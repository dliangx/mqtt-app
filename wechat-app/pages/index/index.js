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
      const devices = await request({
        url: "/devices",
        method: "GET",
      });

      // 创建地图标记
      const markers = devices
        .filter((device) => device.longitude && device.latitude)
        .map((device) => ({
          id: device.id,
          latitude: device.latitude,
          longitude: device.longitude,
          title: device.name,
          iconPath: this.getMarkerIcon(device.status),
          width: 30,
          height: 30,
          callout: {
            content: device.name,
            color: "#333",
            fontSize: 14,
            borderRadius: 4,
            bgColor: "#fff",
            padding: 8,
            display: "ALWAYS",
          },
        }));

      this.setData({ devices, markers });
    } catch (error) {
      throw new Error("设备列表加载失败");
    }
  },

  async loadAlerts() {
    try {
      const alerts = await request({
        url: "/alerts",
        method: "GET",
      });

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
    const deviceId = e.markerId || e.currentTarget.dataset.device?.id;
    const device =
      this.data.devices.find((d) => d.id === deviceId) ||
      e.currentTarget.dataset.device;

    if (device) {
      this.setData({
        selectedDevice: device,
        dialogOpen: true,
      });
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

    this.setData({ isNavigating: true });

    // 使用微信内置地图打开导航
    wx.openLocation({
      latitude: selectedDevice.latitude,
      longitude: selectedDevice.longitude,
      name: selectedDevice.name,
      address: selectedDevice.address || "设备位置",
      scale: 18,
      success: () => {
        this.showError("正在导航到设备", "success");
      },
      fail: (error) => {
        console.error("导航失败:", error);
        this.showError("导航失败，请检查位置信息", "error");
      },
      complete: () => {
        this.setData({ isNavigating: false });
      },
    });
  },

  // 显示历史轨迹
  showHistoryTrail() {
    const { selectedDevice, isShowingHistory } = this.data;

    if (isShowingHistory) {
      // 清除轨迹
      this.setData({ isShowingHistory: false });
      this.showError("已清除历史轨迹", "info");
    } else {
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
          id: `trail-${index}`,
          latitude: data.latitude || selectedDevice.latitude,
          longitude: data.longitude || selectedDevice.longitude,
          title: `轨迹点 ${index + 1}`,
          iconPath: "/images/trail-marker.png",
          width: 20,
          height: 20,
        };
      });

      // 更新地图标记
      const markers = [...this.data.markers, ...trailMarkers];
      this.setData({ markers });

      this.showError(`显示 ${deviceAlerts.length} 个轨迹点`, "success");
    }
  },

  // 获取标记图标
  getMarkerIcon(status) {
    const iconMap = {
      online: "/images/marker-online.png",
      offline: "/images/marker-offline.png",
      unknown: "/images/marker-unknown.png",
    };
    return iconMap[status] || "/images/marker-unknown.png";
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },
});
