// 服务器配置常量
const path = require('path');
const { readConfig, initConfig } = require('../utils/configUtils');

// 初始化配置文件（仅首次加载时执行）
initConfig();

// 文件路径配置（静态配置，不会改变）
const DATA_DIR = path.join(__dirname, '../../data/');
const IMAGES_DIR = path.join(__dirname, '../../public/images/');

// MongoDB 连接配置（启动时读取一次）
const _initialConfig = readConfig();
const MONGODB_URI = process.env.MONGODB_URI || _initialConfig.mongodb?.uri || 'mongodb://localhost:27017/school-forum';

// MongoDB 认证配置
const MONGODB_AUTH = {
  username: process.env.MONGODB_USERNAME || _initialConfig.mongodb?.username || '',
  password: process.env.MONGODB_PASSWORD || _initialConfig.mongodb?.password || '',
  authSource: process.env.MONGODB_AUTHSOURCE || _initialConfig.mongodb?.authSource || 'admin'
};

// 构建 mongoose 连接选项
const MONGODB_OPTIONS = {};
if (MONGODB_AUTH.username && MONGODB_AUTH.password) {
  MONGODB_OPTIONS.user = MONGODB_AUTH.username;
  MONGODB_OPTIONS.pass = MONGODB_AUTH.password;
  MONGODB_OPTIONS.authSource = MONGODB_AUTH.authSource;
}

// 服务器端口（静态配置）
const PORT = process.env.PORT || 2080;

// ============ 动态配置获取函数 ============
// 这些函数每次调用时都会读取最新的配置文件，确保配置修改后能立即生效

/**
 * 获取当前配置对象
 * @returns {object} 完整配置对象
 */
function getConfig() {
  return readConfig();
}

/**
 * 获取管理员账号列表
 * @returns {Array<string>} 管理员ID列表
 */
function getAdminUsers() {
  return readConfig().adminUsers || [];
}

/**
 * 获取文件上传配置
 * @returns {object} 上传配置对象
 */
function getUploadConfig() {
  return readConfig().upload || {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'],
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 20
  };
}

/**
 * 获取密码加密配置
 * @returns {object} 密码配置对象
 */
function getPasswordConfig() {
  return readConfig().password || { saltRounds: 10 };
}

/**
 * 获取分页配置
 * @returns {object} 分页配置对象
 */
function getPaginationConfig() {
  return readConfig().pagination || { defaultPage: 1, defaultLimit: 20 };
}

/**
 * 获取内容长度限制配置
 * @returns {object} 内容限制配置对象
 */
function getContentLimits() {
  return readConfig().contentLimits || {
    post: 10000,
    comment: 500,
    username: { min: 2, max: 20 },
    qq: { min: 5, max: 15 },
    password: { min: 6 }
  };
}

/**
 * 获取学校配置
 * @returns {Array} 学校列表
 */
function getSchools() {
  return readConfig().schools || [];
}

/**
 * 获取运行模式配置
 * @returns {object} 运行模式配置
 */
function getRunMode() {
  return readConfig().runMode || {
    current: 'normal',
    maintenanceMessage: '网站正在维护中，请稍后再试',
    debugLogLevel: 'debug',
    selfDestructLevel: null,
    lastModeChange: null,
    changedBy: null
  };
}

// 运行模式常量
const RUN_MODES = {
  NORMAL: 'normal',
  DEBUG: 'debug',
  MAINTENANCE: 'maintenance',
  SELF_DESTRUCT: 'self_destruct'
};

// 自毁模式级别常量
const SELF_DESTRUCT_LEVELS = {
  LEVEL_3: 3,
  LEVEL_2: 2,
  LEVEL_1: 1
};

// ============ 向后兼容的静态导出 ============
// 注意：这些值在模块加载时确定，修改配置文件后需要重启服务器才能更新
// 推荐使用上面的函数获取最新配置

// 兼容旧代码：提供 getter 函数，但以属性形式访问
// 这样可以保持向后兼容，同时每次访问都获取最新值
module.exports = {
  // 静态配置
  DATA_DIR,
  IMAGES_DIR,
  MONGODB_URI,
  MONGODB_AUTH,
  MONGODB_OPTIONS,
  PORT,
  
  // 动态配置获取函数（推荐使用）
  getConfig,
  getAdminUsers,
  getUploadConfig,
  getPasswordConfig,
  getPaginationConfig,
  getContentLimits,
  getSchools,
  getRunMode,
  
  // 运行模式常量
  RUN_MODES,
  SELF_DESTRUCT_LEVELS,
  
  // 向后兼容：使用 getter 实现动态读取
  // 但注意：某些场景下 getter 可能不会被调用，建议使用函数
  get ADMIN_USERS() {
    return getAdminUsers();
  },
  get UPLOAD_CONFIG() {
    return getUploadConfig();
  },
  get PASSWORD_CONFIG() {
    return getPasswordConfig();
  },
  get PAGINATION_CONFIG() {
    return getPaginationConfig();
  },
  get CONTENT_LIMITS() {
    return getContentLimits();
  }
};
