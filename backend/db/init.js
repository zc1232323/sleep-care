/**
 * @file 数据库初始化模块
 * @author 周灿
 * @date 2026-06-29
 */

const { getDb, saveDb } = require('./connection');
const { ALL_SCHEMAS } = require('./schemas');

/**
 * 初始化数据库：创建所有表结构
 * @returns {Promise<import('sql.js').Database>} 初始化后的数据库实例
 */
async function initDatabase() {
  const db = await getDb();

  console.log('[DB] 开始初始化数据库表结构...');

  for (const schema of ALL_SCHEMAS) {
    db.run(schema);
  }

  // 首次创建时持久化
  saveDb();
  console.log('[DB] 数据库初始化完成');

  return db;
}

module.exports = { initDatabase };
