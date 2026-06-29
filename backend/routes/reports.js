/**
 * @file 睡眠报告路由（每日报告 API）—— 对齐第4节讲义
 * @author 周灿
 * @date 2026-06-29
 *
 * 核心模式："查询-生成-插入"
 *   1. 客户端请求 GET /daily?date=YYYY-MM-DD
 *   2. 先查 sleep_reports 表，若已有记录直接返回
 *   3. 若无记录，用确定性伪随机算法生成模拟数据
 *   4. INSERT 后调用 saveDb() 持久化到磁盘
 *   5. 重新查询并返回新插入的记录
 *
 * 字段对齐讲义：sleep_score, total_sleep_minutes, deep_sleep_minutes,
 *              light_sleep_minutes, rem_sleep_minutes, awake_minutes,
 *              awake_count, heart_rate_json, sleep_stages_json, noise_json
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 确定性伪随机数生成器（基于种子）
 * 相同的 user_id + device_id + date → 相同的随机结果
 * 保证：同一用户同一天的数据稳定，重启服务器也不变
 */
function createSeededRandom(seedStr) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) {
    s = (s * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
  }
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 0) / 2147483647;
  };
}

/**
 * 生成模拟睡眠报告数据（确定性随机）
 * @param {number} userId 用户 ID
 * @param {number} deviceId 设备 ID
 * @param {string} reportDate 报告日期 YYYY-MM-DD
 * @returns {Object} 睡眠报告数据
 */
function generateReportData(userId, deviceId, reportDate) {
  const seed = `${userId}_${deviceId}_${reportDate}`;
  const rand = createSeededRandom(seed);

  // 基础参数（符合生理规律）
  const sleepScore = Math.floor(60 + rand() * 40);           // 60-100
  const totalSleepMinutes = Math.floor(300 + rand() * 180);  // 300-480 分钟（5-8小时）

  // 分期占比（符合睡眠生理）
  const deepRatio = 0.15 + rand() * 0.20;                    // 15%-35%
  const remRatio = 0.20 + rand() * 0.05;                     // 20%-25%
  const lightRatio = 1 - deepRatio - remRatio;               // 剩余为浅睡

  const deepSleepMinutes = Math.floor(totalSleepMinutes * deepRatio);
  const remSleepMinutes = Math.floor(totalSleepMinutes * remRatio);
  const lightSleepMinutes = totalSleepMinutes - deepSleepMinutes - remSleepMinutes;

  const awakeCount = Math.floor(rand() * 6);                 // 0-5 次
  const awakeMinutes = Math.floor(rand() * 30);              // 0-30 分钟

  // 模拟心率数据（10个采样点）
  const heartRates = [];
  for (let i = 0; i < 10; i++) {
    heartRates.push({
      time: `${22 + Math.floor(i / 6)}:${(30 + i * 5) % 60}`.padStart(5, '0'),
      bpm: Math.floor(55 + rand() * 25)                      // 55-80 bpm
    });
  }

  // 模拟睡眠阶段数据（为第5节柱状图预留）
  const stages = [
    { stage: 'awake', start: '22:45', end: '23:05', duration: 20 },
    { stage: 'light', start: '23:05', end: '23:40', duration: 35 },
    { stage: 'deep',  start: '23:40', end: '01:20', duration: 100 },
    { stage: 'light', start: '01:20', end: '02:30', duration: 70 },
    { stage: 'rem',   start: '02:30', end: '03:15', duration: 45 },
    { stage: 'deep',  start: '03:15', end: '05:00', duration: 105 },
    { stage: 'light', start: '05:00', end: '06:00', duration: 60 }
  ];

  return {
    sleep_score: sleepScore,
    total_sleep_minutes: totalSleepMinutes,
    deep_sleep_minutes: deepSleepMinutes,
    rem_sleep_minutes: remSleepMinutes,
    light_sleep_minutes: lightSleepMinutes,
    awake_minutes: awakeMinutes,
    awake_count: awakeCount,
    heart_rate_json: JSON.stringify(heartRates),
    sleep_stages_json: JSON.stringify(stages),
    noise_json: JSON.stringify({ avg_db: Math.floor(25 + rand() * 20) })
  };
}

/** 所有接口需要 JWT 认证 */
router.use(authenticateToken);

/**
 * @api {get} /api/sleep/report/daily 获取每日睡眠报告
 * @apiParam {String} [date] 查询日期 YYYY-MM-DD，默认昨天
 *
 * 逻辑（对齐讲义"查询-生成-插入"模式）：
 *   1. 获取用户的第一台设备 device_id（若无设备，device_id = 0）
 *   2. SELECT 查询是否已有该日期的报告
 *   3. 若存在 → 直接返回
 *   4. 若不存在 → 生成模拟数据 → INSERT → saveDb → 重新查询返回
 */
router.get('/daily', async (req, res) => {
  const userId = req.user.id;

  // 1. 日期处理：默认昨天
  let dateStr = req.query.date;
  if (!dateStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  try {
    const db = await getDb();

    // 2. 获取用户的第一台设备（简化处理：取最早添加的一台）
    let deviceId = 0;
    const deviceRow = db.exec(
      'SELECT id FROM devices WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
      [userId]
    );
    if (deviceRow.length > 0 && deviceRow[0].values.length > 0) {
      deviceId = deviceRow[0].values[0][0];
    }

    // 3. 先查询数据库：是否已有该日期的报告
    const existing = db.exec(
      `SELECT id, user_id, device_id, report_date, sleep_score,
              total_sleep_minutes, deep_sleep_minutes, light_sleep_minutes,
              rem_sleep_minutes, awake_minutes, awake_count,
              heart_rate_json, sleep_stages_json, noise_json, created_at
       FROM sleep_reports
       WHERE user_id = ? AND device_id = ? AND report_date = ?`,
      [userId, deviceId, dateStr]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      // 4. 存在则直接返回（不重新生成）
      const row = existing[0].values[0];
      return res.json({
        code: 0,
        message: 'success',
        data: {
          id: row[0],
          user_id: row[1],
          device_id: row[2],
          report_date: row[3],
          sleep_score: row[4],
          total_sleep_minutes: row[5],
          deep_sleep_minutes: row[6],
          light_sleep_minutes: row[7],
          rem_sleep_minutes: row[8],
          awake_minutes: row[9],
          awake_count: row[10],
          heart_rate_json: typeof row[11] === 'string' ? JSON.parse(row[11]) : null,
          sleep_stages_json: typeof row[12] === 'string' ? JSON.parse(row[12]) : null,
          noise_json: typeof row[13] === 'string' ? JSON.parse(row[13]) : null,
          created_at: row[14]
        }
      });
    }

    // 5. 不存在 → 生成模拟数据
    const data = generateReportData(userId, deviceId, dateStr);

    // 6. INSERT 插入数据库
    try {
      db.run(
        `INSERT INTO sleep_reports
           (user_id, device_id, report_date, sleep_score, total_sleep_minutes,
            deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes,
            awake_minutes, awake_count, heart_rate_json, sleep_stages_json, noise_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, deviceId, dateStr,
          data.sleep_score, data.total_sleep_minutes,
          data.deep_sleep_minutes, data.light_sleep_minutes, data.rem_sleep_minutes,
          data.awake_minutes, data.awake_count,
          data.heart_rate_json, data.sleep_stages_json, data.noise_json
        ]
      );
    } catch (err) {
      // 并发场景下可能 UNIQUE 约束冲突，重新查询返回即可
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        const retry = db.exec(
          `SELECT id, user_id, device_id, report_date, sleep_score,
                  total_sleep_minutes, deep_sleep_minutes, light_sleep_minutes,
                  rem_sleep_minutes, awake_minutes, awake_count,
                  heart_rate_json, sleep_stages_json, noise_json, created_at
           FROM sleep_reports
           WHERE user_id = ? AND device_id = ? AND report_date = ?`,
          [userId, deviceId, dateStr]
        );
        if (retry.length > 0 && retry[0].values.length > 0) {
          const row = retry[0].values[0];
          return res.json({
            code: 0,
            message: 'success',
            data: {
              id: row[0], user_id: row[1], device_id: row[2], report_date: row[3],
              sleep_score: row[4], total_sleep_minutes: row[5],
              deep_sleep_minutes: row[6], light_sleep_minutes: row[7],
              rem_sleep_minutes: row[8], awake_minutes: row[9], awake_count: row[10],
              heart_rate_json: typeof row[11] === 'string' ? JSON.parse(row[11]) : null,
              sleep_stages_json: typeof row[12] === 'string' ? JSON.parse(row[12]) : null,
              noise_json: typeof row[13] === 'string' ? JSON.parse(row[13]) : null,
              created_at: row[14]
            }
          });
        }
      }
      throw err;
    }

    // 7. 关键：sql.js 必须显式调用 saveDb 持久化到磁盘
    saveDb();

    // 8. 查询新插入的记录并返回
    const inserted = db.exec(
      `SELECT id, user_id, device_id, report_date, sleep_score,
              total_sleep_minutes, deep_sleep_minutes, light_sleep_minutes,
              rem_sleep_minutes, awake_minutes, awake_count,
              heart_rate_json, sleep_stages_json, noise_json, created_at
       FROM sleep_reports
       WHERE user_id = ? AND device_id = ? AND report_date = ?`,
      [userId, deviceId, dateStr]
    );
    const row = inserted[0].values[0];

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: row[0],
        user_id: row[1],
        device_id: row[2],
        report_date: row[3],
        sleep_score: row[4],
        total_sleep_minutes: row[5],
        deep_sleep_minutes: row[6],
        light_sleep_minutes: row[7],
        rem_sleep_minutes: row[8],
        awake_minutes: row[9],
        awake_count: row[10],
        heart_rate_json: typeof row[11] === 'string' ? JSON.parse(row[11]) : null,
        sleep_stages_json: typeof row[12] === 'string' ? JSON.parse(row[12]) : null,
        noise_json: typeof row[13] === 'string' ? JSON.parse(row[13]) : null,
        created_at: row[14]
      }
    });

  } catch (err) {
    console.error('[Report] 获取每日报告失败:', err);
    res.json({
      code: 1001,
      message: '生成报告失败',
      data: null,
    });
  }
});

module.exports = router;

// ============================================================
// 第5大节：睡眠分期 API（GET /api/sleep/stages）
// ============================================================

/**
 * @api {get} /api/sleep/stages 获取睡眠分期数据（48个数据点）
 * @apiParam {String} [date] 查询日期 YYYY-MM-DD，默认昨天
 * @apiHeader {String} Authorization Bearer JWT Token
 *
 * 分期编码：0=清醒(awake), 1=浅睡(light), 2=深睡(deep), 3=REM
 * 生理规律：
 *   - 入睡前 → 浅睡过渡
 *   - 前半夜 → 深睡为主（SWS 恢复性睡眠）
 *   - 后半夜 → REM 为主（梦境期增多）
 *   - 觉醒穿插其中（0-3次）
 *
 * 数据流：
 *   1. 查询 sleep_reports 表该日期的 sleep_stages_json 字段
 *   2. 若存在 → 直接返回解析后的 JSON 数组
 *   3. 若不存在 → 生成 48 个分期数据点 → UPDATE 到数据库 → saveDb() → 返回
 */
router.get('/stages', async (req, res) => {
  const userId = req.user.id;

  // 1. 日期处理
  let dateStr = req.query.date;
  if (!dateStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  try {
    const db = await getDb();

    // 2. 获取设备 ID
    let deviceId = 0;
    const deviceRow = db.exec(
      'SELECT id FROM devices WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
      [userId]
    );
    if (deviceRow.length > 0 && deviceRow[0].values.length > 0) {
      deviceId = deviceRow[0].values[0][0];
    }

    // 3. 查询是否已有该日期的报告（含 sleep_stages_json）
    const existing = db.exec(
      'SELECT id, sleep_stages_json FROM sleep_reports WHERE user_id = ? AND device_id = ? AND report_date = ?',
      [userId, deviceId, dateStr]
    );

    // 4. 已有分期数据 → 直接解析返回
    if (existing.length > 0 && existing[0].values.length > 0) {
      const row = existing[0].values[0];
      const stagesJson = row[1];
      if (stagesJson) {
        try {
          const parsedStages = typeof stagesJson === 'string' ? JSON.parse(stagesJson) : stagesJson;

          // 如果是旧格式的 stage 对象数组，转换为新的 48 点格式
          if (Array.isArray(parsedStages) && parsedStages.length > 0 &&
              typeof parsedStages[0] === 'object' && 'stage' in parsedStages[0]) {
            // 旧格式 → 转换为 48 点格式并更新
            const stages48 = generate48StagePoints(userId, deviceId, dateStr);
            db.run(
              'UPDATE sleep_reports SET sleep_stages_json = ? WHERE id = ?',
              [JSON.stringify(stages48), row[0]]
            );
            saveDb();

            return res.json({
              code: 0,
              message: 'success',
              data: { stages: stages48, count: 48, source: 'converted' }
            });
          }

          // 新格式（48点数组）→ 直接返回
          return res.json({
            code: 0,
            message: 'success',
            data: { stages: parsedStages, count: parsedStages.length, source: 'db' }
          });
        } catch (parseErr) {
          console.warn('[Stages] JSON 解析失败，将重新生成:', parseErr.message);
        }
      }
    }

    // 5. 无数据或格式异常 → 生成 48 个分期数据点
    const stages48 = generate48StagePoints(userId, deviceId, dateStr);

    // 6. 写入数据库
    try {
      db.run(
        `UPDATE sleep_reports SET sleep_stages_json = ?
         WHERE user_id = ? AND device_id = ? AND report_date = ?`,
        [JSON.stringify(stages48), userId, deviceId, dateStr]
      );
    } catch (updateErr) {
      // 如果该日期还没有报告记录，先 INSERT 一条
      if (updateErr.message && updateErr.message.includes('no such row')) {
        const baseData = generateReportData(userId, deviceId, dateStr);
        baseData.sleep_stages_json = JSON.stringify(stages48);

        db.run(
          `INSERT INTO sleep_reports
             (user_id, device_id, report_date, sleep_score, total_sleep_minutes,
              deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes,
              awake_minutes, awake_count, heart_rate_json, sleep_stages_json, noise_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, deviceId, dateStr,
            baseData.sleep_score, baseData.total_sleep_minutes,
            baseData.deep_sleep_minutes, baseData.light_sleep_minutes, baseData.rem_sleep_minutes,
            baseData.awake_minutes, baseData.awake_count,
            baseData.heart_rate_json, baseData.sleep_stages_json, baseData.noise_json
          ]
        );
      }
    }

    // 7. 持久化到磁盘
    saveDb();

    return res.json({
      code: 0,
      message: 'success',
      data: { stages: stages48, count: 48, source: 'generated' }
    });

  } catch (err) {
    console.error('[Stages] 获取睡眠分期失败:', err);
    res.json({
      code: 1001,
      message: '获取分期数据失败',
      data: null
    });
  }
});

/**
 * 生成 48 个睡眠分期数据点
 * 每个点代表约 5 分钟的睡眠状态
 * 编码规则：0=清醒(awake), 1=浅睡(light), 2=深睡(deep), 3=REM
 * 生理规律：
 *   - 22:30~23:00  入睡前（浅睡+短暂清醒）
 *   - 23:00~02:00  前半夜深睡为主（SWS 占比最高）
 *   - 02:00~04:30  深睡与REM交替，REM逐渐增加
 *   - 04:30~06:30  后半夜REM为主，伴随短暂觉醒
 *   - 06:00~07:00  清醒/浅睡过渡期
 *
 * @param {number} userId 用户ID
 * @param {number} deviceId 设备ID
 * @param {string} dateStr 日期字符串
 * @returns {Array} 48个分期数据点 [{time, stage}, ...]
 */
function generate48StagePoints(userId, deviceId, dateStr) {
  const seed = `${userId}_${deviceId}_${dateStr}_stages`;
  const rand = createSeededRandom(seed);

  const stages = [];
  const startTime = new Date(`${dateStr}T22:30:00`); // 从22:30开始

  for (let i = 0; i < 48; i++) {
    const pointTime = new Date(startTime.getTime() + i * 300000); // 每5分钟一个点
    const hour = pointTime.getHours();
    const minute = pointTime.getMinutes();
    const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    let stage;
    const r = rand(); // 0~1

    if (i < 4) {
      // 前20分钟：入睡前（22:30~22:50）→ 以清醒和浅睡为主
      stage = r < 0.4 ? 0 : 1; // 40%清醒, 60%浅睡
    } else if (i < 14) {
      // 22:50~00:50（前半夜第1段）：深睡高峰期
      stage = r < 0.65 ? 2 : r < 0.85 ? 1 : (r < 0.95 ? 0 : 3); // 65%深睡, 20%浅睡, 10%清醒, 5%REM
    } else if (i < 24) {
      // 00:50~03:00（前半夜第2段）：深睡为主，开始出现REM
      stage = r < 0.55 ? 2 : r < 0.75 ? 1 : r < 0.90 ? 3 : 0; // 55%深睡, 20%浅睡, 15%REM, 10%清醒
    } else if (i < 34) {
      // 03:00~05:10（后半夜第1段）：REM增多，深睡减少
      stage = r < 0.35 ? 2 : r < 0.60 ? 3 : r < 0.85 ? 1 : 0; // 35%深睡, 25%REM, 25%浅睡, 15%清醒
    } else if (i < 44) {
      // 05:10~06:40（后半夜第2段）：REM为主，接近清醒
      stage = r < 0.15 ? 2 : r < 0.45 ? 3 : r < 0.80 ? 1 : 0; // 15%深睡, 30%REM, 35%浅睡, 20%清醒
    } else {
      // 最后20分钟：即将醒来
      stage = r < 0.05 ? 2 : r < 0.15 ? 3 : r < 0.50 ? 1 : 0; // 5%深睡, 10%REM, 35%浅睡, 50%清醒
    }

    stages.push({ time: timeLabel, stage: stage });
  }

  return stages;
}
