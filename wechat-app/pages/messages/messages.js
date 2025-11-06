// pages/messages/messages.js
const { request } = require("../../utils/api.js");

Page({
  data: {
    alerts: [],
    devices: [],
    unreadCount: 0,
    loading: true,
    selectedAlert: null,
    showDetailModal: false,
    showSendMessageDialog: false,
    messageContent: "",
    sendingMessage: false,
    sendMessageSuccess: false,
    sendMessageError: "",
    displayAlerts: [],
  },

  onLoad() {
    this.checkAuth();
    this.loadData();
  },

  onShow() {
    this.checkAuth();
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
      await Promise.all([this.loadAlerts(), this.loadDevices()]);
      this.calculateUnreadCount();
      this.filterDisplayAlerts();
    } catch (error) {
      console.error("加载数据失败:", error);
      this.showError("数据加载失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadAlerts() {
    try {
      const alerts = await request({
        url: "/alerts",
        method: "GET",
      });
      this.setData({ alerts });
    } catch (error) {
      throw new Error("消息列表加载失败");
    }
  },

  async loadDevices() {
    try {
      const devices = await request({
        url: "/devices",
        method: "GET",
      });
      this.setData({ devices });
    } catch (error) {
      throw new Error("设备列表加载失败");
    }
  },

  // 计算未读消息数量
  calculateUnreadCount() {
    const unreadCount = this.data.alerts.filter((alert) => !alert.read).length;
    this.setData({ unreadCount });
  },

  // 过滤显示的消息
  filterDisplayAlerts() {
    this.setData({
      displayAlerts: this.data.alerts,
    });
  },

  // 显示消息详情
  showAlertDetail(e) {
    const alert = e.currentTarget.dataset.alert;
    this.setData({
      selectedAlert: alert,
      showDetailModal: true,
    });
  },

  // 关闭详情模态框
  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      selectedAlert: null,
    });
  },

  // 打开发送消息对话框
  openSendMessageDialog() {
    this.setData({
      showSendMessageDialog: true,
      messageContent: "",
      sendMessageSuccess: false,
      sendMessageError: "",
    });
  },

  // 关闭发送消息对话框
  closeSendMessageDialog() {
    this.setData({
      showSendMessageDialog: false,
      messageContent: "",
      sendMessageSuccess: false,
      sendMessageError: "",
    });
  },

  // 消息内容输入
  onMessageContentInput(e) {
    this.setData({
      messageContent: e.detail.value,
    });
  },

  // 发送重要消息
  async sendImportantMessage() {
    if (!this.data.messageContent.trim()) {
      this.setData({
        sendMessageError: "消息内容不能为空",
      });
      return;
    }

    this.setData({
      sendingMessage: true,
      sendMessageError: "",
    });

    try {
      // 获取当前位置
      let locationData = null;
      try {
        const locationRes = await new Promise((resolve, reject) => {
          wx.getLocation({
            type: "gcj02",
            success: resolve,
            fail: reject,
          });
        });

        locationData = {
          latitude: locationRes.latitude,
          longitude: locationRes.longitude,
          accuracy: locationRes.accuracy,
          source: "browser",
        };
      } catch (locationError) {
        console.warn("获取位置失败:", locationError);
      }

      // 发送消息
      const alertData = {
        device_id: 0, // 系统消息
        type: "important",
        message: this.data.messageContent.trim(),
        level: "high",
        raw_data: JSON.stringify({
          source: "user",
          location: locationData,
          timestamp: new Date().toISOString(),
        }),
      };

      await request({
        url: "/alerts",
        method: "POST",
        data: alertData,
      });

      this.setData({
        sendMessageSuccess: true,
        messageContent: "",
      });

      // 重新加载数据
      setTimeout(() => {
        this.loadData();
        setTimeout(() => {
          this.closeSendMessageDialog();
        }, 1500);
      }, 1000);
    } catch (error) {
      this.setData({
        sendMessageError: "消息发送失败: " + error.message,
      });
    } finally {
      this.setData({ sendingMessage: false });
    }
  },

  // 标记为已读
  async markAsRead(e) {
    const alertId = e.currentTarget.dataset.id;

    this.setData({ loading: true });
    try {
      await request({
        url: `/alerts/${alertId}/read`,
        method: "PUT",
      });

      // 更新本地数据
      const alerts = this.data.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, read: true } : alert,
      );

      this.setData({ alerts });
      this.calculateUnreadCount();
      this.filterDisplayAlerts();

      // 如果当前在详情模态框中，也更新选中消息
      if (this.data.selectedAlert && this.data.selectedAlert.id === alertId) {
        this.setData({
          "selectedAlert.read": true,
        });
      }

      this.showSuccess("消息已标记为已读");
    } catch (error) {
      this.showError("标记失败: " + error.message);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取设备名称
  getDeviceName(alert) {
    if (alert.device_id === 0) {
      return "系统消息";
    }

    const device = this.data.devices.find((d) => d.id === alert.device_id);
    return device ? device.name : `设备 ${alert.device_id}`;
  },

  // 获取严重程度颜色
  getSeverityColor(level) {
    const colorMap = {
      critical: "#d32f2f",
      high: "#f57c00",
      medium: "#fbc02d",
      low: "#388e3c",
    };
    return colorMap[level] || "#666";
  },

  // 获取严重程度文本
  getSeverityText(level) {
    const textMap = {
      critical: "严重",
      high: "高",
      medium: "中",
      low: "低",
    };
    return textMap[level] || "未知";
  },

  // 格式化时间戳
  formatTimestamp(timestamp) {
    if (!timestamp) return "未知时间";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString();
  },

  // 显示错误消息
  showError(message) {
    wx.showToast({
      title: message,
      icon: "error",
      duration: 3000,
    });
  },

  // 显示成功消息
  showSuccess(message) {
    wx.showToast({
      title: message,
      icon: "success",
      duration: 2000,
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },
});
