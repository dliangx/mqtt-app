import axios from 'axios';

import type { User, Alert, Device, ApiResponse } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (
      error.response?.status === 401 ||
      (error.response?.status === 400 && error.response?.data?.error === 'Invalid token')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export interface GenerateTestDataResponse {
  test_data: any[];
}

// Helper function to extract data from API response
export const getResponseData = <T>(response: ApiResponse<T>): T | undefined => response.data;

export const apiService = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    api.post<{ token: string; user: any }>('/login', credentials),

  register: (userData: { username: string; email: string; password: string }) =>
    api.post<ApiResponse>('/register', userData),

  // Devices
  getDevices: () => api.get<ApiResponse<Device[]>>('/devices').then((response) => response.data),

  createDevice: (deviceData: {
    name: string;
    topic: string;
    longitude?: number;
    latitude?: number;
    address?: string;
  }) => api.post<ApiResponse<Device>>('/devices', deviceData),

  deleteDevice: (id: number) => api.delete<ApiResponse>(`/devices/${id}`),

  updateDevice: (
    id: number,
    deviceData: {
      name?: string;
      topic?: string;
      group_id?: number;
      longitude?: number;
      latitude?: number;
      address?: string;
    }
  ) => api.put<ApiResponse<Device>>(`/devices/${id}`, deviceData),

  updateDeviceLocation: (
    id: number,
    locationData: {
      longitude: number;
      latitude: number;
      address?: string;
    }
  ) => api.put<ApiResponse>(`/devices/${id}/location`, locationData),

  updateDeviceStatus: (id: number, statusData: { status: string }) =>
    api.put<ApiResponse>(`/devices/${id}/status`, statusData),

  // Alerts
  getAlerts: () => api.get<ApiResponse<Alert[]>>('/alerts').then((response) => response.data),

  getUnreadAlerts: () =>
    api
      .get<ApiResponse<{ count: number }>>('/alerts/unread')
      .then((response: any) => (response.data as any)?.count || 0),

  createAlert: (alertData: {
    device_id: number;
    type: string;
    message: string;
    level: string;
    raw_data: string;
  }) => api.post<ApiResponse<Alert>>('/alerts', alertData),

  markAlertAsRead: (id: number) => api.put<ApiResponse>(`/alerts/${id}/read`),

  markAlertsAsRead: (ids: number[]) => api.put<ApiResponse>('/alerts/read', { ids }),

  deleteAlert: (id: number) => api.delete<ApiResponse>(`/alerts/${id}`),

  deleteAlerts: (ids: number[]) => api.delete<ApiResponse>('/alerts', { data: { ids } }),

  // Data push
  pushDeviceData: (data: {
    device_id: number;
    longitude?: number;
    latitude?: number;
    address?: string;
    status?: string;
    data?: any;
  }) => api.post<ApiResponse>('/data/push', data),

  generateTestData: () => api.post<ApiResponse<GenerateTestDataResponse>>('/data/generate-test'),

  pushTestData: (data: any) => api.post<ApiResponse>('/data/push-test', data),

  // Generate trajectory tracking data
  generateTrajectoryData: () => api.post<ApiResponse<any>>('/message-types/geo-test-data'),

  // Users
  getUsers: () => api.get<ApiResponse<User[]>>('/users').then((response) => response.data),

  // Device Groups
  getDeviceGroups: () =>
    api.get<ApiResponse<any[]>>('/device-groups').then((response) => response.data),

  createDeviceGroup: (groupData: { name: string; description?: string; icon?: File }) => {
    const formData = new FormData();
    formData.append('name', groupData.name);
    if (groupData.description) {
      formData.append('description', groupData.description);
    }
    if (groupData.icon) {
      formData.append('icon', groupData.icon);
    }
    return api.post<ApiResponse<any>>('/device-groups', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateDeviceGroup: (
    id: number,
    groupData: { name?: string; description?: string; icon?: File }
  ) => {
    const formData = new FormData();
    if (groupData.name) {
      formData.append('name', groupData.name);
    }
    if (groupData.description) {
      formData.append('description', groupData.description);
    }
    if (groupData.icon) {
      formData.append('icon', groupData.icon);
    }
    return api.put<ApiResponse<any>>(`/device-groups/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteDeviceGroup: (id: number) => api.delete<ApiResponse>(`/device-groups/${id}`),

  createUser: (userData: { username: string; password: string; role: string }) =>
    api.post<ApiResponse<User>>('/users', userData),

  updateUser: (
    id: number,
    userData: {
      username: string;
      role: string;
    }
  ) => api.put<ApiResponse<User>>(`/users/${id}`, userData),

  deleteUser: (id: number) => api.delete<ApiResponse>(`/users/${id}`),

  markAllAlertsAsRead: () => api.put<ApiResponse>('/alerts/read-all'),

  // Message type configs
  getMessageTypeConfigs: () =>
    api.get<ApiResponse<any[]>>('/message-types').then((response) => response.data),

  getMessageTypeConfig: (id: number) =>
    api.get<ApiResponse<any>>(`/message-types/${id}`).then((response) => response.data),

  getDefaultMessageTypeConfig: () =>
    api.get<ApiResponse<any>>('/message-types/default').then((response) => response.data),

  createMessageTypeConfig: (configData: {
    name: string;
    description?: string;
    protocol: string;
    format: any;
    is_default?: boolean;
  }) => api.post<ApiResponse<any>>('/message-types', configData),

  updateMessageTypeConfig: (
    id: number,
    configData: {
      name?: string;
      description?: string;
      protocol?: string;
      format?: any;
      is_default?: boolean;
    }
  ) => api.put<ApiResponse<any>>(`/message-types/${id}`, configData),

  deleteMessageTypeConfig: (id: number) => api.delete<ApiResponse>(`/message-types/${id}`),

  setDefaultMessageTypeConfig: (id: number) => api.put<ApiResponse>(`/message-types/${id}/default`),

  parseMessageData: (data: { config_id: number; raw_data: string }) =>
    api.post<ApiResponse<any>>('/message-types/parse', data),

  testMessageFormat: (data: { format: any; test_data: string }) =>
    api.post<ApiResponse<any>>('/message-types/test', data),
};

export { api };
