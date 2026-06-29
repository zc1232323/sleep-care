/**
 * @file 设备列表页面逻辑
 * @author 周灿
 * @date 2026-06-29
 */

const app = getApp();

Page({
  data: {
    deviceList: [],
    loading: false
  },

  onShow() {
    // 每次显示页面时刷新设备列表
    this.loadDeviceList();
  },

  /**
   * 加载设备列表
   */
  loadDeviceList() {
    const token = wx.getStorageSync('token');

    if (!token) {
      // 未登录，跳转到登录页
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/v1/devices/list`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          this.setData({
            deviceList: res.data.data.list || []
          });
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          // Token 过期或无效，清除登录状态
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          app.globalData.token = '';
          app.globalData.userInfo = null;
          wx.redirectTo({ url: '/pages/login/login' });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDeviceList();
    wx.stopPullDownRefresh();
  }
});
