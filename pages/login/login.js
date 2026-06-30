/**
 * @file 登录/注册页面逻辑
 * @author 周灿
 * @date 2026-06-29 ~ 2026-06-30
 */

const app = getApp();

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    loading: false,
    errorMsg: '',
    isRegister: false  // false=登录模式, true=注册模式
  },

  onLoad() {
    // 检查本地是否已有 token，有则直接跳转首页（免登录）
    if (app.getToken()) {
      wx.switchTab({ url: '/pages/home/home' });
    }
  },

  // ===== 输入处理 =====

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value, errorMsg: '' });
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value, errorMsg: '' });
  },
  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value, errorMsg: '' });
  },
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value, errorMsg: '' });
  },

  // ===== 切换登录/注册模式 =====

  toggleMode() {
    this.setData({
      isRegister: !this.data.isRegister,
      errorMsg: '',
      phone: '',
      password: '',
      confirmPassword: '',
      nickname: ''
    });
  },

  // ===== 登录逻辑 =====

  onLogin() {
    const { phone, password } = this.data;

    if (!phone) { this.setData({ errorMsg: '请输入手机号' }); return; }
    if (!/^\d{11}$/.test(phone)) { this.setData({ errorMsg: '手机号必须是11位数字' }); return; }
    if (!password) { this.setData({ errorMsg: '请输入密码' }); return; }
    if (password.length < 6) { this.setData({ errorMsg: '密码长度不能少于6位' }); return; }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/v1/auth/login`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone, password },
      success: (res) => {
        if (res.data.code === 0) {
          const { token, id, phone: userPhone, nickname, role } = res.data.data;
          const userInfo = { id, phone: userPhone, nickname, role };

          app.setToken(token);
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);

          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            // 首页是 tabBar 页面，必须用 switchTab 跳转
            wx.switchTab({ url: '/pages/home/home' });
          }, 800);
        } else {
          this.setData({ errorMsg: res.data?.message || '登录失败，请检查账号密码' });
        }
      },
      fail: () => {
        this.setData({ errorMsg: '网络连接失败，请稍后重试' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // ===== 注册逻辑（需求3.1：支持手机号注册）=====

  onRegister() {
    const { phone, password, confirmPassword, nickname } = this.data;

    // 表单验证
    if (!phone) { this.setData({ errorMsg: '请输入手机号' }); return; }
    if (!/^\d{11}$/.test(phone)) { this.setData({ errorMsg: '手机号必须是11位数字' }); return; }
    if (!password) { this.setData({ errorMsg: '请设置密码' }); return; }
    if (password.length < 6) { this.setData({ errorMsg: '密码至少6位' }); return; }
    if (password !== confirmPassword) { this.setData({ errorMsg: '两次输入的密码不一致' }); return; }

    this.setData({ loading: true });

    // 调用后端注册接口
    wx.request({
      url: `${app.globalData.baseUrl}/api/v1/auth/register`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { phone, password, nickname: nickname || undefined, role: 'patient' },  // 第10大节：显式注册为patient角色
      success: (res) => {
        if (res.data.code === 0) {
          // 注册成功 → 自动登录
          const registeredUser = res.data.data;
          wx.showToast({
            title: '注册成功',
            icon: 'success',
            duration: 1500
          });

          // 1.5秒后切换到登录模式并自动填充手机号
          setTimeout(() => {
            this.setData({
              isRegister: false,
              password: '',
              confirmPassword: '',
              nickname: '',
              errorMsg: '',
              loading: false,
              phone: phone  // 保留手机号方便用户直接登录
            });
            wx.showToast({ title: `注册成功，请登录`, icon: 'none' });
          }, 1000);
        } else {
          this.setData({
            errorMsg: res.data?.message || '注册失败，该手机号可能已注册'
          });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        this.setData({ errorMsg: '网络连接失败，请稍后重试' });
        this.setData({ loading: false });
      }
    });
  }
});
