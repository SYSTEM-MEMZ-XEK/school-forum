const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

// ============ 标签管理（放在前面，避免被通配路由捕获） ============

// 获取用户所有标签
router.get('/favorites/tags/:userId', favoriteController.getUserTags);

// 创建标签
router.post('/favorites/tags', favoriteController.createTag);

// 更新标签
router.put('/favorites/tags/:tagId', favoriteController.updateTag);

// 删除标签
router.delete('/favorites/tags/:tagId', favoriteController.deleteTag);

// 更新标签排序
router.put('/favorites/tags/order', favoriteController.updateTagOrder);

// ============ 批量操作（放在前面，避免被通配路由捕获） ============

// 批量删除收藏
router.post('/favorites/batch/delete', favoriteController.batchRemoveFavorites);

// 批量移动收藏到标签
router.post('/favorites/batch/move', favoriteController.batchMoveToTag);

// 获取用户收藏列表
router.get('/favorites/user/:userId', favoriteController.getUserFavorites);

// 获取用户收藏数量
router.get('/favorites/user/:userId/count', favoriteController.getFavoriteCount);

// ============ 收藏管理（带 postId 参数的路由放在最后） ============

// 收藏帖子
router.post('/favorites/:postId', favoriteController.addFavorite);

// 取消收藏
router.delete('/favorites/:postId', favoriteController.removeFavorite);

// 检查是否已收藏
router.get('/favorites/:postId/check', favoriteController.checkFavorite);

// 更新收藏的标签
router.put('/favorites/:postId/tag', favoriteController.updateFavoriteTag);

module.exports = router;
