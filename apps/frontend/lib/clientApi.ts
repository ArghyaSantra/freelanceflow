import axios from "axios";
import { useClientAuth } from "@/hooks/useClientAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const clientApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// attach client access token to every request
clientApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("clientAccessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// handle token expiry — auto refresh
clientApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes("/client/auth/refresh")) {
      useClientAuth.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/client/login";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/client/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = response.data;
        localStorage.setItem("clientAccessToken", accessToken);
        document.cookie = `clientAccessToken=${accessToken}; path=/; max-age=86400`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return clientApi(originalRequest);
      } catch {
        useClientAuth.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/client/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// client auth endpoints
export const clientAuthApi = {
  login: (data: { email: string; password: string }) =>
    clientApi.post("/client/auth/login", data),
  logout: () => clientApi.post("/client/auth/logout"),
  me: () => clientApi.get("/client/auth/me"),
  refresh: () => clientApi.post("/client/auth/refresh"),
  getInvitation: (token: string) =>
    clientApi.get(`/client/auth/invitation/${token}`),
  register: (data: { token: string; password: string }) =>
    clientApi.post("/client/auth/register", data),
};

// client portal endpoints
export const clientPortalApi = {
  // documents
  getDocuments: () => clientApi.get("/client/documents"),
  getDocument: (id: string) => clientApi.get(`/client/documents/${id}`),

  // invoices
  getInvoices: () => clientApi.get("/client/invoices"),
  getInvoice: (id: string) => clientApi.get(`/client/invoices/${id}`),

  // assets
  getAssets: () => clientApi.get("/client/assets"),
  approveAsset: (id: string) => clientApi.post(`/client/assets/${id}/approve`),
  rejectAsset: (id: string, comment?: string) =>
    clientApi.post(`/client/assets/${id}/reject`, { comment }),
  addComment: (id: string, content: string) =>
    clientApi.post(`/client/assets/${id}/comments`, { content }),
};
