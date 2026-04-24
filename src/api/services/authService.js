import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const authService = {
  login: async (credentials) => {
    const response = await axiosInstance.post(ENDPOINTS.AUTH.LOGIN, credentials);
    if (response.success && response.token) {
      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_refresh_token', response.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }
    return response;
  },

  logout: async () => {
    try {
      await axiosInstance.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
    }
  },

  getMe: async () => {
    return await axiosInstance.get(ENDPOINTS.AUTH.ME);
  },

  changePassword: async (data) => {
    return await axiosInstance.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    const response = await axiosInstance.post(ENDPOINTS.AUTH.REFRESH, { refreshToken });
    if (response.token) {
      localStorage.setItem('admin_token', response.token);
    }
    return response;
  },
};