const fs = require('fs');
const path = require('path');
const { LOG_FILE, DATA_DIR } = require('../config/constants');

// 日志级别
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

// 日志颜色（用于控制台输出）
const LOG_COLORS = {
  INFO: '\x1b[36m',    // 青色
  WARN: '\x1b[33m',    // 黄色
  ERROR: '\x1b[31m',   // 红色
  SUCCESS: '\x1b[32m', // 绿色
  RESET: '\x1b[0m'     // 重置
};

/**
 * 获取日志文件路径（按日期）
 * @param {Date} date - 日期对象，默认为当前日期
 * @returns {string} 日志文件路径
 */
function getLogFilePath(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(DATA_DIR, `server-${dateStr}.log`);
}

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 * @returns {string} 格式化后的日志
 */
function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

/**
 * 写入日志到文件（按日期）
 * @param {string} formattedMessage - 格式化后的日志消息
 */
function writeLogToFile(formattedMessage) {
  try {
    const logFilePath = getLogFilePath();
    fs.appendFileSync(logFilePath, formattedMessage + '\n', 'utf8');
  } catch (error) {
    console.error('写入日志文件失败:', error);
  }
}

/**
 * 在控制台输出日志
 * @param {string} level - 日志级别
 * @param {string} formattedMessage - 格式化后的日志消息
 */
function logToConsole(level, formattedMessage) {
  const color = LOG_COLORS[level] || LOG_COLORS.RESET;
  console.log(`${color}${formattedMessage}${LOG_COLORS.RESET}`);
}

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 */
function logInfo(message, data = null) {
  const formattedMessage = formatLogMessage(LOG_LEVELS.INFO, message, data);
  logToConsole(LOG_LEVELS.INFO, formattedMessage);
  writeLogToFile(formattedMessage);
}

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 */
function logWarn(message, data = null) {
  const formattedMessage = formatLogMessage(LOG_LEVELS.WARN, message, data);
  logToConsole(LOG_LEVELS.WARN, formattedMessage);
  writeLogToFile(formattedMessage);
}

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 */
function logError(message, data = null) {
  const formattedMessage = formatLogMessage(LOG_LEVELS.ERROR, message, data);
  logToConsole(LOG_LEVELS.ERROR, formattedMessage);
  writeLogToFile(formattedMessage);
}

/**
 * 记录成功日志
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 */
function logSuccess(message, data = null) {
  const formattedMessage = formatLogMessage(LOG_LEVELS.SUCCESS, message, data);
  logToConsole(LOG_LEVELS.SUCCESS, formattedMessage);
  writeLogToFile(formattedMessage);
}

/**
 * 记录用户操作
 * @param {string} action - 操作类型
 * @param {string} userId - 用户ID
 * @param {string} username - 用户名
 * @param {object} details - 操作详情
 */
function logUserAction(action, userId, username, details = {}) {
  const message = `用户操作: ${action} | 用户: ${username} (ID: ${userId})`;
  logInfo(message, details);
}

/**
 * 记录系统事件
 * @param {string} event - 事件类型
 * @param {object} details - 事件详情
 */
function logSystemEvent(event, details = {}) {
  const message = `系统事件: ${event}`;
  logInfo(message, details);
}

/**
 * 记录安全事件
 * @param {string} event - 安全事件类型
 * @param {object} details - 事件详情
 */
function logSecurityEvent(event, details = {}) {
  const message = `安全事件: ${event}`;
  logWarn(message, details);
}

/**
 * 获取所有日志文件列表
 * @returns {Array} 日志文件信息数组 [{date: '2026-02-08', size: 1234, path: '/path/to/file'}, ...]
 */
function getAllLogFiles() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const logFiles = files
      .filter(file => file.startsWith('server-') && file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        const dateMatch = file.match(/server-(\d{4}-\d{2}-\d{2})\.log/);
        return {
          date: dateMatch ? dateMatch[1] : file,
          size: stats.size,
          path: filePath,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return logFiles;
  } catch (error) {
    console.error('获取日志文件列表失败:', error);
    return [];
  }
}

/**
 * 获取可用的日志日期列表
 * @returns {Array} 日期字符串数组 ['2026-02-08', '2026-02-07', ...]
 */
function getAvailableLogDates() {
  const logFiles = getAllLogFiles();
  return logFiles.map(file => file.date);
}

/**
 * 读取日志文件
 * @param {string} date - 日期字符串，格式为 'YYYY-MM-DD'，默认为今天
 * @param {number} lines - 读取的行数，0表示读取全部
 * @returns {string[]} 日志行数组
 */
function readLogs(date = null, lines = 0) {
  try {
    const logFilePath = date ? getLogFilePath(new Date(date)) : getLogFilePath();
    
    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    const content = fs.readFileSync(logFilePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    
    // 如果lines为0或大于等于总行数，返回全部
    if (lines === 0 || lines >= allLines.length) {
      return allLines;
    }
    
    // 返回最后 N 行
    return allLines.slice(-lines);
  } catch (error) {
    console.error('读取日志文件失败:', error);
    return [];
  }
}

/**
 * 清空指定日期的日志文件
 * @param {string} date - 日期字符串，格式为 'YYYY-MM-DD'，默认为今天
 */
function clearLogs(date = null) {
  try {
    const logFilePath = date ? getLogFilePath(new Date(date)) : getLogFilePath();
    
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
      logSystemEvent('日志文件已清空', { date: date || new Date().toISOString().split('T')[0] });
    }
  } catch (error) {
    console.error('清空日志文件失败:', error);
  }
}

/**
 * 删除指定日期的日志文件
 * @param {string} date - 日期字符串，格式为 'YYYY-MM-DD'
 */
function deleteLogs(date) {
  try {
    const logFilePath = getLogFilePath(new Date(date));
    
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      logSystemEvent('日志文件已删除', { date });
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除日志文件失败:', error);
    return false;
  }
}

/**
 * 清空所有日志文件
 */
function clearAllLogs() {
  try {
    const logFiles = getAllLogFiles();
    let clearedCount = 0;
    
    logFiles.forEach(file => {
      try {
        fs.writeFileSync(file.path, '', 'utf8');
        clearedCount++;
      } catch (error) {
        console.error(`清空日志文件失败: ${file.path}`, error);
      }
    });
    
    logSystemEvent('所有日志文件已清空', { clearedCount });
    return clearedCount;
  } catch (error) {
    console.error('清空所有日志文件失败:', error);
    return 0;
  }
}

module.exports = {
  logInfo,
  logWarn,
  logError,
  logSuccess,
  logUserAction,
  logSystemEvent,
  logSecurityEvent,
  getLogFilePath,
  getAllLogFiles,
  getAvailableLogDates,
  readLogs,
  clearLogs,
  deleteLogs,
  clearAllLogs,
  LOG_LEVELS
};