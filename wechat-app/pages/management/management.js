// pages/management/management.js
const { request } = require("../../utils/api.js");
const { checkAuth } = require("../../utils/util.js");

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
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    hasMore: true,
    loadingMore: false,
  },

  onLoad() {
    checkAuth();
    this.loadData();
  },

  onShow() {
    checkAuth;
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
  async loadDevices(isLoadMore = false) {
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
        url: `/devices?page=${page}&page_size=${this.data.pageSize}`,
        method: "GET",
      });

      // 处理分页响应格式
      let devices;
      let totalPages = 1;

      if (response.pagination) {
        devices = response.data || [];
        totalPages = response.pagination.total_page || 1;
        const hasMore = page < totalPages;

        if (isLoadMore) {
          devices = [...this.data.devices, ...devices];
        }

        this.setData({
          devices: devices,
          currentPage: page,
          totalPages: totalPages,
          hasMore: hasMore,
        });
      } else {
        // 兼容旧格式
        devices = response.data || response;
        this.setData({
          devices: devices,
          hasMore: false,
        });
      }
    } catch (error) {
      throw new Error("设备列表加载失败");
    } finally {
      if (isLoadMore) {
        this.setData({ loadingMore: false });
      } else {
        this.setData({ loading: false });
      }
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

    // 表单验证
    if (!formData.name?.trim() || !formData.topic?.trim()) {
      this.showError("设备名称和设备主题不能为空");
      return;
    }

    const deviceData = {
      name: formData.name?.trim(),
      topic: formData.topic?.trim(),
      group_id: this.data.newDevice.group_id,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      address: formData.address?.trim(),
    };

    this.setData({ loading: true });
    try {
      const newDevice = await request({
        url: "/devices",
        method: "POST",
        data: deviceData,
      });

      // 重新加载第一页数据
      this.loadDevices(false);
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

    // 表单验证
    if (!formData.name?.trim() || !formData.topic?.trim()) {
      this.showError("设备名称和设备主题不能为空");
      return;
    }

    const deviceData = {
      name: formData.name?.trim(),
      topic: formData.topic?.trim(),
      group_id: this.data.editingDevice.group_id,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      address: formData.address?.trim(),
    };

    this.setData({ loading: true });
    try {
      const updatedDevice = await request({
        url: `/devices/${this.data.editingDevice.ID}`,
        method: "PUT",
        data: deviceData,
      });

      // 更新设备列表
      const devices = this.data.devices.map((device) =>
        device.ID === this.data.editingDevice.ID ? updatedDevice : device,
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
    const device = this.data.devices.find((d) => d.ID === deviceId);

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

            // 重新加载第一页数据
            this.loadDevices(false);
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
    const groupId = this.data.deviceGroups[index]?.ID || null;
    this.setData({
      "newDevice.group_id": groupId,
    });
  },

  // 编辑设备组选择变化
  onEditGroupChange(e) {
    const index = e.detail.value;
    const groupId = this.data.deviceGroups[index]?.ID || null;
    this.setData({
      "editingDevice.group_id": groupId,
    });
  },

  // scroll-view 滚动到底部
  onScrollToLower() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadDevices(true);
    } else {
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
