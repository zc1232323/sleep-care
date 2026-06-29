/**
 * @file 数据库表结构定义（DDL）
 * @author 周灿
 * @date 2026-06-29
 */

/**
 * 用户表建表语句
 * 字段：id, phone, username, password_hash, created_at
 */
const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phone       TEXT    NOT NULL UNIQUE,
    username    TEXT    NOT NULL,
    password_hash TEXT  NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

/**
 * 设备表建表语句
 * 字段：id, serial_no, device_name, user_id, status, created_at
 */
const CREATE_DEVICES_TABLE = `
  CREATE TABLE IF NOT EXISTS devices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_no   TEXT    NOT NULL UNIQUE,
    device_name TEXT    NOT NULL DEFAULT '',
    user_id     INTEGER NOT NULL,
    status      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

/**
 * 睡眠报告表建表语句
 * 字段：id, user_id, device_id, report_date, sleep_score, total_sleep_minutes,
 *       deep_sleep_minutes, light_sleep_minutes, awake_minutes, awake_count,
 *       heart_rate_json, sleep_stages_json, noise_json
 */
const CREATE_SLEEP_REPORTS_TABLE = `
  CREATE TABLE IF NOT EXISTS sleep_reports (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL,
    device_id            INTEGER,
    report_date          TEXT    NOT NULL,
    sleep_score          INTEGER NOT NULL DEFAULT 0,
    total_sleep_minutes  INTEGER NOT NULL DEFAULT 0,
    deep_sleep_minutes   INTEGER NOT NULL DEFAULT 0,
    light_sleep_minutes  INTEGER NOT NULL DEFAULT 0,
    awake_minutes        INTEGER NOT NULL DEFAULT 0,
    awake_count          INTEGER NOT NULL DEFAULT 0,
    heart_rate_json      TEXT,
    sleep_stages_json    TEXT,
    noise_json           TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, report_date)
  );
`;

/** 所有建表语句列表 */
const ALL_SCHEMAS = [CREATE_USERS_TABLE, CREATE_DEVICES_TABLE, CREATE_SLEEP_REPORTS_TABLE];

module.exports = { CREATE_USERS_TABLE, CREATE_DEVICES_TABLE, CREATE_SLEEP_REPORTS_TABLE, ALL_SCHEMAS };
