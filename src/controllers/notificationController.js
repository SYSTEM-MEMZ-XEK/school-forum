const { v4: uuidv4 } = require('uuid');
const { 
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getPosts,
  getUsers,
  getUserById,
  getPostById
} = require('../utils/dataUtils');
const { 
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const logger = require('../utils/logger');

const notificationController = {
  // 获取用户的通知
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const notifications = await getNotifications(userId);
      const posts = await getPosts();
      const users = await getUsers();
      
      // 为通知添加帖子标题和用户信息
      const enrichedNotifications = notifications.map(notification => {
        const post = posts.find(p => p.id === notification.postId);
        const fromUser = users.find(u => u.id === notification.fromUserId);
        
        return {
          ...notification,
          postTitle: post ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content) : '帖子已被删除',
          fromUsername: fromUser ? fromUser.username : '未知用户',
          postExists: !!post && !post.isDeleted
        };
      });
      
      res.json(generateSuccessResponse({ notifications: enrichedNotifications }));
    } catch (error) {
      logger.logError('获取通知失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
  
  // 标记通知为已读
  async markAsRead(req, res) {
    try {
      const notificationId = req.params.id;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const notifications = await getNotifications(userId);
      const notification = notifications.find(n => n.id === notificationId && n.userId === userId);
      
      if (!notification) {
        return res.status(404).json(generateErrorResponse('通知不存在'));
      }
      
      await markNotificationAsRead(notificationId);
      
      res.json(generateSuccessResponse({}, '通知已标记为已读'));
    } catch (error) {
      logger.logError('标记通知为已读失败', { error: error.message, notificationId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
  
  // 标记所有通知为已读
  async markAllAsRead(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const result = await markAllNotificationsAsRead(userId);
      
      res.json(generateSuccessResponse({ updatedCount: result.modifiedCount || 0 }, `已标记所有通知为已读`));
    } catch (error) {
      logger.logError('标记所有通知为已读失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
  
  // 创建点赞通知
  async createLikeNotification(postId, fromUserId, postOwnerId) {
    try {
      if (fromUserId === postOwnerId) {
        // 不给自己发通知
        return;
      }
      
      const posts = await getPosts();
      const users = await getUsers();
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotifications = await getNotifications(postOwnerId);
      const existingNotification = existingNotifications.find(n => 
        n.type === 'like' && 
        n.postId === postId && 
        n.fromUserId === fromUserId && 
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳
        const { Notification } = require('../utils/dataUtils');
        await Notification.findOneAndUpdate(
          { id: existingNotification.id },
          { timestamp: new Date() }
        );
        return;
      }
      
      const newNotification = {
        id: uuidv4(),
        userId: postOwnerId,
        type: 'like',
        postId: postId,
        fromUserId: fromUserId,
        fromUsername: fromUser.username,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建点赞通知失败', { error: error.message, postId, fromUserId, postOwnerId });
    }
  },
  
  // 创建评论通知
  async createCommentNotification(postId, fromUserId, commentContent, postOwnerId) {
    try {
      if (fromUserId === postOwnerId) {
        // 不给自己发通知
        return;
      }
      
      const posts = await getPosts();
      const users = await getUsers();
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotifications = await getNotifications(postOwnerId);
      const existingNotification = existingNotifications.find(n => 
        n.type === 'comment' && 
        n.postId === postId && 
        n.fromUserId === fromUserId && 
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳和内容
        const { Notification } = require('../utils/dataUtils');
        await Notification.findOneAndUpdate(
          { id: existingNotification.id },
          { timestamp: new Date(), content: commentContent }
        );
        return;
      }
      
      const newNotification = {
        id: uuidv4(),
        userId: postOwnerId,
        type: 'comment',
        postId: postId,
        fromUserId: fromUserId,
        fromUsername: fromUser.username,
        content: commentContent,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建评论通知失败', { error: error.message, postId, fromUserId, postOwnerId });
    }
  },

  // 创建评论回复通知
  async createCommentReplyNotification(postId, commentId, fromUserId, replyContent, commentOwnerId) {
    try {
      if (fromUserId === commentOwnerId) {
        // 不给自己发通知
        return;
      }
      
      const posts = await getPosts();
      const users = await getUsers();
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 查找被回复的评论
      const comment = post.comments && post.comments.find(c => c.id === commentId);
      if (!comment) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotifications = await getNotifications(commentOwnerId);
      const existingNotification = existingNotifications.find(n => 
        n.type === 'comment_reply' && 
        n.postId === postId && 
        n.commentId === commentId &&
        n.fromUserId === fromUserId && 
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳和内容
        const { Notification } = require('../utils/dataUtils');
        await Notification.findOneAndUpdate(
          { id: existingNotification.id },
          { timestamp: new Date(), content: replyContent }
        );
        return;
      }
      
      const newNotification = {
        id: uuidv4(),
        userId: commentOwnerId,
        type: 'comment_reply',
        postId: postId,
        commentId: commentId,
        fromUserId: fromUserId,
        fromUsername: fromUser.username,
        content: replyContent,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建评论回复通知失败', { error: error.message, postId, commentId, fromUserId, commentOwnerId });
    }
  },

  // 创建帖子删除通知（系统消息）
  async createPostDeletedNotification(postId, postOwnerId, reason, adminId) {
    try {
      const posts = await getPosts(true);
      const users = await getUsers();
      
      const post = posts.find(p => p.id === postId);
      const admin = users.find(u => u.id === adminId);
      
      if (!post || !admin) {
        return;
      }
      
      const postTitle = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
      
      const newNotification = {
        id: uuidv4(),
        userId: postOwnerId,
        type: 'system',
        systemType: 'post_deleted',
        postId: postId,
        postTitle: postTitle,
        reason: reason || '违反论坛规定',
        adminName: admin.username,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建帖子删除通知失败', { error: error.message, postId, postOwnerId, reason, adminId });
    }
  },

  // 创建评论删除通知（系统消息）
  async createCommentDeletedNotification(postId, commentId, commentOwnerId, reason, adminId) {
    try {
      const posts = await getPosts();
      const users = await getUsers();
      
      const post = posts.find(p => p.id === postId);
      const admin = users.find(u => u.id === adminId);
      
      if (!post || !admin) {
        return;
      }
      
      const postTitle = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
      
      const newNotification = {
        id: uuidv4(),
        userId: commentOwnerId,
        type: 'system',
        systemType: 'comment_deleted',
        postId: postId,
        commentId: commentId,
        postTitle: postTitle,
        reason: reason || '违反论坛规定',
        adminName: admin.username,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建评论删除通知失败', { error: error.message, postId, commentId, commentOwnerId, adminId });
    }
  },

  // 创建账号封禁通知（系统消息）
  async createAccountBannedNotification(userId, reason, banEndTime, adminId) {
    try {
      const users = await getUsers();
      
      const user = users.find(u => u.id === userId);
      const admin = users.find(u => u.id === adminId);
      
      if (!user || !admin) {
        return;
      }
      
      const newNotification = {
        id: uuidv4(),
        userId: userId,
        type: 'system',
        systemType: 'account_banned',
        reason: reason || '违反论坛规定',
        banEndTime: banEndTime,
        adminName: admin.username,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建账号封禁通知失败', { error: error.message, userId, reason, banEndTime, adminId });
    }
  },

  // 创建举报结果通知（给被举报用户）
  async createReportResultNotification(userId, isViolation, reason, banDays, targetType, targetContent) {
    try {
      const targetText = targetType === 'post' ? '帖子' : '评论';
      const contentPreview = targetContent ? (targetContent.length > 100 ? targetContent.substring(0, 100) + '...' : targetContent) : '';
      
      const newNotification = {
        id: uuidv4(),
        userId: userId,
        type: 'system',
        systemType: 'report_result',
        isViolation: isViolation,
        reason: reason,
        banDays: banDays,
        targetType: targetText,
        targetContent: contentPreview,
        message: isViolation 
          ? `您的${targetText}因"${reason}"被举报，经核实违规属实，已被封禁${banDays === 365 ? '永久' : banDays + '天'}`
          : `您的${targetText}被举报，经核实未发现违规`,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建举报结果通知失败', { error: error.message, userId, isViolation, reason });
    }
  },

  // 创建举报人结果通知（给举报人）
  async createReporterResultNotification(reporterId, isApproved, reason, targetUsername, banDays, targetType, targetContent, note) {
    try {
      const targetText = targetType === 'post' ? '帖子' : '评论';
      const contentPreview = targetContent ? (targetContent.length > 100 ? targetContent.substring(0, 100) + '...' : targetContent) : '';
      
      const newNotification = {
        id: uuidv4(),
        userId: reporterId,
        type: 'system',
        systemType: 'reporter_result',
        isApproved: isApproved,
        reason: reason,
        targetUsername: targetUsername || '用户',
        banDays: banDays,
        targetType: targetText,
        targetContent: contentPreview,
        note: note || '',
        message: isApproved 
          ? `您举报的用户"${targetUsername}"因"${reason}"违规属实，已被封禁${banDays === 365 ? '永久' : banDays + '天'}`
          : `您举报的内容经核实未发现违规${note ? '：' + note : ''}`,
        timestamp: new Date(),
        read: false
      };
      
      await createNotification(newNotification);
    } catch (error) {
      logger.logError('创建举报人结果通知失败', { error: error.message, reporterId, isApproved, reason });
    }
  }
};

module.exports = notificationController;
