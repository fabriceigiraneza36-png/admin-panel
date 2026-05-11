import axios from "axios";
import { API_BASE, TOKEN_KEY, REFRESH_KEY, ADMIN_KEY } from "@utils/constants";

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const MAX_RETRIES = 1;

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  failedQueue = [];
};

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ADMIN_KEY);
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.config?.url);
      return Promise.reject(error);
    }

    const isAuth =
      original?.url?.includes("/auth/") ||
      original?.url?.includes("/adminAuth/");

    if (error.response?.status === 401 && !original?._retry && !isAuth) {
      const refreshToken = localStorage.getItem(REFRESH_KEY);

      if (!refreshToken) {
        clearAuth();
        if (window.location.pathname !== "/login")
          window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const paths = ["/admin/auth/refresh-token", "/adminAuth/refresh-token"];
        let newToken = null;

        for (const path of paths) {
          try {
            const { data } = await axios.post(`${API_BASE}${path}`, {
              refreshToken,
            });
            newToken = data.token || data.data?.token;
            if (newToken) break;
          } catch (e) {
            if (e?.response?.status !== 404) throw e;
          }
        }

        if (!newToken) throw new Error("No token in refresh response");

        localStorage.setItem(TOKEN_KEY, newToken);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        if (window.location.pathname !== "/login")
          window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/* ── Always returns a string — never an object ── */
export const getErrorMessage = (error) => {
  if (!error) return "An error occurred";

  /* Axios error with response */
  if (error.response?.data) {
    const d = error.response.data;
    if (typeof d.error === "string") return d.error;
    if (typeof d.message === "string") return d.message;
    if (typeof d.msg === "string") return d.msg;
    if (typeof d === "string") return d;
  }

  if (error.response?.status === 404) return "Resource not found (404)";
  if (error.response?.status === 401)
    return "Unauthorized — please log in again";
  if (error.response?.status === 403) return "Access denied";
  if (error.response?.status === 500) return "Server error — please try again";

  if (typeof error.message === "string") return error.message;
  if (typeof error === "string") return error;

  return "An unexpected error occurred";
};

export const createEndpoint = (base) => ({
  getAll: (params) => apiClient.get(base, { params }),
  getOne: (id) => apiClient.get(`${base}/${id}`),
  create: (data) => apiClient.post(base, data),
  update: (id, data) => apiClient.put(`${base}/${id}`, data),
  patch: (id, data) => apiClient.patch(`${base}/${id}`, data),
  remove: (id) => apiClient.delete(`${base}/${id}`),
});

export default apiClient;
