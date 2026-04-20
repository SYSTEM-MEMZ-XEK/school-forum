const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAdmin } = require('../middleware/adminAuth');
const { authenticateUser } = require('../middleware/jwtAuth');

// 公开路由
// 获取举报类型列表 — 无需认证
router.get('/reports/types', reportController.getReportTypes);

// 提交举报 — 需要登录
router.post('/reports', authenticateUser, reportController.submitReport);

// 获取用户举报历史 — 需要登录
router.get('/reports/user/:userId', authenticateUser, reportController.getUserReports);

// 管理员路由
// 获取举报列表
router.get('/admin/reports', requireAdmin, reportController.getReportsList);

// 获取举报统计
router.get('/admin/reports/stats', requireAdmin, reportController.getReportStats);

// 处理举报
router.post('/admin/reports/:reportId/process', requireAdmin, reportController.processReport);

module.exports = router;
