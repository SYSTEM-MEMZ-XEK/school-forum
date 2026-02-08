const {
  readData,
  writeData
} = require('../utils/dataUtils');
const {
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { PAGINATION_CONFIG } = require('../config/constants');
const {
  USERS_FILE,
  POSTS_FILE,
  BANNED_USERS_FILE,
  DELETED_POSTS_FILE
} = require('../config/constants');
const logger = require('../utils/logger');
const notificationController = require('./notificationController');

const adminController = {
  // 管理员功能 - 获取帖子列表（包含已删除帖子）
  getAdminPosts(req, res) {
    try {
      const { page = PAGINATION_CONFIG.defaultPage, limit = PAGINATION_CONFIG.defaultLimit, search = '' } = req.query;

      logger.logInfo('管理员访问帖子列表', {
        page,
        limit,
        search,
        ip: req.ip
      });

      const posts = readData(POSTS_FILE);

      let filteredPosts = posts;

      // 搜索功能（管理员可以看到所有帖子，包括已删除的）
      if (search) {
        filteredPosts = posts.filter(post =>
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
        );
      }

      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

      res.json(generateSuccessResponse({
        posts: paginatedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredPosts.length / limit),
          totalPosts: filteredPosts.length,
          hasNext: endIndex < filteredPosts.length,
          hasPrev: startIndex > 0
        }
      }));
    } catch (error) {
      logger.logError('管理员获取帖子错误', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 永久删除帖子
  deletePostPermanently(req, res) {
    try {
      const postId = req.params.id;
      const { adminId, reason } = req.body;

      if (!adminId) {
        logger.logWarn('永久删除帖子失败：管理员ID为空', { postId });
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId);

      if (postIndex === -1) {
        logger.logWarn('永久删除帖子失败：帖子不存在', { postId, adminId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const deletedPost = posts[postIndex];

      // 永久删除帖子（从数组中移除）
      posts.splice(postIndex, 1);
      writeData(POSTS_FILE, posts);

      // 记录管理员永久删除帖子日志
      logger.logSecurityEvent('管理员永久删除帖子', {
        adminId,
        postId,
        postAuthor: deletedPost.username,
        reason: reason || '无',
        ip: req.ip
      });
      
      // 更新用户发帖数
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === deletedPost.userId);
      if (userIndex !== -1) {
        users[userIndex].postCount = Math.max(0, (users[userIndex].postCount || 0) - 1);
        writeData(USERS_FILE, users);
      }
      
      // 记录删除操作到备份文件
      try {
        const deletedPosts = readData(DELETED_POSTS_FILE);
        deletedPosts.unshift({
          ...deletedPost,
          deletedBy: adminId,
          deletedAt: new Date().toISOString(),
          reason: reason || '违反论坛规定',
          permanentDelete: true
        });
        writeData(DELETED_POSTS_FILE, deletedPosts);
      } catch (backupError) {
        logger.logError('备份删除记录失败', { error: backupError.message, postId });
      }
      
      // 发送系统通知给帖子作者
      const notificationController = require('./notificationController');
      notificationController.createPostDeletedNotification(postId, deletedPost.userId, reason, adminId);
      
      res.json(generateSuccessResponse({}, '帖子已永久删除'));
    } catch (error) {
      logger.logError('永久删除帖子失败', { error: error.message, postId: req.params.id, adminId: req.body.adminId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 封禁用户
  banUser(req, res) {
    try {
      const userId = req.params.id;
      const { adminId, duration, reason } = req.body;
      
      if (!adminId) {
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 计算封禁结束时间
      const banDuration = parseInt(duration) || 7;
      const banEndTime = new Date();
      
      if (banDuration === 365) {
        // 永久封禁
        banEndTime.setFullYear(banEndTime.getFullYear() + 100);
      } else {
        banEndTime.setDate(banEndTime.getDate() + banDuration);
      }
      
      // 更新用户状态
      user.isActive = false;
      user.banStartTime = new Date().toISOString();
      user.banEndTime = banEndTime.toISOString();
      user.banReason = reason || '违反论坛规定';
      user.bannedBy = adminId;
      
      writeData(USERS_FILE, users);
      
      // 记录封禁信息
      const bannedUsers = readData(BANNED_USERS_FILE) || [];
      bannedUsers.unshift({
        userId: user.id,
        username: user.username,
        qq: user.qq,
        banStartTime: user.banStartTime,
        banEndTime: user.banEndTime,
        banReason: user.banReason,
        bannedBy: user.bannedBy
      });
      writeData(BANNED_USERS_FILE, bannedUsers);

      // 记录封禁用户日志
      logger.logUserAction('封禁用户', adminId, user.username, {
        targetUserId: user.id,
        targetUsername: user.username,
        targetQQ: user.qq,
        duration: banDuration,
        reason: reason || '违反论坛规定',
        banEndTime: banEndTime.toISOString()
      });

      // 发送系统通知给被封禁用户
      const notificationController = require('./notificationController');
      notificationController.createAccountBannedNotification(userId, reason, banEndTime.toISOString(), adminId);

      res.json(generateSuccessResponse({
        banInfo: {
          username: user.username,
          banStartTime: user.banStartTime,
          banEndTime: user.banEndTime,
          banReason: user.banReason,
          bannedBy: user.bannedBy
        }
      }, `用户 ${user.username} 已被封禁 ${banDuration === 365 ? '永久' : banDuration + ' 天'}`));
    } catch (error) {
      logger.logError('封禁用户失败', { error: error.message, userId: req.params.id, adminId: req.body.adminId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 解封用户
  unbanUser(req, res) {
    try {
      const userId = req.params.id;
      const { adminId } = req.body;
      
      if (!adminId) {
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 解封用户
      user.isActive = true;
      delete user.banStartTime;
      delete user.banEndTime;
      delete user.banReason;
      delete user.bannedBy;
      
      writeData(USERS_FILE, users);

      // 记录解封用户日志
      logger.logUserAction('解封用户', adminId, user.username, {
        targetUserId: user.id,
        targetUsername: user.username
      });

      res.json(generateSuccessResponse({}, `用户 ${user.username} 已解封`));
    } catch (error) {
      logger.logError('解封用户失败', { error: error.message, userId: req.params.id, adminId: req.body.adminId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取所有用户
  getAllUsers(req, res) {
    try {
      const users = readData(USERS_FILE);
      
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(generateSuccessResponse({ users: safeUsers }));
    } catch (error) {
      logger.logError('获取用户列表失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取封禁用户列表
  getBannedUsers(req, res) {
    try {
      const users = readData(USERS_FILE);
      
      const bannedUsers = users
        .filter(user => user.isActive === false)
        .map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
      
      res.json(generateSuccessResponse({ bannedUsers }));
    } catch (error) {
      logger.logError('获取封禁用户列表失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取详细统计数据
  getDetailedStats(req, res) {
    try {
      const users = readData(USERS_FILE);
      const posts = readData(POSTS_FILE);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      
      // 基础统计
      const totalUsers = users.length;
      const totalPosts = posts.filter(p => !p.isDeleted).length;
      const bannedUsers = users.filter(user => user.isActive === false).length;
      
      // 时间范围统计
      const todayPosts = posts.filter(post => 
        new Date(post.timestamp) >= today && !post.isDeleted
      );
      const weekPosts = posts.filter(post => 
        new Date(post.timestamp) >= weekAgo && !post.isDeleted
      );
      const monthPosts = posts.filter(post => 
        new Date(post.timestamp) >= monthAgo && !post.isDeleted
      );
      
      // 用户活跃度统计
      const activeUsers = users.filter(user => {
        const userPosts = posts.filter(post => 
          post.userId === user.id && !post.isDeleted
        );
        return userPosts.length > 0;
      }).length;
      
      // 年级分布统计
      const gradeDistribution = {};
      users.forEach(user => {
        if (user.grade) {
          gradeDistribution[user.grade] = (gradeDistribution[user.grade] || 0) + 1;
        }
      });
      
      // 学校分布统计
      const schoolDistribution = {};
      users.forEach(user => {
        if (user.school) {
          schoolDistribution[user.school] = (schoolDistribution[user.school] || 0) + 1;
        }
      });
      
      // 帖子类型统计
      const anonymousPosts = posts.filter(post => 
        (post.anonymous === true || post.anonymous === 'true') && !post.isDeleted
      ).length;
      const normalPosts = totalPosts - anonymousPosts;
      
      // 评论和点赞统计
      const totalComments = posts.reduce((sum, post) => 
        sum + (post.comments ? post.comments.length : 0), 0
      );
      const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
      
      // 最活跃用户
      const userActivity = users.map(user => {
        const userPosts = posts.filter(post => 
          post.userId === user.id && !post.isDeleted
        );
        const userComments = posts.reduce((sum, post) => {
          if (post.comments) {
            return sum + post.comments.filter(comment => comment.userId === user.id).length;
          }
          return sum;
        }, 0);
        
        return {
          username: user.username,
          school: user.school,
          grade: user.grade,
          postCount: userPosts.length,
          commentCount: userComments,
          totalActivity: userPosts.length + userComments
        };
      }).sort((a, b) => b.totalActivity - a.totalActivity).slice(0, 10);
      
      const detailedStats = {
        totalUsers,
        totalPosts,
        bannedUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        
        todayPosts: todayPosts.length,
        weekPosts: weekPosts.length,
        monthPosts: monthPosts.length,
        
        totalComments,
        totalLikes,
        averageLikesPerPost: totalPosts > 0 ? (totalLikes / totalPosts).toFixed(2) : 0,
        averageCommentsPerPost: totalPosts > 0 ? (totalComments / totalPosts).toFixed(2) : 0,
        
        anonymousPosts,
        normalPosts,
        anonymousPercentage: totalPosts > 0 ? ((anonymousPosts / totalPosts) * 100).toFixed(2) : 0,
        
        gradeDistribution,
        schoolDistribution,
        
        topActiveUsers: userActivity
      };
      
      res.json(generateSuccessResponse({ stats: detailedStats }));
    } catch (error) {
      logger.logError('获取详细统计失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取最近活动
  getRecentActivity(req, res) {
    try {
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
      // 获取最近24小时的帖子
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      const recentPosts = posts
        .filter(post => new Date(post.timestamp) >= dayAgo && !post.isDeleted)
        .slice(0, 20);
      
      // 获取最近注册的用户
      const recentUsers = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
      
      res.json(generateSuccessResponse({
        recentPosts,
        recentUsers
      }));
    } catch (error) {
      logger.logError('获取最近活动失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取所有评论
  getAdminComments(req, res) {
    try {
      const { page = PAGINATION_CONFIG.defaultPage, limit = PAGINATION_CONFIG.defaultLimit, search = '' } = req.query;
      const posts = readData(POSTS_FILE);
      
      // 收集所有评论
      let allComments = [];
      posts.forEach(post => {
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach(comment => {
            allComments.push({
              ...comment,
              postId: post.id,
              postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '')
            });
          });
        }
      });
      
      // 搜索功能
      if (search) {
        allComments = allComments.filter(comment => 
          comment.content.toLowerCase().includes(search.toLowerCase()) ||
          (comment.username && comment.username.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // 按时间倒序排序
      allComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedComments = allComments.slice(startIndex, endIndex);
      
      res.json(generateSuccessResponse({
        comments: paginatedComments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(allComments.length / limit),
          totalComments: allComments.length,
          hasNext: endIndex < allComments.length,
          hasPrev: startIndex > 0
        }
      }));
    } catch (error) {
      logger.logError('管理员获取评论失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 删除评论
  deleteComment(req, res) {
    try {
      const commentId = req.params.id;
      const { adminId, postId, reason } = req.body;
      
      if (!adminId || !postId) {
        return res.status(400).json(generateErrorResponse('管理员ID和帖子ID不能为空'));
      }
      
      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId);
      
      if (postIndex === -1) {
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }
      
      const post = posts[postIndex];
      const commentIndex = post.comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json(generateErrorResponse('评论不存在'));
      }
      
      const deletedComment = post.comments[commentIndex];
      
      // 删除评论
      post.comments.splice(commentIndex, 1);
      writeData(POSTS_FILE, posts);
      
      // 更新用户评论数
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === deletedComment.userId);
      if (userIndex !== -1) {
        users[userIndex].commentCount = Math.max(0, (users[userIndex].commentCount || 0) - 1);
        writeData(USERS_FILE, users);
      }
      
      // 发送系统通知给评论作者
      const notificationController = require('./notificationController');
      notificationController.createCommentDeletedNotification(postId, commentId, deletedComment.userId, reason, adminId);
      
      res.json(generateSuccessResponse({}, '评论已删除'));
    } catch (error) {
      logger.logError('删除评论失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取日志
  getLogs(req, res) {
    try {
      const { page = 1, limit = 50, level, search, date } = req.query;

      logger.logInfo('管理员访问日志', { page, limit, level, search, date, ip: req.ip });

      const loggerUtil = require('../utils/logger');
      const logLines = loggerUtil.readLogs(date || null, 0); // 读取全部日志

      // 解析日志行
      let logs = logLines.map(line => {
        try {
          // 解析日志格式: [timestamp] [LEVEL] message | Data: {...}
          const match = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+?)(?:\s+\|\s+Data:\s+(.+))?$/);
          if (match) {
            const [, timestamp, logLevel, message, dataStr] = match;
            return {
              timestamp,
              level: logLevel,
              message: message.trim(),
              data: dataStr ? JSON.parse(dataStr) : null
            };
          }
          // 如果格式不匹配，返回一个简化对象
          return {
            timestamp: new Date().toISOString(),
            level: 'UNKNOWN',
            message: line,
            data: null
          };
        } catch (error) {
          // 解析失败时返回原始行
          return {
            timestamp: new Date().toISOString(),
            level: 'UNKNOWN',
            message: line,
            data: null
          };
        }
      });

      // 按级别过滤
      if (level && level !== 'ALL') {
        logs = logs.filter(log => log.level === level);
      }

      // 按关键词搜索
      if (search) {
        const searchLower = search.toLowerCase();
        logs = logs.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
        );
      }

      // 倒序排列（最新的在前）
      logs.reverse();

      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedLogs = logs.slice(startIndex, endIndex);

      res.json(generateSuccessResponse({
        logs: paginatedLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(logs.length / limit),
          totalLogs: logs.length,
          hasNext: endIndex < logs.length,
          hasPrev: startIndex > 0
        }
      }));
    } catch (error) {
      logger.logError('获取日志失败', { error: error.message, stack: error.stack });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 获取可用的日志日期列表
  getAvailableDates(req, res) {
    try {
      const loggerUtil = require('../utils/logger');
      const dates = loggerUtil.getAvailableLogDates();
      
      res.json(generateSuccessResponse({ dates }));
    } catch (error) {
      logger.logError('获取日志日期列表失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 清空指定日期的日志
  clearLogs(req, res) {
    try {
      const { adminId, date } = req.body;

      if (!adminId) {
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }

      logger.logSecurityEvent('管理员清空日志', { adminId, date, ip: req.ip });

      const loggerUtil = require('../utils/logger');
      loggerUtil.clearLogs(date || null);

      logger.logSystemEvent('日志已清空', { adminId, date });

      res.json(generateSuccessResponse({}, '日志已清空'));
    } catch (error) {
      logger.logError('清空日志失败', { error: error.message, adminId: req.body.adminId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员功能 - 删除指定日期的日志文件
  deleteLogsByDate(req, res) {
    try {
      const { adminId, date } = req.body;

      if (!adminId) {
        return res.status(400).json(generateErrorResponse('管理员ID不能为空'));
      }

      if (!date) {
        return res.status(400).json(generateErrorResponse('日期不能为空'));
      }

      logger.logSecurityEvent('管理员删除日志文件', { adminId, date, ip: req.ip });

      const loggerUtil = require('../utils/logger');
      const success = loggerUtil.deleteLogs(date);

      if (success) {
        logger.logSystemEvent('日志文件已删除', { adminId, date });
        res.json(generateSuccessResponse({}, '日志文件已删除'));
      } else {
        res.status(404).json(generateErrorResponse('日志文件不存在'));
      }
    } catch (error) {
      logger.logError('删除日志文件失败', { error: error.message, adminId: req.body.adminId, date: req.body.date });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = adminController;