import prisma from '../config/database';

export class NotificationService {
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    relatedId?: string;
  }) {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type || 'OTHER') as any,
        relatedId: data.relatedId,
      },
    });
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}