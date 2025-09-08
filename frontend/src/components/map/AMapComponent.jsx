import React, { useEffect, useRef, useState } from "react";

// 严格的坐标验证函数
const isValidCoordinate = (value) => {
  if (value == null) return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && typeof num === "number";
};

const isValidLongitude = (lng) =>
  isValidCoordinate(lng) && lng >= -180 && lng <= 180;
const isValidLatitude = (lat) =>
  isValidCoordinate(lat) && lat >= -90 && lat <= 90;

// 全局错误处理函数
const handleMapError = (error, context = "") => {
  console.error("AMap Error:", context, error);
  return false; // 返回false表示错误已处理
};

const AMapComponent = ({ devices, onMarkerClick, height = "400px" }) => {
  const mapRef = useRef(null);
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

      const map = new AMap.Map(mapRef.current, {
        zoom: 10,
        center: [116.397428, 39.90923],
        viewMode: "2D",
      });

      setMapLoaded(true);
      updateMarkers(map);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("地图初始化失败");
    }
  };

  const updateMarkers = (map) => {
    try {
      if (!map || !devices.length) {
        console.log("No map or devices available");
        return;
      }

      console.log("Devices data:", devices);
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
      const markers = [];
      validDevices.forEach((device) => {
        // 使用安全的坐标获取方式
        const lng = parseFloat(device.longitude);
        const lat = parseFloat(device.latitude);
        console.log(
          "Coordinates for device:",
          device.name,
          ":",
          lng,
          lat,
          "original:",
          device.longitude,
          device.latitude,
        );

        // 二次验证坐标有效性，防止parseFloat返回NaN
        if (!isValidLongitude(lng) || !isValidLatitude(lat)) {
          return;
        }

        const marker = new AMap.Marker({
          position: [lng, lat],
          title: device.name,
          content: createMarkerContent(device),
          map: map,
          offset: new AMap.Pixel(-13, -30),
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
        }
      });
      map.setFitView();
    } catch (error) {
      if (!handleMapError(error, "updateMarkers")) {
        // 出错时
        console.error("Failed to update markers:", error);
      }
    }
  };

  const createMarkerContent = (device) => {
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

  const getStatusColor = (status) => {
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
