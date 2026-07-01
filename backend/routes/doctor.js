/**
 * @file 医生授权路由（第9+11大节）
 * @author 周灿
 * @date 2026-06-30
 *
 * 患者端：
 *   POST /api/doctor/grant      — 添加医生授权（phone 或 doctor_id）
 *   GET  /api/doctor/granted    — 查看已授权的医生列表
 *   DELETE /api/doctor/revoke   — 撤销授权
 *
 * 医生端（第11大节新增）：
 *   PUT /api/doctor/confirm     — 确认授权（pending → active）
 *   GET /api/doctor/patients    — 患者列表（含状态、最新评分）
 *   GET /api/doctor/patient/data — 查看患者报告（仅 active 可查看）
 *   PUT /api/doctor/note        — 保存干预建议
 *   GET /api/doctor/note        — 获取干预建议
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

/**
 * 通用：根据患者最近一次睡眠报告，获取最新评分
 */
async function getLatestScore(db, patientId) {
  const scoreRes = await db.exec(
    `SELECT sleep_score FROM sleep_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 1`,
    [patientId]
  );
  if (scoreRes.length > 0 && scoreRes[0].values.length > 0) {
    return scoreRes[0].values[0][0] || null;
  }
  return null;
}

/**
 * POST /api/doctor/grant
 * Body: { phone } 或 { doctor_id, doctor_phone }
 * 通过手机号或 doctor_id 查找 role='doctor' 的用户，创建授权记录
 */
router.post('/grant', async (req, res) => {
  const userId = req.user.id;
  const { phone, expire_date } = req.body;
  const doctorId = req.body.doctor_id;
  const doctorPhone = req.body.doctor_phone;

  if (!phone && !doctorId && !doctorPhone) {
    return res.json({ code: 1001, message: '请输入医生手机号或选择医生', data: null });
  }

  try {
    const db = await getDb();

    // 1. 查找医生用户
    let docRow = null;
    if (doctorId) {
      const r = await db.exec("SELECT id, phone, nickname FROM users WHERE id = ? AND role = 'doctor'", [doctorId]);
      if (r.length > 0 && r[0].values.length > 0) docRow = r;
    }
    if (!docRow && doctorPhone) {
      const r = await db.exec("SELECT id, phone, nickname FROM users WHERE phone = ? AND role = 'doctor'", [doctorPhone]);
      if (r.length > 0 && r[0].values.length > 0) docRow = r;
    }
    if (!docRow && phone) {
      const r = await db.exec("SELECT id, phone, nickname FROM users WHERE phone = ? AND role = 'doctor'", [phone]);
      if (r.length > 0 && r[0].values.length > 0) docRow = r;
    }

    if (!docRow || docRow.length === 0 || docRow[0].values.length === 0) {
      return res.json({ code: 1002, message: '未找到医生账号', data: null });
    }

    const [docId, docPhone, docName] = docRow[0].values[0];

    // 2. 检查是否已授权该医生
    const existing = await db.exec(
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
      expireDateStr = expire_date;
    } else {
      const exp = new Date();
      exp.setDate(exp.getDate() + 7);
      expireDateStr = exp.toISOString().split('T')[0];
    }

    // 4. 插入授权记录
    await db.run(
      `INSERT INTO doctor_authorizations 
         (patient_id, doctor_id, status, expire_date, requested_at)
       VALUES (?, ?, 'pending', ?, datetime('now','localtime'))`,
      [userId, docId, expireDateStr]
    );

    const lastIdRes = await db.exec('SELECT last_insert_rowid()');
    const newId = lastIdRes[0]?.values[0][0] || 0;

    saveDb();

    return res.json({
      code: 0,
      message: '授权请求已发送',
      data: {
        id: newId,
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
 */
router.get('/granted', async (req, res) => {
  const patientId = req.user.id;

  try {
    const db = await getDb();

    const rows = await db.exec(`
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
 */
router.delete('/revoke', async (req, res) => {
  const userId = req.user.id;
  const authId = req.query.auth_id || req.body?.auth_id;

  if (!authId) {
    return res.json({ code: 1001, message: '缺少授权记录ID', data: null });
  }

  try {
    const db = await getDb();

    const check = await db.exec(
      `SELECT id FROM doctor_authorizations WHERE id = ? AND patient_id = ? AND status IN ('pending','active')`,
      [authId, userId]
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1002, message: '授权记录不存在或已被撤销', data: null });
    }

    await db.run(
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

// ============================================================
// 第11大节：医生端 API
// ============================================================

/**
 * PUT /api/doctor/confirm
 * Body: { auth_id } 或 { patient_id }
 * 医生确认患者授权请求，status: pending → active
 */
router.put('/confirm', async (req, res) => {
  const doctorId = req.user.id;
  const { auth_id, patient_id } = req.body;

  if (!auth_id && !patient_id) {
    return res.json({ code: 1001, message: '缺少授权ID或患者ID', data: null });
  }

  try {
    const db = await getDb();

    let whereClause = '';
    let params = [doctorId];
    if (auth_id) {
      whereClause = 'AND id = ?';
      params.push(auth_id);
    } else {
      whereClause = 'AND patient_id = ?';
      params.push(patient_id);
    }

    const check = await db.exec(
      `SELECT id, patient_id FROM doctor_authorizations WHERE doctor_id = ? AND status = 'pending' ${whereClause}`,
      params
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1002, message: '未找到待确认的授权记录', data: null });
    }

    const authRecordId = check[0].values[0][0];
    const targetPatientId = check[0].values[0][1];

    await db.run(
      `UPDATE doctor_authorizations SET status = 'active', responded_at = datetime('now','localtime') WHERE id = ?`,
      [authRecordId]
    );
    saveDb();

    return res.json({
      code: 0,
      message: '确认授权成功',
      data: { auth_id: authRecordId, patient_id: targetPatientId, status: 'active' }
    });

  } catch (err) {
    console.error('[Doctor] 确认授权失败:', err);
    res.json({ code: 1001, message: '确认授权失败', data: null });
  }
});

/**
 * GET /api/doctor/patients
 * 医生查看所有患者列表（pending / active），含最新评分和 doctor_note
 */
router.get('/patients', async (req, res) => {
  const doctorId = req.user.id;

  try {
    const db = await getDb();

    const rows = await db.exec(`
      SELECT a.id, a.patient_id, a.status, a.expire_date, a.requested_at, a.responded_at, a.doctor_note,
             u.nickname as patient_name, u.phone as patient_phone
      FROM doctor_authorizations a
      JOIN users u ON a.patient_id = u.id
      WHERE a.doctor_id = ? AND a.status IN ('pending', 'active')
      ORDER BY a.requested_at DESC
    `, [doctorId]);

    if (rows.length > 0 && rows[0].values.length > 0) {
      const patients = [];
      for (const row of rows[0].values) {
        const patientId = row[1];
        patients.push({
          id: row[0],
          patient_id: patientId,
          status: row[2],
          expire_date: row[3],
          requested_at: row[4],
          responded_at: row[5],
          doctor_note: row[6] || '',
          patient_name: row[7] || '未知',
          patient_phone: row[8] || '',
          latest_score: await getLatestScore(db, patientId)
        });
      }
      return res.json({ code: 0, message: 'success', data: patients });
    }

    return res.json({ code: 0, message: 'success', data: [] });

  } catch (err) {
    console.error('[Doctor] 获取患者列表失败:', err);
    res.json({ code: 1001, message: '查询失败', data: null });
  }
});

/**
 * GET /api/doctor/patient/data
 * Query: patient_id
 * 医生查看患者睡眠报告（仅 active 授权可查看，pending 返回无权）
 */
router.get('/patient/data', async (req, res) => {
  const doctorId = req.user.id;
  const patientId = req.query.patient_id;

  if (!patientId) {
    return res.json({ code: 1001, message: '缺少 patient_id', data: null });
  }

  try {
    const db = await getDb();

    // 检查 active 授权关系
    const auth = await db.exec(
      `SELECT id, status FROM doctor_authorizations WHERE doctor_id = ? AND patient_id = ? AND status IN ('pending','active')`,
      [doctorId, patientId]
    );

    if (auth.length === 0 || auth[0].values.length === 0) {
      return res.json({ code: 1003, message: '未找到该患者的授权关系，无权查看', data: null });
    }

    const status = auth[0].values[0][1];
    if (status !== 'active') {
      return res.json({ code: 1003, message: '该患者尚未授权完成，无权查看', data: null });
    }

    // 获取最新报告
    const reportRes = await db.exec(
      `SELECT sleep_score, total_sleep_minutes, deep_sleep_minutes, light_sleep_minutes,
              rem_sleep_minutes, awake_minutes, awake_count, sleep_stages_json, noise_json
       FROM sleep_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 1`,
      [patientId]
    );

    if (reportRes.length === 0 || reportRes[0].values.length === 0) {
      return res.json({ code: 0, message: 'success', data: null });
    }

    const row = reportRes[0].values[0];
    const totalMin = row[1] || 0;
    const deepRatio = totalMin > 0 ? Math.round((row[2] / totalMin) * 100) : 0;

    return res.json({
      code: 0,
      message: 'success',
      data: {
        sleep_score: row[0],
        total_sleep_minutes: totalMin,
        deep_sleep_minutes: row[2],
        light_sleep_minutes: row[3],
        rem_sleep_minutes: row[4],
        awake_minutes: row[5],
        awake_count: row[6],
        deep_ratio: deepRatio,
        sleep_stages: typeof row[7] === 'string' ? JSON.parse(row[7]) : row[7],
        noise: typeof row[8] === 'string' ? JSON.parse(row[8]) : row[8]
      }
    });

  } catch (err) {
    console.error('[Doctor] 获取患者数据失败:', err);
    res.json({ code: 1001, message: '查询失败', data: null });
  }
});

/**
 * PUT /api/doctor/note
 * Body: { patient_id, note }
 * 医生保存/更新干预建议（写入 doctor_authorizations.doctor_note）
 */
router.put('/note', async (req, res) => {
  const doctorId = req.user.id;
  const { patient_id, note } = req.body;

  if (!patient_id) {
    return res.json({ code: 1001, message: '缺少患者ID', data: null });
  }

  try {
    const db = await getDb();

    const check = await db.exec(
      `SELECT id FROM doctor_authorizations WHERE patient_id = ? AND doctor_id = ? AND status = 'active'`,
      [patient_id, doctorId]
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1002, message: '未找到有效的授权记录', data: null });
    }

    const authId = check[0].values[0][0];

    await db.run(
      `UPDATE doctor_authorizations SET doctor_note = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [note || '', authId]
    );
    saveDb();

    return res.json({ code: 0, message: '建议保存成功', data: { patient_id, note } });

  } catch (err) {
    console.error('[Doctor] 保存建议失败:', err);
    res.json({ code: 1001, message: '保存失败', data: null });
  }
});

/**
 * GET /api/doctor/note
 * Query: patient_id
 */
router.get('/note', async (req, res) => {
  const doctorId = req.user.id;
  const patientId = req.query.patient_id;

  if (!patientId) {
    return res.json({ code: 1001, message: '缺少患者ID', data: null });
  }

  try {
    const db = await getDb();

    const noteRes = await db.exec(
      `SELECT doctor_note FROM doctor_authorizations WHERE patient_id = ? AND doctor_id = ? AND status = 'active'`,
      [patientId, doctorId]
    );

    if (noteRes.length > 0 && noteRes[0].values.length > 0) {
      return res.json({ code: 0, message: 'success', data: { note: noteRes[0].values[0][0] || '' } });
    }

    return res.json({ code: 0, message: 'success', data: { note: '' } });

  } catch (err) {
    console.error('[Doctor] 获取建议失败:', err);
    res.json({ code: 1001, message: '查询失败', data: null });
  }
});

module.exports = router;
