const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

// 管理员功能 - 获取帖子列表（包含已删除帖子）
router.get('/admin/posts', requireAdmin, adminController.getAdminPosts);

// 管理员功能 - 永久删除帖子
router.delete('/admin/posts/:id', requireAdmin, adminController.deletePostPermanently);

// 管理员功能 - 封禁用户
router.post('/admin/users/:id/ban', requireAdmin, adminController.banUser);

// 管理员功能 - 解封用户
router.post('/admin/users/:id/unban', requireAdmin, adminController.unbanUser);

// 管理员功能 - 获取所有用户
router.get('/admin/users', requireAdmin, adminController.getAllUsers);

// 管理员功能 - 获取封禁用户列表
router.get('/admin/banned-users', requireAdmin, adminController.getBannedUsers);

// 管理员功能 - 获取详细统计数据
router.get('/admin/stats', requireAdmin, adminController.getDetailedStats);

// 管理员功能 - 获取最近活动
router.get('/admin/recent-activity', requireAdmin, adminController.getRecentActivity);

// 管理员功能 - 获取所有评论
router.get('/admin/comments', requireAdmin, adminController.getAdminComments);

// 管理员功能 - 删除评论
router.delete('/admin/comments/:id', requireAdmin, adminController.deleteComment);

// 管理员功能 - 获取日志
router.get('/admin/logs', requireAdmin, adminController.getLogs);

// 管理员功能 - 获取可用的日志日期列表
router.get('/admin/logs/dates', requireAdmin, adminController.getAvailableDates);

// 管理员功能 - 清空日志
router.delete('/admin/logs', requireAdmin, adminController.clearLogs);

// 管理员功能 - 删除指定日期的日志文件
router.delete('/admin/logs/date', requireAdmin, adminController.deleteLogsByDate);

module.exports = router;