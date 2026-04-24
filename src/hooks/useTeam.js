import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '@/api/services/teamService';
import { toast } from 'react-hot-toast';

export const useTeam = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['team', params],
    queryFn: () => teamService.getAll(params),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: teamService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
      toast.success('Team member added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add team member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
      toast.success('Team member updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update team member');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teamService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
      toast.success('Team member deleted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete team member');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: teamService.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['team']);
      toast.success('Status updated!');
    },
  });

  return {
    teamMembers: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    createMember: createMutation.mutate,
    updateMember: updateMutation.mutate,
    deleteMember: deleteMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
  };
};