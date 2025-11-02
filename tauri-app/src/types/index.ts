export interface DeviceGroup {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: number;
  name: string;
  topic: string;
  user_id: number;
  group_id?: number;
  device_group?: DeviceGroup;
  longitude: number;
  latitude: number;
  address: string;
  status: "online" | "offline" | "warning";
  last_seen: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  device_id: number;
  type: string;
  message: string;
  level: "critical" | "high" | "medium" | "low";
  read: boolean;
  timestamp: number;
  created_at: string;
  updated_at: string;
  raw_data?: string;
  parsed_data?: string;
}

export interface DeviceData {
  device_id: number;
  longitude: number;
  latitude: number;
  address: string;
  status: string;
  data: any;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: number;
}
