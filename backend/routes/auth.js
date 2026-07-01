/**
 * @file 用户认证路由（注册 + 登录）—— 对齐第2节讲义
 * @author 周灿
 * @date 2026-06-29
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db/connection');

const router = express.Router();

/** JWT 密钥（生产环境应使用环境变量） */
const JWT_SECRET = process.env.JWT_SECRET || 'sleep_care_jwt_secret_2026';
/** JWT 过期时间 */
const JWT_EXPIRES_IN = '7d';
/** 密码加密强度 */
const BCRYPT_ROUNDS = 10;

/**
 * @api {post} /api/v1/auth/register 用户注册
 * @apiParam {String} phone 手机号（11位）
 * @apiParam {String} password 密码（>=6位）
 * @apiParam {String} [nickname] 昵称（可选，默认"用户+手机后4位"）
 * 字段对齐讲义：phone, password_hash, nickname, role=patient, status=1
 */
router.post('/register', async (req, res) => {
  const { phone, password, nickname } = req.body;
  // 第11大节：支持 role 参数，默认 'patient'，只允许 patient/doctor
  const role = req.body.role === 'doctor' ? 'doctor' : 'patient';

  // 1. 校验手机号和密码不能为空
  if (!phone || !password) {
    return res.json({
      code: 1001,
      message: '手机号和密码不能为空',
      data: null,
    });
  }

  // 2. 手机号必须是11位数字
  if (!/^\d{11}$/.test(phone)) {
    return res.json({
      code: 1001,
      message: '手机号必须是11位数字',
      data: null,
    });
  }

  // 3. 密码长度校验
  if (password.length < 6) {
    return res.json({
      code: 1001,
      message: '密码长度不能少于6位',
      data: null,
    });
  }

  try {
    const db = await getDb();

    // 4. 检查手机号是否已注册
    const existing = db.exec('SELECT 1 FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.json({
        code: 1001,
        message: '该手机号已注册',
        data: null,
      });
    }

    // 5. bcrypt 哈希密码
    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    // 6. 默认昵称（如未传 nickname）
    const displayName = nickname || `用户${phone.slice(-4)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 7. 插入新用户：role 默认 patient（第11大节支持传入 doctor），status 默认 1
    try {
      db.run(
        `INSERT INTO users (phone, password_hash, nickname, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [phone, passwordHash, displayName, role, now, now]
      );
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.json({ code: 1001, message: '该手机号已注册', data: null });
      }
      throw err;
    }

    // 8. 持久化到磁盘（sql.js 关键步骤）
    saveDb();

    // 9. 查询新用户（不含密码哈希）
    const result = db.exec(
      'SELECT id, phone, nickname, role FROM users WHERE phone = ?',
      [phone]
    );
    const row = result[0].values[0];

    res.json({
      code: 0,
      message: '注册成功',
      data: {
        id: row[0],
        phone: row[1],
        nickname: row[2],
        role: row[3],
      },
    });
  } catch (err) {
    console.error('[Auth] 注册失败:', err);
    res.json({
      code: 1001,
      message: '注册失败',
      data: null,
    });
  }
});

/**
 * @api {post} /api/v1/auth/login 用户登录
 * @apiParam {String} phone 手机号
 * @apiParam {String} password 密码
 * 返回：token + 用户信息（id, phone, nickname, role）
 * 逻辑：校验 → 查用户 → bcrypt 验密 → 检查 status → 签发 JWT → 更新 updated_at
 */
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  // 1. 校验非空
  if (!phone || !password) {
    return res.json({
      code: 1001,
      message: '手机号和密码不能为空',
      data: null,
    });
  }

  try {
    const db = await getDb();

    // 2. 按 phone 查询用户
    const result = db.exec(
      'SELECT id, phone, password_hash, nickname, role, status FROM users WHERE phone = ?',
      [phone]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({
        code: 1001,
        message: '用户不存在，请先注册',
        data: null,
      });
    }

    const row = result[0].values[0];
    const user = {
      id: row[0],
      phone: row[1],
      password_hash: row[2],
      nickname: row[3],
      role: row[4],
      status: row[5],
    };

    // 3. bcrypt 验证密码
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.json({
        code: 1001,
        message: '密码错误',
        data: null,
      });
    }

    // 4. 检查账号状态（status === 1 才允许登录）
    if (user.status !== 1) {
      return res.json({
        code: 1001,
        message: '账号已被禁用',
        data: null,
      });
    }

    // 5. 签发 JWT（payload 包含 id, phone, role，不放密码等敏感信息）
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 6. 更新 updated_at（记录最后登录时间）
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.run('UPDATE users SET updated_at = ? WHERE id = ?', [now, user.id]);
    saveDb();

    // 7. 返回 token 和用户信息
    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth] 登录失败:', err);
    res.json({
      code: 1001,
      message: '登录失败',
      data: null,
    });
  }
});

module.exports = router;
