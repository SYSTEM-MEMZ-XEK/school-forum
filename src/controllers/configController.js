const {
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { readConfig, addAdmin, removeAdmin, updateConfig } = require('../utils/configUtils');
const logger = require('../utils/logger');
const { getAdminUsers } = require('../config/constants');

const configController = {
  // 获取配置
  getConfig(req, res) {
    try {
      const config = readConfig();
      
      // 返回配置（不包含敏感信息）
      const safeConfig = {
        adminUsers: config.adminUsers,
        upload: config.upload,
        pagination: config.pagination,
        contentLimits: config.contentLimits,
        schools: config.schools || []
      };
      
      logger.logInfo('管理员获取配置', { adminId: req.query.adminId, ip: req.ip });
      
      res.json(generateSuccessResponse({ config: safeConfig }));
    } catch (error) {
      logger.logError('获取配置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取学校配置（公开API）
  getSchools(req, res) {
    try {
      const config = readConfig();
      const schools = config.schools || [];
      
      res.json(generateSuccessResponse({ schools }));
    } catch (error) {
      logger.logError('获取学校配置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取公开配置（无需管理员权限）
  getPublicConfig(req, res) {
    try {
      const config = readConfig();
      
      // 只返回前端需要的非敏感配置
      const publicConfig = {
        contentLimits: config.contentLimits,
        upload: {
          maxFiles: config.upload?.maxFiles,
          maxFileSize: config.upload?.maxFileSize,
          allowedTypes: config.upload?.allowedTypes
        }
      };
      
      res.json(generateSuccessResponse({ config: publicConfig }));
    } catch (error) {
      logger.logError('获取公开配置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 更新配置
  updateConfig(req, res) {
    try {
      // adminId 来自 JWT 认证中间件（requireAdmin），不信任 req.body
      const adminId = req.admin.id;
      const { updates } = req.body;

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json(generateErrorResponse('配置更新数据无效'));
      }

      logger.logSecurityEvent('管理员更新配置', { adminId, updates, ip: req.ip });

      const success = updateConfig(updates);
      
      if (success) {
        logger.logSystemEvent('配置已更新', { adminId });
        res.json(generateSuccessResponse({}, '配置已更新'));
      } else {
        res.status(500).json(generateErrorResponse('更新配置失败'));
      }
    } catch (error) {
      logger.logError('更新配置失败', { error: error.message, adminId: req.admin?.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 添加管理员
  addAdmin(req, res) {
    try {
      // adminId 来自 JWT 认证中间件（requireAdmin），不信任 req.body
      const adminId = req.admin.id;
      const { newAdminId } = req.body;

      if (!newAdminId) {
        return res.status(400).json(generateErrorResponse('新管理员ID不能为空'));
      }

      logger.logSecurityEvent('管理员添加管理员', { adminId, newAdminId, ip: req.ip });

      const success = addAdmin(newAdminId);
      
      if (success) {
        logger.logSystemEvent('管理员已添加', { adminId, newAdminId });
        res.json(generateSuccessResponse({ newAdminId }, '管理员已添加'));
      } else {
        res.status(400).json(generateErrorResponse('管理员已存在'));
      }
    } catch (error) {
      logger.logError('添加管理员失败', { error: error.message, adminId: req.admin?.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 删除管理员
  removeAdmin(req, res) {
    try {
      // adminId 来自 JWT 认证中间件（requireAdmin），不信任 req.body
      const adminId = req.admin.id;
      const { targetAdminId } = req.body;

      if (!targetAdminId) {
        return res.status(400).json(generateErrorResponse('目标管理员ID不能为空'));
      }

      // 确保不能删除自己
      if (adminId === targetAdminId) {
        return res.status(400).json(generateErrorResponse('不能删除自己'));
      }

      logger.logSecurityEvent('管理员删除管理员', { adminId, targetAdminId, ip: req.ip });

      const success = removeAdmin(targetAdminId);
      
      if (success) {
        logger.logSystemEvent('管理员已删除', { adminId, targetAdminId });
        res.json(generateSuccessResponse({ targetAdminId }, '管理员已删除'));
      } else if (!success && getAdminUsers().length <= 1) {
        res.status(400).json(generateErrorResponse('不能删除最后一个管理员'));
      } else {
        res.status(404).json(generateErrorResponse('管理员不存在'));
      }
    } catch (error) {
      logger.logError('删除管理员失败', { error: error.message, adminId: req.admin?.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取管理员列表
  async getAdmins(req, res) {
    try {
      const config = readConfig();
      const { getUsers } = require('../utils/dataUtils');
      const users = await getUsers();
      
      // 获取管理员详细信息
      const admins = config.adminUsers.map(adminId => {
        const user = users.find(u => u.id === adminId || u.qq === adminId);
        return {
          id: adminId,
          username: user?.username || adminId,
          qq: user?.qq || null,
          createdAt: user?.createdAt || null
        };
      });
      
      logger.logInfo('管理员获取管理员列表', { adminId: req.query.adminId, count: admins.length, ip: req.ip });
      
      res.json(generateSuccessResponse({ admins }));
    } catch (error) {
      logger.logError('获取管理员列表失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = configController;