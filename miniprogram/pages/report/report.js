/**
 * @file 睡眠分期报告页逻辑（第5大节）—— View柱状图版
 * @author 周灿
 * @date 2026-06-30
 *
 * 完全不使用 Canvas！用 <view> 元素 + CSS flex 拼出柱状图
 * 解决微信开发者工具 Canvas 2D Timeout 问题
 */

const app = getApp();

// 分期值 → CSS类名 映射
const STAGE_CLASSES = ['bar-awake', 'bar-light', 'bar-deep', 'bar-rem'];

Page({
  data: {
    selectedDate: '',
    today: '',
    loading: false,
    stagesData: null,   // 原始API数据（含 stage/time）
    summary: null,
    dataSource: '',
    error: ''
  },

  onLoad(options) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    this.setData({
      selectedDate: options.date || dateStr,
      today: new Date().toISOString().split('T')[0]
    });

    this.loadStages();
  },

  /**
   * 加载睡眠分期数据
   */
  loadStages() {
    const token = app.getToken();
    if (!token) { this.setData({ error: '请先登录' }); return; }

    this.setData({ loading: true, error: '' });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/stages?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const stages = res.data.data.stages;

          // 为每个数据点计算：CSS类名 + 柱子高度百分比
          const enriched = stages.map((s, idx) => ({
            time: s.time,
            stage: s.stage,
            stageClass: STAGE_CLASSES[s.stage] || 'bar-awake',
            // stage 0→最矮(15%), 3→最高(90%)
            barHeight: Math.round(15 + (s.stage / 3) * 75)
          }));

          // X轴标签：每8个取一个时间
          const xLabels = [];
          for (let i = 0; i < stages.length; i += 8) {
            xLabels.push(String(stages[i].time).slice(0, 5));
          }

          this.setData({
            stagesData: enriched,
            xLabels: xLabels,
            dataSource: res.data.data.source || 'db',
            error: ''
          });
          this.calcSummary(stages);

        } else if (res.statusCode === 401 || res.statusCode === 403) {
          app.clearToken();
          this.setData({ error: '登录已过期', stagesData: null, summary: null });
        } else {
          this.setData({ error: res.data?.message || '获取数据失败' });
        }
      },
      fail: () => { this.setData({ error: '网络连接失败' }); },
      complete: () => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  calcSummary(stages) {
    let awake = 0, light = 0, deep = 0, rem = 0;
    for (const s of stages) {
      switch (s.stage) {
        case 0: awake++; break;
        case 1: light++; break;
        case 2: deep++; break;
        case 3: rem++; break;
      }
    }
    this.setData({ summary: { awake, light, deep, rem } });
  },

  onDateChange(e) {
    const newDate = e.detail.value;
    if (newDate === this.data.selectedDate) return;
    this.setData({ selectedDate: newDate });
    this.loadStages();
  },

  onPullDownRefresh() {
    this.loadStages();
  }
});
