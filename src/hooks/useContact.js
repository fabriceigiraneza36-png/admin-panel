import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/api/services/contactService';
import { toast } from 'react-hot-toast';

export const useContact = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contact', params],
    queryFn: () => contactService.getAll(params),
    keepPreviousData: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: contactService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(['contact']);
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: contactService.toggleStar,
    onSuccess: () => {
      queryClient.invalidateQueries(['contact']);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: contactService.archive,
    onSuccess: () => {
      queryClient.invalidateQueries(['contact']);
      toast.success('Message archived!');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, data }) => contactService.reply(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contact']);
      toast.success('Reply sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contactService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['contact']);
      toast.success('Message deleted!');
    },
  });

  return {
    messages: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    toggleStar: toggleStarMutation.mutate,
    archiveMessage: archiveMutation.mutate,
    replyToMessage: replyMutation.mutate,
    deleteMessage: deleteMutation.mutate,
  };
};

export const useContactStats = () => {
  return useQuery({
    queryKey: ['contact-stats'],
    queryFn: contactService.getStats,
  });
};