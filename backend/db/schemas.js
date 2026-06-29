/**
 * @file 数据库表结构定义（DDL）—— 5张核心表，完全对齐第1节讲义
 * @author 周灿
 * @date 2026-06-29
 */

/**
 * 用户表：用户信息（注册登录）
 * 字段：id, phone, password_hash, nickname, role, status, created_at, updated_at
 */
const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    nickname      TEXT,
    role          TEXT    NOT NULL DEFAULT 'patient',
    status        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

/**
 * 设备表：虚拟/真实设备信息（外键关联 users）
 * 字段：id, serial_no, user_id, nickname, is_virtual, online_status, created_at, updated_at
 */
const CREATE_DEVICES_TABLE = `
  CREATE TABLE IF NOT EXISTS devices (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_no      TEXT    NOT NULL UNIQUE,
    user_id        INTEGER NOT NULL,
    nickname       TEXT    NOT NULL DEFAULT '我的设备',
    is_virtual     INTEGER NOT NULL DEFAULT 1,
    online_status  INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );
`;

/**
 * 睡眠报告表：每日睡眠数据（外键关联 users + devices）
 * 字段：id, user_id, device_id, report_date, sleep_score, total_sleep_minutes,
 *       deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes,
 *       awake_minutes, awake_count, heart_rate_json, sleep_stages_json,
 *       noise_json, created_at
 */
const CREATE_SLEEP_REPORTS_TABLE = `
  CREATE TABLE IF NOT EXISTS sleep_reports (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL,
    device_id            INTEGER NOT NULL,
    report_date          TEXT    NOT NULL,
    sleep_score          INTEGER NOT NULL DEFAULT 0,
    total_sleep_minutes  INTEGER NOT NULL DEFAULT 0,
    deep_sleep_minutes   INTEGER NOT NULL DEFAULT 0,
    light_sleep_minutes  INTEGER NOT NULL DEFAULT 0,
    rem_sleep_minutes    INTEGER NOT NULL DEFAULT 0,
    awake_minutes        INTEGER NOT NULL DEFAULT 0,
    awake_count          INTEGER NOT NULL DEFAULT 0,
    heart_rate_json      TEXT,
    sleep_stages_json    TEXT,
    noise_json           TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
    FOREIGN KEY (device_id)  REFERENCES devices (id)  ON DELETE CASCADE,
    UNIQUE (user_id, device_id, report_date)
  );
`;

/**
 * 用户设置表（一对一）：个性化作息设置
 * 字段：id, user_id, bed_time, wake_time, sunrise_duration_minutes,
 *       sound_type, brightness_level, volume_level, timezone,
 *       dnd_enabled, dnd_start, dnd_end, created_at, updated_at
 */
const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                     INTEGER NOT NULL UNIQUE,
    bed_time                    TEXT,
    wake_time                   TEXT,
    sunrise_duration_minutes    INTEGER DEFAULT 10,
    sound_type                  TEXT,
    brightness_level            INTEGER DEFAULT 5,
    volume_level                INTEGER DEFAULT 5,
    timezone                    TEXT    DEFAULT 'Asia/Shanghai',
    dnd_enabled                 INTEGER DEFAULT 0,
    dnd_start                   TEXT,
    dnd_end                     TEXT,
    created_at                  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at                  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );
`;

/**
 * 医生授权表：用户授权医生查看睡眠数据
 * 字段：id, patient_id, doctor_id, status, expire_date, doctor_note,
 *       requested_at, responded_at, created_at, updated_at
 */
const CREATE_DOCTOR_AUTHORIZATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS doctor_authorizations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id    INTEGER NOT NULL,
    doctor_id     INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending',
    expire_date   TEXT,
    doctor_note   TEXT,
    requested_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    responded_at  TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)  REFERENCES users (id) ON DELETE CASCADE
  );
`;

/** 所有建表语句列表（按依赖顺序） */
const ALL_SCHEMAS = [
  CREATE_USERS_TABLE,
  CREATE_DEVICES_TABLE,
  CREATE_SLEEP_REPORTS_TABLE,
  CREATE_USER_SETTINGS_TABLE,
  CREATE_DOCTOR_AUTHORIZATIONS_TABLE,
];

module.exports = {
  CREATE_USERS_TABLE,
  CREATE_DEVICES_TABLE,
  CREATE_SLEEP_REPORTS_TABLE,
  CREATE_USER_SETTINGS_TABLE,
  CREATE_DOCTOR_AUTHORIZATIONS_TABLE,
  ALL_SCHEMAS,
};
