/**
 * @file 睡眠报告路由（每日报告 API）
 * @author 周灿
 * @date 2026-06-29
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 确定性伪随机数生成器（基于种子）
 * 相同的 user_id + device_id + date → 相同的随机结果
 */
function createSeededRandom(seedStr) {
  // 简单哈希种子
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  let state = Math.abs(hash);

  return function () {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * 生成模拟睡眠报告数据（确定性随机）
 * @param {number} userId 用户 ID
 * @param {string} reportDate 报告日期 YYYY-MM-DD
 * @returns {Object} 睡眠报告数据
 */
function generateReportData(userId, reportDate) {
  const seed = `${userId}-${reportDate}`;
  const rand = createSeededRandom(seed);

  // 基础参数：睡眠分数 60-95，总时长 360-540 分钟(6-9h)
  const sleepScore = Math.floor(rand() * 36) + 60;        // 60-95
  const totalSleepMinutes = Math.floor(rand() * 180) + 360; // 360-540

  // 深睡占比 15%-30%，浅睡 50%-70%，清醒 5%-15%
  const deepRatio = rand() * 0.15 + 0.15;              // 15%-30%
  const lightRatio = rand() * 0.20 + 0.50;             // 50%-70%
  const awakeRatio = 1 - deepRatio - lightRatio;

  const deepSleepMinutes = Math.round(totalSleepMinutes * deepRatio);
  const lightSleepMinutes = Math.round(totalSleepMinutes * lightRatio);
  const awakeMinutes = totalSleepMinutes - deepSleepMinutes - lightSleepMinutes;
  const awakeCount = Math.floor(rand() * 8) + 2;       // 2-10 次

  // 模拟心率数据 JSON 数组
  const heartRates = [];
  for (let i = 0; i < 10; i++) {
    heartRates.push({
      time: `23:${30 + i * 5}`,
      bpm: Math.floor(rand() * 25) + 55            // 55-80 bpm
    });
  }

  // 模拟睡眠阶段数据
  const stages = [
    { stage: 'awake', start: '22:45', end: '23:05', duration: 20 },
    { stage: 'light', start: '23:05', end: '23:40', duration: 35 },
    { stage: 'deep', start: '23:40', end: '01:20', duration: 100 },
    { stage: 'light', start: '01:20', end: '02:30', duration: 70 },
    { stage: 'rem', start: '02:30', end: '03:15', duration: 45 },
    { stage: 'deep', start: '03:15', end: '05:00', duration: 105 },
    { stage: 'light', start: '05:00', end: '06:00', duration: 60 }
  ];

  return {
    sleep_score: sleepScore,
    total_sleep_minutes: totalSleepMinutes,
    deep_sleep_minutes: deepSleepMinutes,
    light_sleep_minutes: lightSleepMinutes,
    awake_minutes: awakeMinutes,
    awake_count: awakeCount,
    heart_rate_json: JSON.stringify(heartRates),
    sleep_stages_json: JSON.stringify(stages),
    noise_json: JSON.stringify({ avg_db: Math.floor(rand() * 20) + 25 })
  };
}

/**
 * 格式化分钟数为 "Xh Ym"
 */
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}时${m}分`;
}

/** 所有接口需要 JWT 认证 */
router.use(authenticateToken);

/**
 * @api {get} /api/sleep/report/daily 获取每日睡眠报告
 * @apiName DailyReport
 * @apiGroup 睡眠报告
 * @apiParam {String} [date] 查询日期，格式 YYYY-MM-DD，默认今天
 *
 * 逻辑：
 * - 若该用户该日期无记录，直接 INSERT 模拟数据并返回
 * - 若已有记录，直接返回（不更新）
 * - 使用确定性随机算法：相同(user_id, device, date)产生相同数据
 */
router.get('/daily', async (req, res) => {
  const userId = req.user.id;
  const queryDate = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    const db = await getDb();

    // 先查询是否已存在该日期的报告
    const existing = db.exec(
      `SELECT id, user_id, device_id, report_date, sleep_score,
              total_sleep_minutes, deep_sleep_minutes, light_sleep_minutes,
              awake_minutes, awake_count, heart_rate_json, sleep_stages_json,
              noise_json, created_at
       FROM sleep_reports
       WHERE user_id = ? AND report_date = ?`,
      [userId, queryDate]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      // 已存在，直接返回（不更新）
      const row = existing[0].values[0];
      return res.json({
        code: 0,
        message: '查询成功',
        data: {
          id: row[0],
          user_id: row[1],
          device_id: row[2],
          report_date: row[3],
          sleep_score: row[4],
          total_sleep_minutes: row[5],
          deep_sleep_minutes: row[6],
          light_sleep_minutes: row[7],
          awake_minutes: row[8],
          awake_count: row[9],
          heart_rate_json: typeof row[10] === 'string' ? JSON.parse(row[10]) : null,
          sleep_stages_json: typeof row[11] === 'string' ? JSON.parse(row[11]) : null,
          noise_json: typeof row[12] === 'string' ? JSON.parse(row[12]) : null,
          created_at: row[13]
        }
      });
    }

    // 不存在，生成模拟数据并插入
    const data = generateReportData(userId, queryDate);

    db.run(
      `INSERT INTO sleep_reports
         (user_id, device_id, report_date, sleep_score, total_sleep_minutes,
          deep_sleep_minutes, light_sleep_minutes, awake_minutes, awake_count,
          heart_rate_json, sleep_stages_json, noise_json)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, queryDate, data.sleep_score, data.total_sleep_minutes,
        data.deep_sleep_minutes, data.light_sleep_minutes, data.awake_minutes,
        data.awake_count, data.heart_rate_json, data.sleep_stages_json, data.noise_json
      ]
    );
    saveDb();

    // 查询刚插入的记录返回完整数据
    const inserted = db.exec(
      `SELECT id, report_date, sleep_score, total_sleep_minutes,
              deep_sleep_minutes, light_sleep_minutes, awake_minutes, awake_count,
              heart_rate_json, sleep_stages_json, noise_json, created_at
       FROM sleep_reports WHERE user_id = ? AND report_date = ?`,
      [userId, queryDate]
    );
    const row = inserted[0].values[0];

    res.status(201).json({
      code: 0,
      message: '报告已生成',
      data: {
        id: row[0],
        report_date: row[1],
        sleep_score: row[2],
        total_sleep_minutes: row[3],
        total_duration: formatDuration(row[3]),
        deep_sleep_minutes: row[4],
        deep_ratio: (row[4] / row[3] * 100).toFixed(1) + '%',
        light_sleep_minutes: row[5],
        awake_minutes: row[6],
        awake_count: row[7],
        heart_rate_json: typeof row[8] === 'string' ? JSON.parse(row[8]) : null,
        sleep_stages_json: typeof row[9] === 'string' ? JSON.parse(row[9]) : null,
        noise_json: typeof row[10] === 'string' ? JSON.parse(row[10]) : null,
        created_at: row[11]
      }
    });

  } catch (err) {
    console.error('[Report] 获取每日报告失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，获取报告失败',
      data: null
    });
  }
});

module.exports = router;
