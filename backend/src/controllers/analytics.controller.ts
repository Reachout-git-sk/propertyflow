import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { TicketService } from '../services/ticket.service';

const ticketService = new TicketService();

export class AnalyticsController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalTenants,
        totalUnits,
        occupiedUnits,
        totalWorkers,
        ticketStats,
        recentTickets,
        upcomingInspections,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'TENANT', isActive: true } }),
        prisma.unit.count(),
        prisma.unit.count({ where: { isOccupied: true } }),
        prisma.worker.count(),
        ticketService.getTicketStats(),
        prisma.ticket.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
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
        }),
        prisma.inspection.findMany({
          where: {
            status: 'SCHEDULED' as any,
            scheduledDate: { gte: new Date() },
          },
          take: 5,
          orderBy: { scheduledDate: 'asc' },
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalTenants,
            totalUnits,
            occupiedUnits,
            occupancyRate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0',
            totalWorkers,
          },
          tickets: ticketStats,
          recentTickets,
          upcomingInspections,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkerPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const workers = await prisma.worker.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          ticketAssignments: {
            include: {
              ticket: {
                select: {
                  status: true,
                  completedAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      const performance = workers.map((worker: any) => {
        const totalAssigned = worker.ticketAssignments.length;
        const completed = worker.ticketAssignments.filter(
          (a: any) => a.ticket.status === 'COMPLETED'
        ).length;
        
        const completionRate = totalAssigned > 0 ? ((completed / totalAssigned) * 100).toFixed(1) : '0';

        // Calculate average completion time
        const completedWithTime = worker.ticketAssignments.filter(
          (a: any) => a.ticket.status === 'COMPLETED' && a.ticket.completedAt
        );

        let avgCompletionHours = 0;
        if (completedWithTime.length > 0) {
          const totalHours = completedWithTime.reduce((sum: number, a: any) => {
            const diff = a.ticket.completedAt!.getTime() - a.ticket.createdAt.getTime();
            return sum + diff / (1000 * 60 * 60);
          }, 0);
          avgCompletionHours = totalHours / completedWithTime.length;
        }

        return {
          workerId: worker.id,
          name: `${worker.user.firstName} ${worker.user.lastName}`,
          totalAssigned,
          completed,
          completionRate: parseFloat(completionRate),
          avgCompletionHours: avgCompletionHours.toFixed(1),
          rating: worker.rating,
        };
      });

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  }
}