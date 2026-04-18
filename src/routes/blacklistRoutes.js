const express = require('express');
const router = express.Router();
const blacklistController = require('../controllers/blacklistController');

// 拉黑用户
router.post('/block', blacklistController.blockUser);

// 取消拉黑
router.post('/unblock', blacklistController.unblockUser);

// 检查拉黑状态
router.get('/block/status', blacklistController.checkBlockStatus);

// 检查两个用户之间是否有拉黑关系
router.get('/block/relation', blacklistController.checkBlockRelation);

// 获取用户拉黑的人列表
router.get('/blocked/:userId', blacklistController.getBlockedList);

// 获取拉黑数量
router.get('/blocked/count/:userId', blacklistController.getBlockedCount);

module.exports = router;
