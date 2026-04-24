import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { destinationsService } from '@/api/services/destinationsService';
import { toast } from 'react-hot-toast';

export const useDestinations = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['destinations', params],
    queryFn: () => destinationsService.getAll(params),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: destinationsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['destinations']);
      toast.success('Destination created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create destination');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => destinationsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['destinations']);
      toast.success('Destination updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update destination');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: destinationsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['destinations']);
      toast.success('Destination deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete destination');
    },
  });

  return {
    destinations: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    createDestination: createMutation.mutate,
    updateDestination: updateMutation.mutate,
    deleteDestination: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};

export const useDestination = (id) => {
  return useQuery({
    queryKey: ['destination', id],
    queryFn: () => destinationsService.getById(id),
    enabled: !!id,
  });
};