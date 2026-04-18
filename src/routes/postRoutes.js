const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { upload } = require('../middleware/uploadMiddleware');

// 获取帖子列表（支持分页和搜索）
router.get('/posts', postController.getPosts);

// 发布新帖子（支持图片上传）
router.post('/posts', upload.array('images', 20), postController.createPost);

// 获取单个帖子详情
router.get('/posts/:id', postController.getPostById);

// 增加帖子浏览量
router.post('/posts/:id/view', postController.incrementViewCount);

// 点赞帖子
router.post('/posts/:id/like', postController.likePost);

// 点踩帖子
router.post('/posts/:id/dislike', postController.dislikePost);

// 用户删除自己的帖子
router.delete('/posts/:id', postController.deletePost);
// 兼容 Android 端的 POST 删除方式
router.post('/posts/delete', postController.deletePost);

// 用户编辑自己的帖子
router.put('/posts/:id', upload.array('images', 20), postController.updatePost);

// 添加评论
router.post('/posts/:id/comments', postController.addComment);

// 回复评论
router.post('/posts/:id/comments/:commentId/replies', postController.replyComment);

// 删除评论
router.delete('/posts/:id/comments/:commentId', postController.deleteComment);

// 点赞评论
router.post('/posts/:id/comments/:commentId/like', postController.likeComment);

module.exports = router;