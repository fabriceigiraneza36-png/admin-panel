import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/api/services/bookingsService';
import { toast } from 'react-hot-toast';

export const useBookings = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsService.getAll(params),
    keepPreviousData: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success('Booking status updated!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: bookingsService.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success('Booking confirmed!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to confirm booking');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => bookingsService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success('Booking cancelled!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bookingsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success('Booking deleted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete booking');
    },
  });

  return {
    bookings: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatusMutation.mutate,
    confirmBooking: confirmMutation.mutate,
    cancelBooking: cancelMutation.mutate,
    deleteBooking: deleteMutation.mutate,
  };
};

export const useBooking = (id) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.getById(id),
    enabled: !!id,
  });
};

export const useBookingStats = () => {
  return useQuery({
    queryKey: ['booking-stats'],
    queryFn: bookingsService.getStats,
  });
};