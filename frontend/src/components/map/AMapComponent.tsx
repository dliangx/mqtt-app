/* eslint-disable react-hooks/exhaustive-deps */
import './AMapComponent.css';

import type { Device } from 'src/types';
import type { Geofence, GeofenceViolation } from 'src/utils/geofence';

import React, { useRef, useState, useEffect, useCallback } from 'react';

import { useFullscreen } from 'src/hooks/use-fullscreen';

import { generateId, defaultGeofenceStyle } from 'src/utils/geofence';

declare global {
  interface Window {
    AMap: any;
    mapboxgl: any;
  }
}

// 地图源类型定义
type MapSource = 'amap' | 'mapbox';

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

// 扩展 Window 接口以包含 AMap 和 Mapbox 类型
declare global {
  interface Window {
    AMap: any;
    mapboxgl: any;
  }
}

const AMapComponent = React.forwardRef<any, AMapComponentProps>(
  ({ devices, onMarkerClick, onGeofenceViolation, height = '400px' }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mapboxInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const mapboxMarkersRef = useRef<any[]>([]);
    const geofencePolygonsRef = useRef<any[]>([]);
    const mouseToolRef = useRef<any>(null);
    const prevDevicesJsonRef = useRef<string>('');
    const routePolylineRef = useRef<any>(null);
    const [, setNavigationInfo] = useState<{
      visible: boolean;
      device: Device | null;
      routeInfo: any;
    }>({
      visible: false,
      device: null,
      routeInfo: null,
    });
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState('');
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState('');
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentMapSource, setCurrentMapSource] = useState<MapSource>('amap');
    const [mapViewState, setMapViewState] = useState<{
      center: [number, number];
      zoom: number;
    }>({
      center: [116.397428, 39.90923],
      zoom: 10,
    });
    const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    const { fullscreen, elementRef, toggleFullscreen } = useFullscreen();

    // 暴露导航方法给父组件
    React.useImperativeHandle(ref, () => ({
      navigateToDevice: (device: Device) => {
        if (currentMapSource === 'amap') {
          showRouteToDevice(device);
        } else {
          showMapboxRouteToDevice(device);
        }
      },
      clearNavigation: () => {
        clearRoute();
      },
      getUserLocation: () => getUserCurrentLocation(),
    }));

    // 获取用户当前位置
    const getUserCurrentLocation = useCallback(
      (): Promise<{ lat: number; lng: number }> =>
        new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            const error = '浏览器不支持地理位置定位';
            setLocationError(error);
            reject(new Error(error));
            return;
          }

          setLocationError('');

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              setUserLocation(location);
              resolve(location);
            },
            (error) => {
              let errorMessage = '获取位置失败';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = '用户拒绝了位置访问权限';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = '无法获取位置信息';
                  break;
                case error.TIMEOUT:
                  errorMessage = '获取位置超时';
                  break;
                default:
                  errorMessage = '未知错误';
              }
              setLocationError(errorMessage);
              reject(new Error(errorMessage));
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000,
            }
          );
        }),
      []
    );

    // 初始化时尝试获取用户位置
    useEffect(() => {
      if (mapLoaded) {
        getUserCurrentLocation().catch(() => {
          // 静默失败，用户可以选择手动触发
        });
      }
    }, [mapLoaded, getUserCurrentLocation]);

    useEffect(() => {
      const scriptId = 'amap-script';
      if (document.getElementById(scriptId)) {
        if (currentMapSource === 'amap') {
          initMap();
        }
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${
        import.meta.env.VITE_AMAP_API_KEY
      }&plugin=AMap.MarkerClusterer,AMap.MouseTool,AMap.Polygon,AMap.Circle`;
      script.async = true;
      script.onload = () => {
        if (currentMapSource === 'amap') {
          initMap();
        }
      };
      script.onerror = () => {
        setMapError('地图脚本加载失败，请检查网络连接');
        console.error('Failed to load AMap script');
      };
      document.head.appendChild(script);

      if (document.getElementById(scriptId)) {
        document.head.removeChild(script);
      }
    }, [currentMapSource]);

    // 当设备数据变化时更新地图标记和检查围栏违规
    useEffect(() => {
      if (mapLoaded) {
        const currentDevicesJson = JSON.stringify(devices);
        if (currentDevicesJson !== prevDevicesJsonRef.current) {
          prevDevicesJsonRef.current = currentDevicesJson;
          if (currentMapSource === 'amap' && window.AMap && mapInstanceRef.current) {
            updateMarkers(mapInstanceRef.current);
          } else if (currentMapSource === 'mapbox' && window.mapboxgl) {
            const mapboxMap = document.querySelector('.mapboxgl-map');
            if (mapboxMap) {
              updateMapboxMarkers(mapboxMap);
            }
          }
        }
      }
    }, [devices, mapLoaded, geofences, currentMapSource]);

    // 当切换地图源时清理对应的地图实例
    useEffect(() => {
      if (currentMapSource === 'amap' && mapboxInstanceRef.current) {
        // 切换到高德地图时清理Mapbox
        cleanupMapbox();
      } else if (currentMapSource === 'mapbox' && mapInstanceRef.current) {
        // 切换到Mapbox时清理高德地图
        cleanupAmap();
      }
    }, [currentMapSource]);

    // 组件卸载时清理
    useEffect(
      () => () => {
        cleanupMap();
      },
      []
    );

    const cleanupMapbox = () => {
      if (mapboxMarkersRef.current.length > 0) {
        mapboxMarkersRef.current.forEach((marker) => {
          if (marker && marker.remove) {
            marker.remove();
          }
        });
        mapboxMarkersRef.current = [];
      }

      if (mapboxInstanceRef.current) {
        try {
          mapboxInstanceRef.current.remove();
        } catch (error) {
          console.error('Error removing Mapbox instance:', error);
        }
        mapboxInstanceRef.current = null;
      }
    };

    const cleanupAmap = () => {
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

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (error) {
          console.error('Error destroying AMap instance:', error);
        }
        mapInstanceRef.current = null;
      }
    };

    const cleanupMap = () => {
      cleanupAmap();
      cleanupMapbox();

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

        // 如果地图实例已存在，先销毁
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.destroy();
          } catch (error) {
            console.error('Error destroying existing map:', error);
          }
          mapInstanceRef.current = null;
        }

        const map = new window.AMap.Map(mapRef.current, {
          zoom: mapViewState.zoom,
          center: mapViewState.center,
          viewMode: '2D',
        });

        // 监听地图视角变化
        map.on('moveend', () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          setMapViewState({
            center: [center.lng, center.lat],
            zoom,
          });
        });

        // 初始化鼠标工具
        const mouseTool = new window.AMap.MouseTool(map);
        mouseToolRef.current = mouseTool;

        mapInstanceRef.current = map;
        setMapLoaded(true);
        updateMarkers(map);

        // 初始化驾车导航服务（使用Web服务API）
        // drivingRef不再需要，我们直接使用fetch调用Web服务API

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
            e?.stopPropagation?.();
            e?.preventDefault?.();
            console.log('设备标记点击事件触发');
            setSelectedDevice(device);
            setDeviceDialogOpen(true);
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

    const showRouteToDevice = async (device: Device) => {
      console.log('开始路线规划到设备:', device.name);
      if (!mapInstanceRef.current) return;

      // 清除之前的路线
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      let startPoint: string;

      // 优先使用用户真实位置，如果没有则使用地图中心点
      if (userLocation) {
        startPoint = `${userLocation.lng},${userLocation.lat}`;
        console.log('使用用户真实位置作为起点:', startPoint);
      } else {
        // 尝试获取用户位置
        try {
          const location = await getUserCurrentLocation();
          startPoint = `${location.lng},${location.lat}`;
          console.log('成功获取用户位置作为起点:', startPoint);
        } catch (error) {
          // 获取位置失败，使用地图中心点
          const mapCenter = mapInstanceRef.current.getCenter();
          startPoint = `${mapCenter.lng},${mapCenter.lat}`;
          console.log('使用地图中心点作为起点:', startPoint);
          console.log(error);
        }
      }

      const endPoint = `${device.longitude},${device.latitude}`;

      try {
        // 使用高德地图Web服务API进行路线规划
        const apiKey = import.meta.env.VITE_AMAP_API_KEY;
        const url = `https://restapi.amap.com/v3/direction/driving?origin=${startPoint}&destination=${endPoint}&key=${apiKey}&strategy=0`;

        const response = await fetch(url);
        const result = await response.json();

        console.log('路线规划API响应:', result);

        if (
          result.status === '1' &&
          result.route &&
          result.route.paths &&
          result.route.paths.length > 0
        ) {
          const path = result.route.paths[0];
          console.log('路线规划成功，距离:', path.distance, '米，时间:', path.duration, '秒');
          // 解析路线坐标点
          const polylinePath = path.steps.flatMap((step: any) => {
            const points = step.polyline.split(';').map((point: string) => {
              const [lng, lat] = point.split(',');
              return [parseFloat(lng), parseFloat(lat)];
            });
            return points;
          });

          // 绘制路线
          routePolylineRef.current = new window.AMap.Polyline({
            path: polylinePath,
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
              distance: parseInt(path.distance),
              time: parseInt(path.duration),
              tolls: parseInt(path.tolls) || 0,
              toll_distance: parseInt(path.toll_distance) || 0,
            },
          });

          // 调整地图视图以显示完整路线
          mapInstanceRef.current.setFitView([routePolylineRef.current]);
        } else {
          console.error('路线规划失败:', result.info, result);
          alert(`路线规划失败: ${result.info || '未知错误'}`);
        }
      } catch (error) {
        console.error('路线规划请求失败:', error);
        alert('路线规划请求失败，请检查网络连接');
      }
    };

    const showMapboxRouteToDevice = async (device: Device) => {
      console.log('开始 Mapbox 路线规划到设备:', device.name);
      if (!mapboxInstanceRef.current) return;

      // 清除之前的路线
      clearRoute();

      let startPoint: [number, number];

      // 优先使用用户真实位置，如果没有则使用地图中心点
      if (userLocation) {
        startPoint = [userLocation.lng, userLocation.lat];
        console.log('使用用户真实位置作为起点:', startPoint);
      } else {
        // 尝试获取用户位置
        try {
          const location = await getUserCurrentLocation();
          startPoint = [location.lng, location.lat];
          console.log('成功获取用户位置作为起点:', startPoint);
        } catch {
          // 获取位置失败，使用地图中心点
          const mapCenter = mapboxInstanceRef.current.getCenter();
          startPoint = [mapCenter.lng, mapCenter.lat];
          console.log('使用地图中心点作为起点:', startPoint);
        }
      }

      const endPoint: [number, number] = [Number(device.longitude), Number(device.latitude)];

      try {
        // 使用 Mapbox Directions API 进行路线规划
        const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startPoint[0]},${startPoint[1]};${endPoint[0]},${endPoint[1]}?geometries=geojson&access_token=${accessToken}`;

        const response = await fetch(url);
        const result = await response.json();

        console.log('Mapbox 路线规划API响应:', result);

        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          console.log(
            'Mapbox 路线规划成功，距离:',
            route.distance,
            '米，时间:',
            route.duration,
            '秒'
          );

          const map = mapboxInstanceRef.current;

          // 添加路线源
          if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }

          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry,
            },
          });

          // 添加路线图层
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#1976d2',
              'line-width': 6,
              'line-opacity': 0.8,
            },
          });

          // 显示导航信息
          setNavigationInfo({
            visible: true,
            device,
            routeInfo: {
              distance: parseInt(route.distance),
              time: parseInt(route.duration),
              tolls: 0, // Mapbox API 不提供收费信息
              toll_distance: 0,
            },
          });

          // 调整地图视图以显示完整路线
          const bounds = new window.mapboxgl.LngLatBounds();
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: 50 });
        } else {
          console.error('Mapbox 路线规划失败:', result);
          alert(`路线规划失败: ${result.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('Mapbox 路线规划请求失败:', error);
        alert('路线规划请求失败，请检查网络连接');
      }
    };

    const clearRoute = () => {
      if (routePolylineRef.current) {
        if (currentMapSource === 'amap') {
          routePolylineRef.current.setMap(null);
        } else {
          // For Mapbox, remove the route source and layer
          const map = mapboxInstanceRef.current;
          if (map) {
            if (map.getSource('route')) {
              map.removeLayer('route');
              map.removeSource('route');
            }
          }
        }
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

    const getStatusText = (status: string): string => {
      switch (status) {
        case 'online':
          return '在线';
        case 'offline':
          return '离线';
        case 'warning':
          return '警告';
        default:
          return status;
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

    // 初始化 Mapbox
    useEffect(() => {
      if (currentMapSource === 'mapbox' && mapLoaded) {
        // 动态加载 Mapbox GL JS
        const loadMapbox = async () => {
          try {
            // 检查是否已加载 Mapbox
            if (mapboxInstanceRef.current) {
              // Mapbox 已存在，只需更新标记和确保正确显示
              const container = document.getElementById('mapbox-container');
              if (container) {
                container.style.display = 'block';
              }
              // 同步视角
              mapboxInstanceRef.current.setCenter(mapViewState.center);
              mapboxInstanceRef.current.setZoom(mapViewState.zoom);
              mapboxInstanceRef.current.resize();
              updateMapboxMarkers(mapboxInstanceRef.current);
              return;
            }

            // 检查是否已加载 Mapbox CSS
            if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.css';
              link.crossOrigin = '';
              document.head.appendChild(link);
            }

            // 检查是否已加载 Mapbox JS
            if (window.mapboxgl) {
              // Mapbox JS 已加载，直接初始化地图
              initMapboxMap();
            } else {
              // 加载 Mapbox JS
              const script = document.createElement('script');
              script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.js';
              script.crossOrigin = '';
              script.onload = () => {
                initMapboxMap();
              };
              document.head.appendChild(script);
            }
          } catch (error) {
            console.error('加载 Mapbox 失败:', error);
          }
        };

        const initMapboxMap = () => {
          const mapboxgl = window.mapboxgl;
          const container = document.getElementById('mapbox-container');

          if (!mapboxgl || !container) {
            console.error('Mapbox library or container not available');
            return;
          }

          mapboxgl.accessToken =
            import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
            'pk.eyJ1Ijoic2FtbGVhcm5lciIsImEiOiJja2IzNTFsZXMwaG44MzRsbWplbGNtNHo0In0.BmjC6OX6egwKdm0fAmN_Nw';

          // 确保容器完全可见并正确设置尺寸
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.width = '100%';
          container.style.height = '100%';

          const mapboxMap = new window.mapboxgl.Map({
            container: 'mapbox-container',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: mapViewState.center,
            zoom: mapViewState.zoom,
          });

          // 监听地图视角变化
          mapboxMap.on('moveend', () => {
            const center = mapboxMap.getCenter();
            const zoom = mapboxMap.getZoom();
            setMapViewState({
              center: [center.lng, center.lat],
              zoom,
            });
          });

          // 保存Mapbox实例
          mapboxInstanceRef.current = mapboxMap;

          // 添加导航控件
          mapboxMap.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

          // 添加比例尺
          mapboxMap.addControl(
            new window.mapboxgl.ScaleControl({
              maxWidth: 100,
              unit: 'metric',
            }),
            'bottom-left'
          );

          // 地图加载完成后添加设备标记
          mapboxMap.on('load', () => {
            console.log('Mapbox 初始化完成');
            // 添加设备标记
            updateMapboxMarkers(mapboxMap);
          });

          // 强制重绘地图以解决显示问题
          setTimeout(() => {
            if (mapboxMap) {
              mapboxMap.resize();
              // 再次重绘确保完全显示
              setTimeout(() => {
                if (mapboxMap) {
                  mapboxMap.resize();
                }
              }, 50);
            }
          }, 100);
        };

        loadMapbox();
      }
    }, [currentMapSource, mapLoaded]);

    // 更新 Mapbox 设备标记
    const updateMapboxMarkers = (map: any) => {
      try {
        // 清除现有标记
        if (mapboxMarkersRef.current.length > 0) {
          mapboxMarkersRef.current.forEach((marker) => {
            if (marker && marker.remove) {
              marker.remove();
            }
          });
          mapboxMarkersRef.current = [];
        }

        // 添加新标记
        devices.forEach((device) => {
          if (device.longitude && device.latitude) {
            // 创建标记元素
            const el = document.createElement('div');
            el.className = 'mapbox-marker';
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = getStatusColor(device.status);
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            el.style.cursor = 'pointer';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '10px';
            el.style.fontWeight = 'bold';
            el.style.color = 'white';

            // 添加点击事件
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              setSelectedDevice(device);
              setDeviceDialogOpen(true);
              if (onMarkerClick) {
                onMarkerClick(device);
              }
            });

            // 创建标记
            const marker = new window.mapboxgl.Marker({
              element: el,
              anchor: 'center',
            })
              .setLngLat([device.longitude, device.latitude])
              .setPopup(
                new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="device-popup">
                    <h4>${device.name}</h4>
                    <p>状态: ${getStatusText(device.status)}</p>
                    <p>坐标: ${Number(device.longitude).toFixed(6)}, ${Number(device.latitude).toFixed(6)}</p>
                    ${device.address ? `<p>地址: ${device.address}</p>` : ''}
                  </div>
                `)
              )
              .addTo(map);

            mapboxMarkersRef.current.push(marker);
          }
        });
      } catch (error) {
        console.error('更新 Mapbox 标记失败:', error);
      }
    };

    // 获取状态颜色

    return (
      <div className="amap-component-container" style={{ height }} ref={elementRef}>
        {/* Mapbox 容器 */}
        <div
          id="mapbox-container"
          className={`mapbox-container ${currentMapSource === 'mapbox' ? '' : 'hidden'}`}
        />

        {/* 高德地图容器 */}
        <div
          ref={mapRef}
          className={`amap-container ${currentMapSource === 'amap' ? '' : 'hidden'}`}
        />

        {/* 全屏按钮 */}
        <button
          onClick={toggleFullscreen}
          className="fullscreen-button"
          title={fullscreen ? '退出全屏' : '进入全屏'}
        >
          ⛶
        </button>

        {/* 地图源切换按钮 */}
        <button
          onClick={() => {
            // 在切换前保存当前地图的视角
            if (currentMapSource === 'amap' && mapInstanceRef.current) {
              const center = mapInstanceRef.current.getCenter();
              const zoom = mapInstanceRef.current.getZoom();
              setMapViewState({
                center: [center.lng, center.lat],
                zoom,
              });
            } else if (currentMapSource === 'mapbox' && mapboxInstanceRef.current) {
              const center = mapboxInstanceRef.current.getCenter();
              const zoom = mapboxInstanceRef.current.getZoom();
              setMapViewState({
                center: [center.lng, center.lat],
                zoom,
              });
            }

            const newSource: MapSource = currentMapSource === 'amap' ? 'mapbox' : 'amap';
            setCurrentMapSource(newSource);

            // 切换到高德地图时确保地图已初始化
            if (newSource === 'amap' && window.AMap) {
              // 延迟初始化以确保DOM更新完成
              setTimeout(() => {
                initMap();
              }, 100);
            }
          }}
          className="map-source-button"
          title={`切换到${currentMapSource === 'amap' ? 'Mapbox' : '高德地图'}`}
        >
          {currentMapSource === 'amap' ? '🌍' : '🇨🇳'}
        </button>

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

        {!mapLoaded && !mapError && <div className="map-loading-indicator">地图加载中...</div>}

        {mapError && (
          <div className="map-error-display">
            {mapError}
            <br />
            <small>请检查API密钥配置和网络连接</small>
          </div>
        )}

        {/* 位置获取状态提示 */}
        {locationError && <div className="location-error-display">⚠️ {locationError}</div>}

        {/* 设备信息对话框 */}
        {deviceDialogOpen && selectedDevice && (
          <div className="device-dialog">
            <div className="device-dialog-header">
              <h3>设备信息 - {selectedDevice.name}</h3>
              <button
                onClick={() => setDeviceDialogOpen(false)}
                className="device-dialog-close-button"
              >
                ×
              </button>
            </div>

            <div className="device-dialog-content">
              <div className="device-dialog-content-header">
                <h4>{selectedDevice.name}</h4>
                <span
                  className={`device-status-badge ${
                    selectedDevice.status === 'online'
                      ? 'online'
                      : selectedDevice.status === 'offline'
                        ? 'offline'
                        : selectedDevice.status === 'warning'
                          ? 'warning'
                          : 'default'
                  }`}
                >
                  {selectedDevice.status === 'online'
                    ? '在线'
                    : selectedDevice.status === 'offline'
                      ? '离线'
                      : selectedDevice.status === 'warning'
                        ? '警告'
                        : selectedDevice.status}
                </span>
              </div>

              <div className="device-info-item">
                <div className="device-info-item-label">Topic</div>
                <div className="device-info-item-value">{selectedDevice.topic || '未设置'}</div>
              </div>

              {selectedDevice.longitude && selectedDevice.latitude && (
                <div className="device-info-item">
                  <div className="device-info-item-label">位置坐标</div>
                  <div className="device-info-item-value">
                    {Number(selectedDevice.longitude).toFixed(6)},{' '}
                    {Number(selectedDevice.latitude).toFixed(6)}
                  </div>
                </div>
              )}

              {selectedDevice.address && (
                <div className="device-info-item">
                  <div className="device-info-item-label">地址</div>
                  <div className="device-info-item-value">{selectedDevice.address}</div>
                </div>
              )}

              <div className="device-info-actions">
                <button
                  onClick={() => {
                    if (selectedDevice.longitude && selectedDevice.latitude) {
                      if (currentMapSource === 'amap') {
                        showRouteToDevice(selectedDevice);
                      } else {
                        showMapboxRouteToDevice(selectedDevice);
                      }
                      setDeviceDialogOpen(false);
                    }
                  }}
                  disabled={!selectedDevice.longitude || !selectedDevice.latitude}
                  className="navigate-button"
                >
                  导航到此位置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default AMapComponent;
