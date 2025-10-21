import axios from "axios";
import type { Device, Alert, DeviceGroup } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface GenerateTestDataResponse {
  test_data: any[];
}

// Helper function to extract data from API response
export const getResponseData = <T>(response: ApiResponse<T>): T | undefined => {
  return response.data;
};

export const apiService = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    api.post<ApiResponse<{ token: string }>>("/login", credentials),

  register: (userData: { username: string; email: string; password: string }) =>
    api.post<ApiResponse>("/register", userData),

  // Devices
  getDevices: () =>
    api
      .get<ApiResponse<Device[]>>("/devices")
      .then((response) => response.data),

  createDevice: (deviceData: {
    name: string;
    topic: string;
    group_id?: number;
    longitude?: number;
    latitude?: number;
    address?: string;
  }) => api.post<ApiResponse<Device>>("/devices", deviceData),

  updateDevice: (
    id: number,
    deviceData: {
      name: string;
      topic: string;
      group_id?: number;
      longitude?: number;
      latitude?: number;
      address?: string;
    },
  ) => api.put<ApiResponse<Device>>(`/devices/${id}`, deviceData),

  deleteDevice: (id: number) => api.delete<ApiResponse>(`/devices/${id}`),

  updateDeviceLocation: (
    id: number,
    locationData: {
      longitude: number;
      latitude: number;
      address?: string;
    },
  ) => api.put<ApiResponse>(`/devices/${id}/location`, locationData),

  updateDeviceStatus: (id: number, statusData: { status: string }) =>
    api.put<ApiResponse>(`/devices/${id}/status`, statusData),

  // Device Groups
  getDeviceGroups: () =>
    api
      .get<ApiResponse<DeviceGroup[]>>("/device-groups")
      .then((response) => response.data),

  // Alerts
  getAlerts: () =>
    api.get<ApiResponse<Alert[]>>("/alerts").then((response) => response.data),

  getUnreadAlerts: () =>
    api
      .get<ApiResponse<{ count: number }>>("/alerts/unread")
      .then((response) => (response.data as any)?.count || 0),

  createAlert: (alertData: {
    device_id: number;
    type: string;
    message: string;
    level: string;
    raw_data: string;
  }) => api.post<ApiResponse<Alert>>("/alerts", alertData),

  markAlertAsRead: (id: number) => api.put<ApiResponse>(`/alerts/${id}/read`),

  markAlertsAsRead: (ids: number[]) =>
    api.put<ApiResponse>("/alerts/read", { ids }),

  markAllAlertsAsRead: () => api.put<ApiResponse>("/alerts/read-all"),

  deleteAlert: (id: number) => api.delete<ApiResponse>(`/alerts/${id}`),

  deleteAlerts: (ids: number[]) =>
    api.delete<ApiResponse>("/alerts", { data: { ids } }),

  // Data push
  pushDeviceData: (data: {
    device_id: number;
    longitude?: number;
    latitude?: number;
    address?: string;
    status?: string;
    data?: any;
  }) => api.post<ApiResponse>("/data/push", data),

  generateTestData: () =>
    api.post<ApiResponse<GenerateTestDataResponse>>("/data/generate-test"),

  pushTestData: (data: any) => api.post<ApiResponse>("/data/push-test", data),
};

export { api };
