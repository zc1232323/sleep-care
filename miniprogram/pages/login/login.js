/**
 * @file 登录页面逻辑
 * @author 周灿
 * @date 2026-06-29
 */

const app = getApp();

Page({
  data: {
    phone: '',
    password: '',
    loading: false,
    errorMsg: ''
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value, errorMsg: '' });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ password: e.detail.value, errorMsg: '' });
  },

  // 登录按钮点击
  onLogin() {
    const { phone, password } = this.data;

    // 表单验证
    if (!phone) {
      this.setData({ errorMsg: '请输入手机号' });
      return;
    }
    if (phone.length !== 11) {
      this.setData({ errorMsg: '手机号格式不正确' });
      return;
    }
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }
    if (password.length < 6) {
      this.setData({ errorMsg: '密码长度不能少于6位' });
      return;
    }

    this.setData({ loading: true });

    // 调用后端登录接口
    wx.request({
      url: `${app.globalData.baseUrl}/api/v1/auth/login`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone, password },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const { token, user } = res.data.data;

          // 存储登录信息
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);
          app.globalData.token = token;
          app.globalData.userInfo = user;

          // 跳转到首页（睡眠报告）
          wx.redirectTo({
            url: '/pages/home/home'
          });
        } else {
          this.setData({
            errorMsg: res.data?.message || '登录失败，请检查账号密码'
          });
        }
      },
      fail: () => {
        this.setData({ errorMsg: '网络连接失败，请稍后重试' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  }
});
