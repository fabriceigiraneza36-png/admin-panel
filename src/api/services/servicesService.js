import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const servicesService = {
  getAll: async () => {
    return await axiosInstance.get(ENDPOINTS.SERVICES.LIST);
  },

  create: async (data) => {
    return await axiosInstance.post(ENDPOINTS.SERVICES.CREATE, data);
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.SERVICES.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.SERVICES.DELETE(id));
  },
};