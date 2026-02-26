const { createClient } = require('redis');
const { readConfig } = require('./configUtils');

let redisClient = null;
let isConnected = false;

/**
 * 初始化Redis连接
 */
async function initRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  const config = readConfig();
  const redisConfig = config.redis || {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0
  };

  redisClient = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port
    },
    password: redisConfig.password || undefined,
    database: redisConfig.db || 0
  });

  redisClient.on('connect', () => {
    isConnected = true;
    console.log('[Redis] 连接成功');
  });

  redisClient.on('disconnect', () => {
    isConnected = false;
    console.log('[Redis] 连接断开');
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] 连接错误:', err.message);
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('[Redis] 初始化失败:', error.message);
    throw error;
  }
}

/**
 * 获取Redis客户端
 */
function getRedisClient() {
  if (!redisClient || !isConnected) {
    throw new Error('Redis未连接，请先调用initRedis()');
  }
  return redisClient;
}

/**
 * 关闭Redis连接
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    console.log('[Redis] 连接已关闭');
  }
}

/**
 * 检查Redis是否已连接
 */
function isRedisConnected() {
  return isConnected;
}

/**
 * 验证码相关操作
 */
const verificationCode = {
  // 验证码过期时间（5分钟）
  EXPIRE_TIME: 5 * 60,

  // 发送间隔时间（60秒）
  SEND_INTERVAL: 60,

  /**
   * 生成验证码存储的key
   */
  getKey(email) {
    return `verification:${email.toLowerCase()}`;
  },

  /**
   * 生成发送时间戳的key
   */
  getTimestampKey(email) {
    return `verification:timestamp:${email.toLowerCase()}`;
  },

  /**
   * 存储验证码
   */
  async set(email, code) {
    const client = getRedisClient();
    const key = this.getKey(email);
    const timestampKey = this.getTimestampKey(email);
    
    // 使用multi批量执行
    const multi = client.multi();
    multi.setEx(key, this.EXPIRE_TIME, code);
    multi.setEx(timestampKey, this.SEND_INTERVAL, Date.now().toString());
    
    await multi.exec();
  },

  /**
   * 获取验证码
   */
  async get(email) {
    const client = getRedisClient();
    const key = this.getKey(email);
    return await client.get(key);
  },

  /**
   * 删除验证码
   */
  async delete(email) {
    const client = getRedisClient();
    const key = this.getKey(email);
    await client.del(key);
  },

  /**
   * 检查是否在发送间隔内
   * @returns {boolean} true表示在间隔内，不能发送
   */
  async isInInterval(email) {
    const client = getRedisClient();
    const timestampKey = this.getTimestampKey(email);
    const timestamp = await client.get(timestampKey);
    return !!timestamp;
  },

  /**
   * 验证验证码
   * @returns {object} { valid: boolean, message: string }
   */
  async verify(email, code) {
    const storedCode = await this.get(email);
    
    if (!storedCode) {
      return {
        valid: false,
        message: '验证码不存在或已过期'
      };
    }
    
    if (storedCode !== code) {
      return {
        valid: false,
        message: '验证码错误'
      };
    }
    
    // 验证成功，删除验证码
    await this.delete(email);
    
    return {
      valid: true,
      message: '验证码验证成功'
    };
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  isRedisConnected,
  verificationCode
};
