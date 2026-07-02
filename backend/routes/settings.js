/**
 * @file 用户设置路由（第8大节）—— 作息设置 GET/PUT
 * @author 周灿
 * @date 2026-06-30
 *
 * GET  /api/setting/plan  — 获取作息设置（默认值 23:00 / 07:00 / 10分）
 * PUT  /api/setting/plan  — 保存作息设置
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/** 默认设置 */
const DEFAULTS = {
  bed_time: '23:00',
  wake_time: '07:00',
  sunrise_duration_minutes: 10
};

router.use(authenticateToken);

/**
 * @api {get} /api/setting/plan 获取作息设置
 */
router.get('/plan', async (req, res) => {
  const userId = req.user.id;
  try {
    const db = await getDb();
    const row = await db.exec(
      `SELECT bed_time, wake_time, sunrise_duration_minutes FROM user_settings WHERE user_id = ?`,
      [userId]
    );

    if (row.length > 0 && row[0].values.length > 0) {
      const [bed_time, wake_time, sunrise_duration_minutes] = row[0].values[0];
      return res.json({
        code: 0, message: 'success',
        data: {
          bed_time: bed_time || DEFAULTS.bed_time,
          wake_time: wake_time || DEFAULTS.wake_time,
          sunrise_duration_minutes: sunrise_duration_minutes ?? DEFAULTS.sunrise_duration_minutes
        }
      });
    }

    // 无记录 → 返回默认值
    return res.json({
      code: 0, message: 'success',
      data: DEFAULTS
    });
  } catch (err) {
    console.error('[Settings] 获取设置失败:', err);
    res.json({ code: 1001, message: '获取设置失败', data: null });
  }
});

/**
 * @api {put} /api/setting/plan 保存作息设置
 * @apiBody {String} bed_time       就寝时间 HH:MM
 * @apiBody {String} wake_time      起床时间 HH:MM
 * @apiBody {Number} sunrise_duration_minutes 日出模拟时长(分钟)
 */
router.put('/plan', async (req, res) => {
  const userId = req.user.id;
  const { bed_time, wake_time, sunrise_duration_minutes } = req.body;

  // 参数校验
  if (!bed_time || !wake_time) {
    return res.json({ code: 1001, message: 'bed_time 和 wake_time 不能为空', data: null });
  }

  const isTimeFormat = /^\d{2}:\d{2}$/;
  if (!isTimeFormat.test(bed_time) || !isTimeFormat.test(wake_time)) {
    return res.json({ code: 1001, message: '时间格式错误，应为 HH:MM', data: null });
  }

  const duration = parseInt(sunrise_duration_minutes) || DEFAULTS.sunrise_duration_minutes;
  if (duration < 5 || duration > 30) {
    return res.json({ code: 1001, message: '日出模拟时长应在 5-30 分钟之间', data: null });
  }

  try {
    const db = await getDb();

    // UPSERT: 先查是否存在
    const existing = await db.exec(
      `SELECT id FROM user_settings WHERE user_id = ?`,
      [userId]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      // 更新
      const nowSet = new Date().toISOString().replace('T', ' ').slice(0, 19);
      await db.run(
        `UPDATE user_settings SET bed_time = ?, wake_time = ?, sunrise_duration_minutes = ?, updated_at = ? WHERE user_id = ?`,
        [bed_time, wake_time, duration, nowSet, userId]
      );
    } else {
      // 插入
      await db.run(
        `INSERT INTO user_settings (user_id, bed_time, wake_time, sunrise_duration_minutes) VALUES (?, ?, ?, ?)`,
        [userId, bed_time, wake_time, duration]
      );
    }

    saveDb();

    return res.json({
      code: 0, message: '设置保存成功',
      data: { bed_time, wake_time, sunrise_duration_minutes: duration }
    });
  } catch (err) {
    console.error('[Settings] 保存设置失败:', err);
    res.json({ code: 1001, message: '保存设置失败', data: null });
  }
});

module.exports = router;
