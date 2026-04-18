/**
 * 接口限流中间件
 * 使用Redis实现滑动窗口限流
 */
const { rateLimiter } = require('../utils/redisUtils');
const logger = require('../utils/logger');

/**
 * 创建限流中间件
 * @param {object} options - 配置选项
 * @param {number} options.limit - 时间窗口内最大请求数
 * @param {number} options.window - 时间窗口（秒）
 * @param {string} options.message - 超过限制时的错误消息
 * @param {function} options.keyGenerator - 自定义key生成函数
 */
function createRateLimiter(options = {}) {
  const {
    limit = 100,
    window = 60,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = null
  } = options;

  return async (req, res, next) => {
    try {
      // 生成限流key
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const endpoint = keyGenerator ? keyGenerator(req) : req.originalUrl || req.url;
      
      // 检查是否超过限制
      const result = await rateLimiter.check(ip, endpoint, limit, window);
      
      // 设置响应头
      res.set('X-RateLimit-Limit', limit);
      res.set('X-RateLimit-Remaining', result.remaining);
      res.set('X-RateLimit-Reset', result.resetTime);
      
      if (!result.allowed) {
        logger.logWarn('接口限流触发', {
          ip,
          endpoint,
          limit,
          window
        });
        
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      
      next();
    } catch (error) {
      // 限流检查失败时放行请求
      logger.logError('限流检查失败', { error: error.message });
      next();
    }
  };
}

// 预定义的限流配置
const rateLimiters = {
  // 通用API限流：每分钟100次
  general: createRateLimiter({
    limit: 100,
    window: 60,
    message: '请求过于频繁，请稍后再试'
  }),
  
  // 严格限流：每分钟20次（用于敏感操作）
  strict: createRateLimiter({
    limit: 20,
    window: 60,
    message: '操作过于频繁，请稍后再试'
  }),
  
  // 宽松限流：每分钟300次（用于浏览等非敏感操作）
  loose: createRateLimiter({
    limit: 300,
    window: 60,
    message: '请求过于频繁，请稍后再试'
  }),
  
  // 登录限流：每分钟5次
  login: createRateLimiter({
    limit: 5,
    window: 60,
    message: '登录尝试过于频繁，请稍后再试'
  }),
  
  // 发帖限流：每分钟10次
  post: createRateLimiter({
    limit: 10,
    window: 60,
    message: '发帖过于频繁，请稍后再试'
  }),
  
  // 评论限流：每分钟30次
  comment: createRateLimiter({
    limit: 30,
    window: 60,
    message: '评论过于频繁，请稍后再试'
  }),
  
  // 搜索限流：每分钟30次
  search: createRateLimiter({
    limit: 30,
    window: 60,
    message: '搜索过于频繁，请稍后再试'
  }),
  
  // 验证码限流：每分钟1次
  verificationCode: createRateLimiter({
    limit: 1,
    window: 60,
    message: '验证码发送过于频繁，请稍后再试'
  })
};

module.exports = {
  createRateLimiter,
  rateLimiters
};
