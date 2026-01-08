import { prisma } from "@/lib/prisma";
import { NotificationPriority, NotificationType } from "@prisma/client";

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
};

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      priority: params.priority ?? NotificationPriority.MEDIUM,
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata ?? {},
    },
  });
}

export async function getNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  const unreadNotifications = await prisma.notification.findMany({
    where: { userId, read: false },
    select: { id: true },
  });
  return unreadNotifications.length;
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

