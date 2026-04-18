/**
 * 管理员权限验证中间件
 * 支持 JWT Token 认证，同时兼容旧的 adminId 方式（过渡期）
 */
const { authenticateAdmin } = require('./jwtAuth');
const logger = require('../utils/logger');

/**
 * 管理员权限验证中间件（新版）
 * 优先使用 JWT Token，兼容旧的 adminId 方式
 */
async function requireAdmin(req, res, next) {
  try {
    // 使用 JWT 认证中间件
    await authenticateAdmin(req, res, (err) => {
      if (err) return next(err);
      
      // 认证成功，记录日志
      if (req.admin) {
        logger.logSecurityEvent('admin_auth_success', {
          adminId: req.admin.id,
          username: req.admin.username,
          path: req.path,
          method: req.method,
          ip: req.ip,
          legacyAuth: req.admin.legacyAuth || false
        });
      }
      
      next();
    });
  } catch (error) {
    logger.logError('管理员权限验证错误', { 
      error: error.message,
      path: req.path
    });
    res.status(500).json({ 
      success: false,
      message: '权限验证失败' 
    });
  }
}

/**
 * 严格管理员权限验证（仅 JWT Token）
 * 不兼容旧的 adminId 方式
 */
async function requireAdminStrict(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请提供有效的管理员 Token'
      });
    }
    
    await authenticateAdmin(req, res, next);
  } catch (error) {
    logger.logError('严格管理员权限验证错误', { 
      error: error.message,
      path: req.path
    });
    res.status(500).json({ 
      success: false,
      message: '权限验证失败' 
    });
  }
}

module.exports = {
  requireAdmin,
  requireAdminStrict
};