/**
 * @file 数据库连接模块（第12大节：支持 SQLite / MySQL 切换）
 * @author 周灿
 * @date 2026-07-01
 *
 * 通过环境变量 DATABASE_TYPE 切换数据库：
 *   - sqlite（默认）：使用 sql.js，数据库文件 sleep_care.db
 *   - mysql：使用 mysql2/promise，通过环境变量配置连接
 *
 * 对外统一暴露 getDb() / saveDb() 接口。
 */

const fs = require('fs');
const path = require('path');

const DB_TYPE = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

const DB_PATH = path.resolve(__dirname, '../../sleep_care.db');

/** 全局数据库实例 */
let db = null;

/**
 * 创建 MySQL 兼容包装器
 * 提供与 sql.js 近似的 exec() / run() 方法
 */
function createMysqlWrapper(pool) {
  return {
    async exec(sql, params = []) {
      const [rows] = await pool.query(sql, params);

      // INSERT/UPDATE/DELETE 返回 ResultSetHeader，无数据行
      if (!Array.isArray(rows)) {
        return [];
      }

      // 无数据行时返回空数组（与 sql.js 行为一致）
      if (rows.length === 0) {
        return [];
      }

      const columns = Object.keys(rows[0]);
      const values = rows.map(row => columns.map(c => row[c]));
      return [{ columns, values }];
    },

    async run(sql, params = []) {
      await pool.query(sql, params);
    },

    // MySQL 不需要文件持久化
    $pool: pool,
  };
}

/**
 * 初始化 SQLite 数据库（sql.js）
 */
async function initSqlite() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] 已加载现有数据库文件:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[DB] 已创建新数据库（内存中）');
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * 初始化 MySQL 连接池
 */
async function initMysql() {
  const mysql = require('mysql2/promise');

  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'sleep_care';

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,

    // 第13大节：CloudBase 云托管 MySQL 连接优化
    charset: 'utf8mb4',
    timezone: '+08:00',
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  // 第13大节：MySQL 自动暂停后冷启动很慢，需要重试机制
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 30000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const testConn = await pool.getConnection();
      try {
        await testConn.query('SELECT 1 AS connection_test');
        console.log(`[DB] MySQL 连接测试通过（尝试 ${attempt}/${MAX_RETRIES}）`);
      } finally {
        testConn.release();
      }
      break;
    } catch (err) {
      console.error(`[DB] MySQL 连接失败（尝试 ${attempt}/${MAX_RETRIES}）: ${err.code || err.message}`);
      if (attempt === MAX_RETRIES) {
        throw new Error(`MySQL 连接失败（已重试 ${MAX_RETRIES} 次）: ${err.message}`);
      }
      console.log(`[DB] ${RETRY_DELAY_MS / 1000}s 后重试...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  db = createMysqlWrapper(pool);
  console.log(`[DB] 已连接到 MySQL: ${host}:${port}/${database}`);
  return db;
}

/**
 * 获取数据库实例（单例）
 * @returns {Promise<object>} 数据库实例（sql.js Database 或 MySQL 包装器）
 */
async function getDb() {
  if (db) return db;

  if (DB_TYPE === 'mysql') {
    return initMysql();
  }

  return initSqlite();
}

/**
 * 将数据库持久化到文件
 * 对 SQLite 实际写入文件；对 MySQL 为无操作（MySQL 自行持久化）
 */
function saveDb() {
  if (!db) return;

  if (DB_TYPE === 'sqlite') {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('[DB] 数据库已持久化到:', DB_PATH);
    return;
  }

  // MySQL 无需手动 saveDb
  console.log('[DB] MySQL 不需要手动持久化');
}

module.exports = { getDb, saveDb, DB_PATH, DB_TYPE };
