/**
 * @file 作息设置页（第8大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * 功能：
 *   - 就寝时间：picker mode="time"
 *   - 起床时间：picker mode="time"
 *   - 日出模拟时长：slider (5-30分钟)
 *   - 加载：GET /api/setting/plan
 *   - 保存：PUT /api/setting/plan
 */

const app = getApp();

Page({
  data: {
    bedTime: '23:00',
    wakeTime: '07:00',
    sunriseDuration: 10,
    bedTimeDisplay: '',
    wakeTimeDisplay: '',
    loading: true,
    saving: false
  },

  onShow() {
    this.loadSettings();
  },

  /** 加载用户作息设置 */
  loadSettings() {
    const token = app.getToken();
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/setting/plan`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const d = res.data.data;
          this.setData({
            bedTime: d.bed_time || '23:00',
            wakeTime: d.wake_time || '07:00',
            sunriseDuration: d.sunrise_duration_minutes ?? 10,
            bedTimeDisplay: (d.bed_time || '23:00').replace(':', ':'),
            wakeTimeDisplay: (d.wake_time || '07:00').replace(':', ':')
          });
        } else if (res.statusCode === 401) {
          app.clearToken();
          wx.showToast({ title: '登录已过期', icon: 'none' });
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

  /** 就寝时间选择 */
  onBedTimeChange(e) {
    const t = e.detail.value; // HH:MM
    this.setData({ bedTime: t, bedTimeDisplay: t });
  },

  /** 起床时间选择 */
  onWakeTimeChange(e) {
    const t = e.detail.value;
    this.setData({ wakeTime: t, wakeTimeDisplay: t });
  },

  /** 日出模拟时长 slider 变化 */
  onSunriseChange(e) {
    this.setData({ sunriseDuration: e.detail.value });
  },

  /** 保存设置 */
  saveSettings() {
    const token = app.getToken();
    if (!token) return;

    this.setData({ saving: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/setting/plan`,
      method: 'PUT',
      header: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        bed_time: this.data.bedTime,
        wake_time: this.data.wakeTime,
        sunrise_duration_minutes: this.data.sunriseDuration
      },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          wx.showToast({ title: '保存成功', icon: 'success' });
        } else {
          wx.showToast({
            title: res.data?.message || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ saving: false });
      }
    });
  }
});
