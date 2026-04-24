import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const tipsService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.TIPS.LIST, { params });
  },

  create: async (data) => {
    return await axiosInstance.post(ENDPOINTS.TIPS.CREATE, data);
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.TIPS.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.TIPS.DELETE(id));
  },
};