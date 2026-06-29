/**
 * @file 设备列表页面逻辑 —— 对齐讲义（使用 getToken，字段对齐后端）
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
    const token = app.getToken();

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
        if (res.data.code === 0) {
          // 后端返回的 data 直接是数组（对齐讲义格式）
          this.setData({
            deviceList: res.data.data || []
          });
        } else if (res.data.code === 401 || res.data.code === 403) {
          app.clearToken();
          wx.redirectTo({ url: '/pages/login/login' });
        } else {
          wx.showToast({
            title: res.data?.message || '获取设备列表失败',
            icon: 'none'
          });
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
   * 添加虚拟设备
   */
  handleAddDevice() {
    const token = app.getToken();
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    wx.request({
      url: `${app.globalData.baseUrl}/api/v1/devices/add`,
      method: 'POST',
      data: { is_virtual: true },
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      success: (res) => {
        if (res.data.code === 0) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          this.loadDeviceList();
        } else {
          wx.showToast({
            title: res.data?.message || '添加失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  },

  /**
   * 删除设备（带确认弹窗）
   */
  handleDelete(e) {
    const deviceId = e.currentTarget.dataset.id;
    const token = app.getToken();

    wx.showModal({
      title: '确认删除',
      content: '确定要解绑该设备吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.baseUrl}/api/v1/devices/${deviceId}`,
            method: 'DELETE',
            header: { Authorization: `Bearer ${token}` },
            success: (res) => {
              if (res.data.code === 0) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                this.loadDeviceList();
              } else {
                wx.showToast({
                  title: res.data?.message || '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.showToast({ title: '网络请求失败', icon: 'none' });
            }
          });
        }
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
