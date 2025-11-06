// utils/api.js
const API_BASE_URL = "https://stariot.site/api";

// 请求拦截器 - 添加token
const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("token");

    const header = {
      "Content-Type": "application/json",
      ...options.header,
    };

    if (token) {
      header["Authorization"] = `Bearer ${token}`;
    }

    wx.request({
      url: API_BASE_URL + options.url,
      method: options.method || "GET",
      data: options.data,
      header: header,
      success: (res) => {
        if (res.statusCode === 401) {
          // token过期，跳转到登录页
          wx.removeStorageSync("token");
          wx.removeStorageSync("user");
          wx.redirectTo({
            url: "/pages/login/login",
          });
          reject(new Error("登录已过期"));
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.error || "请求失败"));
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

// 提取API响应数据
const getResponseData = (response) => {
  return response.data;
};

const apiService = {
  // 认证相关
  login: (credentials) =>
    request({
      url: "/login",
      method: "POST",
      data: credentials,
    }),

  register: (userData) =>
    request({
      url: "/register",
      method: "POST",
      data: userData,
    }),

  // 设备相关
  getDevices: () =>
    request({
      url: "/devices",
    }),

  createDevice: (deviceData) =>
    request({
      url: "/devices",
      method: "POST",
      data: deviceData,
    }),

  updateDevice: (id, deviceData) =>
    request({
      url: `/devices/${id}`,
      method: "PUT",
      data: deviceData,
    }),

  deleteDevice: (id) =>
    request({
      url: `/devices/${id}`,
      method: "DELETE",
    }),

  updateDeviceLocation: (id, locationData) =>
    request({
      url: `/devices/${id}/location`,
      method: "PUT",
      data: locationData,
    }),

  updateDeviceStatus: (id, statusData) =>
    request({
      url: `/devices/${id}/status`,
      method: "PUT",
      data: statusData,
    }),

  // 设备分组
  getDeviceGroups: () =>
    request({
      url: "/device-groups",
    }),

  // 报警相关
  getAlerts: () =>
    request({
      url: "/alerts",
    }),

  getUnreadAlerts: () =>
    request({
      url: "/alerts/unread",
    }),

  createAlert: (alertData) =>
    request({
      url: "/alerts",
      method: "POST",
      data: alertData,
    }),

  markAlertAsRead: (id) =>
    request({
      url: `/alerts/${id}/read`,
      method: "PUT",
    }),

  markAlertsAsRead: (ids) =>
    request({
      url: "/alerts/read",
      method: "PUT",
      data: { ids },
    }),

  markAllAlertsAsRead: () =>
    request({
      url: "/alerts/read-all",
      method: "PUT",
    }),

  deleteAlert: (id) =>
    request({
      url: `/alerts/${id}`,
      method: "DELETE",
    }),

  deleteAlerts: (ids) =>
    request({
      url: "/alerts",
      method: "DELETE",
      data: { ids },
    }),

  // 数据推送
  pushDeviceData: (data) =>
    request({
      url: "/data/push",
      method: "POST",
      data: data,
    }),

  generateTestData: () =>
    request({
      url: "/data/generate-test",
      method: "POST",
    }),

  pushTestData: (data) =>
    request({
      url: "/data/push-test",
      method: "POST",
      data: data,
    }),
};

module.exports = {
  apiService,
  getResponseData,
  request,
};
