/**
 * 安全配置模块
 * 管理所有安全相关的配置项
 */
require('dotenv').config();

const path = require('path');

// JWT 配置
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  issuer: 'school-forum',
  audience: 'school-forum-users'
};

// 管理员 JWT 配置
const ADMIN_JWT_CONFIG = {
  secret: process.env.ADMIN_JWT_SECRET,
  expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h',
  issuer: 'school-forum-admin',
  audience: 'school-forum-admin'
};

// 启动时校验关键安全配置
if (!JWT_CONFIG.secret) {
  console.error('[SECURITY] JWT_SECRET 未配置！请在 .env 文件中设置 JWT_SECRET');
  process.exit(1);
}
if (!ADMIN_JWT_CONFIG.secret) {
  console.error('[SECURITY] ADMIN_JWT_SECRET 未配置！请在 .env 文件中设置 ADMIN_JWT_SECRET');
  process.exit(1);
}

// CORS 配置
const CORS_CONFIG = {
  // 允许的域名列表
  origins: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:2080', 'http://127.0.0.1:2080'],
  // 开发模式下是否允许所有来源
  allowAllInDev: process.env.NODE_ENV === 'development',
  // CORS 选项
  options: {
    origin: function (origin, callback) {
      // 允许无 origin 的请求（如移动应用、Postman）
      if (!origin) return callback(null, true);
      
      // 开发模式允许所有来源
      if (CORS_CONFIG.allowAllInDev) return callback(null, true);
      
      // 检查是否在白名单中
      if (CORS_CONFIG.origins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Origin not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400 // 24小时
  }
};

// Helmet 安全头配置
const HELMET_CONFIG = {
contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // 兼容性考虑
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
};

// 登录安全配置
const LOGIN_SECURITY = {
  // 最大尝试次数
  maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  // 锁定时间（毫秒）
  lockTime: parseInt(process.env.LOGIN_LOCK_TIME) || 30 * 60 * 1000, // 30分钟
  // Redis key 前缀
  redisPrefix: 'login_attempts:'
};

// 密码策略配置
const PASSWORD_POLICY = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
  requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
  // 正则表达式
  get pattern() {
    let pattern = '';
    if (this.requireLowercase) pattern += '(?=.*[a-z])';
    if (this.requireUppercase) pattern += '(?=.*[A-Z])';
    if (this.requireNumber) pattern += '(?=.*\\d)';
    if (this.requireSpecial) pattern += '(?=.*[!@#$%^&*(),.?":{}|<>])';
    pattern += `.{${
     this.minLength},}`;
    return new RegExp(`^${pattern}$`);
  }
};

// 请求限制配置
const REQUEST_LIMITS = {
  // 请求体最大大小（MB）
  maxBodySize: parseInt(process.env.MAX_REQUEST_SIZE) || 10,
  // Rate limit 窗口时间（毫秒）
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  // Rate limit 最大请求数
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};

// XSS 过滤配置
const XSS_CONFIG = {
  // 白名单标签
  whiteList: {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    br: [],
    p: [],
    strong: [],
    em: [],
    u: [],
    s: [],
    code: [],
    pre: [],
    blockquote: [],
    ul: [],
    ol: [],
    li: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: [],
    td: []
  },
  // 是否允许 HTML
  allowHtml: true,
  // 是否过滤属性中的危险内容
  stripIgnoreTag: true
};

// 敏感字段列表（日志中需要隐藏）
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'session',
  'apiKey',
  'secret',
  'emailCode',
  'smtpPass'
];

module.exports = {
  JWT_CONFIG,
  ADMIN_JWT_CONFIG,
  CORS_CONFIG,
  HELMET_CONFIG,
  LOGIN_SECURITY,
  PASSWORD_POLICY,
  REQUEST_LIMITS,
  XSS_CONFIG,
  SENSITIVE_FIELDS
};
