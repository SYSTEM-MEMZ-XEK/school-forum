const { getRunMode, RUN_MODES } = require('../config/constants');
const { validateAdminPermission } = require('../utils/validationUtils');
const logger = require('../utils/logger');

/**
 * 维护模式检查中间件
 * 检查论坛是否处于维护模式，如果是则只允许管理员访问
 */
async function checkMaintenanceMode(req, res, next) {
  try {
    const runMode = getRunMode();
    
    // 如果不是维护模式，继续正常请求
    if (runMode.current !== RUN_MODES.MAINTENANCE) {
      return next();
    }
    
    // 维护模式下，允许访问静态资源和管理员页面
    const path = req.path;
    
    // 允许访问的路径
    const allowedPaths = [
      '/admin.html',
      '/login.html',
      '/maintenance',
      '/auth/',
      '/admin/'
    ];
    
    // 静态资源路径
    const staticPaths = ['/css/', '/js/', '/images/', '/libs/', '/errors/'];
    
    // 检查是否是允许的路径
    const isAllowedPath = allowedPaths.some(p => path.startsWith(p));
    const isStaticPath = staticPaths.some(p => path.startsWith(p));
    
    if (isStaticPath) {
      return next();
    }
    
    // 如果是管理员API请求，验证管理员权限
    if (path.startsWith('/admin/') || path.startsWith('/auth/')) {
      return next();
    }
    
    // 如果是管理员页面请求
    if (path === '/admin.html' || path === '/login.html') {
      return next();
    }
    
    // 对于其他请求，检查用户是否是管理员
    const savedUser = req.headers['x-user-data'];
    
    if (savedUser) {
      try {
        const user = typeof savedUser === 'string' ? JSON.parse(savedUser) : savedUser;
        const validationResult = await validateAdminPermission(user.id || user.qq);
        
        if (validationResult.valid) {
          // 管理员可以正常访问
          return next();
        }
      } catch (e) {
        // 解析失败，继续处理为非管理员
      }
    }
    
    // 非管理员用户，返回维护页面
    logger.logInfo('维护模式拦截请求', {
      path: req.path,
      ip: req.ip,
      mode: runMode.current
    });
    
    // API请求返回JSON
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(503).json({
        success: false,
        message: runMode.maintenanceMessage || '网站正在维护中，请稍后再试',
        mode: 'maintenance'
      });
    }
    
    // 页面请求重定向到维护页面
    return res.redirect('/maintenance');
    
  } catch (error) {
    logger.logError('维护模式检查错误', { error: error.message });
    // 出错时允许请求继续，避免阻塞
    return next();
  }
}

/**
 * 自毁模式检查中间件
 */
async function checkSelfDestructMode(req, res, next) {
  try {
    const runMode = getRunMode();
    
    // 如果不是自毁模式，继续正常请求
    if (runMode.current !== RUN_MODES.SELF_DESTRUCT) {
      return next();
    }
    
    logger.logWarn('自毁模式激活，拒绝请求', {
      path: req.path,
      ip: req.ip,
      level: runMode.selfDestructLevel
    });
    
    // 自毁模式下，只允许管理员访问
    const path = req.path;
    
    // 允许管理员相关路径
    if (path.startsWith('/admin/') || path === '/admin.html') {
      return next();
    }
    
    // 其他请求返回503
    return res.status(503).json({
      success: false,
      message: '论坛已关闭',
      mode: 'self_destruct'
    });
    
  } catch (error) {
    logger.logError('自毁模式检查错误', { error: error.message });
    return next();
  }
}

/**
 * 调试模式中间件
 * 在调试模式下增加日志输出
 */
function debugModeLogger(req, res, next) {
  const runMode = getRunMode();
  
  if (runMode.current === RUN_MODES.DEBUG) {
    logger.logDebug('调试模式请求', {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      }
    });
  }
  
  next();
}

module.exports = {
  checkMaintenanceMode,
  checkSelfDestructMode,
  debugModeLogger
};
