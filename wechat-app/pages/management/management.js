// pages/management/management.js
const { request } = require("../../utils/api.js");

Page({
  data: {
    devices: [],
    deviceGroups: [],
    loading: false,
    addDeviceDialog: false,
    editDeviceDialog: false,
    error: "",
    success: "",
    newDevice: {
      name: "",
      topic: "",
      group_id: null,
      longitude: "",
      latitude: "",
      address: "",
    },
    editingDevice: null,
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true });
    try {
      await Promise.all([this.loadDevices(), this.loadDeviceGroups()]);
    } catch (error) {
      this.showError("数据加载失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载设备列表
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

  // 加载设备组
  async loadDeviceGroups() {
    try {
      const deviceGroups = await request({
        url: "/device-groups",
        method: "GET",
      });
      this.setData({ deviceGroups });
    } catch (error) {
      throw new Error("设备组加载失败");
    }
  },

  // 打开添加设备对话框
  openAddDialog() {
    this.setData({
      addDeviceDialog: true,
      newDevice: {
        name: "",
        topic: "",
        group_id: null,
        longitude: "",
        latitude: "",
        address: "",
      },
    });
  },

  // 关闭添加设备对话框
  closeAddDialog() {
    this.setData({ addDeviceDialog: false });
  },

  // 打开编辑设备对话框
  openEditDialog(e) {
    const device = e.currentTarget.dataset.device;
    this.setData({
      editDeviceDialog: true,
      editingDevice: { ...device },
    });
  },

  // 关闭编辑设备对话框
  closeEditDialog() {
    this.setData({ editDeviceDialog: false });
  },

  // 添加设备
  async handleAddDevice(e) {
    const formData = e.detail.value;
    const deviceData = {
      name: formData.name?.trim(),
      topic: formData.topic?.trim(),
      group_id: this.data.newDevice.group_id,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      address: formData.address?.trim(),
    };

    if (!deviceData.name || !deviceData.topic) {
      this.showError("设备名称和设备主题不能为空");
      return;
    }

    this.setData({ loading: true });
    try {
      const newDevice = await request({
        url: "/devices",
        method: "POST",
        data: deviceData,
      });

      // 更新设备列表
      const devices = [...this.data.devices, newDevice];
      this.setData({ devices });

      this.showSuccess("设备添加成功");
      this.closeAddDialog();
    } catch (error) {
      this.showError("设备添加失败: " + error.message);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 编辑设备
  async handleEditDevice(e) {
    const formData = e.detail.value;
    const deviceData = {
      name: formData.name?.trim(),
      topic: formData.topic?.trim(),
      group_id: this.data.editingDevice.group_id,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      address: formData.address?.trim(),
    };

    if (!deviceData.name || !deviceData.topic) {
      this.showError("设备名称和设备主题不能为空");
      return;
    }

    this.setData({ loading: true });
    try {
      const updatedDevice = await request({
        url: `/devices/${this.data.editingDevice.id}`,
        method: "PUT",
        data: deviceData,
      });

      // 更新设备列表
      const devices = this.data.devices.map((device) =>
        device.id === this.data.editingDevice.id ? updatedDevice : device,
      );
      this.setData({ devices });

      this.showSuccess("设备更新成功");
      this.closeEditDialog();
    } catch (error) {
      this.showError("设备更新失败: " + error.message);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 删除设备
  async handleDeleteDevice(e) {
    const deviceId = e.currentTarget.dataset.id;
    const device = this.data.devices.find((d) => d.id === deviceId);

    wx.showModal({
      title: "确认删除",
      content: `确定要删除设备 "${device?.name}" 吗？此操作不可恢复。`,
      confirmColor: "#d32f2f",
      success: async (res) => {
        if (res.confirm) {
          this.setData({ loading: true });
          try {
            await request({
              url: `/devices/${deviceId}`,
              method: "DELETE",
            });

            // 更新设备列表
            const devices = this.data.devices.filter((d) => d.id !== deviceId);
            this.setData({ devices });

            this.showSuccess("设备删除成功");
          } catch (error) {
            this.showError("设备删除失败: " + error.message);
          } finally {
            this.setData({ loading: false });
          }
        }
      },
    });
  },

  // 设备组选择变化
  onGroupChange(e) {
    const index = e.detail.value;
    const groupId = this.data.deviceGroups[index]?.id || null;
    this.setData({
      "newDevice.group_id": groupId,
    });
  },

  // 编辑设备组选择变化
  onEditGroupChange(e) {
    const index = e.detail.value;
    const groupId = this.data.deviceGroups[index]?.id || null;
    this.setData({
      "editingDevice.group_id": groupId,
    });
  },

  // 获取设备组名称
  getGroupName(groupId) {
    if (!groupId) return "未分组";
    const group = this.data.deviceGroups.find((g) => g.id === groupId);
    return group ? group.name : "未知分组";
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      online: "在线",
      offline: "离线",
      unknown: "未知",
    };
    return statusMap[status] || "未知";
  },

  // 格式化日期时间
  formatDateTime(timestamp) {
    if (!timestamp) return "从未在线";

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
    this.setData({ success: message });
    setTimeout(() => {
      this.setData({ success: "" });
    }, 3000);
  },

  // 清除错误
  clearError() {
    this.setData({ error: "" });
  },

  // 清除成功消息
  clearSuccess() {
    this.setData({ success: "" });
  },
});
