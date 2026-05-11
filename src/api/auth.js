import apiClient from "./client";

/* ── Try both admin auth paths (handles both /admin/auth and /adminAuth) ── */
const tryEndpoints = async (method, paths, data) => {
  for (const path of paths) {
    try {
      return await apiClient[method](path, data);
    } catch (err) {
      const status = err?.response?.status;
      // Only retry on 404 (wrong path), throw on other errors
      if (status !== 404) throw err;
    }
  }
  throw new Error("Auth endpoint not found");
};

export const authAPI = {
  login: (credentials) =>
    tryEndpoints(
      "post",
      ["/admin/auth/login", "/adminAuth/login", "/admin/login"],
      credentials,
    ),

  logout: () =>
    tryEndpoints("post", ["/admin/auth/logout", "/adminAuth/logout"], {}),

  me: () => tryEndpoints("get", ["/admin/auth/me", "/adminAuth/me"]),

  updateProfile: (data) =>
    tryEndpoints("put", ["/admin/auth/me", "/adminAuth/me"], data),

  changePassword: (data) =>
    tryEndpoints(
      "put",
      ["/admin/auth/change-password", "/adminAuth/change-password"],
      data,
    ),

  refreshToken: (refreshToken) =>
    tryEndpoints(
      "post",
      ["/admin/auth/refresh-token", "/adminAuth/refresh-token"],
      { refreshToken },
    ),

  register: (data) =>
    tryEndpoints("post", ["/admin/auth/register", "/adminAuth/register"], data),
};
