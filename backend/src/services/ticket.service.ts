import prisma from '../config/database';
import { generateTicketNumber } from '../utils/ticketNumberGenerator';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

export class TicketService {
  async createTicket(data: {
    tenantId: string;
    unitId: string;
    title: string;
    description: string;
    category: any;
    priority?: any;
    source?: any;
  }) {
    const ticketNumber = generateTicketNumber();
    
    const slaHours = this.calculateSLA(data.priority || 'MEDIUM');
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        tenantId: data.tenantId,
        unitId: data.unitId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: (data.priority || 'MEDIUM') as any,
        source: (data.source || 'TENANT_REQUEST') as any,
        slaHours,
        slaDeadline,
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        userId: data.tenantId,
        action: 'TICKET_CREATED',
        newValue: 'NEW',
        notes: 'Ticket created by tenant',
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' as any, isActive: true },
    });

    for (const admin of admins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: 'New Maintenance Request',
        message: `New ticket ${ticketNumber}: ${data.title}`,
        type: 'TICKET_UPDATE',
        relatedId: ticket.id,
      });
    }

    return ticket;
  }

  async getTickets(filters: {
    status?: any;
    priority?: any;
    category?: any;
    tenantId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              property: {
                select: {
                  name: true,
                },
              },
            },
          },
          assignments: {
            include: {
              worker: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketById(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
            property: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
        assignments: {
          include: {
            worker: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    return ticket;
  }

  async assignTicket(
    ticketId: string,
    workerIds: string[],
    assignedBy: string,
    notes?: string,
    estimatedCompletion?: Date
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const assignments = await Promise.all(
      workerIds.map((workerId) =>
        prisma.ticketAssignment.create({
          data: {
            ticketId,
            workerId,
            assignedBy,
            notes,
            estimatedCompletion,
          },
          include: {
            worker: {
              include: {
                user: true,
              },
            },
          },
        })
      )
    );

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'ASSIGNED' as any,
        assignedAt: new Date(),
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId,
        userId: assignedBy,
        action: 'TICKET_ASSIGNED',
        oldValue: ticket.status,
        newValue: 'ASSIGNED',
        notes: `Assigned to ${assignments.length} worker(s)`,
      },
    });

    for (const assignment of assignments) {
      await notificationService.createNotification({
        userId: assignment.worker.userId,
        title: 'New Work Assignment',
        message: `You have been assigned to ticket ${ticket.ticketNumber}`,
        type: 'TICKET_UPDATE',
        relatedId: ticketId,
      });
    }

    if (ticket.tenantId) {
      await notificationService.createNotification({
        userId: ticket.tenantId,
        title: 'Ticket Assigned',
        message: `Your ticket ${ticket.ticketNumber} has been assigned to a worker`,
        type: 'TICKET_UPDATE',
        relatedId: ticketId,
      });
    }

    return assignments;
  }

  async updateTicketStatus(
    ticketId: string,
    status: any,
    userId: string,
    notes?: string
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const updateData: any = { status };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId,
        userId,
        action: 'STATUS_CHANGED',
        oldValue: ticket.status,
        newValue: status,
        notes,
      },
    });

    if (ticket.tenantId) {
      await notificationService.createNotification({
        userId: ticket.tenantId,
        title: 'Ticket Status Updated',
        message: `Your ticket ${ticket.ticketNumber} status changed to ${status}`,
        type: 'TICKET_UPDATE',
        relatedId: ticketId,
      });
    }

    return updatedTicket;
  }

  async addAttachment(
    ticketId: string,
    uploadedBy: string,
    fileName: string,
    filePath: string,
    fileType: string,
    fileSize: number
  ) {
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId,
        uploadedBy,
        fileName,
        filePath,
        fileType,
        fileSize,
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId,
        userId: uploadedBy,
        action: 'ATTACHMENT_ADDED',
        newValue: fileName,
      },
    });

    return attachment;
  }

  private calculateSLA(priority: any): number {
    const slaMap: any = {
      EMERGENCY: 4,
      HIGH: 24,
      MEDIUM: 72,
      LOW: 168,
    };
    return slaMap[priority] || 72;
  }

  async getTicketStats() {
    const [total, newTickets, assigned, inProgress, completed, overdue] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'NEW' as any } }),
      prisma.ticket.count({ where: { status: 'ASSIGNED' as any } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' as any } }),
      prisma.ticket.count({ where: { status: 'COMPLETED' as any } }),
      prisma.ticket.count({
        where: {
          slaDeadline: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] as any },
        },
      }),
    ]);

    const ticketsByCategory = await prisma.ticket.groupBy({
      by: ['category'],
      _count: true,
    });

    const ticketsByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      _count: true,
    });

    return {
      total,
      byStatus: {
        new: newTickets,
        assigned,
        inProgress,
        completed,
      },
      overdue,
      byCategory: ticketsByCategory.map((item: any) => ({
        category: item.category,
        count: item._count,
      })),
      byPriority: ticketsByPriority.map((item: any) => ({
        priority: item.priority,
        count: item._count,
      })),
    };
  }
}