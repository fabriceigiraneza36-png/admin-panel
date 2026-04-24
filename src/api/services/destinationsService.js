import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const destinationsService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.DESTINATIONS.LIST, { params });
  },

  getById: async (id) => {
    return await axiosInstance.get(ENDPOINTS.DESTINATIONS.DETAILS(id));
  },

  create: async (formData) => {
    return await axiosInstance.post(ENDPOINTS.DESTINATIONS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: async (id, formData) => {
    return await axiosInstance.put(ENDPOINTS.DESTINATIONS.UPDATE(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.DESTINATIONS.DELETE(id));
  },

  bulkUpdate: async (data) => {
    return await axiosInstance.patch(ENDPOINTS.DESTINATIONS.BULK_UPDATE, data);
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.DESTINATIONS.STATS);
  },

  // Images
  addImages: async (id, formData) => {
    return await axiosInstance.post(ENDPOINTS.DESTINATIONS.IMAGES.ADD(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateImage: async (id, imageId, data) => {
    return await axiosInstance.put(ENDPOINTS.DESTINATIONS.IMAGES.UPDATE(id, imageId), data);
  },

  deleteImage: async (id, imageId) => {
    return await axiosInstance.delete(ENDPOINTS.DESTINATIONS.IMAGES.DELETE(id, imageId));
  },

  reorderImages: async (id, imageIds) => {
    return await axiosInstance.put(ENDPOINTS.DESTINATIONS.IMAGES.REORDER(id), { imageIds });
  },

  // Itinerary
  addItineraryDay: async (id, data) => {
    return await axiosInstance.post(ENDPOINTS.DESTINATIONS.ITINERARY.ADD(id), data);
  },

  updateItineraryDay: async (id, dayId, data) => {
    return await axiosInstance.put(ENDPOINTS.DESTINATIONS.ITINERARY.UPDATE(id, dayId), data);
  },

  deleteItineraryDay: async (id, dayId) => {
    return await axiosInstance.delete(ENDPOINTS.DESTINATIONS.ITINERARY.DELETE(id, dayId));
  },

  // FAQs
  addFAQ: async (id, data) => {
    return await axiosInstance.post(ENDPOINTS.DESTINATIONS.FAQS.ADD(id), data);
  },

  updateFAQ: async (id, faqId, data) => {
    return await axiosInstance.put(ENDPOINTS.DESTINATIONS.FAQS.UPDATE(id, faqId), data);
  },

  deleteFAQ: async (id, faqId) => {
    return await axiosInstance.delete(ENDPOINTS.DESTINATIONS.FAQS.DELETE(id, faqId));
  },
};