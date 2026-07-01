/**
 * @file 数据库初始化模块
 * @author 周灿
 * @date 2026-06-29
 */

const { getDb, saveDb, DB_TYPE } = require('./connection');
const { ALL_SCHEMAS } = require('./schemas');

/**
 * 初始化数据库：SQLite 创建表结构；MySQL 仅验证表存在
 * @returns {Promise<object>} 初始化后的数据库实例
 */
async function initDatabase() {
  const db = await getDb();

  console.log('[DB] 开始初始化数据库表结构...');

  if (DB_TYPE === 'mysql') {
    // 第13大节：CloudBase MySQL 表已提前通过 migration-cloudbase.sql 创建
    // 这里只验证核心表存在，避免重复执行 SQLite 语法
    const [users] = await db.$pool.query('SHOW TABLES LIKE ?', ['users']);
    const [devices] = await db.$pool.query('SHOW TABLES LIKE ?', ['devices']);
    const [reports] = await db.$pool.query('SHOW TABLES LIKE ?', ['sleep_reports']);
    const [settings] = await db.$pool.query('SHOW TABLES LIKE ?', ['user_settings']);
    const [auths] = await db.$pool.query('SHOW TABLES LIKE ?', ['doctor_authorizations']);
    console.log('[DB] MySQL 表检查通过：', {
      users: users.length > 0,
      devices: devices.length > 0,
      sleep_reports: reports.length > 0,
      user_settings: settings.length > 0,
      doctor_authorizations: auths.length > 0,
    });
  } else {
    for (const schema of ALL_SCHEMAS) {
      await db.run(schema);
    }
    saveDb();
  }

  console.log('[DB] 数据库初始化完成');
  return db;
}

module.exports = { initDatabase };
