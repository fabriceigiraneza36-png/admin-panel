import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const contactService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.CONTACT.LIST, { params });
  },

  getById: async (id) => {
    return await axiosInstance.get(ENDPOINTS.CONTACT.DETAILS(id));
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.CONTACT.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.CONTACT.DELETE(id));
  },

  markAsRead: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.CONTACT.MARK_READ(id));
  },

  toggleStar: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.CONTACT.STAR(id));
  },

  archive: async (id) => {
    return await axiosInstance.patch(ENDPOINTS.CONTACT.ARCHIVE(id));
  },

  reply: async (id, data) => {
    return await axiosInstance.post(ENDPOINTS.CONTACT.REPLY(id), data);
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.CONTACT.STATS);
  },

  export: async (params) => {
    return await axiosInstance.get(ENDPOINTS.CONTACT.EXPORT, {
      params,
      responseType: 'blob',
    });
  },

  bulkUpdate: async (data) => {
    return await axiosInstance.post(ENDPOINTS.CONTACT.BULK, data);
  },
};