import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/api/services/postsService';
import { toast } from 'react-hot-toast';

export const usePosts = (params = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['posts', params],
    queryFn: () => postsService.getAll(params),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: postsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create post');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => postsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      toast.success('Post updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update post');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: postsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      toast.success('Post deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: postsService.togglePublish,
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      toast.success('Post publish status updated!');
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: postsService.toggleFeatured,
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      toast.success('Post featured status updated!');
    },
  });

  return {
    posts: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    createPost: createMutation.mutate,
    updatePost: updateMutation.mutate,
    deletePost: deleteMutation.mutate,
    togglePublish: togglePublishMutation.mutate,
    toggleFeatured: toggleFeaturedMutation.mutate,
  };
};