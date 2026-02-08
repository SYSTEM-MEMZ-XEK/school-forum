const fs = require('fs');
const path = require('path');
const { 
  DATA_DIR, 
  IMAGES_DIR,
  USERS_FILE, 
  POSTS_FILE, 
  BANNED_USERS_FILE, 
  DELETED_POSTS_FILE,
  NOTIFICATIONS_FILE 
} = require('../config/constants');
const { addActivity } = require('./levelSystem');

// 初始化数据文件
function initializeDataFile(filePath, defaultValue) {
  const dir = path.dirname(filePath);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 确保文件存在
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    } catch (error) {
      console.error(`创建文件失败: ${filePath}`, error);
    }
  }
}

// 读取数据
function readData(filePath) {
  try {
    // 如果文件不存在，先创建它
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在，正在创建: ${filePath}`);
      const dir = path.dirname(filePath);
      
      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 创建文件并写入默认值
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取数据错误: ${filePath}`, error);
    
    // 如果读取失败，返回空数组并尝试修复文件
    try {
      console.log(`尝试修复文件: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    } catch (writeError) {
      console.error(`修复文件失败: ${filePath}`, writeError);
    }
    
    return [];
  }
}

// 写入数据
function writeData(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`写入数据错误: ${filePath}`, error);
    
    // 尝试创建目录并重试
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`重试写入成功: ${filePath}`);
    } catch (retryError) {
      console.error(`重试写入失败: ${filePath}`, retryError);
    }
  }
}

// 初始化所有数据文件
function initializeAllDataFiles() {
  initializeDataFile(USERS_FILE, []);
  initializeDataFile(POSTS_FILE, []);
  initializeDataFile(BANNED_USERS_FILE, []);
  initializeDataFile(DELETED_POSTS_FILE, []);
  initializeDataFile(NOTIFICATIONS_FILE, []);
  
  // 迁移用户数据，添加等级和活跃度字段
  migrateUserData();
}

// 迁移用户数据，添加等级和活跃度字段
function migrateUserData() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return;
    }
    
    const users = readData(USERS_FILE);
    let hasChanges = false;
    
    users.forEach(user => {
      // 计算初始活跃度：基于发帖数和评论数
      const calculatedActivity = (user.postCount || 0) + (user.commentCount || 0);
      
      // 如果用户没有活跃度字段，或者活跃度与计算值不匹配，则更新
      if (user.activity === undefined || user.activity !== calculatedActivity) {
        const updatedUser = addActivity(user, calculatedActivity);
        
        user.activity = updatedUser.activity;
        user.level = updatedUser.level;
        hasChanges = true;
      }
      
      // 确保等级字段存在
      if (user.level === undefined) {
        user.level = 1;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      writeData(USERS_FILE, users);
      console.log('用户数据迁移完成：更新等级和活跃度字段');
    }
  } catch (error) {
    console.error('用户数据迁移失败:', error);
  }
}

// 初始化必要的目录
function initializeDirectories() {
  const directories = [
    DATA_DIR,
    IMAGES_DIR
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`创建目录: ${dir}`);
    }
  });
}

module.exports = {
  initializeDataFile,
  readData,
  writeData,
  initializeAllDataFiles,
  migrateUserData,
  initializeDirectories
};