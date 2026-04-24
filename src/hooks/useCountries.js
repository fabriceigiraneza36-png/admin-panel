import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { countriesService } from '@/api/services/countriesService';
import { toast } from 'react-hot-toast';

export const useCountries = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['countries', params],
    queryFn: () => countriesService.getAll(params),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: countriesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['countries']);
      toast.success('Country created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create country');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => countriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['countries']);
      toast.success('Country updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update country');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: countriesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['countries']);
      toast.success('Country deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete country');
    },
  });

  return {
    countries: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    createCountry: createMutation.mutate,
    updateCountry: updateMutation.mutate,
    deleteCountry: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};

export const useCountry = (id) => {
  return useQuery({
    queryKey: ['country', id],
    queryFn: () => countriesService.getById(id),
    enabled: !!id,
  });
};