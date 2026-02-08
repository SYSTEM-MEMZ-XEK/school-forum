const { v4: uuidv4 } = require('uuid');
const { 
  readData, 
  writeData 
} = require('../utils/dataUtils');
const { 
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { NOTIFICATIONS_FILE, POSTS_FILE, USERS_FILE } = require('../config/constants');

const notificationController = {
  // 获取用户的通知
  getUserNotifications(req, res) {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const notifications = readData(NOTIFICATIONS_FILE);
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
      // 过滤出该用户的通知并按时间倒序排序
      const userNotifications = notifications
        .filter(notification => notification.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // 为通知添加帖子标题和用户信息
      const enrichedNotifications = userNotifications.map(notification => {
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
  markAsRead(req, res) {
    try {
      const notificationId = req.params.id;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const notifications = readData(NOTIFICATIONS_FILE);
      const notificationIndex = notifications.findIndex(n => n.id === notificationId && n.userId === userId);
      
      if (notificationIndex === -1) {
        return res.status(404).json(generateErrorResponse('通知不存在'));
      }
      
      notifications[notificationIndex].read = true;
      writeData(NOTIFICATIONS_FILE, notifications);
      
      res.json(generateSuccessResponse({}, '通知已标记为已读'));
    } catch (error) {
      logger.logError('标记通知为已读失败', { error: error.message, notificationId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
  
  // 标记所有通知为已读
  markAllAsRead(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const notifications = readData(NOTIFICATIONS_FILE);
      let updatedCount = 0;
      
      notifications.forEach(notification => {
        if (notification.userId === userId && !notification.read) {
          notification.read = true;
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        writeData(NOTIFICATIONS_FILE, notifications);
      }
      
      res.json(generateSuccessResponse({ updatedCount }, `已标记${updatedCount}条通知为已读`));
    } catch (error) {
      logger.logError('标记所有通知为已读失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
  
  // 创建点赞通知
  createLikeNotification(postId, fromUserId, postOwnerId) {
    try {
      if (fromUserId === postOwnerId) {
        // 不给自己发通知
        return;
      }
      
      const notifications = readData(NOTIFICATIONS_FILE);
      const users = readData(USERS_FILE);
      const posts = readData(POSTS_FILE);
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotification = notifications.find(n => 
        n.type === 'like' && 
        n.postId === postId && 
        n.fromUserId === fromUserId && 
        n.userId === postOwnerId &&
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳
        existingNotification.timestamp = new Date().toISOString();
        writeData(NOTIFICATIONS_FILE, notifications);
        return;
      }
      
      const newNotification = {
        id: uuidv4(),
        userId: postOwnerId,
        type: 'like',
        postId: postId,
        fromUserId: fromUserId,
        fromUsername: fromUser.username,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建点赞通知失败', { error: error.message, postId, userId, postUserId });
    }
  },
  
  // 创建评论通知
  createCommentNotification(postId, fromUserId, commentContent, postOwnerId) {
    try {
      if (fromUserId === postOwnerId) {
        // 不给自己发通知
        return;
      }
      
      const notifications = readData(NOTIFICATIONS_FILE);
      const users = readData(USERS_FILE);
      const posts = readData(POSTS_FILE);
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotification = notifications.find(n => 
        n.type === 'comment' && 
        n.postId === postId && 
        n.fromUserId === fromUserId && 
        n.userId === postOwnerId &&
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳和内容
        existingNotification.timestamp = new Date().toISOString();
        existingNotification.content = commentContent;
        writeData(NOTIFICATIONS_FILE, notifications);
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
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建评论通知失败', { error: error.message, postId, userId, postUserId });
    }
  },

  // 创建评论回复通知
  createCommentReplyNotification(postId, commentId, fromUserId, replyContent, commentOwnerId) {
    try {
      const notifications = readData(NOTIFICATIONS_FILE);
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
      const post = posts.find(p => p.id === postId && !p.isDeleted);
      const fromUser = users.find(u => u.id === fromUserId);
      
      if (!post || !fromUser) {
        return;
      }
      
      // 查找被回复的评论
      const comment = post.comments.find(c => c.id === commentId);
      if (!comment) {
        return;
      }
      
      // 获取评论作者的信息
      const commentAuthor = users.find(u => u.id === comment.userId);
      if (!commentAuthor) {
        return;
      }
      
      // 检查是否已存在相同的未读通知
      const existingNotification = notifications.find(n => 
        n.type === 'comment_reply' && 
        n.postId === postId && 
        n.commentId === commentId &&
        n.fromUserId === fromUserId && 
        n.userId === commentOwnerId &&
        !n.read
      );
      
      if (existingNotification) {
        // 如果已存在未读通知，更新时间戳和内容
        existingNotification.timestamp = new Date().toISOString();
        existingNotification.content = replyContent;
        writeData(NOTIFICATIONS_FILE, notifications);
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
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建评论回复通知失败', { error: error.message, postId, commentId, userId, targetUserId });
    }
  },

  // 创建帖子删除通知（系统消息）
  createPostDeletedNotification(postId, postOwnerId, reason, adminId) {
    try {
      const notifications = readData(NOTIFICATIONS_FILE);
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
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
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建帖子删除通知失败', { error: error.message, postId, userId, reason, deletedBy });
    }
  },

  // 创建评论删除通知（系统消息）
  createCommentDeletedNotification(postId, commentId, commentOwnerId, reason, adminId) {
    try {
      const notifications = readData(NOTIFICATIONS_FILE);
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
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
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建评论删除通知失败', { error: error.message, postId, commentId, userId, deletedBy });
    }
  },

  // 创建账号封禁通知（系统消息）
  createAccountBannedNotification(userId, reason, banEndTime, adminId) {
    try {
      const notifications = readData(NOTIFICATIONS_FILE);
      const users = readData(USERS_FILE);
      
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
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
    } catch (error) {
      logger.logError('创建账号封禁通知失败', { error: error.message, userId, reason, banEndTime, adminId });
    }
  }
};

module.exports = notificationController;