/**
 * @file Express 应用主入口
 * @author 周灿
 * @date 2026-06-29
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const doctorRoutes = require('./routes/doctor');
const userRoutes = require('./routes/users');

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

const dbInitState = { status: 'pending', error: null };

// 数据库诊断端点（第13大节：CloudBase MySQL 调试）
app.get('/api/health', async (req, res) => {
  try {
    const { getDb, DB_TYPE } = require('./db/connection');
    // 设置 5 秒超时，避免等待 MySQL 重试 150 秒
    const db = await Promise.race([
      getDb(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('数据库初始化超时')), 5000)),
    ]);

    if (DB_TYPE === 'mysql') {
      try {
        const [tables] = await db.$pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        const [dbName] = await db.$pool.query('SELECT DATABASE() AS db');
        res.json({
          code: 0,
          message: 'MySQL 连接正常',
          data: {
            db_type: 'mysql',
            database: dbName[0]?.db || 'unknown',
            tables: tableNames,
            table_count: tableNames.length,
          },
        });
      } catch (dbErr) {
        res.json({
          code: 1001,
          message: 'MySQL 查询失败',
          data: { error: dbErr.message, code: dbErr.code },
        });
      }
    } else {
      const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      res.json({
        code: 0,
        message: 'SQLite 连接正常',
        data: {
          db_type: 'sqlite',
          tables: tables.length > 0 ? tables[0].values.flat() : [],
        },
      });
    }
  } catch (err) {
    res.json({
      code: 1001,
      message: '数据库连接失败',
      data: { error: err.message, init_state: dbInitState },
    });
  }
});

// 挂载路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/sleep/report', reportRoutes);  // 包含 /daily 和 /stages
app.use('/api/setting', settingRoutes);     // 第8大节：作息设置
app.use('/api/doctor', doctorRoutes);      // 第9+11大节：医生授权管理
app.use('/api/users', userRoutes);         // 第11大节：用户列表

// 第11大节：Express 静态文件服务（医生端 Web 页面）
app.use(express.static(path.join(__dirname, 'public')));

// 统一错误处理中间件（第12大节：性能优化/错误处理）
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// 启动服务（先启动 HTTP，让 CloudBase 健康探针通过）
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] SleepCare 后端服务已启动: http://localhost:${PORT}`);
  console.log(`[Server] 局域网访问: http://172.30.157.136:${PORT}`);
});

// 数据库初始化在后台进行，不阻塞服务启动
initDatabase()
  .then(() => {
    dbInitState.status = 'ready';
    console.log('[Server] 数据库初始化完成');
  })
  .catch((err) => {
    dbInitState.status = 'failed';
    dbInitState.error = err.message;
    console.error('[Server] 数据库初始化失败:', err);
  });
