/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AXIOS INSTANCE — Pre-configured HTTP client
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 *   - Automatic base URL from environment
 *   - Request/response interceptors for auth tokens
 *   - Automatic token refresh on 401
 *   - Request queuing during token refresh
 */

import axios from "axios";
import { toast } from "react-hot-toast";
import { TOKEN_KEY, REFRESH_KEY } from '@utils/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL = import.meta.env.VITE_API_URL || "https://backend-jd8f.onrender.com";
const TIMEOUT = 30000; // 30 seconds

// Token storage keys - using constants

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const getAccessToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const getRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

const setTokens = (accessToken, refreshToken) => {
  try {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch (e) {
    console.warn("[Axios] Failed to store tokens:", e);
  }
};

const clearTokens = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REFRESH QUEUE (prevents multiple simultaneous refresh calls)
// ═══════════════════════════════════════════════════════════════════════════════

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE AXIOS INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Send cookies if any
});

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR — Attach auth token
// ═══════════════════════════════════════════════════════════════════════════════

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracing
    config.headers["X-Request-ID"] = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR — Handle auth errors & token refresh
// ═══════════════════════════════════════════════════════════════════════════════

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry if already tried, or if it's a login/register request
    if (
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/refresh-token")
    ) {
      return Promise.reject(error);
    }
    
    // Only handle 401 errors
    if (error.response?.status !== 401) {
      // Handle other errors
      if (error.response?.status === 403) {
        // Forbidden - might be expired token
      } else if (error.response?.status === 429) {
        toast.error("Too many requests. Please wait.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      }
      
      return Promise.reject(error);
    }
    
    // Check if we should attempt refresh
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      // Don't redirect if already on auth page
      if (!window.location.pathname.includes("/auth") && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
    
    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/users/refresh-token`,
        { refreshToken },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      
      const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
      
      setTokens(newAccessToken, newRefreshToken || refreshToken);
      
      // Update the failed request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      
      // Process queued requests
      processQueue(null, newAccessToken);
      
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      
      // Don't redirect if already on auth page
      if (!window.location.pathname.includes("/auth") && !window.location.pathname.includes("/login")) {
        toast.error("Session expired. Please log in again.");
        window.location.href = "/login";
      }
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update stored tokens (call after login/register)
 */
axiosInstance.setAuthTokens = (accessToken, refreshToken) => {
  setTokens(accessToken, refreshToken);
};

/**
 * Clear stored tokens (call on logout)
 */
axiosInstance.clearAuthTokens = () => {
  clearTokens();
};

/**
 * Get the base URL
 */
axiosInstance.getBaseURL = () => BASE_URL;

export default axiosInstance;