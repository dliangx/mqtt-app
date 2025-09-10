import type { Device } from 'src/types';
import type { Geofence, GeofenceViolation } from 'src/utils/geofence';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { checkGeofenceViolations, defaultGeofenceStyle, generateId } from 'src/utils/geofence';

import { apiService } from 'src/services/api';

import GeofenceToolbar from './GeofenceToolbar';

interface AMapComponentProps {
  devices: Device[];
  onMarkerClick?: (device: Device) => void;
  onGeofenceViolation?: (violation: GeofenceViolation) => void;
  height?: string;
}

// 严格的坐标验证函数
const isValidCoordinate = (value: unknown): boolean => {
  if (value == null) return false;
  const num = parseFloat(value as string);
  return !isNaN(num) && isFinite(num) && typeof num === 'number';
};

const isValidLongitude = (lng: unknown): boolean =>
  isValidCoordinate(lng) && parseFloat(lng as string) >= -180 && parseFloat(lng as string) <= 180;

const isValidLatitude = (lat: unknown): boolean =>
  isValidCoordinate(lat) && parseFloat(lat as string) >= -90 && parseFloat(lat as string) <= 90;

// 全局错误处理函数
const handleMapError = (error: unknown, context = ''): boolean => {
  console.error('AMap Error:', context, error);
  return false;
};

// 扩展 Window 接口以包含 AMap 类型
declare global {
  interface Window {
    AMap: any;
  }
}

const AMapComponent = React.forwardRef<any, AMapComponentProps>(
  ({ devices, onMarkerClick, onGeofenceViolation, height = '400px' }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const geofencePolygonsRef = useRef<any[]>([]);
    const mouseToolRef = useRef<any>(null);
    const prevDevicesJsonRef = useRef<string>('');
    const drivingRef = useRef<any>(null);
    const routePolylineRef = useRef<any>(null);
    const [navigationInfo, setNavigationInfo] = useState<{
      visible: boolean;
      device: Device | null;
      routeInfo: any;
    }>({
      visible: false,
      device: null,
      routeInfo: null,
    });
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState('');
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // 暴露导航方法给父组件
    React.useImperativeHandle(ref, () => ({
      navigateToDevice: (device: Device) => {
        showRouteToDevice(device);
      },
      clearNavigation: () => {
        clearRoute();
      },
    }));

    useEffect(() => {
      const scriptId = 'amap-script';
      if (document.getElementById(scriptId)) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${
        import.meta.env.VITE_AMAP_API_KEY
      }&plugin=AMap.MarkerClusterer,AMap.MouseTool,AMap.Polygon,AMap.Circle,AMap.Driving`;
      script.async = true;
      script.onload = () => {
        initMap();
      };
      script.onerror = () => {
        setMapError('地图脚本加载失败，请检查网络连接');
        console.error('Failed to load AMap script');
      };
      document.head.appendChild(script);

      return () => {
        if (document.getElementById(scriptId)) {
          document.head.removeChild(script);
        }
      };
    }, []);

    // 当设备数据变化时更新地图标记和检查围栏违规
    useEffect(() => {
      if (mapLoaded && window.AMap && mapInstanceRef.current) {
        const currentDevicesJson = JSON.stringify(devices);
        if (currentDevicesJson !== prevDevicesJsonRef.current) {
          prevDevicesJsonRef.current = currentDevicesJson;
          updateMarkers(mapInstanceRef.current);
        }
      }
    }, [devices, mapLoaded, geofences]);

    // 组件卸载时清理
    useEffect(
      () => () => {
        cleanupMap();
      },
      []
    );

    const cleanupMap = () => {
      if (markersRef.current.length > 0) {
        markersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
      }

      if (geofencePolygonsRef.current.length > 0) {
        geofencePolygonsRef.current.forEach((polygon) => {
          if (polygon && polygon.setMap) {
            polygon.setMap(null);
          }
        });
        geofencePolygonsRef.current = [];
      }

      if (mouseToolRef.current) {
        try {
          mouseToolRef.current.close(true);
        } catch (error) {
          console.error('Error closing mouse tool:', error);
        }
      }

      // 清除路线
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      // 关闭导航信息面板
      setNavigationInfo({
        visible: false,
        device: null,
        routeInfo: null,
      });
    };

    const initMap = () => {
      try {
        if (!mapRef.current || !window.AMap) {
          console.error('Map container or AMap library not available');
          return;
        }

        const map = new window.AMap.Map(mapRef.current, {
          zoom: 10,
          center: [116.397428, 39.90923],
          viewMode: '2D',
        });

        // 初始化鼠标工具
        const mouseTool = new window.AMap.MouseTool(map);
        mouseToolRef.current = mouseTool;

        mapInstanceRef.current = map;
        setMapLoaded(true);
        updateMarkers(map);

        // 初始化驾车导航服务
        drivingRef.current = new window.AMap.Driving({
          map,
          policy: window.AMap.DrivingPolicy.LEAST_TIME, // 最短时间
          hideMarkers: true, // 隐藏标记
          autoFitView: true, // 自动调整视图
          showTraffic: false, // 不显示实时交通
        });

        // 添加地图点击事件监听
        map.on('click', handleMapClick);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('地图初始化失败');
      }
    };

    const handleMapClick = (e: any) => {
      // 只在绘制模式下处理点击事件
      if (isDrawing && selectedGeofence) {
        const point: [number, number] = [e.lnglat.getLng(), e.lnglat.getLat()];
        const updatedGeofence = {
          ...selectedGeofence,
          coordinates: [...selectedGeofence.coordinates, point],
        };
        setSelectedGeofence(updatedGeofence);
        handleGeofenceUpdate(updatedGeofence.id, updatedGeofence);
      }
    };

    const startDrawing = () => {
      if (!mapInstanceRef.current || !selectedGeofence || !isDrawing) {
        // 如果条件不满足，确保绘制工具关闭
        if (mouseToolRef.current) {
          mouseToolRef.current.close(true);
        }
        return;
      }

      const mouseTool = mouseToolRef.current;
      if (selectedGeofence.type === 'polygon') {
        mouseTool.polygon({
          strokeColor: selectedGeofence.strokeColor || defaultGeofenceStyle.strokeColor,
          strokeOpacity: 1,
          strokeWeight: selectedGeofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
          fillColor: selectedGeofence.color || defaultGeofenceStyle.color,
          fillOpacity: 0.4,
        });
      } else if (selectedGeofence.type === 'circle' && selectedGeofence.radius) {
        mouseTool.circle({
          center: selectedGeofence.coordinates[0] || [116.397428, 39.90923],
          radius: selectedGeofence.radius,
          strokeColor: selectedGeofence.strokeColor || defaultGeofenceStyle.strokeColor,
          strokeOpacity: 1,
          strokeWeight: selectedGeofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
          fillColor: selectedGeofence.color || defaultGeofenceStyle.color,
          fillOpacity: 0.4,
        });
      }

      mouseTool.on('draw', (event: any) => {
        // 双重检查绘制模式状态，确保只在激活状态下处理
        if (!isDrawing) {
          mouseTool.close(true);
          return;
        }

        const obj = event.obj;
        let coordinates: [number, number][] = [];

        if (selectedGeofence.type === 'polygon') {
          coordinates = obj.getPath().map((point: any) => [point.lng, point.lat]);
        } else if (selectedGeofence.type === 'circle') {
          const center = obj.getCenter();
          coordinates = [[center.lng, center.lat]];
        }

        const updatedGeofence = {
          ...selectedGeofence,
          coordinates,
        };

        setSelectedGeofence(updatedGeofence);
        handleGeofenceUpdate(updatedGeofence.id, updatedGeofence);

        // 绘制完成后自动退出绘制模式并关闭工具
        setIsDrawing(false);
        mouseTool.close(true);
      });

      // 添加绘制取消监听
      mouseTool.on('drawEnd', () => {
        if (!isDrawing && mouseToolRef.current) {
          mouseToolRef.current.close(true);
        }
      });
    };

    const updateMarkers = (map: any) => {
      try {
        // 清除现有标记
        markersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];

        if (!map || !devices.length) return;

        const validDevices = devices.filter(
          (device) => isValidLongitude(device.longitude) && isValidLatitude(device.latitude)
        );

        if (validDevices.length === 0) return;

        const markers: any[] = [];
        validDevices.forEach((device) => {
          const lng = parseFloat(device.longitude as unknown as string);
          const lat = parseFloat(device.latitude as unknown as string);

          if (!isValidLongitude(lng) || !isValidLatitude(lat)) return;

          const marker = new window.AMap.Marker({
            position: [lng, lat],
            title: device.name,
            content: createMarkerContent(device),
            map,
            offset: new window.AMap.Pixel(-13, -30),
          });

          marker.on('click', (e: any) => {
            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
            console.log('设备标记点击事件触发');
            if (onMarkerClick) {
              onMarkerClick(device);
            }
            return false;
          });

          markers.push(marker);
          markersRef.current.push(marker);
        });

        if (markers.length > 0) {
          map.setFitView(markers);
        }
      } catch (error) {
        handleMapError(error, 'updateMarkers');
      }
    };

    const createNavigationButton = (device: Device) => {
      const position = [device.longitude, device.latitude];
      const button = new window.AMap.Marker({
        position,
        offset: new window.AMap.Pixel(30, -30),
        content: `
        <div style="
          background: white;
          border-radius: 4px;
          padding: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <div style="color: #1976d2; font-size: 16px;">🚗</div>
        </div>
      `,
      });

      button.on('click', (e: any) => {
        e && e.stopPropagation && e.stopPropagation();
        e && e.preventDefault && e.preventDefault();
        console.log('导航按钮点击事件触发');
        // 在当前页面显示路线规划
        showRouteToDevice(device);
        return false;
      });

      return button;
    };

    const showRouteToDevice = (device: Device) => {
      console.log('开始路线规划到设备:', device.name);
      if (!drivingRef.current || !mapInstanceRef.current) return;

      // 清除之前的路线
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      // 获取当前位置（这里使用地图中心点作为起点，实际应用中可能需要获取用户真实位置）
      const mapCenter = mapInstanceRef.current.getCenter();
      const startPoint = [mapCenter.lng, mapCenter.lat];
      const endPoint = [device.longitude, device.latitude];

      // 搜索路线
      drivingRef.current.search(startPoint, endPoint, (status: string, result: any) => {
        console.log('路线规划结果状态:', status);
        if (status === 'complete') {
          if (result.routes && result.routes.length) {
            const route = result.routes[0];
            console.log('路线规划成功，找到', result.routes.length, '条路线');

            // 绘制路线
            const path = route.paths[0];
            routePolylineRef.current = new window.AMap.Polyline({
              path: path.steps.reduce((acc: any[], step: any) => [...acc, ...step.path], []),
              strokeColor: '#1976d2',
              strokeOpacity: 0.8,
              strokeWeight: 6,
              map: mapInstanceRef.current,
            });

            // 显示导航信息
            setNavigationInfo({
              visible: true,
              device,
              routeInfo: {
                distance: path.distance,
                time: path.duration,
                tolls: path.tolls,
                toll_distance: path.toll_distance,
              },
            });

            // 调整地图视图以显示完整路线
            mapInstanceRef.current.setFitView([routePolylineRef.current]);

            // 禁用Driving服务默认的标记点击行为
            if (result && result.markers) {
              result.markers.forEach((marker: any) => {
                if (marker && marker.on) {
                  marker.on('click', (e: any) => {
                    e && e.stopPropagation && e.stopPropagation();
                    e && e.preventDefault && e.preventDefault();
                    return false;
                  });
                }
              });
            }
          }
        } else {
          console.error('路线规划失败:', status, result);
        }
      });
    };

    const clearRoute = () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      setNavigationInfo({
        visible: false,
        device: null,
        routeInfo: null,
      });
    };

    const createMarkerContent = (device: Device): string => {
      const color = getStatusColor(device.status);

      return `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        font-weight: bold;
      ">
        ${device.name.charAt(0).toUpperCase()}
      </div>
    `;
    };

    const getStatusColor = (status: string): string => {
      switch (status) {
        case 'online':
          return '#4caf50';
        case 'offline':
          return '#f44336';
        case 'warning':
          return '#ff9800';
        default:
          return '#9e9e9e';
      }
    };

    const drawGeofences = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      // 清除现有围栏
      geofencePolygonsRef.current.forEach((polygon) => {
        if (polygon && polygon.setMap) {
          polygon.setMap(null);
        }
      });
      geofencePolygonsRef.current = [];

      geofences.forEach((geofence) => {
        if (geofence.coordinates.length === 0) return;

        let polygon: any;

        if (geofence.type === 'polygon' && geofence.coordinates.length >= 3) {
          polygon = new window.AMap.Polygon({
            path: geofence.coordinates,
            strokeColor: geofence.strokeColor || defaultGeofenceStyle.strokeColor,
            strokeOpacity: 1,
            strokeWeight: geofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
            fillColor: geofence.color || defaultGeofenceStyle.color,
            fillOpacity: 0.4,
            zIndex: 50,
          });
        } else if (
          geofence.type === 'circle' &&
          geofence.radius &&
          geofence.coordinates.length > 0
        ) {
          polygon = new window.AMap.Circle({
            center: geofence.coordinates[0],
            radius: geofence.radius,
            strokeColor: geofence.strokeColor || defaultGeofenceStyle.strokeColor,
            strokeOpacity: 1,
            strokeWeight: geofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
            fillColor: geofence.color || defaultGeofenceStyle.color,
            fillOpacity: 0.4,
            zIndex: 50,
          });
        }

        if (polygon) {
          polygon.setMap(map);
          geofencePolygonsRef.current.push(polygon);
        }
      });
    };

    const checkViolations = useCallback(async () => {
      if (!geofences.length || !devices.length) {
        return;
      }

      const validDevices = devices.filter(
        (device) => isValidLongitude(device.longitude) && isValidLatitude(device.latitude)
      );

      const newViolations = checkGeofenceViolations(validDevices, geofences);

      // 发送新的违规警报到服务器
      for (const violation of newViolations) {
        if (onGeofenceViolation) {
          onGeofenceViolation(violation);
        }

        try {
          await apiService.createAlert({
            device_id: violation.deviceId,
            type: 'geofence_violation',
            message: violation.message,
            level: 'warning',
          });
        } catch (error) {
          console.error('Failed to create alert:', error);
        }
      }
    }, [devices, geofences, onGeofenceViolation]);

    const handleGeofenceCreate = (geofenceData: Omit<Geofence, 'id'>) => {
      const newGeofence: Geofence = {
        ...geofenceData,
        id: generateId(),
        coordinates: [],
      };
      setGeofences((prev) => [...prev, newGeofence]);
      setSelectedGeofence(newGeofence);
      setIsDrawing(true);
    };

    const handleGeofenceUpdate = (id: string, updates: Partial<Geofence>) => {
      setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
      if (selectedGeofence?.id === id) {
        setSelectedGeofence((prev) => (prev ? { ...prev, ...updates } : null));
      }
      drawGeofences();
    };

    const handleGeofenceDelete = (id: string) => {
      setGeofences((prev) => prev.filter((g) => g.id !== id));
      if (selectedGeofence?.id === id) {
        setSelectedGeofence(null);
        setIsDrawing(false);
      }
      drawGeofences();
    };

    const handleGeofenceSelect = (geofence: Geofence | null) => {
      setSelectedGeofence(geofence);
      setIsDrawing(false);
    };

    const handleDrawingToggle = (drawing: boolean) => {
      if (drawing && !selectedGeofence) {
        // 如果没有选择围栏，先创建一个默认围栏
        const newGeofence: Geofence = {
          id: generateId(),
          name: `围栏${geofences.length + 1}`,
          type: 'polygon',
          coordinates: [],
          ...defaultGeofenceStyle,
        };
        setGeofences((prev) => [...prev, newGeofence]);
        setSelectedGeofence(newGeofence);
      }
      setIsDrawing(drawing);

      if (drawing) {
        startDrawing();
      } else if (mouseToolRef.current) {
        mouseToolRef.current.close(true);
      }
    };

    useEffect(() => {
      if (mapLoaded && mapInstanceRef.current) {
        drawGeofences();
      }
    }, [geofences, mapLoaded]);

    useEffect(() => {
      if (isDrawing && mapLoaded) {
        startDrawing();
      } else if (mouseToolRef.current) {
        // 当绘制模式关闭时，确保停止所有绘制工具
        mouseToolRef.current.close(true);
      }
    }, [isDrawing, mapLoaded]);

    // 监听绘制模式变化，确保绘制工具正确关闭
    useEffect(() => {
      if (!isDrawing && mouseToolRef.current) {
        mouseToolRef.current.close(true);
      }
    }, [isDrawing]);

    // 监听选择围栏变化，如果取消选择则退出绘制模式
    useEffect(() => {
      if (!selectedGeofence && isDrawing) {
        setIsDrawing(false);
        if (mouseToolRef.current) {
          mouseToolRef.current.close(true);
        }
      }
    }, [selectedGeofence, isDrawing]);

    return (
      <div style={{ position: 'relative', height }}>
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        />

        {/* 地理围栏工具栏 */}
        <GeofenceToolbar
          geofences={geofences}
          onGeofenceCreate={handleGeofenceCreate}
          onGeofenceUpdate={handleGeofenceUpdate}
          onGeofenceDelete={handleGeofenceDelete}
          onGeofenceSelect={handleGeofenceSelect}
          selectedGeofence={selectedGeofence}
          isDrawing={isDrawing}
          onDrawingToggle={handleDrawingToggle}
        />

        {!mapLoaded && !mapError && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            地图加载中...
          </div>
        )}

        {mapError && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffebee',
              borderRadius: '8px',
              color: '#d32f2f',
              fontSize: '14px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            {mapError}
            <br />
            <small style={{ fontSize: '12px', marginTop: '8px' }}>
              请检查API密钥配置和网络连接
            </small>
          </div>
        )}

        {/* 导航信息面板 */}
        {navigationInfo.visible && navigationInfo.device && navigationInfo.routeInfo && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              minWidth: '250px',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h4 style={{ margin: 0, color: '#1976d2' }}>导航到 {navigationInfo.device.name}</h4>
              <button
                onClick={clearRoute}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '12px',
              }}
            >
              <div>距离: {(navigationInfo.routeInfo.distance / 1000).toFixed(1)} km</div>
              <div>时间: {Math.ceil(navigationInfo.routeInfo.time / 60)} 分钟</div>
              {navigationInfo.routeInfo.tolls > 0 && (
                <div>收费: {navigationInfo.routeInfo.tolls} 元</div>
              )}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#666',
                textAlign: 'center',
                marginTop: '8px',
                padding: '4px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              路线已在地图上显示
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default AMapComponent;
