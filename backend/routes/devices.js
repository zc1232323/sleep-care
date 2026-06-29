/**
 * @file 设备管理路由（CRUD）—— 对齐第3节讲义
 * @author 周灿
 * @date 2026-06-29
 *
 * 字段对齐讲义：serial_no, user_id, nickname, is_virtual, online_status,
 *              created_at, updated_at
 * 接口设计：
 *   GET    /list         获取当前用户的设备列表
 *   POST   /add          添加虚拟设备（is_virtual=true）或手动添加（device_serial）
 *   PUT    /:id          修改设备昵称
 *   DELETE /:id          删除设备（按主键 id）
 */

const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 生成虚拟设备序列号：VIR + 16位随机字母数字
 * @returns {string} 如 "VIRaB3xY9kLm2NpQ7"
 */
function generateSerialNo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 16; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'VIR' + randomStr;
}

/** 所有设备接口都需要 JWT 认证 */
router.use(authenticateToken);

/**
 * @api {get} /api/v1/devices/list 获取设备列表
 * 查询当前用户的所有设备，按 created_at DESC 排序
 */
router.get('/list', async (req, res) => {
  const userId = req.user.id;

  try {
    const db = await getDb();

    const result = db.exec(
      `SELECT id, serial_no, user_id, nickname, is_virtual, online_status, created_at, updated_at
       FROM devices
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({
        code: 0,
        message: 'success',
        data: [],
      });
    }

    const list = result[0].values.map((row) => ({
      id: row[0],
      serial_no: row[1],
      user_id: row[2],
      nickname: row[3],
      is_virtual: row[4],
      online_status: row[5],
      created_at: row[6],
      updated_at: row[7],
    }));

    res.json({
      code: 0,
      message: 'success',
      data: list,
    });
  } catch (err) {
    console.error('[Device] 获取设备列表失败:', err);
    res.json({
      code: 1001,
      message: '查询失败',
      data: null,
    });
  }
});

/**
 * @api {post} /api/v1/devices/add 添加设备
 * @apiParam {String} [device_serial] 手动输入的16位序列号（可选）
 * @apiParam {Boolean} [is_virtual] 是否虚拟设备（true 时自动生成 serial_no）
 * 逻辑：
 *   - is_virtual=true → 自动生成 "VIR"+16位随机
 *   - 传入 device_serial → 直接使用（校验16位字母数字）
 *   - 插入后 saveDb 持久化
 */
router.post('/add', async (req, res) => {
  const { device_serial, is_virtual } = req.body;
  const userId = req.user.id;

  let serialNo;

  // 1. 序列号生成策略
  if (is_virtual === true) {
    // 虚拟设备：自动生成，最多重试3次避免碰撞
    const db = await getDb();
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateSerialNo();
      const exists = db.exec('SELECT 1 FROM devices WHERE serial_no = ?', [candidate]);
      if (exists.length === 0 || exists[0].values.length === 0) {
        serialNo = candidate;
        break;
      }
    }
    if (!serialNo) {
      return res.json({ code: 1001, message: '序列号生成失败，请重试', data: null });
    }
  } else if (device_serial) {
    // 手动添加：校验16位字母数字
    if (!/^[A-Za-z0-9]{16}$/.test(device_serial)) {
      return res.json({
        code: 1001,
        message: '序列号格式错误（需16位字母数字）',
        data: null,
      });
    }
    serialNo = device_serial;
  } else {
    return res.json({
      code: 1001,
      message: '请提供设备序列号或标记为虚拟设备',
      data: null,
    });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    const db = await getDb();

    // 2. 插入设备（is_virtual: 1虚拟 / 0真实；online_status 默认 1 在线）
    try {
      db.run(
        `INSERT INTO devices (user_id, serial_no, nickname, is_virtual, online_status, created_at, updated_at)
         VALUES (?, ?, '我的设备', ?, 1, ?, ?)`,
        [userId, serialNo, is_virtual ? 1 : 0, now, now]
      );
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.json({ code: 1001, message: '该序列号已被绑定', data: null });
      }
      throw err;
    }

    // 3. 关键：sql.js 必须显式调用 saveDb 持久化到磁盘
    saveDb();

    // 4. 查询新插入的设备
    const result = db.exec(
      `SELECT id, serial_no, user_id, nickname, is_virtual, online_status, created_at, updated_at
       FROM devices WHERE serial_no = ?`,
      [serialNo]
    );
    const row = result[0].values[0];

    res.json({
      code: 0,
      message: '添加成功',
      data: {
        id: row[0],
        serial_no: row[1],
        user_id: row[2],
        nickname: row[3],
        is_virtual: row[4],
        online_status: row[5],
        created_at: row[6],
        updated_at: row[7],
      },
    });
  } catch (err) {
    console.error('[Device] 添加设备失败:', err);
    res.json({
      code: 1001,
      message: '添加失败',
      data: null,
    });
  }
});

/**
 * @api {put} /api/v1/devices/:id 修改设备昵称
 * 按主键 id 修改，先验证设备属于当前用户（权限校验）
 */
router.put('/:id', async (req, res) => {
  const deviceId = parseInt(req.params.id, 10);
  const { nickname } = req.body;
  const userId = req.user.id;

  if (!nickname || !nickname.trim()) {
    return res.json({ code: 1001, message: '设备昵称不能为空', data: null });
  }

  try {
    const db = await getDb();

    // 1. 权限校验：验证设备属于当前用户
    const check = db.exec('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1001, message: '设备不存在', data: null });
    }
    const deviceRow = check[0].values[0];
    // user_id 在第3列（索引2）
    if (deviceRow[2] !== userId) {
      return res.json({ code: 1001, message: '无权操作该设备', data: null });
    }

    // 2. 执行更新
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.run(
      'UPDATE devices SET nickname = ?, updated_at = ? WHERE id = ?',
      [nickname.trim(), now, deviceId]
    );
    saveDb();

    // 3. 返回更新后的设备
    const updated = db.exec(
      `SELECT id, serial_no, user_id, nickname, is_virtual, online_status, created_at, updated_at
       FROM devices WHERE id = ?`,
      [deviceId]
    );
    const row = updated[0].values[0];

    res.json({
      code: 0,
      message: '修改成功',
      data: {
        id: row[0],
        serial_no: row[1],
        user_id: row[2],
        nickname: row[3],
        is_virtual: row[4],
        online_status: row[5],
        created_at: row[6],
        updated_at: row[7],
      },
    });
  } catch (err) {
    console.error('[Device] 更新设备失败:', err);
    res.json({
      code: 1001,
      message: '修改失败',
      data: null,
    });
  }
});

/**
 * @api {delete} /api/v1/devices/:id 删除设备
 * 按主键 id 删除，先验证设备属于当前用户（权限校验）
 */
router.delete('/:id', async (req, res) => {
  const deviceId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const db = await getDb();

    // 1. 权限校验
    const check = db.exec('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (check.length === 0 || check[0].values.length === 0) {
      return res.json({ code: 1001, message: '设备不存在', data: null });
    }
    const deviceRow = check[0].values[0];
    if (deviceRow[2] !== userId) {
      return res.json({ code: 1001, message: '无权操作该设备', data: null });
    }

    // 2. 硬删除
    db.run('DELETE FROM devices WHERE id = ?', [deviceId]);
    saveDb();

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (err) {
    console.error('[Device] 删除设备失败:', err);
    res.json({
      code: 1001,
      message: '删除失败',
      data: null,
    });
  }
});

module.exports = router;
