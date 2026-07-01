/**
 * @file 用户管理路由（第11大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * GET /api/users/doctors — 返回所有医生用户（id, phone, nickname）
 */

const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();
// GET /api/users/doctors 为公开接口，患者未登录即可查看医生列表
// 如需为其他用户路由添加认证，请在具体路由上单独挂载 authenticateToken

router.get('/doctors', async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec("SELECT id, phone, nickname FROM users WHERE role = 'doctor' ORDER BY id");

    if (rows.length > 0 && rows[0].values.length > 0) {
      const doctors = rows[0].values.map(row => ({
        id: row[0],
        phone: row[1] || '',
        nickname: row[2] || '未知医生'
      }));
      return res.json({ code: 0, message: 'success', data: doctors });
    }

    return res.json({ code: 0, message: 'success', data: [] });

  } catch (err) {
    console.error('[Users] 获取医生列表失败:', err);
    res.json({ code: 1001, message: '查询失败', data: null });
  }
});

module.exports = router;
