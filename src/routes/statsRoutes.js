const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// 获取统计数据
router.get('/stats', statsController.getStats);

// 搜索功能
router.get('/search', statsController.search);

// IP访问统计
// 获取IP统计摘要
router.get('/ip-stats/summary', statsController.getIpStatsSummary);

// 获取IP统计列表
router.get('/ip-stats', statsController.getIpStats);

// 获取指定IP的访问次数
router.get('/ip-stats/:ip', statsController.getIpAccessCount);

// 清除指定IP的统计
router.delete('/ip-stats/:ip', statsController.clearIpStats);

// 清除所有IP统计
router.delete('/ip-stats', statsController.clearAllIpStats);

module.exports = router;