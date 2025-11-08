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
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    hasMore: true,
    loadingMore: false,
  },

  onLoad() {
    this.checkAuth();
    this.loadData();
  },

  onShow() {
    this.checkAuth();
    this.loadData();
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
    console.log("loadData: Setting loading to true");
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
      console.log("loadData: Setting loading to false");
    }
  },

  async loadAlerts(isLoadMore = false) {
    if (isLoadMore && !this.data.hasMore) {
      return;
    }

    if (isLoadMore) {
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true, currentPage: 1, hasMore: true });
    }

    try {
      const page = isLoadMore ? this.data.currentPage + 1 : 1;
      const response = await request({
        url: `/alerts?page=${page}&page_size=${this.data.pageSize}`,
        method: "GET",
      });

      // 处理分页响应格式
      let alerts;
      let totalPages = 1;

      if (response.pagination) {
        alerts = response.data || [];
        totalPages = response.pagination.total_page || 1;
        const hasMore = page < totalPages;

        if (isLoadMore) {
          alerts = [...this.data.alerts, ...alerts];
        }

        this.setData({
          alerts: alerts,
          currentPage: page,
          totalPages: totalPages,
          hasMore: hasMore,
        });
      } else {
        // 兼容旧格式
        alerts = response.data || response;
        this.setData({
          alerts: alerts,
          hasMore: false,
        });
      }

      this.filterDisplayAlerts();
    } catch (error) {
      throw new Error("消息列表加载失败");
    } finally {
      if (isLoadMore) {
        this.setData({ loadingMore: false });
      } else {
        this.setData({ loading: false });
      }
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
    const alertId = this.data.selectedAlert?.ID;

    this.setData({ loading: true });
    try {
      await request({
        url: `/alerts/${alertId}/read`,
        method: "PUT",
      });

      // 重新加载第一页数据
      this.loadAlerts(false);
      this.calculateUnreadCount();

      // 如果当前在详情模态框中，也更新选中消息
      if (this.data.selectedAlert && this.data.selectedAlert.ID === alertId) {
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

  // 显示错误消息
  showError(message) {
    wx.showToast({
      title: message,
      icon: "error",
      duration: 3000,
    });
  },

  // scroll-view 滚动到底部
  onScrollToLower() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadAlerts(true);
    } else {
    }
  },

  // 显示成功消息
  showSuccess(message) {
    this.setData({ success: message });
    setTimeout(() => {
      this.setData({ success: "" });
    }, 3000);
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },
});
