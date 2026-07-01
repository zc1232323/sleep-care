-- SQLite → MySQL 迁移脚本（第12大节）
-- 使用方法：
--   1. 在 MySQL 中创建数据库：CREATE DATABASE sleep_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   2. 执行本脚本：mysql -u root -p sleep_care < docs/migration.sql
--   3. 运行 docs/migrate-data.js 导入数据

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  phone         VARCHAR(20)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(100),
  role          VARCHAR(20)  NOT NULL DEFAULT 'patient',
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  serial_no      VARCHAR(64)  NOT NULL UNIQUE,
  user_id        INT          NOT NULL,
  nickname       VARCHAR(100) NOT NULL DEFAULT '我的设备',
  is_virtual     TINYINT      NOT NULL DEFAULT 1,
  online_status  TINYINT      NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 睡眠报告表
CREATE TABLE IF NOT EXISTS sleep_reports (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  user_id              INT          NOT NULL,
  device_id            INT          NOT NULL,
  report_date          DATE         NOT NULL,
  sleep_score          INT          NOT NULL DEFAULT 0,
  total_sleep_minutes  INT          NOT NULL DEFAULT 0,
  deep_sleep_minutes   INT          NOT NULL DEFAULT 0,
  light_sleep_minutes  INT          NOT NULL DEFAULT 0,
  rem_sleep_minutes    INT          NOT NULL DEFAULT 0,
  awake_minutes        INT          NOT NULL DEFAULT 0,
  awake_count          INT          NOT NULL DEFAULT 0,
  heart_rate_json      TEXT,
  sleep_stages_json    TEXT,
  noise_json           TEXT,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_device_date (user_id, device_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  id                          INT PRIMARY KEY AUTO_INCREMENT,
  user_id                     INT          NOT NULL UNIQUE,
  bed_time                    VARCHAR(10),
  wake_time                   VARCHAR(10),
  sunrise_duration_minutes    INT          DEFAULT 10,
  sound_type                  VARCHAR(50),
  brightness_level            INT          DEFAULT 5,
  volume_level                INT          DEFAULT 5,
  timezone                    VARCHAR(50)  DEFAULT 'Asia/Shanghai',
  dnd_enabled                 TINYINT      DEFAULT 0,
  dnd_start                   VARCHAR(10),
  dnd_end                     VARCHAR(10),
  created_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 医生授权表
CREATE TABLE IF NOT EXISTS doctor_authorizations (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  patient_id    INT          NOT NULL,
  doctor_id     INT          NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  expire_date   DATE,
  doctor_note   TEXT,
  requested_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at  TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 常用查询索引（性能优化）
CREATE INDEX IF NOT EXISTS idx_sleep_reports_user_id      ON sleep_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_reports_report_date  ON sleep_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_devices_user_id            ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_auth_doctor_id      ON doctor_authorizations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_auth_patient_id     ON doctor_authorizations(patient_id);

SET FOREIGN_KEY_CHECKS = 1;
