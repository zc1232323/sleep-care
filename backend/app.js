/**
 * @file Express 应用主入口
 * @author 周灿
 * @date 2026-06-29
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const doctorRoutes = require('./routes/doctor');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 根路由 — 服务健康检查
app.get('/', (req, res) => {
  res.json({
    code: 0,
    message: 'SleepCare API 服务运行中',
    data: {
      name: 'SleepCare Backend',
      version: '1.0.0',
    },
  });
});

// 挂载路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/sleep/report', reportRoutes);  // 包含 /daily 和 /stages
app.use('/api/setting', settingRoutes);     // 第8大节：作息设置
app.use('/api/doctor', doctorRoutes);      // 第9大节：医生授权管理

// 启动服务
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] SleepCare 后端服务已启动: http://localhost:${PORT}`);
      console.log(`[Server] 局域网访问: http://172.30.157.136:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Server] 数据库初始化失败:', err);
    process.exit(1);
  });
