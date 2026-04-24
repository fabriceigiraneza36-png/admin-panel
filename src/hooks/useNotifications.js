import { useNotificationStore } from '@/store/notificationStore';
import { useSocket } from './useSocket';

export const useNotifications = () => {
  useSocket(); // Initialize socket connection

  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
};