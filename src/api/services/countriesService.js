import axiosInstance from '../axios';
import { ENDPOINTS } from '../endpoints';

export const countriesService = {
  getAll: async (params) => {
    return await axiosInstance.get(ENDPOINTS.COUNTRIES.LIST, { params });
  },

  getById: async (id) => {
    return await axiosInstance.get(ENDPOINTS.COUNTRIES.DETAILS(id));
  },

  create: async (data) => {
    return await axiosInstance.post(ENDPOINTS.COUNTRIES.CREATE, data);
  },

  update: async (id, data) => {
    return await axiosInstance.put(ENDPOINTS.COUNTRIES.UPDATE(id), data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(ENDPOINTS.COUNTRIES.DELETE(id));
  },

  getStats: async () => {
    return await axiosInstance.get(ENDPOINTS.COUNTRIES.STATS);
  },

  // Airports
  addAirport: async (countryId, data) => {
    return await axiosInstance.post(ENDPOINTS.COUNTRIES.AIRPORTS.ADD(countryId), data);
  },

  deleteAirport: async (countryId, airportId) => {
    return await axiosInstance.delete(ENDPOINTS.COUNTRIES.AIRPORTS.DELETE(countryId, airportId));
  },

  // Festivals
  addFestival: async (countryId, data) => {
    return await axiosInstance.post(ENDPOINTS.COUNTRIES.FESTIVALS.ADD(countryId), data);
  },

  deleteFestival: async (countryId, festivalId) => {
    return await axiosInstance.delete(ENDPOINTS.COUNTRIES.FESTIVALS.DELETE(countryId, festivalId));
  },

  // UNESCO Sites
  addUNESCOSite: async (countryId, data) => {
    return await axiosInstance.post(ENDPOINTS.COUNTRIES.UNESCO.ADD(countryId), data);
  },

  deleteUNESCOSite: async (countryId, siteId) => {
    return await axiosInstance.delete(ENDPOINTS.COUNTRIES.UNESCO.DELETE(countryId, siteId));
  },
};