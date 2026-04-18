const express = require('express');
const router = express.Router();
const runModeController = require('../controllers/runModeController');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * 获取当前运行模式（公开接口）
 */
router.get('/run-mode', runModeController.getMode);

/**
 * 获取维护模式消息（公开接口）
 */
router.get('/maintenance-message', runModeController.getMaintenanceMessage);

/**
 * 设置运行模式（管理员）
 */
router.post('/admin/run-mode', requireAdmin, runModeController.setMode);

/**
 * 自毁模式 - 三级：删除所有帖子、评论、私信
 */
router.post('/admin/self-destruct/level3', requireAdmin, runModeController.selfDestructLevel3);

/**
 * 自毁模式 - 二级：清空数据库
 */
router.post('/admin/self-destruct/level2', requireAdmin, runModeController.selfDestructLevel2);

/**
 * 自毁模式 - 一级：删除论坛文件
 */
router.post('/admin/self-destruct/level1', requireAdmin, runModeController.selfDestructLevel1);

module.exports = router;
