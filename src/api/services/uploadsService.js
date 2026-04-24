import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const uploadsService = {
  uploadImage: async (file, folder = '') => {
    const formData = new FormData();
    formData.append('image', file);

    const endpoint = folder 
      ? `/api/uploads/image/${folder}` 
      : ENDPOINTS.UPLOADS.IMAGE;

    return await axiosInstance.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    return await axiosInstance.post(ENDPOINTS.UPLOADS.IMAGES, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAsset: async (publicId) => {
    return await axiosInstance.delete(ENDPOINTS.UPLOADS.DELETE(publicId));
  },
};