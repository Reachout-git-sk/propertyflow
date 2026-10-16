import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { hashPassword } from '../utils/passwordHash';

export const createTenantSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).optional(), // Admin can set password
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    unitId: z.string().uuid(),
    leaseStart: z.string().datetime(),
    leaseEnd: z.string().datetime(),
    rentAmount: z.number().positive(),
    depositAmount: z.number().positive().optional(),
  }),
});

export const updateTenantSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional(),
    isActive: z.boolean().optional(),
  }),
});

export class TenantsController {
  async getTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { role: 'TENANT' as any };

      // A tenant only sees themselves. (The tenant ticket form calls this list
      // to find its own unit; before, it received every tenant's email and phone.)
      if (req.user!.role === 'TENANT') {
        where.id = req.user!.id;
      }

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [tenants, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            createdAt: true,
            tenancies: {
              where: { status: 'ACTIVE' as any },
              include: {
                unit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          tenants,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // A tenant may only open their own profile; anyone else's looks like it does not exist
      if (req.user!.role === 'TENANT' && id !== req.user!.id) {
        throw new AppError('Tenant not found', 404);
      }

      const tenant = await prisma.user.findUnique({
        where: { id, role: 'TENANT' as any },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          tenancies: {
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
              paymentRecords: {
                orderBy: { paymentDate: 'desc' },
                take: 10,
              },
            },
          },
          ticketsCreated: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              status: true,
              priority: true,
              createdAt: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      res.status(200).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        unitId,
        leaseStart,
        leaseEnd,
        rentAmount,
        depositAmount,
      } = req.body;

      // Add to whitelist
      await prisma.emailWhitelist.upsert({
        where: { email },
        update: { role: 'TENANT' as any },
        create: {
          email,
          role: 'TENANT' as any,
          approvedBy: req.user!.id,
        },
      });

      // Check if user already exists
      let tenant = await prisma.user.findUnique({ where: { email } });

      if (!tenant) {
        // Create user with admin-provided password or default
        const tempPassword = password || 'ChangeMe@123';
        const passwordHash = await hashPassword(tempPassword);
        
        tenant = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: 'TENANT' as any,
            firstName,
            lastName,
            phone,
          },
        });
      }

      // Create tenancy
      const tenancy = await prisma.tenancy.create({
        data: {
          tenantId: tenant.id,
          unitId,
          leaseStart: new Date(leaseStart),
          leaseEnd: new Date(leaseEnd),
          rentAmount,
          depositAmount,
          status: 'ACTIVE' as any,
        },
        include: {
          tenant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          unit: {
            include: {
              property: true,
            },
          },
        },
      });

      // Update unit occupancy
      await prisma.unit.update({
        where: { id: unitId },
        data: { isOccupied: true },
      });

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: {
          ...tenancy,
          temporaryPassword: password || 'ChangeMe@123',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, password, isActive } = req.body;

      const updateData: any = {};
      
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // If admin is resetting password
      if (password) {
        updateData.passwordHash = await hashPassword(password);
      }

      const tenant = await prisma.user.update({
        where: { id, role: 'TENANT' as any },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await prisma.user.update({
        where: { id, role: 'TENANT' as any },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: 'Tenant deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // This will cascade delete tenancies, tickets, etc.
      await prisma.user.delete({
        where: { id, role: 'TENANT' as any },
      });

      res.status(200).json({
        success: true,
        message: 'Tenant deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}