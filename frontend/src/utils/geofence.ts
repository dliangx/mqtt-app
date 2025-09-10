// 地理围栏工具函数和类型定义

export interface Geofence {
  id: string;
  name: string;
  coordinates: [number, number][]; // 多边形坐标点数组
  type: 'polygon' | 'circle';
  radius?: number; // 圆形围栏的半径（米）
  color?: string;
  strokeColor?: string;
  strokeWeight?: number;
}

export interface GeofenceViolation {
  deviceId: number;
  deviceName: string;
  geofenceId: string;
  geofenceName: string;
  violationType: 'inside' | 'outside';
  coordinates: [number, number];
  timestamp: number;
  message: string;
}

// 判断点是否在多边形内（射线法）
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// 计算两点之间的距离（米）- Haversine公式
export function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;

  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 判断点是否在圆形围栏内
export function isPointInCircle(
  point: [number, number],
  center: [number, number],
  radius: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radius;
}

// 检查设备是否违反地理围栏
export function checkGeofenceViolation(
  device: { id: number; name: string; longitude: number; latitude: number },
  geofence: Geofence
): GeofenceViolation | null {
  const point: [number, number] = [device.longitude, device.latitude];

  let isInside = false;

  if (geofence.type === 'circle' && geofence.radius && geofence.coordinates.length > 0) {
    isInside = isPointInCircle(point, geofence.coordinates[0], geofence.radius);
  } else if (geofence.type === 'polygon' && geofence.coordinates.length >= 3) {
    isInside = isPointInPolygon(point, geofence.coordinates);
  }

  if (!isInside) {
    return {
      deviceId: device.id,
      deviceName: device.name,
      geofenceId: geofence.id,
      geofenceName: geofence.name,
      violationType: 'outside',
      coordinates: point,
      timestamp: Date.now(),
      message: `设备 ${device.name} 超出地理围栏 "${geofence.name}"`
    };
  }

  return null;
}

// 批量检查多个设备的地理围栏违规
export function checkGeofenceViolations(
  devices: Array<{ id: number; name: string; longitude: number; latitude: number }>,
  geofences: Geofence[]
): GeofenceViolation[] {
  const violations: GeofenceViolation[] = [];

  devices.forEach(device => {
    geofences.forEach(geofence => {
      const violation = checkGeofenceViolation(device, geofence);
      if (violation) {
        violations.push(violation);
      }
    });
  });

  return violations;
}

// 生成随机ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 默认地理围栏样式
export const defaultGeofenceStyle = {
  color: '#1890ff20',
  strokeColor: '#1890ff',
  strokeWeight: 2
};
