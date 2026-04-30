const express = require('express');
const router = express.Router({ mergeParams: true });
const blacklistController = require('../controllers/blacklistController');
const { authenticateUser } = require('../middleware/jwtAuth');

// 所有路由统一添加 /api 前缀，与前端请求路径保持一致
const apiRouter = express.Router({ mergeParams: true });
router.use('/api', apiRouter);

// 拉黑用户
apiRouter.post('/block', authenticateUser, blacklistController.blockUser);

// 取消拉黑
apiRouter.post('/unblock', authenticateUser, blacklistController.unblockUser);

// 检查拉黑状态
apiRouter.get('/block/status', blacklistController.checkBlockStatus);

// 检查两个用户之间是否有拉黑关系
apiRouter.get('/block/relation', blacklistController.checkBlockRelation);

// 获取用户拉黑的人列表
apiRouter.get('/blocked/:userId', blacklistController.getBlockedList);

// 获取拉黑数量
apiRouter.get('/blocked/count/:userId', blacklistController.getBlockedCount);

module.exports = router;
