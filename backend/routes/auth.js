/**
 * @file 用户认证路由（注册 + 登录）
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
 * @apiName Register
 * @apiGroup 认证
 * @apiParam {String} phone 手机号
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 * @apiSuccess {Number} code 状态码（0=成功）
 * @apiSuccess {String} message 提示信息
 * @apiSuccess {Object} data 用户信息
 */
router.post('/register', async (req, res) => {
  const { phone, username, password } = req.body;

  // 参数校验
  if (!phone || !username || !password) {
    return res.status(400).json({
      code: 1,
      message: '手机号、用户名和密码不能为空',
      data: null,
    });
  }

  // 密码长度校验
  if (password.length < 6) {
    return res.status(400).json({
      code: 1,
      message: '密码长度不能少于6位',
      data: null,
    });
  }

  try {
    const db = await getDb();

    // 检查手机号是否已注册
    const existing = db.exec('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({
        code: 1,
        message: '该手机号已注册',
        data: null,
      });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 插入新用户
    db.run(
      'INSERT INTO users (phone, username, password_hash) VALUES (?, ?, ?)',
      [phone, username, passwordHash]
    );

    // 持久化到文件
    saveDb();

    // 查询刚插入的用户（获取 id 和 created_at）
    const result = db.exec('SELECT id, phone, username, created_at FROM users WHERE phone = ?', [phone]);
    const user = result[0].values[0];

    res.status(201).json({
      code: 0,
      message: '注册成功',
      data: {
        id: user[0],
        phone: user[1],
        username: user[2],
        created_at: user[3],
      },
    });
  } catch (err) {
    console.error('[Auth] 注册失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，注册失败',
      data: null,
    });
  }
});

/**
 * @api {post} /api/v1/auth/login 用户登录
 * @apiName Login
 * @apiGroup 认证
 * @apiParam {String} phone 手机号
 * @apiParam {String} password 密码
 * @apiSuccess {Number} code 状态码（0=成功）
 * @apiSuccess {String} message 提示信息
 * @apiSuccess {String} data.token JWT令牌
 * @apiSuccess {Object} data.user 用户信息
 */
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  // 参数校验
  if (!phone || !password) {
    return res.status(400).json({
      code: 1,
      message: '手机号和密码不能为空',
      data: null,
    });
  }

  try {
    const db = await getDb();

    // 查询用户
    const result = db.exec(
      'SELECT id, phone, username, password_hash, created_at FROM users WHERE phone = ?',
      [phone]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(400).json({
        code: 1,
        message: '该手机号未注册',
        data: null,
      });
    }

    const row = result[0].values[0];
    const user = {
      id: row[0],
      phone: row[1],
      username: row[2],
      password_hash: row[3],
      created_at: row[4],
    };

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        code: 1,
        message: '密码错误',
        data: null,
      });
    }

    // 生成 JWT Token
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error('[Auth] 登录失败:', err);
    res.status(500).json({
      code: 1,
      message: '服务器错误，登录失败',
      data: null,
    });
  }
});

module.exports = router;
