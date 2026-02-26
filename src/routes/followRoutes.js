const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');

// 关注用户
router.post('/follow', followController.followUser);

// 取消关注
router.delete('/follow', followController.unfollowUser);

// 检查关注状态
router.get('/follow/status', followController.checkFollowStatus);

// 获取用户的关注数和粉丝数
router.get('/follow/stats/:userId', followController.getFollowStats);

// 获取关注用户的新帖子数量（用于顶栏徽章）
router.get('/follow/new-posts/:userId', followController.getNewPostsCount);

// 标记用户查看了关注动态
router.post('/follow/mark-viewed', followController.markFollowingViewed);

// 获取用户关注的人列表
router.get('/following/:userId', followController.getFollowingList);

// 获取用户的粉丝列表
router.get('/followers/:userId', followController.getFollowerList);

// 获取关注的人的帖子
router.get('/following/posts/:userId', followController.getFollowingPosts);

module.exports = router;
