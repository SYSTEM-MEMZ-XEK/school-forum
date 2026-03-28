const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAdmin } = require('../middleware/adminAuth');

// 公开路由
// 获取举报类型列表
router.get('/reports/types', reportController.getReportTypes);

// 提交举报
router.post('/reports', reportController.submitReport);

// 获取用户举报历史
router.get('/reports/user/:userId', reportController.getUserReports);

// 管理员路由
// 获取举报列表
router.get('/admin/reports', requireAdmin, reportController.getReportsList);

// 获取举报统计
router.get('/admin/reports/stats', requireAdmin, reportController.getReportStats);

// 处理举报
router.post('/admin/reports/:reportId/process', requireAdmin, reportController.processReport);

module.exports = router;
