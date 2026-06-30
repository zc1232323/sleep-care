/**
 * @file 医生授权管理页（第9大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * 功能：
 *   - 输入医生手机号 → 添加授权（POST /api/doctor/grant）
 *   - 显示已授权医生列表（GET /api/doctor/granted）
 *   - 撤销授权（DELETE /api/doctor/revoke + 确认对话框）
 */

const app = getApp();

Page({
  data: {
    doctors: [],        // 已授权医生列表
    inputPhone: '',     // 输入的手机号
    adding: false,      // 添加中状态
    loading: true,      // 列表加载中
    error: ''
  },

  onShow() {
    this.loadDoctors();
  },

  /** 加载已授权的医生列表 */
  loadDoctors() {
    const token = app.getToken();
    if (!token) { this.setData({ error: '请先登录' }); return; }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/doctor/granted`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          this.setData({ doctors: res.data.data || [] });
        } else if (res.statusCode === 401) {
          app.clearToken();
          this.setData({ error: '登录已过期' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  /** 手机号输入 */
  onPhoneInput(e) {
    this.setData({ inputPhone: e.detail.value.trim() });
  },

  /** 添加医生授权 */
  addDoctor() {
    const phone = this.data.inputPhone;
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }

    const token = app.getToken();
    if (!token) return;

    this.setData({ adding: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/doctor/grant`,
      method: 'POST',
      header: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: { phone },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          wx.showToast({ title: '授权成功', icon: 'success' });
          this.setData({ inputPhone: '' });
          // 刷新列表
          this.loadDoctors();
        } else if (res.statusCode === 200 && res.data.code === 1002) {
          wx.showToast({ title: '未找到该医生账号', icon: 'none', duration: 2500 });
        } else if (res.statusCode === 200 && res.data.code === 1003) {
          wx.showToast({ title: '不可重复添加', icon: 'none', duration: 2500 });
        } else {
          wx.showToast({ title: res.data?.message || '添加失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ adding: false });
      }
    });
  },

  /** 撤销授权（带确认对话框） */
  revokeDoctor(e) {
    const authId = e.currentTarget.dataset.id;
    const doctorName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '撤销确认',
      content: `确定要撤销对「${doctorName}」医生的授权吗？`,
      confirmText: '确认撤销',
      confirmColor: '#e53935',
      success: (res) => {
        if (res.confirm) {
          this.doRevoke(authId);
        }
      }
    });
  },

  /** 执行撤销请求 */
  doRevoke(authId) {
    const token = app.getToken();
    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/api/doctor/revoke?auth_id=${authId}`,
      method: 'DELETE',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          wx.showToast({ title: '已撤销', icon: 'success' });
          this.loadDoctors();
        } else {
          wx.showToast({ title: res.data?.message || '撤销失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      }
    });
  }
});
