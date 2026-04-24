import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const subscribersService = {
  getAll: async () => {
    return await axiosInstance.get(ENDPOINTS.SUBSCRIBERS.LIST);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.SUBSCRIBERS.DELETE(id));
  },
};