import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const postsService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.POSTS.LIST, { params });
  },

  create: async (formData) => {
    return await axiosInstance.post(ENDPOINTS.POSTS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: async (id, formData) => {
    return await axiosInstance.put(ENDPOINTS.POSTS.UPDATE(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.POSTS.DELETE(id));
  },

  togglePublish: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.POSTS.TOGGLE_PUBLISH(id));
  },

  toggleFeatured: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.POSTS.TOGGLE_FEATURED(id));
  },

  bulkDelete: async (ids) => {
    return await axiosInstance.delete(ENDPOINTS.POSTS.BULK_DELETE, { data: { ids } });
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.POSTS.STATS);
  },
};