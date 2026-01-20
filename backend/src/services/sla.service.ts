import prisma from '../config/database';
import { NotificationService } from './notification.service';
import cron from 'node-cron';
import logger from '../utils/logger';

const notificationService = new NotificationService();

export class SLAService {
  // Run every hour
  startSLAMonitoring() {
    cron.schedule('0 * * * *', async () => {
      logger.info('Running SLA monitoring check...');
      await this.checkOverdueTickets();
    });
  }

  async checkOverdueTickets() {
    const now = new Date();

    // Find tickets approaching SLA deadline (within 2 hours)
    const approachingDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const tickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
        slaDeadline: {
          gte: now,
          lte: approachingDeadline,
        },
      },
      include: {
        tenant: true,
        assignments: {
          include: {
            worker: {
              include: { user: true },
            },
          },
        },
      },
    });

    // Notify admins and assigned workers
    for (const ticket of tickets) {
      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
      });

      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'SLA Warning',
          message: `Ticket ${ticket.ticketNumber} is approaching SLA deadline`,
          type: 'TICKET_UPDATE',
          relatedId: ticket.id,
        });
      }

      // Notify assigned workers
      for (const assignment of ticket.assignments) {
        await notificationService.createNotification({
          userId: assignment.worker.userId,
          title: 'SLA Warning',
          message: `Ticket ${ticket.ticketNumber} assigned to you is approaching deadline`,
          type: 'TICKET_UPDATE',
          relatedId: ticket.id,
        });
      }
    }

    logger.info(`SLA check completed. ${tickets.length} tickets approaching deadline.`);
  }
}