import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { TicketService } from '../services/ticket.service';

const ticketService = new TicketService();

export const createInspectionSchema = z.object({
  body: z.object({
    unitId: z.string().uuid(),
    inspectionType: z.string(),
    scheduledDate: z.string().datetime(),
    notes: z.string().optional(),
  }),
});

export class InspectionsController {
  async getInspections(req: Request, res: Response, next: NextFunction) {
    try {
      const { unitId, status, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (unitId) where.unitId = unitId as string;
      if (status) where.status = status as any;

      const [inspections, total] = await Promise.all([
        prisma.inspection.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            inspector: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            findings: {
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        }),
        prisma.inspection.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          inspections,
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

  async createInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { unitId, inspectionType, scheduledDate, notes } = req.body;
      const inspectorId = req.user!.id;

      const inspection = await prisma.inspection.create({
        data: {
          unitId,
          inspectorId,
          inspectionType: inspectionType as any,
          scheduledDate: new Date(scheduledDate),
          notes,
        },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Inspection scheduled successfully',
        data: inspection,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { findings, notes } = req.body;

      const inspection = await prisma.inspection.update({
        where: { id },
        data: {
          status: 'COMPLETED' as any,
          completedDate: new Date(),
          notes,
        },
      });

      // Create findings and auto-generate tickets if needed
      if (findings && findings.length > 0) {
        for (const finding of findings) {
          const inspectionFinding = await prisma.inspectionFinding.create({
            data: {
              inspectionId: id,
              issueDescription: finding.issueDescription,
              severity: finding.severity,
              photoPath: finding.photoPath,
              uploadedBy: req.user!.id,
            },
          });

          // Auto-create ticket for major issues
          if (finding.severity === 'MAJOR' || finding.createTicket) {
            const unit = await prisma.unit.findUnique({
              where: { id: inspection.unitId },
              include: {
                tenancies: {
                  where: { status: 'ACTIVE' as any },
                },
              },
            });

            if (unit && unit.tenancies.length > 0) {
              const ticket = await ticketService.createTicket({
                tenantId: unit.tenancies[0].tenantId,
                unitId: unit.id,
                title: `Inspection Finding: ${finding.issueDescription.substring(0, 50)}`,
                description: finding.issueDescription,
                category: finding.category || 'GENERAL',
                priority: finding.severity === 'MAJOR' ? 'HIGH' : 'MEDIUM',
                source: 'INSPECTION',
              });

              // Link ticket to finding
              await prisma.inspectionFinding.update({
                where: { id: inspectionFinding.id },
                data: { ticketId: ticket.id },
              });
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Inspection completed successfully',
        data: inspection,
      });
    } catch (error) {
      next(error);
    }
  }
}