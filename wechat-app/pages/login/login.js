// pages/login/login.js
Page({
  data: {
    tab: 0, // 0: 登录, 1: 注册
    username: '',
    password: '',
    email: '',
    loading: false,
    error: '',
    successMessage: ''
  },

  onLoad() {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (token) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  handleTabChange(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({
      tab,
      error: '',
      successMessage: ''
    });
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  onEmailInput(e) {
    this.setData({
      email: e.detail.value
    });
  },

  async handleSubmit() {
    const { tab, username, password, email } = this.data;

    if (!username.trim()) {
      this.setData({
        error: '请输入用户名'
      });
      return;
    }

    if (!password.trim()) {
      this.setData({
        error: '请输入密码'
      });
      return;
    }

    if (tab === 1 && !email.trim()) {
      this.setData({
        error: '请输入邮箱'
      });
      return;
    }

    this.setData({
      loading: true,
      error: '',
      successMessage: ''
    });

    try {
      if (tab === 0) {
        // 登录
        await this.login({ username, password });
      } else {
        // 注册
        await this.register({ username, email, password });
      }
    } catch (error) {
      console.error('操作失败:', error);
      this.setData({
        error: error.message || '操作失败，请重试'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  async login(credentials) {
    // 这里应该调用实际的登录API
    // 暂时使用模拟数据
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (credentials.username && credentials.password) {
          const token = 'mock-token-' + Date.now();
          const userInfo = {
            username: credentials.username,
            email: credentials.username + '@example.com'
          };

          wx.setStorageSync('token', token);
          wx.setStorageSync('user', userInfo);

          this.setData({
            successMessage: '登录成功'
          });

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1000);

          resolve();
        } else {
          reject(new Error('用户名或密码错误'));
        }
      }, 1000);
    });
  },

  async register(userData) {
    // 这里应该调用实际的注册API
    // 暂时使用模拟数据
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (userData.username && userData.email && userData.password) {
          this.setData({
            successMessage: '注册成功！请登录',
            tab: 0,
            username: '',
            password: '',
            email: ''
          });
          resolve();
        } else {
          reject(new Error('注册失败，请检查输入'));
        }
      }, 1000);
    });
  },

  switchTab() {
    const { tab } = this.data;
    this.setData({
      tab: tab === 0 ? 1 : 0,
      error: '',
      successMessage: ''
    });
  }
})
