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

// 启动服务
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] SleepCare 后端服务已启动: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Server] 数据库初始化失败:', err);
    process.exit(1);
  });
