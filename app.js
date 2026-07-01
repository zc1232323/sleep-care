/**
 * @file 小程序入口文件 —— 对齐讲义，提供 setToken/getToken 全局方法
 * @author 周灿
 * @date 2026-07-01
 */

const { BASE_URL } = require('./utils/config');

App({
  globalData: {
    baseUrl: BASE_URL,
    userInfo: null,
    token: null
  },

  onLaunch() {
    // 启动时从本地缓存恢复 token
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  },

  /**
   * 设置 Token（同步写入全局变量 + 本地缓存）
   * @param {String} token JWT 令牌
   */
  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },

  /**
   * 获取 Token（优先全局变量，回退本地缓存）
   * @returns {String|null}
   */
  getToken() {
    return this.globalData.token || wx.getStorageSync('token') || null;
  },

  /**
   * 清除 Token（登出时调用）
   */
  clearToken() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
