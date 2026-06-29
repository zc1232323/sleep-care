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

/** 所有建表语句列表 */
const ALL_SCHEMAS = [CREATE_USERS_TABLE, CREATE_DEVICES_TABLE];

module.exports = { CREATE_USERS_TABLE, CREATE_DEVICES_TABLE, ALL_SCHEMAS };
