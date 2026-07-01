/**
 * @file SQLite → MySQL 数据迁移脚本（第12大节）
 * @author 周灿
 * @date 2026-07-01
 *
 * 运行方式：
 *   1. 确保 MySQL 已运行并创建数据库 sleep_care
 *   2. 执行 docs/migration.sql 创建表结构
 *   3. 设置环境变量（可选）：
 *      DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD= DB_NAME=sleep_care
 *   4. 运行：node docs/migrate-data.js
 *
 * 说明：
 *   - 从 sleep_care.db（SQLite）读取所有数据
 *   - 写入 MySQL 同名表
 *   - 迁移前会清空目标表，避免主键冲突
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const mysql = require('mysql2/promise');

const DB_PATH = path.resolve(__dirname, '..', 'sleep_care.db');

const TABLES = [
  'users',
  'devices',
  'sleep_reports',
  'user_settings',
  'doctor_authorizations',
];

const COLUMN_LISTS = {
  users: ['id', 'phone', 'password_hash', 'nickname', 'role', 'status', 'created_at', 'updated_at'],
  devices: ['id', 'serial_no', 'user_id', 'nickname', 'is_virtual', 'online_status', 'created_at', 'updated_at'],
  sleep_reports: ['id', 'user_id', 'device_id', 'report_date', 'sleep_score', 'total_sleep_minutes', 'deep_sleep_minutes', 'light_sleep_minutes', 'rem_sleep_minutes', 'awake_minutes', 'awake_count', 'heart_rate_json', 'sleep_stages_json', 'noise_json', 'created_at'],
  user_settings: ['id', 'user_id', 'bed_time', 'wake_time', 'sunrise_duration_minutes', 'sound_type', 'brightness_level', 'volume_level', 'timezone', 'dnd_enabled', 'dnd_start', 'dnd_end', 'created_at', 'updated_at'],
  doctor_authorizations: ['id', 'patient_id', 'doctor_id', 'status', 'expire_date', 'doctor_note', 'requested_at', 'responded_at', 'created_at', 'updated_at'],
};

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[Migrate] SQLite 数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }

  // 1. 读取 SQLite 数据
  console.log('[Migrate] 正在读取 SQLite 数据库...');
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const sqliteDb = new SQL.Database(fileBuffer);

  const data = {};
  for (const table of TABLES) {
    const res = sqliteDb.exec(`SELECT * FROM ${table}`);
    if (res.length > 0 && res[0].values.length > 0) {
      const columns = res[0].columns;
      data[table] = res[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i] === undefined ? null : row[i];
        });
        return obj;
      });
    } else {
      data[table] = [];
    }
    console.log(`[Migrate]  ${table}: ${data[table].length} 条记录`);
  }
  sqliteDb.close();

  // 2. 连接 MySQL
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'sleep_care';

  console.log(`[Migrate] 正在连接 MySQL: ${host}:${port}/${database}...`);
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    // 3. 按依赖顺序清空表（先清空子表，再清父表）
    console.log('[Migrate] 正在清空 MySQL 目标表...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of ['doctor_authorizations', 'sleep_reports', 'user_settings', 'devices', 'users']) {
      await pool.query(`TRUNCATE TABLE ${table}`);
      console.log(`[Migrate]  已清空 ${table}`);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // 4. 插入数据
    console.log('[Migrate] 正在写入 MySQL...');
    for (const table of TABLES) {
      const rows = data[table];
      if (rows.length === 0) continue;

      const columns = COLUMN_LISTS[table];
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      let inserted = 0;
      for (const row of rows) {
        const values = columns.map(col => {
          const value = row[col];
          if (value === undefined || value === null) return null;
          // SQLite 的 INTEGER 0/1 直接映射为 MySQL 的 TINYINT
          return value;
        });
        await pool.query(sql, values);
        inserted++;
      }
      console.log(`[Migrate]  ${table}: 已写入 ${inserted} 条记录`);
    }

    console.log('[Migrate] ✅ 数据迁移完成！');
  } catch (err) {
    console.error('[Migrate] ❌ 迁移失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[Migrate] 未捕获错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});
