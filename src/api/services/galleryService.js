import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const galleryService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.GALLERY.LIST, { params });
  },

  create: async (formData) => {
    return await axiosInstance.post(ENDPOINTS.GALLERY.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  bulkCreate: async (formData) => {
    return await axiosInstance.post(ENDPOINTS.GALLERY.BULK_CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.GALLERY.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.GALLERY.DELETE(id));
  },
};