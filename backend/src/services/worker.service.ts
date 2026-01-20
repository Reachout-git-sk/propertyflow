import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { WorkerAvailability } from '@prisma/client';

export class WorkerService {
  async getWorkers(filters?: {
    skills?: string[];
    availability?: WorkerAvailability;
  }) {
    const where: any = {};

    if (filters?.availability) {
      where.availabilityStatus = filters.availability;
    }

    if (filters?.skills && filters.skills.length > 0) {
      where.skills = {
        hasSome: filters.skills,
      };
    }

    const workers = await prisma.worker.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        ticketAssignments: {
          where: {
            ticket: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            },
          },
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
    });

    return workers.map((worker) => ({
      ...worker,
      activeTickets: worker.ticketAssignments.length,
    }));
  }

  async getWorkerById(workerId: string) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        ticketAssignments: {
          orderBy: { assignedAt: 'desc' },
          take: 20,
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                priority: true,
                category: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!worker) {
      throw new AppError('Worker not found', 404);
    }

    return worker;
  }

  async updateWorker(
    workerId: string,
    data: {
      companyName?: string;
      skills?: string[];
      hourlyRate?: number;
      availabilityStatus?: WorkerAvailability;
    }
  ) {
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return worker;
  }

  async getWorkerStats(workerId: string) {
    const [totalAssignments, completedTickets, avgRating] = await Promise.all([
      prisma.ticketAssignment.count({
        where: { workerId },
      }),
      prisma.ticketAssignment.count({
        where: {
          workerId,
          ticket: { status: 'COMPLETED' },
        },
      }),
      prisma.worker.findUnique({
        where: { id: workerId },
        select: { rating: true },
      }),
    ]);

    return {
      totalAssignments,
      completedTickets,
      rating: avgRating?.rating || 0,
    };
  }
}