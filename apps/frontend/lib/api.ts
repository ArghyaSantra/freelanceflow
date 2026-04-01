import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send cookies with every request
});

// attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// handle token expiry — auto refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // don't retry refresh endpoint itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      localStorage.removeItem("accessToken");
      document.cookie = "accessToken=; path=/; max-age=0";
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);
        document.cookie = `accessToken=${accessToken}; path=/; max-age=86400`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        document.cookie = "accessToken=; path=/; max-age=0";
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// auth endpoints
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    workspaceName: string;
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  refresh: () => api.post("/auth/refresh"),
};

// client endpoints
export const clientsApi = {
  list: () => api.get("/clients"),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post("/clients", data),
  update: (id: string, data: unknown) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// project endpoints
export const projectsApi = {
  list: (params?: { clientId?: string; status?: string }) =>
    api.get("/projects", { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post("/projects", data),
  update: (id: string, data: unknown) => api.put(`/projects/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/projects/${id}/status`, { status }),
};

// document endpoints
export const documentsApi = {
  list: (params?: { projectId?: string }) => api.get("/documents", { params }),
  get: (id: string) => api.get(`/documents/${id}`),
  getUploadUrl: (data: {
    filename: string;
    projectId: string;
    title: string;
  }) => api.post("/documents/upload-url", data),
  create: (data: unknown) => api.post("/documents", data),
  getFields: (id: string) => api.get(`/documents/${id}/fields`),
  createField: (id: string, data: unknown) =>
    api.post(`/documents/${id}/fields`, data),
  deleteField: (id: string, fieldId: string) =>
    api.delete(`/documents/${id}/fields/${fieldId}`),
  send: (id: string) => api.post(`/documents/${id}/send`),
};

// public endpoints (no auth)
export const publicApi = {
  getDocument: (token: string) => api.get(`/public/sign/${token}`),
  signDocument: (token: string, data: unknown) =>
    api.post(`/public/sign/${token}`, data),
};

// invoice endpoints
export const invoicesApi = {
  list: (params?: { projectId?: string; status?: string }) =>
    api.get("/invoices", { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: unknown) => api.post("/invoices", data),
  update: (id: string, data: unknown) => api.put(`/invoices/${id}`, data),
  send: (id: string) => api.post(`/invoices/${id}/send`),
  markPaid: (id: string) => api.post(`/invoices/${id}/mark-paid`),
  cancel: (id: string) => api.post(`/invoices/${id}/cancel`),
};
