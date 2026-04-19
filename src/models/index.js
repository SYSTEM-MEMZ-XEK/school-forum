const mongoose = require('mongoose');

// 导入所有模型
const User = require('./User');
const Post = require('./Post');
const Notification = require('./Notification');
const Report = require('./Report');
const BannedUser = require('./BannedUser');
const DeletedPost = require('./DeletedPost');
const Favorite = require('./Favorite');
const FavoriteTag = require('./FavoriteTag');
const Follow = require('./Follow');
const Message = require('./Message');
const Conversation = require('./Conversation');
const Blacklist = require('./Blacklist');
const Announcement = require('./Announcement');

// ===================== MongoDB 事件监听 =====================
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] 连接成功');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] 连接断开，Mongoose 将自动重连...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] 已重新连接');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] 连接错误:', err.message);
});

// ===================== 数据库连接 =====================

/**
 * 连接 MongoDB
 * @param {string} uri - MongoDB 连接字符串
 * @param {object} options - mongoose 连接选项（已在 constants.js 中构建，含认证/TLS/超时）
 */
const connectDB = async (uri, options = {}) => {
  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 6+ 默认配置，以下选项已移除或默认启用：
      // useNewUrlParser: true, useUnifiedTopology: true
      ...options
    });

    // 打印连接信息（脱敏：不打印密码）
    const { host, port, name } = conn.connection;
    console.log(`[MongoDB] 已连接: ${host}:${port}/${name}`);
    return conn;
  } catch (error) {
    console.error('[MongoDB] 连接失败:', error.message);
    process.exit(1);
  }
};

// 断开数据库连接
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] 连接已断开');
  } catch (error) {
    console.error('[MongoDB] 断开连接失败:', error.message);
  }
};

// 导出模型和连接函数
module.exports = {
  mongoose,
  connectDB,
  disconnectDB,
  User,
  Post,
  Notification,
  Report,
  BannedUser,
  DeletedPost,
  Favorite,
  FavoriteTag,
  Follow,
  Message,
  Conversation,
  Blacklist,
  Announcement
};