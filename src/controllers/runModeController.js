const {
  getRunMode,
  setRunMode,
  RUN_MODES,
  SELF_DESTRUCT_LEVELS
} = require('../utils/configUtils');
const {
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// 导入模型
const Post = require('../models/Post');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const Favorite = require('../models/Favorite');
const Follow = require('../models/Follow');

const runModeController = {
  /**
   * 获取当前运行模式
   */
  async getMode(req, res) {
    try {
      const runMode = getRunMode();
      
      res.json(generateSuccessResponse({
        mode: runMode.current,
        maintenanceMessage: runMode.maintenanceMessage,
        selfDestructLevel: runMode.selfDestructLevel,
        lastModeChange: runMode.lastModeChange,
        changedBy: runMode.changedBy
      }));
    } catch (error) {
      logger.logError('获取运行模式失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  /**
   * 设置运行模式
   */
  async setMode(req, res) {
    try {
      const { adminId, mode, maintenanceMessage } = req.body;
      
      if (!adminId) {
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }
      
      if (!mode || !Object.values(RUN_MODES).includes(mode)) {
        return res.status(400).json(generateErrorResponse('无效的运行模式'));
      }
      
      // 不允许直接设置自毁模式，需要通过专门的接口
      if (mode === RUN_MODES.SELF_DESTRUCT) {
        return res.status(400).json(generateErrorResponse('请使用自毁模式专用接口'));
      }
      
      const options = {};
      if (maintenanceMessage && mode === RUN_MODES.MAINTENANCE) {
        options.maintenanceMessage = maintenanceMessage;
      }
      
      const success = setRunMode(mode, adminId, options);
      
      if (success) {
        logger.logSecurityEvent('运行模式变更', {
          adminId,
          newMode: mode,
          previousMode: getRunMode().current,
          ip: req.ip
        });
        
        res.json(generateSuccessResponse({
          mode,
          maintenanceMessage: options.maintenanceMessage
        }, `已切换到${mode === RUN_MODES.NORMAL ? '正常' : mode === RUN_MODES.DEBUG ? '调试' : '维护'}模式`));
      } else {
        res.status(500).json(generateErrorResponse('设置运行模式失败'));
      }
    } catch (error) {
      logger.logError('设置运行模式失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  /**
   * 获取维护模式消息
   */
  async getMaintenanceMessage(req, res) {
    try {
      const runMode = getRunMode();
      
      res.json(generateSuccessResponse({
        message: runMode.maintenanceMessage
      }));
    } catch (error) {
      res.json(generateSuccessResponse({
        message: '网站正在维护中，请稍后再试'
      }));
    }
  },

  /**
   * 自毁模式 - 三级：删除所有帖子、评论、私信
   */
  async selfDestructLevel3(req, res) {
    try {
      const { adminId, confirmation, verificationCode } = req.body;
      
      // 验证确认字符串
      if (confirmation !== '确认删除所有内容') {
        return res.status(400).json(generateErrorResponse('确认字符串不正确'));
      }
      
      // 验证管理员权限已在中间件完成
      
      logger.logSecurityEvent('自毁模式三级执行开始', {
        adminId,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      // 删除所有帖子
      const postsResult = await Post.deleteMany({});
      logger.logInfo('自毁三级：帖子删除完成', { count: postsResult.deletedCount });
      
      // 删除所有私信
      const messagesResult = await Message.deleteMany({});
      logger.logInfo('自毁三级：私信删除完成', { count: messagesResult.deletedCount });
      
      // 删除所有会话
      const conversationsResult = await Conversation.deleteMany({});
      logger.logInfo('自毁三级：会话删除完成', { count: conversationsResult.deletedCount });
      
      // 删除所有通知
      const notificationsResult = await Notification.deleteMany({});
      logger.logInfo('自毁三级：通知删除完成', { count: notificationsResult.deletedCount });
      
      // 删除所有举报
      const reportsResult = await Report.deleteMany({});
      logger.logInfo('自毁三级：举报删除完成', { count: reportsResult.deletedCount });
      
      // 删除所有收藏
      const favoritesResult = await Favorite.deleteMany({});
      logger.logInfo('自毁三级：收藏删除完成', { count: favoritesResult.deletedCount });
      
      // 删除所有关注
      const followsResult = await Follow.deleteMany({});
      logger.logInfo('自毁三级：关注删除完成', { count: followsResult.deletedCount });
      
      // 重置用户的发帖数和评论数
      await User.updateMany({}, { postCount: 0, commentCount: 0 });
      
      // 设置自毁模式
      setRunMode(RUN_MODES.SELF_DESTRUCT, adminId, { selfDestructLevel: SELF_DESTRUCT_LEVELS.LEVEL_3 });
      
      logger.logSecurityEvent('自毁模式三级执行完成', {
        adminId,
        ip: req.ip,
        results: {
          posts: postsResult.deletedCount,
          messages: messagesResult.deletedCount,
          conversations: conversationsResult.deletedCount,
          notifications: notificationsResult.deletedCount,
          reports: reportsResult.deletedCount,
          favorites: favoritesResult.deletedCount,
          follows: followsResult.deletedCount
        }
      });
      
      res.json(generateSuccessResponse({
        level: 3,
        results: {
          posts: postsResult.deletedCount,
          messages: messagesResult.deletedCount,
          conversations: conversationsResult.deletedCount,
          notifications: notificationsResult.deletedCount,
          reports: reportsResult.deletedCount,
          favorites: favoritesResult.deletedCount,
          follows: followsResult.deletedCount
        }
      }, '自毁模式三级执行完成：已删除所有帖子、评论、私信'));
      
    } catch (error) {
      logger.logError('自毁模式三级执行失败', { error: error.message, stack: error.stack });
      res.status(500).json(generateErrorResponse('执行失败: ' + error.message, 500));
    }
  },

  /**
   * 自毁模式 - 二级：清空数据库
   */
  async selfDestructLevel2(req, res) {
    try {
      const { adminId, confirmation } = req.body;
      
      // 验证确认字符串
      if (confirmation !== '确认清空数据库') {
        return res.status(400).json(generateErrorResponse('确认字符串不正确'));
      }
      
      logger.logSecurityEvent('自毁模式二级执行开始', {
        adminId,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      // 获取所有集合名称
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      let droppedCount = 0;
      
      // 删除所有集合
      for (const name of collectionNames) {
        try {
          await mongoose.connection.db.dropCollection(name);
          droppedCount++;
          logger.logInfo('自毁二级：删除集合', { collection: name });
        } catch (err) {
          logger.logError('自毁二级：删除集合失败', { collection: name, error: err.message });
        }
      }
      
      // 设置自毁模式
      setRunMode(RUN_MODES.SELF_DESTRUCT, adminId, { selfDestructLevel: SELF_DESTRUCT_LEVELS.LEVEL_2 });
      
      logger.logSecurityEvent('自毁模式二级执行完成', {
        adminId,
        ip: req.ip,
        droppedCollections: droppedCount
      });
      
      res.json(generateSuccessResponse({
        level: 2,
        droppedCollections: droppedCount
      }, '自毁模式二级执行完成：已清空数据库'));
      
    } catch (error) {
      logger.logError('自毁模式二级执行失败', { error: error.message, stack: error.stack });
      res.status(500).json(generateErrorResponse('执行失败: ' + error.message, 500));
    }
  },

  /**
   * 自毁模式 - 一级：删除论坛文件
   */
  async selfDestructLevel1(req, res) {
    try {
      const { adminId, confirmation } = req.body;
      
      // 验证确认字符串
      if (confirmation !== '确认销毁论坛') {
        return res.status(400).json(generateErrorResponse('确认字符串不正确'));
      }
      
      logger.logSecurityEvent('自毁模式一级执行开始', {
        adminId,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      const deletedFiles = [];
      const errors = [];
      
      // 获取项目根目录
      const rootDir = path.join(__dirname, '../../');
      
      // 需要删除的目录和文件（保留必要的运行文件）
      const targetsToDelete = [
        'public/images/avatars',
        'public/images',
        'public/css',
        'public/js',
        'public/libs',
        'public/errors',
        'public/*.html',
        'src',
        'data'
      ];
      
      // 递归删除目录
      function deleteRecursive(dirPath) {
        if (fs.existsSync(dirPath)) {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteRecursive(curPath);
            } else {
              try {
                fs.unlinkSync(curPath);
                deletedFiles.push(curPath);
              } catch (err) {
                errors.push({ file: curPath, error: err.message });
              }
            }
          });
          try {
            fs.rmdirSync(dirPath);
            deletedFiles.push(dirPath);
          } catch (err) {
            errors.push({ file: dirPath, error: err.message });
          }
        }
      }
      
      // 执行删除
      for (const target of targetsToDelete) {
        const fullPath = path.join(rootDir, target);
        try {
          if (fs.existsSync(fullPath)) {
            const stat = fs.lstatSync(fullPath);
            if (stat.isDirectory()) {
              deleteRecursive(fullPath);
            } else {
              fs.unlinkSync(fullPath);
              deletedFiles.push(fullPath);
            }
          }
        } catch (err) {
          errors.push({ target, error: err.message });
        }
      }
      
      // 设置自毁模式
      setRunMode(RUN_MODES.SELF_DESTRUCT, adminId, { selfDestructLevel: SELF_DESTRUCT_LEVELS.LEVEL_1 });
      
      logger.logSecurityEvent('自毁模式一级执行完成', {
        adminId,
        ip: req.ip,
        deletedCount: deletedFiles.length,
        errors: errors.length
      });
      
      res.json(generateSuccessResponse({
        level: 1,
        deletedCount: deletedFiles.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // 只返回前10个错误
      }, '自毁模式一级执行完成：已删除论坛文件'));
      
    } catch (error) {
      logger.logError('自毁模式一级执行失败', { error: error.message, stack: error.stack });
      res.status(500).json(generateErrorResponse('执行失败: ' + error.message, 500));
    }
  }
};

module.exports = runModeController;
