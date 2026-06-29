/**
 * @file 睡眠分期报告页逻辑（第5大节）—— ECharts 柱状图 + 日期选择器
 * @author 周灿
 * @date 2026-06-30
 */

const app = getApp();

// 引入 ECharts（从组件目录）
// eslint-disable-next-line no-undef
const ec = require('../../components/ec-canvas/echarts');

Page({
  data: {
    selectedDate: '',
    today: '',
    loading: false,
    stagesData: null,
    chartInstance: null,
    summary: null,
    dataSource: '',
    error: ''
  },

  onLoad(options) {
    // 初始化日期：默认昨天，或接收传入的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    this.setData({
      selectedDate: options.date || dateStr,
      today: new Date().toISOString().split('T')[0]
    });

    // 加载分期数据
    this.loadStages();
  },

  onShow() {
    // 页面显示时刷新图表（解决 TabBar 切回时尺寸问题）
    if (this.data.chartInstance && this.data.stagesData) {
      setTimeout(() => {
        this.renderChart(this.data.stagesData);
      }, 200);
    }
  },

  /**
   * ECharts 组件初始化回调（由 ec-canvas 触发 init 事件）
   */
  initChart(e) {
    const { canvas, width, height, dpr } = e.detail;

    const chart = ec.init(canvas, null, {
      width: width,
      height: height,
      devicePixelRatio: dpr
    });

    this.setData({ chartInstance: chart });

    // 如果已有数据，立即渲染
    if (this.data.stagesData) {
      this.renderChart(this.data.stagesData);
    }
  },

  /**
   * 加载睡眠分期数据
   */
  loadStages() {
    const token = app.getToken();
    if (!token) {
      this.setData({ error: '请先登录' });
      return;
    }

    this.setData({ loading: true, error: '' });

    wx.request({
      url: `${app.globalData.baseUrl}/api/sleep/report/stages?date=${this.data.selectedDate}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          const stages = res.data.data.stages;
          const source = res.data.data.source || 'db';

          this.setData({
            stagesData: stages,
            dataSource: source === 'generated' ? '新生成' : source === 'db' ? '数据库' : '已转换',
            error: ''
          });

          // 计算统计摘要
          this.calcSummary(stages);

          // 渲染图表（等 chartInstance 就绪后）
          if (this.data.chartInstance) {
            this.renderChart(stages);
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          app.clearToken();
          this.setData({
            error: '登录已过期，请重新登录',
            stagesData: null,
            summary: null
          });
        } else {
          this.setData({
            error: res.data?.message || '获取数据失败'
          });
        }
      },
      fail: () => {
        this.setData({ error: '网络连接失败，请检查后端服务是否启动' });
      },
      complete: () => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  /**
   * 计算分期统计摘要
   * 编码: 0=清醒, 1=浅睡, 2=深睡, 3=REM
   */
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

    this.setData({
      summary: { awake, light, deep, rem }
    });
  },

  /**
   * 渲染 ECharts 分期柱状图
   * 颜色区分：
   *   清醒(0): #ff6b6b 红色
   *   浅睡(1): #51cf66 绿色
   *   深睡(2): #339af0 蓝色
   *   REM(3):  #cc5de8 紫色
   */
  renderChart(stages) {
    if (!stages || !this.data.chartInstance) return;

    const times = stages.map(s => s.time);
    const values = stages.map(s => s.stage);
    
    // 根据阶段值映射到不同颜色
    const colors = values.map(v => {
      switch (v) {
        case 0: return '#ff6b6b'; // 红色 - 清醒
        case 1: return '#51cf66'; // 绿色 - 浅睡
        case 2: return '#339af0'; // 蓝色 - 深睡
        case 3: return '#cc5de8'; // 紫色 - REM
        default: return '#999';
      }
    });

    const option = {
      backgroundColor: '#fff',
      grid: {
        top: 40,
        right: 20,
        bottom: 60,
        left: 50,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter(params) {
          const idx = params[0].dataIndex;
          const val = stages[idx].stage;
          const names = ['清醒', '浅睡', '深睡', 'REM'];
          const colorNames = ['#ff6b6b', '#51cf66', '#339af0', '#cc5de8'];
          return `${params[0].name}<br/>${names[val]}<br/>`;
        }
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          fontSize: 9,
          color: '#666',
          interval: 7, // 每8个显示一个标签
          rotate: 45
        },
        axisLine: { lineStyle: { color: '#ddd' } }
      },
      yAxis: {
        type: 'value',
        name: '分期',
        min: -0.5,
        max: 3.5,
        interval: 1,
        inverse: false,
        axisLabel: {
          formatter(value) {
            const labels = ['清醒', '浅睡', '深睡', 'REM'];
            return labels[value] !== undefined ? labels[value] : '';
          },
          fontSize: 11,
          color: '#666'
        },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      series: [{
        name: '睡眠分期',
        type: 'bar',
        barWidth: '60%',
        data: values.map((val, idx) => ({
          value: val,
          itemStyle: { color: colors[idx], borderRadius: [2, 2, 0, 0] }
        })),
        animationDuration: 800,
        animationEasing: 'cubicOut'
      }]
    };

    try {
      this.data.chartInstance.setOption(option, true); // true = 不合并，完全替换
    } catch (err) {
      console.error('[Report] 渲染图表失败:', err);
    }
  },

  /**
   * 日期选择器变更
   */
  onDateChange(e) {
    const newDate = e.detail.value;
    if (newDate === this.data.selectedDate) return;

    this.setData({ selectedDate: newDate });
    this.loadStages(); // 切换日期后自动刷新
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadStages();
  }
});
