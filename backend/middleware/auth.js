/**
 * @file JWT 认证中间件（authenticateToken）
 * @author 周灿
 * @date 2026-06-29
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sleep_care_jwt_secret_2026';

/**
 * JWT Token 验证中间件
 * 从请求头 Authorization: Bearer <token> 中提取并验证 token，
 * 将解析出的用户信息挂载到 req.user 上。
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      code: 1,
      message: '未提供认证令牌',
      data: null,
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        code: 1,
        message: '令牌无效或已过期',
        data: null,
      });
    }

    // 将用户信息挂载到请求对象上，供后续路由使用
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
