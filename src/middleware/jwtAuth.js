/**
 * JWT 认证中间件
 * 提供用户和管理员的 Token 认证
 */
const jwt = require('jsonwebtoken');
const { JWT_CONFIG, ADMIN_JWT_CONFIG, LOGIN_SECURITY } = require('../config/security');
const { getRedisClient } = require('../utils/redisUtils');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * 生成访问令牌
 */
function generateAccessToken(userId, payload = {}) {
  return jwt.sign(
    { 
      userId,
      type: 'access',
      ...payload 
    },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    }
  );
}

/**
 * 生成刷新令牌
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { 
      userId,
      type: 'refresh'
    },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.refreshExpiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    }
  );
}

/**
 * 生成管理员令牌
 */
function generateAdminToken(adminId, payload = {}) {
  return jwt.sign(
    { 
      adminId,
      type: 'admin',
      ...payload 
    },
    ADMIN_JWT_CONFIG.secret,
    {
      expiresIn: ADMIN_JWT_CONFIG.expiresIn,
      issuer: ADMIN_JWT_CONFIG.issuer,
      audience: ADMIN_JWT_CONFIG.audience
    }
  );
}

/**
 * 验证令牌
 */
function verifyToken(token, isAdmin = false) {
  const config = isAdmin ? ADMIN_JWT_CONFIG : JWT_CONFIG;
  
  try {
    const decoded = jwt.verify(token, config.secret, {
      issuer: config.issuer,
      audience: config.audience
    });
    return { valid: true, decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error.name,
      message: error.message 
    };
  }
}

/**
 * 从请求中提取令牌
 */
function extractToken(req) {
  // 优先从 Authorization 头获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 其次从查询参数获取（用于 WebSocket 等）
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  // 最后从 Cookie 获取
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * 用户认证中间件
 */
async function authenticateUser(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.logWarn('认证失败：未提供Token', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderPrefix: req.headers.authorization ? req.headers.authorization.substring(0, 15) + '...' : 'N/A',
        contentType: req.headers['content-type']
      });
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }
    
    const result = verifyToken(token);
    
    if (!result.valid) {
      // 调试日志：记录验证失败的具体原因
      logger.logWarn('Token验证失败', {
        error: result.error,
        message: result.message,
        path: req.path,
        tokenPrefix: token.substring(0, 20) + '...'
      });
      
      if (result.error === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '登录已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: '无效的身份验证'
      });
    }
    
    // 检查令牌是否在黑名单中（已注销）
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`token_blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: '令牌已失效，请重新登录'
        });
      }
    }
    
    // 验证用户是否存在（用户ID是自定义字符串UUID，不是MongoDB _id）
    const user = await User.findOne({ id: result.decoded.userId }).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      qq: user.qq,
      avatar: user.avatar,
      role: user.role || 'user'
    };
    req.token = token;
    
    next();
  } catch (error) {
    logger.logError('用户认证失败', { 
      error: error.message,
      path: req.path
    });
    
    res.status(500).json({
      success: false,
      message: '认证服务错误'
    });
  }
}

/**
 * 管理员认证中间件
 */
async function authenticateAdmin(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请提供管理员身份验证'
      });
    }
    
    const result = verifyToken(token, true);
    
    if (!result.valid) {
      if (result.error === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '管理员会话已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: '无效的管理员身份验证'
      });
    }
    
    // 检查令牌黑名单
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`admin_token_blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: '管理员令牌已失效'
        });
      }
    }
    
    // 验证管理员权限
    const { validateAdminPermission } = require('../utils/validationUtils');
    const validationResult = await validateAdminPermission(result.decoded.adminId);
    
    if (!validationResult.valid) {
      return res.status(403).json({
        success: false,
        message: validationResult.message
      });
    }
    
    // 将管理员信息附加到请求对象
    req.admin = {
      id: result.decoded.adminId,
      username: validationResult.user.username,
      role: 'admin'
    };
    req.token = token;
    
    next();
  } catch (error) {
    logger.logError('管理员认证失败', { 
      error: error.message,
      path: req.path
    });
    
    res.status(500).json({
      success: false,
      message: '认证服务错误'
    });
  }
}

/**
 * 可选认证中间件
 * 如果提供了令牌则验证，否则继续
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    return next();
  }
  
  try {
    const result = verifyToken(token);
    
    if (result.valid) {
      const user = await User.findOne({ id: result.decoded.userId }).lean();
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          qq: user.qq,
          avatar: user.avatar,
          role: user.role || 'user'
        };
        req.token = token;
      }
    }
  } catch (error) {
    // 静默失败，继续处理请求
  }
  
  next();
}

/**
 * 注销令牌
 * 将令牌加入黑名单
 */
async function invalidateToken(token, isAdmin = false) {
  const redis = getRedisClient();
  if (!redis) return false;
  
  try {
    const result = verifyToken(token, isAdmin);
    if (!result.valid) return false;
    
    // 计算剩余有效期
    const expiresAt = result.decoded.exp * 1000;
    const ttl = Math.max(0, expiresAt - Date.now());
    
    // 存入黑名单
    const key = isAdmin ? `admin_token_blacklist:${token}` : `token_blacklist:${token}`;
    await redis.setEx(key, Math.ceil(ttl / 1000), '1');
    
    return true;
  } catch (error) {
    logger.logError('注销令牌失败', { error: error.message });
    return false;
  }
}

/**
 * 登录失败追踪
 */
async function recordLoginAttempt(identifier, success, ip) {
  const redis = getRedisClient();
  if (!redis) return { allowed: true };
  
  const key = `${LOGIN_SECURITY.redisPrefix}${identifier}`;
  
  try {
    if (success) {
      // 登录成功，清除失败记录
      await redis.del(key);
      return { allowed: true };
    }
    
    // 登录失败，增加计数
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      // 首次失败，设置过期时间
      await redis.expire(key, Math.ceil(LOGIN_SECURITY.lockTime / 1000));
    }
    
    // 检查是否需要锁定
    if (attempts >= LOGIN_SECURITY.maxAttempts) {
      const ttl = await redis.ttl(key);
      logger.logSecurityEvent('account_locked', {
        identifier,
        ip,
        attempts,
        lockTimeRemaining: ttl
      });
      
      return { 
        allowed: false, 
        attempts,
        lockTimeRemaining: ttl * 1000
      };
    }
    
    return { 
      allowed: true, 
      attempts,
      remaining: LOGIN_SECURITY.maxAttempts - attempts
    };
  } catch (error) {
    logger.logError('记录登录尝试失败', { error: error.message });
    return { allowed: true };
  }
}

/**
 * 检查登录是否被锁定
 */
async function checkLoginLocked(identifier) {
  const redis = getRedisClient();
  if (!redis) return { locked: false };
  
  try {
    const key = `${LOGIN_SECURITY.redisPrefix}${identifier}`;
    const attempts = await redis.get(key);
    
    if (attempts && parseInt(attempts) >= LOGIN_SECURITY.maxAttempts) {
      const ttl = await redis.ttl(key);
      return {
        locked: true,
        lockTimeRemaining: ttl * 1000
      };
    }
    
    return { locked: false };
  } catch (error) {
    logger.logError('检查登录锁定失败', { error: error.message });
    return { locked: false };
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateAdminToken,
  verifyToken,
  extractToken,
  authenticateUser,
  authenticateAdmin,
  optionalAuth,
  invalidateToken,
  recordLoginAttempt,
  checkLoginLocked
};
