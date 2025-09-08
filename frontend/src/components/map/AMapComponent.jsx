import React, { useEffect, useRef, useState } from "react";

// 调试函数：详细记录坐标验证过程
const debugCoordinate = (device, context = "") => {
  const lng = parseFloat(device.longitude);
  const lat = parseFloat(device.latitude);

  const debugInfo = {
    context,
    device: device.name,
    originalLng: device.longitude,
    originalLat: device.latitude,
    typeLng: typeof device.longitude,
    typeLat: typeof device.latitude,
    parsedLng: lng,
    parsedLat: lat,
    isLngValid: !isNaN(lng) && isFinite(lng) && lng >= -180 && lng <= 180,
    isLatValid: !isNaN(lat) && isFinite(lat) && lat >= -90 && lat <= 90,
    isLngNaN: isNaN(lng),
    isLatNaN: isNaN(lat),
    isLngFinite: isFinite(lng),
    isLatFinite: isFinite(lat),
  };

  console.log("Coordinate Debug:", debugInfo);
  return debugInfo;
};

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
      import.meta.env.VITE_AMAP_API_KEY || "YOUR_AMAP_API_KEY"
    }&plugin=AMap.MarkerClusterer`;
    script.async = true;
    script.onload = () => {
      if (import.meta.env.VITE_AMAP_API_KEY === "YOUR_AMAP_API_KEY_HERE") {
        console.warn("请配置高德地图API密钥在.env文件中");
        setMapError("请配置高德地图API密钥");
        return;
      }
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

      const map = new window.AMap.Map(mapRef.current, {
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
        map.setCenter([116.397428, 39.90923]);
        map.setZoom(10);
        return;
      }

      const validDevices = devices.filter((device) => {
        // 详细的调试信息
        const debugInfo = debugCoordinate(device, "filter-validation");

        // 使用严格的验证函数
        const isValid =
          isValidLongitude(device.longitude) &&
          isValidLatitude(device.latitude);

        if (!isValid) {
          console.warn(
            "Invalid coordinates for device:",
            device.name,
            debugInfo,
          );
        }

        return isValid;
      });
      console.log("Valid devices with coordinates:", validDevices);

      if (validDevices.length === 0) {
        console.log(
          "No valid devices with coordinates found - using default Beijing location",
        );
        // 设置默认的北京位置
        map.setCenter([116.397428, 39.90923]);
        map.setZoom(10);
        return;
      }

      validDevices.forEach((device) => {
        // 使用安全的坐标获取方式
        const lng = parseFloat(device.longitude);
        const lat = parseFloat(device.latitude);

        // 终极验证 - 防止任何NaN值
        if (!isValidLongitude(lng) || !isValidLatitude(lat)) {
          const debugInfo = debugCoordinate(device, "emergency-validation");
          console.error(
            "EMERGENCY: Invalid coordinates detected - skipping device:",
            debugInfo,
          );
          return; // 完全跳过这个设备
        }

        let marker;
        try {
          // 最终安全检查：确保坐标不是NaN
          if (isNaN(lng) || isNaN(lat)) {
            console.error(
              "FINAL CHECK: NaN coordinates detected - aborting marker creation:",
              {
                device: device.name,
                lng: lng,
                lat: lat,
                isLngNaN: isNaN(lng),
                isLatNaN: isNaN(lat),
              },
            );
            return;
          }

          marker = new window.AMap.Marker({
            position: [lng, lat],
            title: device.name,
            content: createMarkerContent(device),
            offset: new window.AMap.Pixel(-13, -30),
          });
        } catch (error) {
          if (handleMapError(error, "createMarker")) return;
        }

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
          try {
            map.add(marker);
          } catch (error) {
            handleMapError(error, "mapAddMarker");
          }
        }
      });

      if (validDevices.length === 1) {
        const lng = parseFloat(validDevices[0].longitude);
        const lat = parseFloat(validDevices[0].latitude);

        // 使用验证函数确保坐标安全
        if (isValidLongitude(lng) && isValidLatitude(lat)) {
          try {
            map.setCenter([lng, lat]);
            map.setZoom(15);
          } catch (error) {
            if (!handleMapError(error, "setCenter")) {
              // 如果设置中心失败，使用默认位置
              map.setCenter([116.397428, 39.90923]);
              map.setZoom(10);
            }
          }
        } else {
          console.error("Cannot center map - invalid coordinates:", lng, lat);
          map.setCenter([116.397428, 39.90923]);
          map.setZoom(10);
        }
      } else if (validDevices.length > 1) {
        const bounds = new window.AMap.Bounds();
        validDevices.forEach((device) => {
          const lng = parseFloat(device.longitude);
          const lat = parseFloat(device.latitude);

          // 使用验证函数确保坐标安全
          if (isValidLongitude(lng) && isValidLatitude(lat)) {
            try {
              bounds.extend([lng, lat]);
            } catch (error) {
              console.error("Error extending bounds:", error, lng, lat);
            }
          } else {
            console.warn("Skipping invalid coordinates for bounds:", lng, lat);
          }
        });
        try {
          map.setBounds(bounds);
        } catch (error) {
          if (!handleMapError(error, "setBounds")) {
            // 如果设置边界失败，使用默认位置
            map.setCenter([116.397428, 39.90923]);
            map.setZoom(10);
          }
        }
      }
    } catch (error) {
      if (!handleMapError(error, "updateMarkers")) {
        // 出错时也设置默认位置
        if (map) {
          map.setCenter([116.397428, 39.90923]);
          map.setZoom(10);
        }
      }
    }
  };

  const createMarkerContent = (device) => {
    const color = getStatusColor(device.status);
    return `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
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
          borderRadius: "8px",
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
