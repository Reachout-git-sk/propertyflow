import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useNotifications = () => {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.data;
    },
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data.data.count;
    },
  });

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
  };
};
