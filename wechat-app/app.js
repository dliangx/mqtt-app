// app.js
const { apiService } = require("./utils/api");

App({
  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    // 小程序显示时检查登录状态
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const user = wx.getStorageSync("user");

    if (token && user) {
      // 验证token有效性
      this.verifyToken(token);
    } else {
      // 未登录，跳转到登录页
      this.redirectToLogin();
    }
  },

  async verifyToken(token) {
    try {
      // 这里可以添加token验证逻辑
      // 暂时假设token有效
      console.log("Token验证通过");
    } catch (error) {
      console.error("Token验证失败:", error);
      this.clearAuthData();
      this.redirectToLogin();
    }
  },

  clearAuthData() {
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
  },

  redirectToLogin() {
    // 获取当前页面栈
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const route = currentPage ? currentPage.route : "";

    // 排除登录页面本身
    if (route !== "pages/login/login") {
      wx.redirectTo({
        url: "/pages/login/login",
      });
    }
  },

  // 全局登录方法
  async login(credentials) {
    try {
      const response = await apiService.login(credentials);
      const token = response.data?.token;

      if (token) {
        const userInfo = {
          username: credentials.username,
          email: credentials.username + "@example.com",
        };

        wx.setStorageSync("token", token);
        wx.setStorageSync("user", userInfo);

        return { success: true, user: userInfo };
      } else {
        throw new Error("登录失败：未获取到token");
      }
    } catch (error) {
      console.error("登录失败:", error);
      return {
        success: false,
        error: error.message || "登录失败，请重试",
      };
    }
  },

  // 全局登出方法
  logout() {
    this.clearAuthData();
    wx.redirectTo({
      url: "/pages/login/login",
    });
  },

  // 获取用户信息
  getUserInfo() {
    return wx.getStorageSync("user") || null;
  },

  // 检查是否已登录
  isLoggedIn() {
    const token = wx.getStorageSync("token");
    const user = wx.getStorageSync("user");
    return !!(token && user);
  },

  // 全局数据
  globalData: {
    userInfo: null,
    apiBaseUrl: "https://stariot.site/api",
    appName: "要友卫星",
    version: "1.0.0",
  },

  // 全局错误处理
  onError(msg) {
    console.error("小程序发生错误:", msg);
    wx.showToast({
      title: "程序发生错误",
      icon: "error",
    });
  },

  // 网络状态变化处理
  onNetworkStatusChange(res) {
    if (!res.isConnected) {
      wx.showToast({
        title: "网络连接已断开",
        icon: "none",
      });
    }
  },
});
