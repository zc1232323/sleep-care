/**
 * @file SQLite 数据库连接模块（基于 sql.js）
 * @author 周灿
 * @date 2026-06-29
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

/** 数据库文件存储路径（项目根目录） */
const DB_PATH = path.resolve(__dirname, '../../sleep_care.db');

/** 全局数据库实例 */
let db = null;

/**
 * 获取数据库实例（单例）
 * @returns {Promise<import('sql.js').Database>} 数据库实例
 */
async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // 如果数据库文件已存在，从文件加载；否则创建新数据库
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] 已加载现有数据库文件:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[DB] 已创建新数据库（内存中）');
  }

  // 启用外键约束（ON DELETE CASCADE 依赖此设置）
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * 将数据库持久化到文件
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log('[DB] 数据库已持久化到:', DB_PATH);
}

module.exports = { getDb, saveDb, DB_PATH };
