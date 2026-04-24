import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const bookingsService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.BOOKINGS.LIST, { params });
  },

  getById: async (id) => {
    return await axiosInstance.get(ENDPOINTS.BOOKINGS.DETAILS(id));
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.BOOKINGS.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.BOOKINGS.DELETE(id));
  },

  updateStatus: async (id, status) => {
    return await axiosInstance.patch(ENDPOINTS.BOOKINGS.UPDATE_STATUS(id), { status });
  },

  confirm: async (id) => {
    return await axiosInstance.post(ENDPOINTS.BOOKINGS.CONFIRM(id));
  },

  cancel: async (id, reason) => {
    return await axiosInstance.post(ENDPOINTS.BOOKINGS.CANCEL(id), { reason });
  },

  addNotes: async (id, notes) => {
    return await axiosInstance.post(ENDPOINTS.BOOKINGS.ADD_NOTES(id), { notes });
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.BOOKINGS.STATS);
  },

  export: async (params) => {
    return await axiosInstance.get(ENDPOINTS.BOOKINGS.EXPORT, {
      params,
      responseType: 'blob',
    });
  },

  bulkUpdateStatus: async (ids, status) => {
    return await axiosInstance.post(ENDPOINTS.BOOKINGS.BULK_STATUS, { ids, status });
  },
};