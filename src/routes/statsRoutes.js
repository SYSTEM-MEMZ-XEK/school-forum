const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { optionalAuth } = require('../middleware/jwtAuth');
const { requireAdmin } = require('../middleware/adminAuth');

// 获取统计数据
router.get('/stats', statsController.getStats);

// 搜索功能（可选认证：有 token 时按登录身份返回个性化结果）
router.get('/search', optionalAuth, statsController.search);

// ============ IP 访问统计（仅管理员） ============
// 注意：与 adminRoutes 的 /admin/ip-stats 等价，此处也必须强制管理员认证，
// 避免出现无认证的公开入口（历史上曾存在越权读取/删除风险）
router.get('/ip-stats/summary', requireAdmin, statsController.getIpStatsSummary);

// 获取IP统计列表
router.get('/ip-stats', requireAdmin, statsController.getIpStats);

// 获取指定IP的访问次数
router.get('/ip-stats/:ip', requireAdmin, statsController.getIpAccessCount);

// 清除指定IP的统计
router.delete('/ip-stats/:ip', requireAdmin, statsController.clearIpStats);

// 清除所有IP统计
router.delete('/ip-stats', requireAdmin, statsController.clearAllIpStats);

module.exports = router;
