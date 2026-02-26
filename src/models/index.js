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

// 数据库连接配置
const connectDB = async (uri) => {
  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 6+ 默认配置，以下选项已移除或默认启用：
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      // useCreateIndex: true,
      // useFindAndModify: false
    });
    
    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 断开数据库连接
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB 连接已断开');
  } catch (error) {
    console.error('断开 MongoDB 连接失败:', error.message);
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
  FavoriteTag
};