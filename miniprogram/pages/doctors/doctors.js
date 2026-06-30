/**
 * @file 医生授权管理页（第9+10大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * 功能：
 *   - 从医生列表选择（GET /api/users/doctors），传 doctor_id 添加授权
 *   - 显示已授权医生列表（GET /api/doctor/granted）
 *   - 撤销授权（DELETE /api/doctor/revoke + 确认对话框）
 */

const app = getApp();

Page({
  data: {
    allDoctors: [],            // 系统中所有医生（卡片列表）
    selectedDoctorId: null,    // 当前选中的医生 id
    selectedDoctorName: '',    // 当前选中的医生姓名
    grantedDoctors: [],        // 已授权医生列表
    adding: false,
    loading: true,
    error: ''
  },

  onShow() {
    this.loadAllDoctors();
    this.loadGrantedDoctors();
  },

  /** 加载所有医生（第10大节：loadDoctors） */
  loadAllDoctors() {
    const token = app.getToken();
    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/api/users/doctors`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const list = res.data.data || [];
          const names = list.map(d => `${d.nickname} (${d.phone})`);
          this.setData({ allDoctors: list, doctorNames: names });
        }
      }
    });
  },

  /** 选择医生（点击卡片高亮） */
  selectDoctor(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const doctor = this.data.allDoctors.find(d => d.id == id);
    if (doctor) {
      this.setData({
        selectedDoctorId: doctor.id,
        selectedDoctorName: doctor.nickname || doctor.name || name || '未知医生'
      });
    }
  },

  /** 加载已授权的医生列表 */
  loadGrantedDoctors() {
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
          this.setData({ grantedDoctors: res.data.data || [] });
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

  /** 添加医生授权（传 doctor_id） */
  addDoctor() {
    if (!this.data.selectedDoctorId) {
      wx.showToast({ title: '请先选择医生', icon: 'none' });
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
      data: { doctor_id: this.data.selectedDoctorId },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          wx.showToast({ title: '授权成功', icon: 'success' });
          this.setData({ selectedDoctorId: null, selectedDoctorName: '', adding: false });
          this.loadGrantedDoctors();
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
          this.loadGrantedDoctors();
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
