/**
 * @file 首页逻辑（睡眠报告卡片）
 * @author 周灿
 * @date 2026-06-29
 */

const app = getApp();

Page({
  data: {
    reportData: null,
    loading: false,
    refreshing: false,
    hasToken: false,
    reportDate: '',
    scoreLevel: 'good'
  },

  onShow() {
    // 每次显示时刷新数据
    const token = wx.getStorageSync('token');
    this.setData({
      hasToken: !!token,
      reportDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.')
    });

    if (token) {
      this.loadDailyReport();
    }
  },

  /**
   * 加载每日睡眠报告
   */
  loadDailyReport() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ hasToken: false });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/daily`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const data = res.data.data;
          const score = data.sleep_score;

          let level = 'fair';
          if (score >= 85) level = 'excellent';
          else if (score >= 70) level = 'good';
          else if (score < 60) level = 'poor';

          this.setData({
            reportData: data,
            scoreLevel: level
          });

          if (res.statusCode === 201) {
            wx.showToast({ title: '今日报告已生成', icon: 'success' });
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          this.handleTokenExpired();
        } else {
          wx.showToast({
            title: res.data?.message || '获取报告失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false, refreshing: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  /**
   * 格式化分钟数为 X时Y分
   */
  formatMin(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}时${m}分`;
  },

  /**
   * Token 过期处理
   */
  handleTokenExpired() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    app.globalData.token = '';
    app.globalData.userInfo = null;
    this.setData({ hasToken: false, reportData: null });
    wx.redirectTo({ url: '/pages/login/login' });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadDailyReport();
  }
});
