/**
 * @file 小程序入口文件
 * @author 周灿
 * @date 2026-06-29
 */

App({
  globalData: {
    baseUrl: 'http://172.30.157.136:3000',
    token: wx.getStorageSync('token') || '',
    userInfo: null
  },

  onLaunch() {
    // 检查本地存储的登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  }
});
