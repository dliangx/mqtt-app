import { describe, it, expect } from 'vitest';
import {
  isPointInPolygon,
  calculateDistance,
  isPointInCircle,
  checkGeofenceViolation,
  checkGeofenceViolations,
  generateId,
  type Geofence,
} from './geofence';

describe('geofence utilities', () => {
  describe('isPointInPolygon', () => {
    it('should return true for point inside polygon', () => {
      const polygon: [number, number][] = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ];
      const point: [number, number] = [5, 5];
      expect(isPointInPolygon(point, polygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const polygon: [number, number][] = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ];
      const point: [number, number] = [15, 15];
      expect(isPointInPolygon(point, polygon)).toBe(false);
    });

    it('should handle complex polygons', () => {
      const polygon: [number, number][] = [
        [0, 0],
        [5, 10],
        [10, 0],
        [15, 10],
        [20, 0],
      ];
      const pointInside: [number, number] = [10, 5];
      const pointOutside: [number, number] = [10, 15];
      expect(isPointInPolygon(pointInside, polygon)).toBe(true);
      expect(isPointInPolygon(pointOutside, polygon)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1: [number, number] = [116.397428, 39.90923]; // 北京
      const point2: [number, number] = [121.473701, 31.230416]; // 上海
      const distance = calculateDistance(point1, point2);
      expect(distance).toBeGreaterThan(1000000); // 大约1068公里
      expect(distance).toBeLessThan(1100000);
    });

    it('should return 0 for same points', () => {
      const point: [number, number] = [116.397428, 39.90923];
      expect(calculateDistance(point, point)).toBe(0);
    });
  });

  describe('isPointInCircle', () => {
    it('should return true for point inside circle', () => {
      const center: [number, number] = [0, 0];
      const point: [number, number] = [0.001, 0.001];
      expect(isPointInCircle(point, center, 1000)).toBe(true);
    });

    it('should return false for point outside circle', () => {
      const center: [number, number] = [0, 0];
      const point: [number, number] = [1, 1];
      expect(isPointInCircle(point, center, 1000)).toBe(false);
    });
  });

  describe('checkGeofenceViolation', () => {
    const polygonGeofence: Geofence = {
      id: '1',
      name: 'Test Polygon',
      type: 'polygon',
      coordinates: [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ],
    };

    const circleGeofence: Geofence = {
      id: '2',
      name: 'Test Circle',
      type: 'circle',
      coordinates: [[0, 0]],
      radius: 1000,
    };

    it('should detect violation for point outside polygon', () => {
      const device = { id: 1, name: 'Device 1', longitude: 15, latitude: 15 };
      const violation = checkGeofenceViolation(device, polygonGeofence);
      expect(violation).not.toBeNull();
      expect(violation?.deviceId).toBe(1);
      expect(violation?.violationType).toBe('outside');
    });

    it('should return null for point inside polygon', () => {
      const device = { id: 1, name: 'Device 1', longitude: 5, latitude: 5 };
      const violation = checkGeofenceViolation(device, polygonGeofence);
      expect(violation).toBeNull();
    });

    it('should detect violation for point outside circle', () => {
      const device = { id: 1, name: 'Device 1', longitude: 1, latitude: 1 };
      const violation = checkGeofenceViolation(device, circleGeofence);
      expect(violation).not.toBeNull();
      expect(violation?.violationType).toBe('outside');
    });

    it('should return null for point inside circle', () => {
      const device = { id: 1, name: 'Device 1', longitude: 0.001, latitude: 0.001 };
      const violation = checkGeofenceViolation(device, circleGeofence);
      expect(violation).toBeNull();
    });
  });

  describe('checkGeofenceViolations', () => {
    it('should check multiple devices against multiple geofences', () => {
      const devices = [
        { id: 1, name: 'Device 1', longitude: 15, latitude: 15 }, // 违规
        { id: 2, name: 'Device 2', longitude: 5, latitude: 5 },   // 正常
      ];

      const geofences: Geofence[] = [
        {
          id: '1',
          name: 'Test Geofence',
          type: 'polygon',
          coordinates: [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
          ],
        },
      ];

      const violations = checkGeofenceViolations(devices, geofences);
      expect(violations).toHaveLength(1);
      expect(violations[0].deviceId).toBe(1);
    });
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(9);
    });
  });
});
