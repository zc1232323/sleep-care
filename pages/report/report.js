/**
 * @file 睡眠分期报告页（第5+6大节）—— 分期柱状图 + 噪音折线图
 * @author 周灿
 * @date 2026-06-30
 *
 * 用 <view> 元素拼图表，不依赖 Canvas/ECharts，彻底避免 Timeout
 */

const app = getApp();

const STAGE_CLASSES = ['bar-awake', 'bar-light', 'bar-deep', 'bar-rem'];

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

  /**
   * 同时加载分期数据 + 噪音数据
   */
  loadData() {
    const token = app.getToken();
    if (!token) { this.setData({ error: '请先登录' }); return; }
    this.setData({ loading: true, error: '' });

    // 并行请求两个接口
    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/stages?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => this.handleStagesRes(res),
      fail: () => { /* 单个失败不影响 */ }
    });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/noise?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => this.handleNoiseRes(res),
      fail: () => { /* 单个失败不影响 */ }
    });
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
      this.setData({ stagesData: enriched, xLabels, stageSource: res.data.data.source || 'db' });
      this.calcSummary(stages);
    } else if (res.statusCode === 401) {
      app.clearToken();
      this.setData({ error: '登录已过期' });
    }
    this.checkLoadComplete();
  },

  /** 处理噪音接口响应 */
  handleNoiseRes(res) {
    if (res.statusCode === 200 && res.data.code === 0) {
      const noises = res.data.data.noises;
      
      // 计算噪音折线图的 Y 轴百分比（20~70dB 映射到 0%~100%）
      const minDb = 20, maxDb = 70;
      const enriched = noises.map(n => ({
        time: n.time,
        value: n.value,
        period: n.period,
        // 百分比高度：value 越高，百分比越高（从底部往上长）
        pctHeight: Math.max(0, Math.min(100, ((n.value - minDb) / (maxDb - minDb)) * 100))
      }));

      // X轴标签：每24个取一个时间（每2小时）
      const nxLabels = [];
      for (let i = 0; i < noises.length; i += 24) {
        nxLabels.push(String(noises[i].time).slice(0, 5));
      }

      this.setData({ noiseData: enriched, noiseXLabels: nxLabels, noiseSource: res.data.data.source || 'db' });
    }
    this.checkLoadComplete();
  },

  /** 检查两个请求是否都完成 */
  checkLoadComplete() {
    // 只要有一个完成就关闭 loading（用户体验更好）
    if (this.data.stagesData || this.data.noiseData) {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
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
    this.setData({
      selectedDate: newDate,
      stagesData: null,
      noiseData: null,
      summary: null
    });
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
  }
});
