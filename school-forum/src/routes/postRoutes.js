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

// 用户删除自己的帖子
router.delete('/posts/:id', postController.deletePost);

// 添加评论
router.post('/posts/:id/comments', postController.addComment);

// 回复评论
router.post('/posts/:id/comments/:commentId/replies', postController.replyComment);

// 删除评论
router.delete('/posts/:id/comments/:commentId', postController.deleteComment);

module.exports = router;