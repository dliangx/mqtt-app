import React, { useEffect, useRef, useState } from "react";
import type { Device } from "../../types";

interface AMapComponentProps {
  devices: Device[];
  onMarkerClick?: (device: Device) => void;
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
  return false; // 返回false表示错误已处理
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
  height = "400px",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const prevDevicesJsonRef = useRef<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");

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
    }&plugin=AMap.MarkerClusterer`;
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

  // 当设备数据变化时更新地图标记
  useEffect(() => {
    if (mapLoaded && window.AMap && mapInstanceRef.current) {
      // 只有在设备数据实际发生变化时才更新标记
      const currentDevicesJson = JSON.stringify(devices);

      if (currentDevicesJson !== prevDevicesJsonRef.current) {
        prevDevicesJsonRef.current = currentDevicesJson;
        updateMarkers(mapInstanceRef.current);
      } else {
        console.log("Devices data unchanged, skipping marker update");
      }
    }
  }, [devices, mapLoaded]);

  // 组件卸载时清理所有标记
  useEffect(() => {
    return () => {
      if (markersRef.current.length > 0) {
        markersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null); // 从地图上移除标记
          }
        });
        markersRef.current = []; // 清空标记引用数组
      }
    };
  }, []);

  const initMap = () => {
    try {
      if (!mapRef.current) {
        console.error("Map container element not found");
        return;
      }

      if (!window.AMap) {
        console.error("AMap library not loaded");
        return;
      }

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 10,
        center: [116.397428, 39.90923],
        viewMode: "2D",
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
      updateMarkers(map);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("地图初始化失败");
    }
  };

  const updateMarkers = (map: any) => {
    try {
      // 首先清除所有现有的标记
      markersRef.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null); // 从地图上移除标记
        }
      });
      markersRef.current = []; // 清空标记引用数组

      if (!map || !devices.length) {
        console.log("No map or devices available");
        return;
      }

      // 安全检查：确保devices是数组
      if (!Array.isArray(devices)) {
        console.error("Devices is not an array:", devices);
        return;
      }

      const validDevices = devices.filter((device) => {
        // 使用严格的验证函数
        const isValid =
          isValidLongitude(device.longitude) &&
          isValidLatitude(device.latitude);

        if (!isValid) {
          console.warn("Invalid coordinates for device:", device.name);
        }

        return isValid;
      });
      console.log("Valid devices with coordinates:", validDevices);

      if (validDevices.length === 0) {
        console.log(
          "No valid devices with coordinates found - using default Beijing location",
        );
        return;
      }

      // 创建所有marker并收集到数组中
      const markers: any[] = [];
      validDevices.forEach((device) => {
        // 使用安全的坐标获取方式
        const lng = parseFloat(device.longitude as unknown as string);
        const lat = parseFloat(device.latitude as unknown as string);

        // 二次验证坐标有效性，防止parseFloat返回NaN
        if (!isValidLongitude(lng) || !isValidLatitude(lat)) {
          return;
        }

        const marker = new window.AMap.Marker({
          position: [lng, lat],
          title: device.name,
          content: createMarkerContent(device),
          map: map,
          offset: new window.AMap.Pixel(-13, -30),
        });

        if (onMarkerClick && marker) {
          try {
            marker.on("click", () => {
              onMarkerClick(device);
            });
          } catch (error) {
            handleMapError(error, "markerClick");
          }
        }

        if (marker) {
          markers.push(marker);
          markersRef.current.push(marker); // 存储标记引用
        }
      });

      // 只有当有有效设备时才调整视图
      if (markers.length > 0) {
        // 设置合适的缩放级别来显示所有标记
        map.setFitView(markers);
      } else {
        // 如果没有有效设备，重置到默认视图
        map.setZoomAndCenter(10, [116.397428, 39.90923]);
      }
    } catch (error) {
      if (!handleMapError(error, "updateMarkers")) {
        // 出错时
        console.error("Failed to update markers:", error);
      }
    }
  };

  const createMarkerContent = (device: Device): string => {
    const color = getStatusColor(device.status);
    return `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid white;
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

      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          fontSize: "12px",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#4caf50",
              marginRight: "6px",
            }}
          ></div>
          <span>在线</span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#f44336",
              marginRight: "6px",
            }}
          ></div>
          <span>离线</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#ff9800",
              marginRight: "6px",
            }}
          ></div>
          <span>警告</span>
        </div>
      </div>
    </div>
  );
};

export default AMapComponent;
