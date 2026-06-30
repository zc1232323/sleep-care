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
    const token = app.getToken();
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
    const token = app.getToken();
    if (!token) {
      this.setData({ hasToken: false });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/daily`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,  // 15秒超时（默认5秒太短）
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const data = res.data.data;
          const score = data.sleep_score;

          let level = 'fair';
          if (score >= 85) level = 'excellent';
          else if (score >= 70) level = 'good';
          else if (score < 60) level = 'poor';

          // 格式化总时长为 "X时Y分"
          const totalMin = data.total_sleep_minutes || 0;
          const h = Math.floor(totalMin / 60);
          const m = totalMin % 60;
          const totalDuration = `${h}时${m}分`;

          // 计算深睡比例（百分比）
          let deepRatio = '0%';
          if (totalMin > 0) {
            const deepPct = ((data.deep_sleep_minutes || 0) / totalMin * 100).toFixed(0);
            deepRatio = `${deepPct}%`;
          }

          this.setData({
            reportData: {
              ...data,
              total_duration: totalDuration,
              deep_ratio: deepRatio,
              // 预计算详细时长（WXML不能直接调用JS函数）
              deep_duration: this.formatMin(data.deep_sleep_minutes || 0),
              light_duration: this.formatMin(data.light_sleep_minutes || 0),
              awake_duration: this.formatMin(data.awake_minutes || 0),
            },
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
    app.clearToken();
    this.setData({ hasToken: false, reportData: null });
    wx.redirectTo({ url: '/pages/login/login' });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    // 延迟一点让动画显示出来
    setTimeout(() => {
      this.loadDailyReport();
    }, 300);
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearToken();
          wx.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/login/login' });
          }, 1000);
        }
      }
    });
  },

  /**
   * 跳转到详细分期报告页（第5大节）
   * 注意：报告页是 tabBar 页面，必须用 switchTab 不能用 navigateTo
   * 通过 globalData 传递日期参数（switchTab 不支持 ?参数）
   */
  goToReport() {
    const date = this.data.reportData ? this.data.reportData.report_date : '';
    // 把选中日期存到全局，report 页 onShow 时读取
    if (date) {
      app.globalData.selectedReportDate = date;
    }
    wx.switchTab({
      url: '/pages/report/report'
    });
  }
});
