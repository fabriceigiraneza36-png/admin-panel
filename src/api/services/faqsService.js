import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const faqsService = {
  getAll: async () => {
    return await axiosInstance.get(ENDPOINTS.FAQS.LIST);
  },

  create: async (data) => {
    return await axiosInstance.post(ENDPOINTS.FAQS.CREATE, data);
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.FAQS.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.FAQS.DELETE(id));
  },
};