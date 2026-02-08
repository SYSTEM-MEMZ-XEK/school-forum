const fs = require('fs');
const path = require('path');

// 直接定义数据目录路径，避免循环依赖
const DATA_DIR = path.join(__dirname, '../../data/');

// 配置文件路径
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
  // 管理员列表
  adminUsers: ['1635075096'],
  
  // 文件上传配置
  upload: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 20
  },
  
  // 密码加密配置
  password: {
    saltRounds: 10
  },
  
  // 分页配置
  pagination: {
    defaultPage: 1,
    defaultLimit: 20
  },
  
  // 内容长度限制
  contentLimits: {
    post: 10000,
    comment: 500,
    username: {
      min: 2,
      max: 20
    },
    qq: {
      min: 5,
      max: 15
    },
    password: {
      min: 6
    }
  }
};

/**
 * 初始化配置文件
 */
function initConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      writeConfig(DEFAULT_CONFIG);
      console.log('配置文件已创建:', CONFIG_FILE);
    }
  } catch (error) {
    console.error('初始化配置文件失败:', error);
  }
}

/**
 * 读取配置文件
 * @returns {object} 配置对象
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      initConfig();
    }
    
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(content);
    
    // 合并默认配置，确保所有必需的配置项都存在
    return mergeWithDefaults(config);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 写入配置文件
 * @param {object} config - 配置对象
 */
function writeConfig(config) {
  try {
    const configStr = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE, configStr, 'utf8');
  } catch (error) {
    console.error('写入配置文件失败:', error);
    throw error;
  }
}

/**
 * 合并配置与默认配置
 * @param {object} config - 用户配置
 * @returns {object} 合并后的配置
 */
function mergeWithDefaults(config) {
  return {
    adminUsers: config.adminUsers || DEFAULT_CONFIG.adminUsers,
    upload: {
      allowedTypes: config.upload?.allowedTypes || DEFAULT_CONFIG.upload.allowedTypes,
      maxFileSize: config.upload?.maxFileSize || DEFAULT_CONFIG.upload.maxFileSize,
      maxFiles: config.upload?.maxFiles || DEFAULT_CONFIG.upload.maxFiles
    },
    password: {
      saltRounds: config.password?.saltRounds || DEFAULT_CONFIG.password.saltRounds
    },
    pagination: {
      defaultPage: config.pagination?.defaultPage || DEFAULT_CONFIG.pagination.defaultPage,
      defaultLimit: config.pagination?.defaultLimit || DEFAULT_CONFIG.pagination.defaultLimit
    },
    contentLimits: {
      post: config.contentLimits?.post || DEFAULT_CONFIG.contentLimits.post,
      comment: config.contentLimits?.comment || DEFAULT_CONFIG.contentLimits.comment,
      username: {
        min: config.contentLimits?.username?.min || DEFAULT_CONFIG.contentLimits.username.min,
        max: config.contentLimits?.username?.max || DEFAULT_CONFIG.contentLimits.username.max
      },
      qq: {
        min: config.contentLimits?.qq?.min || DEFAULT_CONFIG.contentLimits.qq.min,
        max: config.contentLimits?.qq?.max || DEFAULT_CONFIG.contentLimits.qq.max
      },
      password: {
        min: config.contentLimits?.password?.min || DEFAULT_CONFIG.contentLimits.password.min
      }
    }
  };
}

/**
 * 添加管理员
 * @param {string} adminId - 管理员ID（QQ号或用户ID）
 * @returns {boolean} 是否成功
 */
function addAdmin(adminId) {
  try {
    const config = readConfig();
    
    if (!config.adminUsers.includes(adminId)) {
      config.adminUsers.push(adminId);
      writeConfig(config);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('添加管理员失败:', error);
    return false;
  }
}

/**
 * 删除管理员
 * @param {string} adminId - 管理员ID
 * @returns {boolean} 是否成功
 */
function removeAdmin(adminId) {
  try {
    const config = readConfig();
    
    const index = config.adminUsers.indexOf(adminId);
    if (index > -1) {
      // 确保至少保留一个管理员
      if (config.adminUsers.length > 1) {
        config.adminUsers.splice(index, 1);
        writeConfig(config);
        return true;
      }
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('删除管理员失败:', error);
    return false;
  }
}

/**
 * 更新配置
 * @param {object} updates - 要更新的配置项
 * @returns {boolean} 是否成功
 */
function updateConfig(updates) {
  try {
    const config = readConfig();
    
    // 深度合并配置
    const updatedConfig = deepMerge(config, updates);
    
    writeConfig(updatedConfig);
    return true;
  } catch (error) {
    console.error('更新配置失败:', error);
    return false;
  }
}

/**
 * 深度合并对象
 * @param {object} target - 目标对象
 * @param {object} source - 源对象
 * @returns {object} 合并后的对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * 获取配置文件路径
 * @returns {string} 配置文件路径
 */
function getConfigFilePath() {
  return CONFIG_FILE;
}

module.exports = {
  initConfig,
  readConfig,
  writeConfig,
  addAdmin,
  removeAdmin,
  updateConfig,
  getConfigFilePath,
  DEFAULT_CONFIG
};