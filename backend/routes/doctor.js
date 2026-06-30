/**
 * @file 医生授权路由（第9大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * POST /api/doctor/grant  — 添加医生授权（通过手机号查找医生用户）
 * GET  /api/doctor/granted — 查看已授权的医生列表
 * DELETE /api/doctor/revoke — 撤销授权（status → revoked）
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/doctor/grant
 * Body: { phone, expire_date }
 * 通过手机号查找 role='doctor' 的用户，创建授权记录
 */
router.post('/grant', async (req, res) => {
  const userId = req.user.id;
  const { phone, expire_date } = req.body;

  if (!phone) {
    return res.json({ code: 1001, message: '请输入医生手机号', data: null });
  }

  try {
    const db = await getDb();

    // 1. 通过手机号查找医生用户（role = 'doctor'）
    const docRow = db.exec(
      "SELECT id, phone, nickname FROM users WHERE phone = ? AND role = 'doctor'",
      [phone]
    );

    if (docRow.length === 0 || docRow[0].values.length === 0) {
      return res.json({ code: 1002, message: '未找到该手机号的医生账号', data: null });
    }

    const [docId, docPhone, docName] = docRow[0].values[0];

    // 2. 检查是否已授权该医生（pending 或 active 状态，不能重复）
    const existing = db.exec(
      `SELECT id, status FROM doctor_authorizations 
       WHERE patient_id = ? AND doctor_id = ? AND status IN ('pending','active')`,
      [userId, docId]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.json({ code: 1003, message: '已向该医生发起过授权，不可重复添加', data: null });
    }

    // 3. 计算过期时间（默认7天后）
    let expireDateStr;
    if (expire_date) {
      expireDateStr = expire_date; // YYYY-MM-DD
    } else {
      const exp = new Date();
      exp.setDate(exp.getDate() + 7);
      expireDateStr = exp.toISOString().split('T')[0];
    }

    // 4. 插入授权记录
    db.run(
      `INSERT INTO doctor_authorizations 
         (patient_id, doctor_id, status, expire_date, requested_at)
       VALUES (?, ?, 'pending', ?, datetime('now','localtime'))`,
      [userId, docId, expireDateStr]
    );
    saveDb();

    return res.json({
      code: 0,
      message: '授权请求已发送',
      data: {
        id: lastInsertRowid,
        doctor_id: docId,
        doctor_name: docName,
        doctor_phone: docPhone,
        status: 'pending',
        expire_date: expireDateStr
      }
    });

  } catch (err) {
    console.error('[Doctor] 授权失败:', err);
    res.json({ code: 1001, message: '授权操作失败', data: null });
  }
});

/**
 * GET /api/doctor/granted
 * 返回当前患者的所有有效授权医生列表（JOIN users 表获取姓名、手机号等）
 * 按 requested_at DESC 排序（最新在前），仅返回 pending 和 active 状态
 */
router.get('/granted', async (req, res) => {
  const patientId = req.user.id;

  try {
    const db = await getDb();

    const rows = db.exec(`
      SELECT a.id, a.doctor_id, a.status, a.expire_date, a.requested_at,
             u.nickname as doctor_name, u.phone as doctor_phone
      FROM doctor_authorizations a
      JOIN users u ON a.doctor_id = u.id
      WHERE a.patient_id = ? AND a.status IN ('pending', 'active')
      ORDER BY a.requested_at DESC
    `, [patientId]);

    if (rows.length > 0 && rows[0].values.length > 0) {
      const doctors = rows[0].values.map(row => ({
        id: row[0],
        doctor_id: row[1],
        status: row[2],
        expire_date: row[3],
        requested_at: row[4],
        doctor_name: row[5] || '未知',
        doctor_phone: row[6] || ''
      }));
      return res.json({ code: 0, message: 'success', data: doctors });
    }

    return res.json({ code: 0, message: 'success', data: [] });

  } catch (err) {
    console.error('[Doctor] 获取授权列表失败:', err);
    res.json({ code: 1001, message: '查询失败', data: null });
  }
});

/**
 * DELETE /api/doctor/revoke
 * Body: { auth_id } 或 Query: { auth_id }
 * 将指定授权记录的状态改为 'revoked'
 */
router.delete('/revoke', async (req, res) => {
  const userId = req.user.id;
  const authId = req.query.auth_id || req.body?.auth_id;

  if (!authId) {
    return res.json({ code: 1001, message: '缺少授权记录ID', data: null });
  }

  try {
    const db = await getDb();

    // 确认是自己的授权记录
    const check = db.exec(
      `SELECT id FROM doctor_authorizations WHERE id = ? AND patient_id = ? AND status IN ('pending','active')`,
      [authId, userId]
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1002, message: '授权记录不存在或已被撤销', data: null });
    }

    db.run(
      `UPDATE doctor_authorizations SET status = 'revoked', responded_at = datetime('now','localtime') WHERE id = ?`,
      [authId]
    );
    saveDb();

    return res.json({ code: 0, message: '撤销成功', data: null });

  } catch (err) {
    console.error('[Doctor] 撤销失败:', err);
    res.json({ code: 1001, message: '撤销失败', data: null });
  }
});

module.exports = router;
