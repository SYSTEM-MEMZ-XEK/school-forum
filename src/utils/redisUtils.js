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

/**
 * IP访问统计相关操作
 */
const ipStats = {
  // IP访问计数的前缀key
  PREFIX: 'ip:stats:',

  /**
   * 获取IP统计的key
   */
  getKey(ip) {
    return `${this.PREFIX}${ip}`;
  },

  /**
   * 记录一次访问
   * @param {string} ip - 访问IP
   */
  async recordAccess(ip) {
    if (!isConnected) {
      return;
    }
    try {
      const client = getRedisClient();
      const key = this.getKey(ip);
      await client.incr(key);
    } catch (error) {
      console.error('[Redis] 记录IP访问失败:', error.message);
    }
  },

  /**
   * 获取指定IP的访问次数
   * @param {string} ip - IP地址
   * @returns {Promise<number>} 访问次数
   */
  async getAccessCount(ip) {
    if (!isConnected) {
      return 0;
    }
    try {
      const client = getRedisClient();
      const key = this.getKey(ip);
      const count = await client.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      console.error('[Redis] 获取IP访问次数失败:', error.message);
      return 0;
    }
  },

  /**
   * 获取所有IP访问统计
   * @param {object} options - 查询选项
   * @param {number} options.limit - 返回数量限制
   * @param {string} options.order - 排序方式 'asc' 或 'desc'
   * @returns {Promise<Array>} IP访问统计数组 [{ip, count}, ...]
   */
  async getAllStats(options = {}) {
    const { limit = 100, order = 'desc' } = options;
    
    if (!isConnected) {
      return [];
    }
    
    try {
      const client = getRedisClient();
      const keys = [];
      
      // 扫描所有IP统计key
      for await (const key of client.scanIterator({
        MATCH: `${this.PREFIX}*`,
        COUNT: 1000
      })) {
        keys.push(key);
      }

      // 获取所有IP的访问次数
      const stats = [];
      for (const key of keys) {
        const count = await client.get(key);
        const ip = key.replace(this.PREFIX, '');
        stats.push({
          ip,
          count: parseInt(count) || 0
        });
      }

      // 排序
      stats.sort((a, b) => {
        if (order === 'desc') {
          return b.count - a.count;
        }
        return a.count - b.count;
      });

      // 限制返回数量
      return stats.slice(0, limit);
    } catch (error) {
      console.error('[Redis] 获取IP访问统计失败:', error.message);
      return [];
    }
  },

  /**
   * 获取IP统计总数
   * @returns {Promise<object>} { totalIps, totalAccess }
   */
  async getSummary() {
    if (!isConnected) {
      return { totalIps: 0, totalAccess: 0 };
    }
    
    try {
      const client = getRedisClient();
      let totalIps = 0;
      let totalAccess = 0;

      for await (const key of client.scanIterator({
        MATCH: `${this.PREFIX}*`,
        COUNT: 1000
      })) {
        totalIps++;
        const count = await client.get(key);
        totalAccess += parseInt(count) || 0;
      }

      return { totalIps, totalAccess };
    } catch (error) {
      console.error('[Redis] 获取IP统计摘要失败:', error.message);
      return { totalIps: 0, totalAccess: 0 };
    }
  },

  /**
   * 清除指定IP的统计
   * @param {string} ip - IP地址
   */
  async clearIp(ip) {
    if (!isConnected) {
      return false;
    }
    try {
      const client = getRedisClient();
      const key = this.getKey(ip);
      await client.del(key);
      return true;
    } catch (error) {
      console.error('[Redis] 清除IP统计失败:', error.message);
      return false;
    }
  },

  /**
   * 清除所有IP统计
   */
  async clearAll() {
    if (!isConnected) {
      return 0;
    }
    try {
      const client = getRedisClient();
      let clearedCount = 0;

      for await (const key of client.scanIterator({
        MATCH: `${this.PREFIX}*`,
        COUNT: 1000
      })) {
        await client.del(key);
        clearedCount++;
      }

      return clearedCount;
    } catch (error) {
      console.error('[Redis] 清除所有IP统计失败:', error.message);
      return 0;
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  isRedisConnected,
  verificationCode,
  ipStats
};
