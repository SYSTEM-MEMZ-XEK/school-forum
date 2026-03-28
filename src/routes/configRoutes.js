const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { requireAdmin } = require('../middleware/adminAuth');

// 学校配置 - 获取学校列表（公开API）
router.get('/schools', configController.getSchools);

// 公开配置 - 获取前端需要的非敏感配置
router.get('/public', configController.getPublicConfig);

// 配置管理 - 获取配置
router.get('/admin/config', requireAdmin, configController.getConfig);

// 配置管理 - 更新配置
router.put('/admin/config', requireAdmin, configController.updateConfig);

// 管理员管理 - 获取管理员列表
router.get('/admin/admins', requireAdmin, configController.getAdmins);

// 管理员管理 - 添加管理员
router.post('/admin/admins', requireAdmin, configController.addAdmin);

// 管理员管理 - 删除管理员
router.delete('/admin/admins', requireAdmin, configController.removeAdmin);

module.exports = router;