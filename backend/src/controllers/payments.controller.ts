import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ownedBy } from '../utils/access';
import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    tenancyId: z.string().uuid(),
    amount: z.number().positive(),
    paymentType: z.string(),
    paymentMethod: z.string().optional(),
    paymentDate: z.string().datetime(),
    notes: z.string().optional(),
  }),
});

export class PaymentsController {
  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenancyId, status, page = 1, limit = 20 } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (tenancyId) {
        where.tenancyId = tenancyId as string;
      }

      if (status) {
        where.status = status as any;
      }

      // If tenant, only show their payments
      if (userRole === 'TENANT') {
        where.tenancy = {
          tenantId: userId,
        };
      }

      const [payments, total] = await Promise.all([
        prisma.paymentRecord.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            tenancy: {
              include: {
                tenant: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                unit: {
                  select: {
                    unitNumber: true,
                    property: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.paymentRecord.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          payments,
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

  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenancyId, amount, paymentType, paymentMethod, paymentDate, notes } = req.body;
      const uploadedBy = req.user!.id;

      // A tenant may only record payments on their own tenancy
      const tenancy = await prisma.tenancy.findFirst({
        where: { id: tenancyId, ...ownedBy(req.user!) },
      });
      if (!tenancy) {
        throw new AppError('Tenancy not found', 404);
      }

      const payment = await prisma.paymentRecord.create({
        data: {
          tenancyId,
          amount,
          paymentType: paymentType as any,
          paymentMethod,
          paymentDate: new Date(paymentDate),
          notes,
          uploadedBy,
          status: 'PENDING' as any,
        },
        include: {
          tenancy: {
            include: {
              tenant: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              unit: {
                select: {
                  unitNumber: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Payment record created successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await prisma.paymentRecord.update({
        where: { id },
        data: { status: status as any },
      });

      res.status(200).json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      // The payment must belong to one of the tenant's own tenancies
      const ownPayment = await prisma.paymentRecord.findFirst({
        where: { id, tenancy: ownedBy(req.user!) },
      });
      if (!ownPayment) {
        throw new AppError('Payment not found', 404);
      }

      const payment = await prisma.paymentRecord.update({
        where: { id },
        data: {
          receiptPath: file.path,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Receipt uploaded successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}