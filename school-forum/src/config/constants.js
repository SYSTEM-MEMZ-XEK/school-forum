// 服务器配置常量
const path = require('path');
const { readConfig, initConfig } = require('../utils/configUtils');

// 初始化配置文件
initConfig();

// 读取配置
const config = readConfig();

// 文件路径配置
const DATA_DIR = path.join(__dirname, '../../data/');
const IMAGES_DIR = path.join(__dirname, '../../public/images/');

// 数据文件路径
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const BANNED_USERS_FILE = path.join(DATA_DIR, 'banned_users.json');
const DELETED_POSTS_FILE = path.join(DATA_DIR, 'deleted_posts.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const LOG_FILE = path.join(DATA_DIR, 'server.log');

// 服务器端口
const PORT = process.env.PORT || 3000;

// 管理员账号列表（从配置文件读取）
const ADMIN_USERS = config.adminUsers;

// 文件上传配置（从配置文件读取）
const UPLOAD_CONFIG = config.upload;

// 密码加密配置（从配置文件读取）
const PASSWORD_CONFIG = config.password;

// 分页配置（从配置文件读取）
const PAGINATION_CONFIG = config.pagination;

// 内容长度限制（从配置文件读取）
const CONTENT_LIMITS = config.contentLimits;

module.exports = {
  ADMIN_USERS,
  DATA_DIR,
  IMAGES_DIR,
  USERS_FILE,
  POSTS_FILE,
  BANNED_USERS_FILE,
  DELETED_POSTS_FILE,
  NOTIFICATIONS_FILE,
  LOG_FILE,
  PORT,
  UPLOAD_CONFIG,
  PASSWORD_CONFIG,
  PAGINATION_CONFIG,
  CONTENT_LIMITS
};