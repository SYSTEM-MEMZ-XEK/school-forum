const Follow = require('../models/Follow');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');
const {
  generateErrorResponse,
  generateSuccessResponse,
  userExists
} = require('../utils/validationUtils');
const logger = require('../utils/logger');

const followController = {
  // 关注用户
  async followUser(req, res) {
    try {
      const { followerId, followingId } = req.body;

      if (!followerId || !followingId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 不能关注自己
      if (followerId === followingId) {
        return res.status(400).json(generateErrorResponse('不能关注自己'));
      }

      // 检查被关注的用户是否存在
      if (!await userExists(followingId)) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 检查是否已关注
      const isFollowing = await Follow.isFollowing(followerId, followingId);
      if (isFollowing) {
        return res.status(400).json(generateErrorResponse('已经关注了该用户'));
      }

      // 获取关注者信息
      const follower = await User.findOne({ id: followerId });
      const followerUsername = follower ? follower.username : '用户';

      // 创建关注关系
      await Follow.create({
        followerId,
        followingId,
        createdAt: new Date()
      });

      // 创建关注通知
      await Notification.create({
        id: uuidv4(),
        userId: followingId,
        type: 'follow',
        fromUserId: followerId,
        fromUsername: followerUsername,
        timestamp: new Date(),
        read: false
      });

      logger.logUserAction('关注用户', followerId, '', {
        followingId
      });

      res.json(generateSuccessResponse({
        following: true
      }, '关注成功'));
    } catch (error) {
      logger.logError('关注用户失败', { error: error.message, body: req.body });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 取消关注
  async unfollowUser(req, res) {
    try {
      const { followerId, followingId } = req.body;

      if (!followerId || !followingId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 删除关注关系
      const result = await Follow.findOneAndDelete({ followerId, followingId });

      if (!result) {
        return res.status(400).json(generateErrorResponse('未关注该用户'));
      }

      logger.logUserAction('取消关注', followerId, '', {
        followingId
      });

      res.json(generateSuccessResponse({
        following: false
      }, '取消关注成功'));
    } catch (error) {
      logger.logError('取消关注失败', { error: error.message, body: req.body });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 检查关注状态
  async checkFollowStatus(req, res) {
    try {
      const { followerId, followingId } = req.query;

      if (!followerId || !followingId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const isFollowing = await Follow.isFollowing(followerId, followingId);

      res.json(generateSuccessResponse({
        isFollowing
      }));
    } catch (error) {
      logger.logError('检查关注状态失败', { error: error.message, query: req.query });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取用户的关注数和粉丝数
  async getFollowStats(req, res) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const followingCount = await Follow.getFollowingCount(userId);
      const followerCount = await Follow.getFollowerCount(userId);

      res.json(generateSuccessResponse({
        followingCount,
        followerCount
      }));
    } catch (error) {
      logger.logError('获取关注统计失败', { error: error.message, userId: req.params.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取用户关注的人列表
  async getFollowingList(req, res) {
    try {
      const userId = req.params.userId;
      const currentUserId = req.query.currentUserId; // 当前登录用户ID
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 获取关注列表
      const followingList = await Follow.getFollowingList(userId, limit, skip);

      // 获取用户详细信息
      const followingIds = followingList.map(f => f.followingId);
      const users = await User.find({ id: { $in: followingIds } });

      // 获取当前用户关注的人（用于判断关注状态）
      let currentUserFollowingIds = [];
      if (currentUserId && currentUserId !== userId) {
        currentUserFollowingIds = await Follow.getFollowingIds(currentUserId);
      }

      // 检查是否是管理员
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();

      // 组合数据
      const result = followingList.map(f => {
        const user = users.find(u => u.id === f.followingId);
        if (!user) return null;

        return {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          school: user.school,
          grade: user.grade,
          className: user.className,
          followedAt: f.followedAt,
          isAdmin: adminUsers.includes(user.qq) || adminUsers.includes(user.id),
          isFollowing: currentUserId ? currentUserFollowingIds.includes(user.id) : false
        };
      }).filter(Boolean);

      // 获取总数
      const total = await Follow.getFollowingCount(userId);

      res.json(generateSuccessResponse({
        list: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      }));
    } catch (error) {
      logger.logError('获取关注列表失败', { error: error.message, userId: req.params.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取用户的粉丝列表
  async getFollowerList(req, res) {
    try {
      const userId = req.params.userId;
      const currentUserId = req.query.currentUserId; // 当前登录用户ID
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 获取粉丝列表
      const followerList = await Follow.getFollowerList(userId, limit, skip);

      // 获取用户详细信息
      const followerIds = followerList.map(f => f.followerId);
      const users = await User.find({ id: { $in: followerIds } });

      // 获取当前用户关注的人（用于判断关注状态）
      let currentUserFollowingIds = [];
      if (currentUserId) {
        currentUserFollowingIds = await Follow.getFollowingIds(currentUserId);
      }

      // 检查是否是管理员
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();

      // 组合数据
      const result = followerList.map(f => {
        const user = users.find(u => u.id === f.followerId);
        if (!user) return null;

        return {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          school: user.school,
          grade: user.grade,
          className: user.className,
          followedAt: f.followedAt,
          isAdmin: adminUsers.includes(user.qq) || adminUsers.includes(user.id),
          isFollowing: currentUserFollowingIds.includes(user.id)
        };
      }).filter(Boolean);

      // 获取总数
      const total = await Follow.getFollowerCount(userId);

      res.json(generateSuccessResponse({
        list: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      }));
    } catch (error) {
      logger.logError('获取粉丝列表失败', { error: error.message, userId: req.params.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取关注的人的帖子（用于"我的关注"页面）
  async getFollowingPosts(req, res) {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 获取关注的人的ID列表
      const followingIds = await Follow.getFollowingIds(userId);

      if (followingIds.length === 0) {
        return res.json(generateSuccessResponse({
          posts: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            total: 0,
            hasNext: false,
            hasPrev: false
          }
        }));
      }

      // 查询这些用户的帖子
      const posts = await Post.find({
        userId: { $in: followingIds },
        isDeleted: { $ne: true }
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

      // 获取用户头像信息
      const users = await User.find({ id: { $in: followingIds } });
      const userMap = {};
      users.forEach(u => {
        userMap[u.id] = u;
      });

      // 添加用户头像
      const postsWithAvatar = posts.map(post => {
        const user = userMap[post.userId];
        return {
          ...post.toObject(),
          userAvatar: user && user.avatar ? user.avatar : null
        };
      });

      // 获取总数
      const total = await Post.countDocuments({
        userId: { $in: followingIds },
        isDeleted: { $ne: true }
      });

      res.json(generateSuccessResponse({
        posts: postsWithAvatar,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      }));
    } catch (error) {
      logger.logError('获取关注帖子失败', { error: error.message, userId: req.params.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取关注用户的新帖子数量（用于顶栏徽章）
  async getNewPostsCount(req, res) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 获取关注的人的ID列表
      const followingIds = await Follow.getFollowingIds(userId);

      if (followingIds.length === 0) {
        return res.json(generateSuccessResponse({
          count: 0
        }));
      }

      // 获取用户上次查看动态的时间
      const user = await User.findOne({ id: userId });
      const lastViewedAt = user && user.lastViewedFollowingAt;

      // 构建查询条件
      const query = {
        userId: { $in: followingIds },
        isDeleted: { $ne: true }
      };

      // 如果有上次查看时间，只统计这个时间之后的帖子
      if (lastViewedAt) {
        query.timestamp = { $gt: lastViewedAt.toISOString() };
      } else {
        // 如果没有上次查看时间，获取最近7天内的帖子数量
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query.timestamp = { $gte: sevenDaysAgo.toISOString() };
      }

      const count = await Post.countDocuments(query);

      res.json(generateSuccessResponse({
        count
      }));
    } catch (error) {
      logger.logError('获取新帖子数量失败', { error: error.message, userId: req.params.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 标记用户查看了关注动态（更新查看时间）
  async markFollowingViewed(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      // 更新用户的上次查看时间
      await User.findOneAndUpdate(
        { id: userId },
        { lastViewedFollowingAt: new Date() }
      );

      res.json(generateSuccessResponse({
        success: true
      }));
    } catch (error) {
      logger.logError('标记查看动态失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = followController;
