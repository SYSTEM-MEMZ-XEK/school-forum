const express = require('express');
require('express-async-errors'); // 必须在 express 后立即导入
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// 加载环境变量
require('dotenv').config();

// 导入安全配置
const { CORS_CONFIG, HELMET_CONFIG, REQUEST_LIMITS } = require('./src/config/security');

// 导入动态安全配置
const { getSecurityConfig } = require('./src/utils/configUtils');

// 导入安全中间件
const { 
  xssFilter, 
  requestIdMiddleware, 
  injectionGuard,
  additionalSecurityHeaders 
} = require('./src/middleware/security');

// 导入限流中间件
const { createRateLimiter } = require('./src/middleware/rateLimitMiddleware');

// 导入配置
const {
  DATA_DIR,
  IMAGES_DIR,
  PORT,
  MONGODB_URI,
  MONGODB_OPTIONS,
  MONGODB_AUTH,
  REDIS_CONFIG
} = require('./src/config/constants');

// ===================== 启动前安全配置预检 =====================
function checkAuthConfig() {
  const warnings = [];

  // MongoDB 认证检查
  if (!MONGODB_AUTH.username || !MONGODB_AUTH.password) {
    warnings.push(
      '[安全警告] MongoDB 未配置用户名/密码认证（MONGODB_USERNAME / MONGODB_PASSWORD）。' +
      '如在生产环境中使用，请务必启用 MongoDB 认证。'
    );
  }
  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_TLS !== 'true') {
    warnings.push(
      '[安全警告] 生产环境建议启用 MongoDB TLS 加密传输（MONGODB_TLS=true）。'
    );
  }

  // Redis 认证检查
  if (!REDIS_CONFIG.password) {
    warnings.push(
      '[安全警告] Redis 未配置密码认证（REDIS_PASSWORD）。' +
      '如 Redis 暴露于网络，请务必设置密码。'
    );
  }
  if (process.env.NODE_ENV === 'production' && !REDIS_CONFIG.tls) {
    warnings.push(
      '[安全警告] 生产环境建议启用 Redis TLS 加密传输（REDIS_TLS=true）。'
    );
  }

  warnings.forEach(w => console.warn(w));
}

// 导入数据库连接
const { connectDB, migrateFromJSON } = require('./src/models');

// 导入工具函数
const { initializeDirectories } = require('./src/utils/dataUtils');
const logger = require('./src/utils/logger');

// 导入Redis工具
const { initRedis, closeRedis, ipStats } = require('./src/utils/redisUtils');

// 导入路由
const routes = require('./src/routes');

// 导入维护模式中间件
const { checkMaintenanceMode, checkSelfDestructMode, debugModeLogger } = require('./src/middleware/maintenanceMode');

const app = express();

// ==================== 安全中间件配置 ====================
// 注意：顺序很重要，安全中间件应尽早添加

// 1. 请求 ID（便于追踪）
app.use(requestIdMiddleware);

// 2. Helmet 安全头（动态配置）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.helmetEnabled) return next();
  
  const dynamicHelmetConfig = { ...HELMET_CONFIG };
  
  // CSP 开关
  if (!sec.cspEnabled) {
    dynamicHelmetConfig.contentSecurityPolicy = false;
  } else if (!sec.allowHTTP) {
    // 非 HTTP 模式下 CSP connectSrc 加上 https
    dynamicHelmetConfig.contentSecurityPolicy = {
      ...HELMET_CONFIG.contentSecurityPolicy,
      directives: {
        ...HELMET_CONFIG.contentSecurityPolicy.directives,
        connectSrc: ["'self'", "https:"]
      }
    };
  }
  
  // iframe 嵌入防护开关
  if (!sec.frameGuard) {
    dynamicHelmetConfig.frameguard = false;
  }
  
  // HSTS 开关
  dynamicHelmetConfig.hsts = sec.hstsEnabled ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false;
  
  // 限制跨源资源读取（防止 CORS 配置错误时的数据泄露）
  dynamicHelmetConfig.crossOriginResourcePolicy = { policy: 'same-origin' };
  
  helmet(dynamicHelmetConfig)(req, res, next);
});

// 3. CORS 跨域配置（严格白名单，不反射任意 Origin）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  const dynamicCorsOptions = { ...CORS_CONFIG.options };
  
  // 额外来源合并
  let baseOrigins = [...CORS_CONFIG.origins];
  if (sec.corsExtraOrigins && sec.corsExtraOrigins.length > 0) {
    sec.corsExtraOrigins.forEach(origin => {
      if (!baseOrigins.includes(origin)) baseOrigins.push(origin);
    });
  }
  
  dynamicCorsOptions.origin = function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = baseOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) return callback(null, true);
    callback(new Error('CORS policy: Origin not allowed'));
  };
  
  cors(dynamicCorsOptions)(req, res, next);
});

// 4. HPP - 防止 HTTP 参数污染（动态配置）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.hppGuardEnabled) return next();
  hpp({
    checkQuery: true,
    checkBody: true,
    whitelist: ['tags', 'categories', 'ids']
  })(req, res, next);
});

// 5. MongoDB 注入防护（动态配置）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.mongoSanitizeEnabled) return next();
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      logger.logSecurityEvent('mongodb_injection_blocked', {
        key,
        path: req.path,
        ip: req.ip
      });
    }
  })(req, res, next);
});

// 6. 请求体大小限制（从 50MB 降低到可配置值）
app.use(bodyParser.json({ limit: `${REQUEST_LIMITS.maxBodySize}mb` }));
app.use(bodyParser.urlencoded({ extended: true, limit: `${REQUEST_LIMITS.maxBodySize}mb` }));

// 6.1. JSON 解析错误统一处理（避免泄露解析器内部细节）
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: '请求格式错误，请检查提交的数据格式'
    });
  }
  next(err);
});

// 6.5. API 限流中间件（动态配置，排除静态资源）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.rateLimitEnabled) return next();

  // 排除静态资源请求
  if (req.path.startsWith('/css/') || req.path.startsWith('/js/') ||
      req.path.startsWith('/images/') || req.path.startsWith('/libs/') ||
      req.path.startsWith('/errors/') || req.path.endsWith('.ico') ||
      req.path.endsWith('.html') || req.path.endsWith('.svg')) {
    return next();
  }

  // 根据路径选择限流规则
  let limit, windowMs, message;
  const path = req.path.toLowerCase();

  if (path.includes('/login') || path.includes('/register') || path.includes('/auth') || path.includes('/send-verification-code')) {
    // 登录/注册/验证码：严格限流
    limit = sec.rateLimitLogin || 5;
    windowMs = (sec.rateLimitLoginWindow || 60) * 1000;
    message = '登录尝试过于频繁，请60秒后再试';
  } else if (path.includes('/posts') && req.method === 'POST') {
    // 发帖：中等限流
    limit = sec.rateLimitPost || 10;
    windowMs = (sec.rateLimitPostWindow || 60) * 1000;
    message = '发帖过于频繁，请稍后再试';
  } else if (path.includes('/comments')) {
    // 评论：中等限流
    limit = sec.rateLimitComment || 20;
    windowMs = (sec.rateLimitCommentWindow || 60) * 1000;
    message = '评论过于频繁，请稍后再试';
  } else {
    // 通用 API 限流
    limit = sec.rateLimitGeneral || 100;
    windowMs = (sec.rateLimitGeneralWindow || 60) * 1000;
    message = '请求过于频繁，请稍后再试';
  }

  createRateLimiter({ limit, window: Math.floor(windowMs / 1000), message })(req, res, next);
});

// 7. 静态文件服务（带缓存控制 + 路径防护）
app.use((req, res, next) => {
  // 阻止包含 .. 的路径遍历请求
  if (decodeURIComponent(req.path).includes('..')) {
    return res.status(403).json({ success: false, message: '禁止访问' });
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // 带哈希的文件（构建产物）缓存1年
    if (filePath.match(/\.([a-f0-9]{8,})\.(js|css|woff2?|png|jpg|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    // 设置正确的 MIME charset
    if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Content-Type', res.getHeader('Content-Type')?.replace('charset=utf-8', 'charset=utf-8') || '');
    }
  }
}));

// 8. XSS 过滤（动态配置）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.xssFilterEnabled) return next();
  xssFilter(req, res, next);
});

// 9. 注入防护（动态配置）
app.use((req, res, next) => {
  const sec = getSecurityConfig();
  if (!sec.injectionGuardEnabled) return next();
  injectionGuard(req, res, next);
});

// 10. 额外的安全头
app.use(additionalSecurityHeaders);

// 调试模式日志中间件
app.use(debugModeLogger);

// 维护模式检查中间件
app.use(checkMaintenanceMode);

// 自毁模式检查中间件
app.use(checkSelfDestructMode);

// 请求日志中间件（安全增强版）
app.use((req, res, next) => {
  const startTime = Date.now();

  // 获取客户端真实IP（支持代理）
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress ||
                   req.ip;

  // 记录请求信息
  logger.logInfo('收到请求', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: clientIp,
    userAgent: req.get('user-agent')?.substring(0, 100) // 限制长度
  });

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'logError' : 'logInfo';

    // 记录可疑请求
    if (res.statusCode >= 400 || duration > 5000) {
      logger.logSecurityEvent('suspicious_request', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: clientIp
      });
    }

    logger[logLevel]('请求完成', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: clientIp
    });

    // 记录IP访问统计（排除静态资源请求）
    const staticPaths = ['/css/', '/js/', '/images/', '/libs/', '/errors/', '.ico', '.png', '.jpg', '.svg'];
    const isStaticRequest = staticPaths.some(p => req.path.includes(p));
    
    if (!isStaticRequest && clientIp) {
      // 异步记录，不阻塞响应
      ipStats.recordAccess(clientIp).catch(() => {});
    }
  });

  next();
});

// 提供 node_modules 中的库文件
app.use('/libs/mathjax', express.static(path.join(__dirname, 'public/libs/mathjax')));
app.use('/libs/katex', express.static(path.join(__dirname, 'node_modules/katex/dist')));
app.use('/libs/highlight.js', express.static(path.join(__dirname, 'node_modules/highlight.js/lib')));
app.use('/libs/highlight.js/styles', express.static(path.join(__dirname, 'node_modules/highlight.js/styles')));
app.use('/libs/markdown-it', express.static(path.join(__dirname, 'node_modules/markdown-it/dist')));

// 初始化目录
logger.logSystemEvent('正在初始化目录...');
initializeDirectories();

// 初始化配置文件
const { initConfig } = require('./src/utils/configUtils');
initConfig();
logger.logSystemEvent('配置文件初始化完成');

// 使用路由
app.use('/', routes);

// 安全错误处理中间件
const { secureErrorHandler } = require('./src/middleware/security');
app.use(secureErrorHandler);

// 启动服务器
async function startServer() {
  try {
    // 认证配置预检（发出警告，不阻止启动）
    checkAuthConfig();
    // 连接 MongoDB
    logger.logSystemEvent('正在连接 MongoDB...');
    await connectDB(MONGODB_URI, MONGODB_OPTIONS);
    logger.logSuccess('MongoDB 连接成功');

    // 初始化 Redis（带超时，失败时不影响服务启动）
    logger.logSystemEvent('正在连接 Redis...');
    try {
      await Promise.race([
        initRedis(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis 连接超时')), 8000))
      ]);
      logger.logSuccess('Redis 连接成功');
    } catch (redisError) {
      logger.logError('Redis 连接失败，将使用内存存储（限流等功能将不可用）', { error: redisError.message });
    }

    // 启动 Express 服务器
    app.listen(PORT, () => {
      logger.logSuccess('服务器启动成功', {
        port: PORT,
        dataDir: DATA_DIR,
        imagesDir: IMAGES_DIR
      });
      console.log(`服务器运行中: http://localhost:${PORT}`);
      console.log(`数据目录: ${DATA_DIR}`);
      console.log(`图片目录: ${IMAGES_DIR}`);
      console.log('服务器已启动，等待连接...');
    });
  } catch (error) {
    logger.logError('服务器启动失败', { error: error.message, stack: error.stack });
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常（记录后优雅退出，避免进程处于不可恢复状态）
process.on('uncaughtException', (err) => {
  logger.logError('未捕获的异常，进程即将退出', { error: err.message, stack: err.stack });
  console.error('未捕获的异常:', err);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.logError('未处理的 Promise 拒绝', { reason: reason, promise: promise });
});

// 处理进程退出（支持 SIGINT/Ctrl+C 和 SIGTERM/Docker）
const gracefulShutdown = async (signal) => {
  logger.logSystemEvent(`收到 ${signal} 信号，正在关闭服务器...`);
  console.log(`\n收到 ${signal} 信号，正在优雅关闭...`);
  await closeRedis();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 启动服务器
startServer();

module.exports = app;
