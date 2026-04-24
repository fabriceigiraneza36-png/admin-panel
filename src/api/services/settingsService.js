import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const settingsService = {
  getAll: async () => {
    return await axiosInstance.get(ENDPOINTS.SETTINGS.LIST);
  },

  update: async (id, value) => {
    return await axiosInstance.put(ENDPOINTS.SETTINGS.UPDATE(id), { value });
  },
};