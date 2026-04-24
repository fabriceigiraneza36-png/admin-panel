import { useEffect } from 'react';
import { useSocketStore } from '@/store/socketStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';

export const useSocket = () => {
  const { socket, connected, connect, disconnect, emit, on, off } = useSocketStore();
  const { addNotification } = useNotificationStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !socket) {
      connect();
    }

    return () => {
      if (socket && !isAuthenticated) {
        disconnect();
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new bookings
    on('new-booking', (data) => {
      addNotification({
        type: 'booking',
        title: 'New Booking',
        message: `New booking from ${data.full_name}`,
        data,
      });
    });

    // Listen for new contact messages
    on('new-contact-message', (data) => {
      addNotification({
        type: 'contact',
        title: 'New Message',
        message: `New message from ${data.full_name}`,
        data,
      });
    });

    // Listen for booking status updates
    on('booking-status-updated', (data) => {
      addNotification({
        type: 'booking-update',
        title: 'Booking Updated',
        message: `Booking #${data.booking_number} status: ${data.status}`,
        data,
      });
    });

    return () => {
      off('new-booking');
      off('new-contact-message');
      off('booking-status-updated');
    };
  }, [socket]);

  return {
    socket,
    connected,
    emit,
    on,
    off,
  };
};