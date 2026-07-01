-- CloudBase SQL 型数据库专用建表脚本（第13大节）
-- CloudBase SQL 编辑器一次只能执行一条语句，请按下面注释分隔逐条执行
-- 执行顺序：创建数据库 → 使用数据库 → 5张表 → 5个索引

-- 【第1条】创建数据库
CREATE DATABASE IF NOT EXISTS sleep_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 【第2条】切换到 sleep_care 数据库
USE sleep_care;

-- 【第3条】用户表
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

-- 【第4条】设备表
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

-- 【第5条】睡眠报告表
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

-- 【第6条】用户设置表
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

-- 【第7条】医生授权表
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

-- 【第8条】索引1
CREATE INDEX IF NOT EXISTS idx_sleep_reports_user_id ON sleep_reports(user_id);

-- 【第9条】索引2
CREATE INDEX IF NOT EXISTS idx_sleep_reports_report_date ON sleep_reports(report_date);

-- 【第10条】索引3
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

-- 【第11条】索引4
CREATE INDEX IF NOT EXISTS idx_doctor_auth_doctor_id ON doctor_authorizations(doctor_id);

-- 【第12条】索引5
CREATE INDEX IF NOT EXISTS idx_doctor_auth_patient_id ON doctor_authorizations(patient_id);
