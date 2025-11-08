// pages/monitor/monitor.js
const { request } = require("../../utils/api.js");

Page({
  data: {
    devices: [],
    alerts: [],
    loading: true,
    selectedDevice: null,
    dialogOpen: false,
    alertOpen: false,
    alertMessage: "",
    alertType: "info",
    isNavigating: false,
    isShowingHistory: false,
    currentLocation: null,
    markers: [],
    polyline: [],
    mapContext: null,
    unreadAlertsCount: 0,
    criticalAlertsCount: 0,
    highAlertsCount: 0,
    mediumAlertsCount: 0,
    lowAlertsCount: 0,
  },

  onLoad() {
    this.checkAuth();
    this.loadData();
    this.getCurrentLocation();
    // 初始化地图上下文
    this.setData({
      mapContext: wx.createMapContext("map"),
    });
  },

  onShow() {
    this.checkAuth();
  },

  // 显示错误消息
  showError(message) {
    wx.showToast({
      title: message,
      icon: "error",
      duration: 3000,
    });
  },

  checkAuth() {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.redirectTo({
        url: "/pages/login/login",
      });
    }
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      await Promise.all([this.loadDevices(), this.loadAlerts()]);
    } catch (error) {
      console.error("加载数据失败:", error);
      this.showError("加载数据失败", "error");
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadDevices() {
    try {
      const response = await request({
        url: "/devices",
        method: "GET",
      });

      // 处理分页响应格式
      const devices = response.data || response;

      // 创建地图标记
      const markers = devices
        .filter((device) => device.longitude && device.latitude)
        .map((device, index) => ({
          id: Number(device.ID || device.id) || index + 1,
          latitude: device.latitude,
          longitude: device.longitude,
          title: device.name,
          width: 20,
          height: 20,
          iconPath: this.getMarkerIcon(device.status),
        }));

      this.setData({ devices, markers });
    } catch (error) {
      throw new Error("设备列表加载失败");
    }
  },

  async loadAlerts() {
    try {
      const response = await request({
        url: "/alerts",
        method: "GET",
      });

      // 处理分页响应格式
      const alerts = response.data || response;

      // 计算各种统计
      const unreadAlertsCount = alerts.filter((alert) => !alert.read).length;
      const criticalAlertsCount = alerts.filter(
        (alert) => alert.level === "critical",
      ).length;
      const highAlertsCount = alerts.filter(
        (alert) => alert.level === "high",
      ).length;
      const mediumAlertsCount = alerts.filter(
        (alert) => alert.level === "medium",
      ).length;
      const lowAlertsCount = alerts.filter(
        (alert) => alert.level === "low",
      ).length;

      this.setData({
        alerts,
        unreadAlertsCount,
        criticalAlertsCount,
        highAlertsCount,
        mediumAlertsCount,
        lowAlertsCount,
      });
    } catch (error) {
      throw new Error("报警数据加载失败");
    }
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        this.setData({
          currentLocation: {
            latitude: res.latitude,
            longitude: res.longitude,
            source: "browser",
          },
        });
      },
      fail: (error) => {
        console.error("获取位置失败:", error);
        // 使用默认位置（北京）
        this.setData({
          currentLocation: {
            latitude: 39.9093,
            longitude: 116.3974,
            source: "default",
          },
        });
      },
    });
  },

  // 处理地图标记点击
  handleMarkerClick(e) {
    console.log("标记点点击事件:", e);
    const deviceId = e.markerId || e.currentTarget.dataset.device?.id;
    console.log("点击的标记ID:", deviceId);
    console.log("设备列表:", this.data.devices);
    const device =
      this.data.devices.find((d) => d.ID == deviceId || d.id == deviceId) ||
      e.currentTarget.dataset.device;

    if (device) {
      console.log("找到设备:", device);
      // 清除轨迹显示
      this.setData({
        selectedDevice: device,
        dialogOpen: true,
        isShowingHistory: false,
      });
    } else {
      console.log("未找到对应设备");
    }
  },

  // 关闭对话框
  handleCloseDialog() {
    this.setData({
      dialogOpen: false,
      selectedDevice: null,
    });
  },

  // 关闭提示
  handleCloseAlert() {
    this.setData({
      alertOpen: false,
      alertMessage: "",
    });
  },

  // 导航到设备
  navigateToDevice() {
    const { selectedDevice, currentLocation } = this.data;

    if (!selectedDevice.longitude || !selectedDevice.latitude) {
      this.showError("该设备没有位置信息", "error");
      return;
    }

    if (!currentLocation) {
      this.showError("无法获取当前位置", "error");
      return;
    }

    this.setData({ isNavigating: true });

    // 使用微信小程序路线规划API
    wx.request({
      url: "https://apis.map.qq.com/ws/direction/v1/driving/",
      data: {
        from: `${currentLocation.latitude},${currentLocation.longitude}`,
        to: `${selectedDevice.latitude},${selectedDevice.longitude}`,
        key: "YOUR_TENCENT_MAP_KEY", // 需要申请腾讯地图key
        output: "json",
      },
      success: (res) => {
        if (
          res.data.status === 0 &&
          res.data.result &&
          res.data.result.routes &&
          res.data.result.routes.length > 0
        ) {
          const route = res.data.result.routes[0];

          // 解析路线坐标点
          const points = [];
          const polyline = route.polyline;
          const coords = polyline.split(";");

          coords.forEach((coord) => {
            const [lng, lat] = coord.split(",");
            points.push({
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            });
          });

          // 绘制路线
          const polylineData = [
            {
              points: points,
              color: "#1976d2",
              width: 6,
              dottedLine: false,
              arrowLine: true,
            },
          ];

          this.setData({
            polyline: polylineData,
            isNavigating: false,
          });

          // 调整地图视野以显示完整路线
          this.data.mapContext.includePoints({
            points: points,
            padding: [40, 40, 40, 40],
          });

          this.showError("路线规划完成，已在地图上显示", "success");
        } else {
          console.error("路线规划API返回错误:", res.data);
          this.showError("无法规划路线", "error");
          this.setData({ isNavigating: false });
        }
      },
      fail: (error) => {
        console.error("路线规划失败 - 网络错误:", error);
        console.error("错误详情:", JSON.stringify(error, null, 2));
        this.showError("路线规划失败", "error");
        this.setData({ isNavigating: false });
      },
    });
  },

  // 显示历史轨迹
  showHistoryTrail() {
    const { selectedDevice } = this.data;

    // 显示轨迹
    this.setData({ isShowingHistory: true });

    // 获取设备的历史报警数据
    const deviceAlerts = this.data.alerts.filter(
      (alert) =>
        alert.device_id === selectedDevice.id && alert.type === "track",
    );

    if (deviceAlerts.length === 0) {
      this.showError("该设备暂无轨迹数据", "info");
      return;
    }

    // 创建轨迹标记
    const trailMarkers = deviceAlerts.map((alert, index) => {
      const data = alert.parsed_data ? JSON.parse(alert.parsed_data) : {};
      return {
        id: 100000 + index,
        latitude: data.latitude || selectedDevice.latitude,
        longitude: data.longitude || selectedDevice.longitude,
        title: `轨迹点 ${index + 1}`,
        width: 16,
        height: 16,
        iconPath:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iNyIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iNSIgZmlsbD0iI2ZmOTgwMCIvPjwvc3ZnPg==",
      };
    });

    // 更新地图标记
    const markers = [...this.data.markers, ...trailMarkers];
    this.setData({ markers });

    this.showError(`显示 ${deviceAlerts.length} 个轨迹点`, "success");
  },

  // 获取标记图标
  getMarkerIcon(status) {
    const iconMap = {
      online:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjYiIGZpbGw9IiM0Y2FmNTAiLz48L3N2Zz4=",
      offline:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjYiIGZpbGw9IiNmNDQzMzYiLz48L3N2Zz4=",
      warning:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjYiIGZpbGw9IiNmZjk4MDAiLz48L3N2Zz4=",
    };
    return (
      iconMap[status] ||
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjYiIGZpbGw9IiM3NTc1NzUiLz48L3N2Zz4="
    );
  },

  // 获取状态颜色
  getStatusColor(status) {
    switch (status) {
      case "online":
        return "#4caf50";
      case "offline":
        return "#f44336";
      case "warning":
        return "#ff9800";
      default:
        return "#757575";
    }
  },

  // 获取状态文本
  getStatusText(status) {
    switch (status) {
      case "online":
        return "在线";
      case "offline":
        return "离线";
      case "warning":
        return "警告";
      default:
        return status;
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },
});
