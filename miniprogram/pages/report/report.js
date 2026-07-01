/**
 * @file 睡眠报告页（第5+6+7大节）—— 分期柱状图 + 噪音柱状图 + 评分趋势图
 * @author 周灿
 * @date 2026-06-30
 *
 * 用 <view> 元素拼图表，不依赖 Canvas/ECharts，彻底避免 Timeout
 */

const app = getApp();

const STAGE_CLASSES = ['bar-awake', 'bar-light', 'bar-deep', 'bar-rem'];

// 评分颜色：根据分数区间着色（绿→黄→红）
function scoreColorClass(score) {
  if (score >= 85) return 'dot-excellent';  // 绿色
  if (score >= 70) return 'dot-good';       // 浅绿
  if (score >= 60) return 'dot-fair';        // 黄色
  return 'dot-poor';                     // 红色
}

function scoreBarClass(score) {
  if (score >= 85) return 'bar-excellent';
  if (score >= 70) return 'bar-good';
  if (score >= 60) return 'bar-fair';
  return 'bar-poor';
}

Page({
  data: {
    selectedDate: '',
    today: '',
    loading: false,
    // 分期数据
    stagesData: null,
    xLabels: [],
    summary: null,
    stageSource: '',
    // 噪音数据
    noiseData: null,
    noiseXLabels: [],
    noiseSource: '',
    // 第7大节：评分汇总
    currentPeriod: 'day',
    summaryData: null,   // { labels, points, avg_score, avgPct }
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
    this.loadData();
  },

  /** 从首页 switchTab 过来时，读取 storage 中的日期 */
  onShow() {
    const storageDate = wx.getStorageSync('selectedReportDate');
    if (storageDate && this.data.selectedDate !== storageDate) {
      console.log('[Report] 收到首页日期:', storageDate, '当前:', this.data.selectedDate);
      this.setData({ selectedDate: storageDate });
      this.loadData();
      // 用完清掉
      wx.removeStorageSync('selectedReportDate');
    }
  },

  /**
   * 加载全部数据（分期 + 噪音 + 汇总评分）
   */
  loadData() {
    const token = app.getToken();
    if (!token) { this.setData({ error: '请先登录' }); return; }
    this.setData({ loading: true, error: '' });

    // 并行请求三个接口
    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/stages?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => this.handleStagesRes(res),
      fail: () => { this.setData({ loading: false }); wx.stopPullDownRefresh(); }
    });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/noise?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => this.handleNoiseRes(res),
      fail: () => { this.setData({ loading: false }); wx.stopPullDownRefresh(); }
    });

    // 第7大节：评分汇总
    this.loadSummary();
  },

  /** 加载评分汇总 */
  loadSummary() {
    const token = app.getToken();
    if (!token) return;
    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/summary?period=${this.data.currentPeriod}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const d = res.data.data;
          const chartData = this.buildTrendChart(d.labels, d.scores, d.avg_score);
          this.setData({ summaryData: chartData, loading: false });
          wx.stopPullDownRefresh();
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          app.clearToken();
          this.setData({ error: '登录已过期', loading: false });
          wx.stopPullDownRefresh();
        }
      },
      fail: () => { this.setData({ loading: false }); wx.stopPullDownRefresh(); }
    });
  },

  /** 构建趋势图数据（rpx高度 + 颜色分类） */
  buildTrendChart(labels, scores, avgScore) {
    // 图表区域高度约280rpx，Y轴范围 40~100（跨度60分）
    const chartH = 260;
    const minScore = 40, maxScore = 100;
    const range = maxScore - minScore; // 60

    const points = labels.map((label, i) => {
      const sc = scores[i] !== undefined ? scores[i] : 70;
      // 分数 → rpx 高度（从基线往上长）
      let pct = Math.max(0, Math.min(1, (sc - minScore) / range));
      const barH = pct * chartH;
      // 数据点圆心位置
      const dotRpx = barH;
      return {
        label,
        value: sc,
        pctHeight: Math.round(pct * 100),       // markLine 用 %
        barHeightRpx: Math.max(4, Math.round(barH)),  // 柱子高度 rpx
        dotRpx: Math.max(4, Math.round(dotRpx)),     // 圆点位置 rpx
        colorClass: scoreColorClass(sc),
        barClass: scoreBarClass(sc)
      };
    });

    // 平均分的百分位置（用于 markLine）
    const avgPct = Math.max(0, Math.min(1, (avgScore - minScore) / range));

    return { labels, points, avg_score: avgScore, avgPct };
  },

  /** 处理分期接口响应 */
  handleStagesRes(res) {
    if (res.statusCode === 200 && res.data.code === 0) {
      const stages = res.data.data.stages;
      const heightMap = [30, 120, 230, 330];
      const enriched = stages.map(s => ({
        time: s.time, stage: s.stage,
        stageClass: STAGE_CLASSES[s.stage] || 'bar-awake',
        barHeightRpx: heightMap[s.stage] || 30
      }));
      const xLabels = [];
      for (let i = 0; i < stages.length; i += 8) {
        xLabels.push(String(stages[i].time).slice(0, 5));
      }
      const summary = this.calcSummary(stages);
      this.setData({
        stagesData: enriched,
        xLabels,
        stageSource: res.data.data.source || 'db',
        summary,
        loading: false
      });
      wx.stopPullDownRefresh();
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      app.clearToken();
      this.setData({ error: '登录已过期', loading: false });
      wx.stopPullDownRefresh();
    }
  },

  /** 处理噪音接口响应 */
  handleNoiseRes(res) {
    if (res.statusCode === 200 && res.data.code === 0) {
      const noises = res.data.data.noises;
      const enriched = noises.map(n => {
        const v = n.value;
        let h;
        if (v <= 25) h = 20 + (v - 20) * 2.4;
        else if (v <= 40) h = 32 + (v - 25) * 3.2;
        else if (v <= 55) h = 80 + (v - 40) * 4.67;
        else if (v <= 65) h = 150 + (v - 55) * 8;
        else h = 230 + Math.min((v - 65) * 5, 30);
        return {
          time: n.time, value: n.value, period: n.period,
          barHeightRpx: Math.round(h),
          barClass: n.period === 'night' ? 'bar-noise-night' : 'bar-noise-day'
        };
      });
      const nxLabels = [];
      for (let i = 0; i < noises.length; i += 24) {
        nxLabels.push(String(noises[i].time).slice(0, 5));
      }
      this.setData({
        noiseData: enriched,
        noiseXLabels: nxLabels,
        noiseSource: res.data.data.source || 'db',
        loading: false
      });
      wx.stopPullDownRefresh();
    }
  },

  /** 切换日/周/月视图 */
  switchPeriod(e) {
    const period = e.currentTarget.dataset.period;
    if (period === this.data.currentPeriod) return;
    this.setData({ currentPeriod: period, summaryData: null });
    this.loadSummary(); // 重新加载该周期的数据
  },

  calcSummary(stages) {
    let awake = 0, light = 0, deep = 0, rem = 0;
    for (const s of stages) {
      switch (s.stage) { case 0: awake++; break; case 1: light++; break; case 2: deep++; break; case 3: rem++; break; }
    }
    return { awake, light, deep, rem };
  },

  onDateChange(e) {
    const nd = e.detail.value;
    if (nd === this.data.selectedDate) return;
    this.setData({
      selectedDate: nd, stagesData: null, noiseData: null,
      summaryData: null, summary: null
    });
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
  }
});
