/**
 * @file ec-canvas 组件 —— 微信小程序 ECharts 图表组件（第5大节）
 * 基于 Canvas 2D API，支持柱状图、折线图等
 *
 * 使用方式（父组件中）：
 * 1. WXML: <ec-canvas id="mychart" canvas-id="mychart-dom" bind:init="initChart"></ec-canvas>
 * 2. JS:
 *    initChart(e) {
 *      const { canvas, width, height } = e.detail;
 *      this.chart = echarts.init(canvas, null, { width, height, devicePixelRatio: wx.getSystemInfoSync().pixelRatio });
 *      this.chart.setOption(option);
 *    }
 */
Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    }
  },

  data: {},

  methods: {
    /**
     * 初始化 Canvas 并通知父组件
     */
    init() {
      return new Promise((resolve, reject) => {
        const query = this.createSelectorQuery();
        query.select(`#${this.properties.canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0]) {
              console.error('[ec-canvas] Canvas 节点未找到');
              reject(new Error('Canvas not found'));
              return;
            }

            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            // 设置画布实际尺寸
            const dpr = wx.getSystemInfoSync().pixelRatio;
            canvas.width = res[0].width * dpr;
            canvas.height = res[0].height * dpr;
            ctx.scale(dpr, dpr);

            resolve({
              canvas: canvas,
              ctx: ctx,
              width: res[0].width,
              height: res[0].height,
              dpr: dpr
            });

            // 触发 init 事件给父组件
            this.triggerEvent('init', {
              canvas: canvas,
              ctx: ctx,
              width: res[0].width,
              height: res[0].height,
              dpr: dpr
            });
          });
      });
    }
  }
});
