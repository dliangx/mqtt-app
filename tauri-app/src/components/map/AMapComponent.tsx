import React, { useEffect, useRef, useState, useCallback } from "react";

import type { Device } from "../../types";
import {
  Geofence,
  GeofenceViolation,
  checkGeofenceViolations,
  generateId,
  defaultGeofenceStyle,
} from "../../utils/geofence";
import GeofenceToolbar from "./GeofenceToolbar";
import { apiService } from "../../services/api";

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
  return !isNaN(num) && isFinite(num) && typeof num === "number";
};

const isValidLongitude = (lng: unknown): boolean =>
  isValidCoordinate(lng) &&
  parseFloat(lng as string) >= -180 &&
  parseFloat(lng as string) <= 180;

const isValidLatitude = (lat: unknown): boolean =>
  isValidCoordinate(lat) &&
  parseFloat(lat as string) >= -90 &&
  parseFloat(lat as string) <= 90;

// 全局错误处理函数
const handleMapError = (error: unknown, context = ""): boolean => {
  console.error("AMap Error:", context, error);
  return false;
};

// 扩展 Window 接口以包含 AMap 类型
declare global {
  interface Window {
    AMap: any;
  }
}

const AMapComponent: React.FC<AMapComponentProps> = ({
  devices,
  onMarkerClick,
  onGeofenceViolation,
  height = "400px",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const geofencePolygonsRef = useRef<any[]>([]);
  const mouseToolRef = useRef<any>(null);
  const prevDevicesJsonRef = useRef<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const scriptId = "amap-script";
    if (document.getElementById(scriptId)) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${
      import.meta.env.VITE_AMAP_API_KEY
    }&plugin=AMap.MarkerClusterer,AMap.MouseTool,AMap.Polygon,AMap.Circle`;
    script.async = true;
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      setMapError("地图脚本加载失败，请检查网络连接");
      console.error("Failed to load AMap script");
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
  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, []);

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
        console.error("Error closing mouse tool:", error);
      }
    }
  };

  const initMap = () => {
    try {
      if (!mapRef.current || !window.AMap) {
        console.error("Map container or AMap library not available");
        return;
      }

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 10,
        center: [116.397428, 39.90923],
        viewMode: "2D",
      });

      // 初始化鼠标工具
      const mouseTool = new window.AMap.MouseTool(map);
      mouseToolRef.current = mouseTool;

      mapInstanceRef.current = map;
      setMapLoaded(true);
      updateMarkers(map);

      // 添加地图点击事件监听
      map.on("click", handleMapClick);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("地图初始化失败");
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
    if (selectedGeofence.type === "polygon") {
      mouseTool.polygon({
        strokeColor:
          selectedGeofence.strokeColor || defaultGeofenceStyle.strokeColor,
        strokeOpacity: 1,
        strokeWeight:
          selectedGeofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
        fillColor: selectedGeofence.color || defaultGeofenceStyle.color,
        fillOpacity: 0.4,
      });
    } else if (selectedGeofence.type === "circle" && selectedGeofence.radius) {
      mouseTool.circle({
        center: selectedGeofence.coordinates[0] || [116.397428, 39.90923],
        radius: selectedGeofence.radius,
        strokeColor:
          selectedGeofence.strokeColor || defaultGeofenceStyle.strokeColor,
        strokeOpacity: 1,
        strokeWeight:
          selectedGeofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
        fillColor: selectedGeofence.color || defaultGeofenceStyle.color,
        fillOpacity: 0.4,
      });
    }

    mouseTool.on("draw", (event: any) => {
      // 双重检查绘制模式状态，确保只在激活状态下处理
      if (!isDrawing) {
        mouseTool.close(true);
        return;
      }

      const obj = event.obj;
      let coordinates: [number, number][] = [];

      if (selectedGeofence.type === "polygon") {
        coordinates = obj.getPath().map((point: any) => [point.lng, point.lat]);
      } else if (selectedGeofence.type === "circle") {
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
    mouseTool.on("drawEnd", () => {
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
        (device) =>
          isValidLongitude(device.longitude) &&
          isValidLatitude(device.latitude),
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
          map: map,
          offset: new window.AMap.Pixel(-13, -30),
        });

        // 添加导航按钮
        const navButton = createNavigationButton(device);
        marker.on("click", () => {
          if (onMarkerClick) {
            onMarkerClick(device);
          }
          // 显示导航按钮
          map.add(navButton);
          // 3秒后自动隐藏导航按钮
          setTimeout(() => {
            map.remove(navButton);
          }, 3000);
        });

        markers.push(marker);
        markersRef.current.push(marker);
      });

      if (markers.length > 0) {
        map.setFitView(markers);
      }
    } catch (error) {
      handleMapError(error, "updateMarkers");
    }
  };

  const createNavigationButton = (device: Device) => {
    const position = [device.longitude, device.latitude];
    const button = new window.AMap.Marker({
      position: position,
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

    button.on("click", () => {
      // 打开导航到该位置
      const url = `https://uri.amap.com/navigation?to=${device.longitude},${device.latitude}&name=${encodeURIComponent(device.name)}&callnative=1`;
      window.open(url, "_blank");
    });

    return button;
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
      case "online":
        return "#4caf50";
      case "offline":
        return "#f44336";
      case "warning":
        return "#ff9800";
      default:
        return "#9e9e9e";
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

      if (geofence.type === "polygon" && geofence.coordinates.length >= 3) {
        polygon = new window.AMap.Polygon({
          path: geofence.coordinates,
          strokeColor: geofence.strokeColor || defaultGeofenceStyle.strokeColor,
          strokeOpacity: 1,
          strokeWeight:
            geofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
          fillColor: geofence.color || defaultGeofenceStyle.color,
          fillOpacity: 0.4,
          zIndex: 50,
        });
      } else if (
        geofence.type === "circle" &&
        geofence.radius &&
        geofence.coordinates.length > 0
      ) {
        polygon = new window.AMap.Circle({
          center: geofence.coordinates[0],
          radius: geofence.radius,
          strokeColor: geofence.strokeColor || defaultGeofenceStyle.strokeColor,
          strokeOpacity: 1,
          strokeWeight:
            geofence.strokeWeight || defaultGeofenceStyle.strokeWeight,
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
      (device) =>
        isValidLongitude(device.longitude) && isValidLatitude(device.latitude),
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
          type: "geofence_violation",
          message: violation.message,
          level: "warning",
        });
      } catch (error) {
        console.error("Failed to create alert:", error);
      }
    }
  }, [devices, geofences, onGeofenceViolation]);

  const handleGeofenceCreate = (geofenceData: Omit<Geofence, "id">) => {
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
    setGeofences((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    );
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
        type: "polygon",
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
    <div style={{ position: "relative", height }}>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
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
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          地图加载中...
        </div>
      )}

      {mapError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffebee",
            borderRadius: "8px",
            color: "#d32f2f",
            fontSize: "14px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          {mapError}
          <br />
          <small style={{ fontSize: "12px", marginTop: "8px" }}>
            请检查API密钥配置和网络连接
          </small>
        </div>
      )}
    </div>
  );
};

export default AMapComponent;
