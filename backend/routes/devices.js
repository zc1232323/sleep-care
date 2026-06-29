/**
 * @file 设备管理路由（CRUD）
 * @author 周灿
 * @date 2026-06-29
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 生成设备序列号（VIR + 16位随机数字）
 * @returns {string} 如 "VIR1234567890123456"
 */
function generateSerialNo() {
  const digits = Math.floor(Math.random() * 10000000000000000)
    .toString()
    .padStart(15, '0');
  return 'VIR' + digits;
}

/** 所有设备接口都需要 JWT 认证 */
router.use(authenticateToken);

/**
 * @api {post} /api/v1/devices/add 添加设备
 * @apiName AddDevice
 * @apiGroup 设备管理
 * @apiParam {String} [device_name] 设备名称（可选）
 * @apiSuccess {Number} code 0=成功
 * @apiSuccess {Object} data 新增的设备信息（含 serial_no）
 */
router.post('/add', async (req, res) => {
  const { device_name } = req.body;
  const userId = req.user.id;
  const serialNo = generateSerialNo();
  const name = device_name || `智能睡眠设备-${Date.now().toString(36).toUpperCase()}`;

  try {
    const db = await getDb();

    db.run(
      'INSERT INTO devices (serial_no, device_name, user_id, status) VALUES (?, ?, ?, 1)',
      [serialNo, name, userId]
    );
    saveDb();

    // 查询刚插入的记录
    const result = db.exec(
      'SELECT id, serial_no, device_name, user_id, status, created_at FROM devices WHERE serial_no = ?',
      [serialNo]
    );
    const row = result[0].values[0];

    res.status(201).json({
      code: 0,
      message: '添加设备成功',
      data: {
        id: row[0],
        serial_no: row[1],
        device_name: row[2],
        user_id: row[3],
        status: row[4] === 1 ? '在线' : '离线',
        created_at: row[5],
      },
    });
  } catch (err) {
    console.error('[Device] 添加设备失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，添加设备失败',
      data: null,
    });
  }
});

/**
 * @api {get} /api/v1/devices/list 获取设备列表
 * @apiName ListDevices
 * @apiGroup 设备管理
 * @apiSuccess {Array} data.list 设备数组（按 created_at DESC 排序）
 */
router.get('/list', async (req, res) => {
  const userId = req.user.id;

  try {
    const db = await getDb();

    const result = db.exec(
      `SELECT id, serial_no, device_name, status, created_at
       FROM devices
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({
        code: 0,
        message: '暂无设备数据',
        data: { list: [] },
      });
    }

    const list = result[0].values.map((row) => ({
      id: row[0],
      serial_no: row[1],
      device_name: row[2],
      status: row[3] === 1 ? '在线' : '离线',
      created_at: row[4],
    }));

    res.json({
      code: 0,
      message: '查询成功',
      data: { list },
    });
  } catch (err) {
    console.error('[Device] 获取设备列表失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，查询失败',
      data: null,
    });
  }
});

/**
 * @api {put} /api/v1/devices/:id 更新设备信息
 * @apiName UpdateDevice
 * @apiGroup 设备管理
 * @apiParam {String} [device_name] 设备名称
 * @apiParam {Number} [status] 在线状态（1=在线 0=离线）
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { device_name, status } = req.body;
  const userId = req.user.id;

  // 至少传一个更新字段
  if (!device_name && status === undefined) {
    return res.status(400).json({
      code: 1,
      message: '请提供要更新的字段（device_name 或 status）',
      data: null,
    });
  }

  try {
    const db = await getDb();

    // 先确认设备存在且属于当前用户
    const check = db.exec(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [parseInt(id), userId]
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.status(404).json({
        code: 1,
        message: '设备不存在或无权限操作',
        data: null,
      });
    }

    // 动态拼接更新语句
    const updates = [];
    const values = [];
    if (device_name !== undefined) {
      updates.push('device_name = ?');
      values.push(device_name);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    values.push(parseInt(id));

    db.run(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ? AND user_id = ${userId}`,
      values
    );
    saveDb();

    // 返回更新后的数据
    const updated = db.exec(
      'SELECT id, serial_no, device_name, status, created_at FROM devices WHERE id = ?',
      [parseInt(id)]
    );
    const row = updated[0].values[0];

    res.json({
      code: 0,
      message: '更新成功',
      data: {
        id: row[0],
        serial_no: row[1],
        device_name: row[2],
        status: row[3] === 1 ? '在线' : '离线',
        created_at: row[4],
      },
    });
  } catch (err) {
    console.error('[Device] 更新设备失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，更新失败',
      data: null,
    });
  }
});

/**
 * @api {delete} /api/v1/devices/:id 删除设备
 * @apiName DeleteDevice
 * @apiGroup 设备管理
 * @apiSuccess {Number} code 0=成功
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const db = await getDb();

    // 确认设备存在且属于当前用户
    const check = db.exec(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [parseInt(id), userId]
    );

    if (check.length === 0 || check[0].values.length === 0) {
      return res.status(404).json({
        code: 1,
        message: '设备不存在或无权限删除',
        data: null,
      });
    }

    db.run('DELETE FROM devices WHERE id = ? AND user_id = ?', [parseInt(id), userId]);
    saveDb();

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (err) {
    console.error('[Device] 删除设备失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，删除失败',
      data: null,
    });
  }
});

module.exports = router;
