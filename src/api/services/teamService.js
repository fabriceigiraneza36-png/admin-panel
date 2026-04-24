import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const teamService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.TEAM.LIST, { params });
  },

  create: async (formData) => {
    return await axiosInstance.post(ENDPOINTS.TEAM.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: async (id, formData) => {
    return await axiosInstance.put(ENDPOINTS.TEAM.UPDATE(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.TEAM.DELETE(id));
  },

  bulkDelete: async (ids) => {
    return await axiosInstance.delete(ENDPOINTS.TEAM.BULK_DELETE, { data: { ids } });
  },

  reorder: async (orders) => {
    return await axiosInstance.patch(ENDPOINTS.TEAM.REORDER, { orders });
  },

  toggleStatus: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.TEAM.TOGGLE_STATUS(id));
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.TEAM.STATS);
  },
};