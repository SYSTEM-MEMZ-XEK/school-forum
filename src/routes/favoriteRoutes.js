const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticateUser } = require('../middleware/jwtAuth');

// ============ 标签管理（放在前面，避免被通配路由捕获） ============

// 获取用户所有标签 — 可公开查看他人标签，无需认证
router.get('/favorites/tags/:userId', favoriteController.getUserTags);

// 创建标签
router.post('/favorites/tags', authenticateUser, favoriteController.createTag);

// 更新标签
router.put('/favorites/tags/:tagId', authenticateUser, favoriteController.updateTag);

// 删除标签
router.delete('/favorites/tags/:tagId', authenticateUser, favoriteController.deleteTag);

// 更新标签排序
router.put('/favorites/tags/order', authenticateUser, favoriteController.updateTagOrder);

// ============ 批量操作（放在前面，避免被通配路由捕获） ============

// 批量删除收藏
router.post('/favorites/batch/delete', authenticateUser, favoriteController.batchRemoveFavorites);

// 批量移动收藏到标签
router.post('/favorites/batch/move', authenticateUser, favoriteController.batchMoveToTag);

// 获取用户收藏列表 — 可公开查看他人收藏，无需认证
router.get('/favorites/user/:userId', favoriteController.getUserFavorites);

// 获取用户收藏数量 — 无需认证
router.get('/favorites/user/:userId/count', favoriteController.getFavoriteCount);

// ============ 收藏管理（带 postId 参数的路由放在最后） ============

// 收藏帖子
router.post('/favorites/:postId', authenticateUser, favoriteController.addFavorite);

// 取消收藏
router.delete('/favorites/:postId', authenticateUser, favoriteController.removeFavorite);

// 检查是否已收藏 — 无需认证（未登录返回 false）
router.get('/favorites/:postId/check', favoriteController.checkFavorite);

// 更新收藏的标签
router.put('/favorites/:postId/tag', authenticateUser, favoriteController.updateFavoriteTag);

module.exports = router;
