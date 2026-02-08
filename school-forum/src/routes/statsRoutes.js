const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// 获取统计数据
router.get('/stats', statsController.getStats);

// 搜索功能
router.get('/search', statsController.search);

module.exports = router;