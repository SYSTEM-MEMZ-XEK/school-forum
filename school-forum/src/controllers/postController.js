const { v4: uuidv4 } = require('uuid');
const {
  readData,
  writeData
} = require('../utils/dataUtils');
const {
  validatePostContent,
  validateCommentContent
} = require('../utils/authUtils');
const {
  userExists,
  isUserActive,
  postExists,
  commentExists,
  canDeleteComment,
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { processUploadedFiles } = require('../middleware/uploadMiddleware');
const { PAGINATION_CONFIG, CONTENT_LIMITS } = require('../config/constants');
const { USERS_FILE, POSTS_FILE, DELETED_POSTS_FILE } = require('../config/constants');
const logger = require('../utils/logger');
const { addActivity } = require('../utils/levelSystem');
const notificationController = require('./notificationController');

const postController = {
  // 获取帖子列表（支持分页和搜索）
  getPosts(req, res) {
    try {
      const { page = PAGINATION_CONFIG.defaultPage, limit = PAGINATION_CONFIG.defaultLimit, search = '' } = req.query;

      // 记录访问日志
      logger.logInfo('获取帖子列表', {
        page,
        limit,
        search: search || '无',
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      
      let filteredPosts = posts.filter(post => !post.isDeleted);
      
      // 搜索功能
      if (search) {
        filteredPosts = filteredPosts.filter(post => 
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // 为每个帖子添加用户头像和等级信息
      const postsWithAvatar = filteredPosts.map(post => {
        const user = users.find(u => u.id === post.userId);
        return {
          ...post,
          userAvatar: user && user.avatar ? user.avatar : null,
          userLevel: user ? (user.level || 1) : 1
        };
      });
      
      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedPosts = postsWithAvatar.slice(startIndex, endIndex);
      
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
      logger.logError('获取帖子列表失败', { error: error.message, query: req.query });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取单个帖子详情
  getPostById(req, res) {
    try {
      const postId = req.params.id;

      // 记录访问帖子详情日志
      logger.logInfo('访问帖子详情', {
        postId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      const post = posts.find(p => p.id === postId && !p.isDeleted);

      if (!post) {
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      // 获取用户头像信息
      const user = users.find(u => u.id === post.userId);

      res.json(generateSuccessResponse({
        post: {
          ...post,
          userAvatar: user && user.avatar ? user.avatar : null
        }
      }));
    } catch (error) {
      logger.logError('获取帖子详情失败', { error: error.message, postId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 增加帖子浏览量
  incrementViewCount(req, res) {
    try {
      const postId = req.params.id;

      logger.logInfo('增加帖子浏览量', {
        postId,
        ip: req.ip
      });

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);

      if (postIndex === -1) {
        logger.logWarn('增加浏览量失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      // 增加浏览量
      const oldViewCount = posts[postIndex].viewCount || 0;
      posts[postIndex].viewCount = oldViewCount + 1;
      writeData(POSTS_FILE, posts);

      logger.logInfo('浏览量已更新', {
        postId,
        oldViewCount,
        newViewCount: posts[postIndex].viewCount
      });

      res.json(generateSuccessResponse({
        viewCount: posts[postIndex].viewCount
      }));
    } catch (error) {
      logger.logError('增加浏览量失败', { error: error.message, postId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 发布新帖子
  async createPost(req, res) {
    try {
      const { userId, username, school, grade, className, content, anonymous } = req.body;
      
      if (!userId || !username || !school || !grade || !className) {
        return res.status(400).json(generateErrorResponse('请填写所有必填字段'));
      }
      
      // 处理上传的图片
      const images = processUploadedFiles(req.files);
      
      // 验证逻辑：如果有图片，允许内容为空；如果没有图片，需要验证内容
      if (images.length === 0) {
        // 没有图片时，需要验证文本内容
        if (!content) {
          return res.status(400).json(generateErrorResponse('帖子内容不能为空'));
        }
        
        // 验证帖子内容
        const contentErrors = validatePostContent(content);
        if (contentErrors.length > 0) {
          return res.status(400).json(generateErrorResponse(contentErrors[0]));
        }
        
        // 检查内容是否只包含空白字符
        if (content.trim().length === 0) {
          return res.status(400).json(generateErrorResponse('帖子内容不能为空或只包含空白字符'));
        }
      } else {
        // 有图片时，如果提供了内容，验证内容长度
        if (content && content.length > 0) {
          const contentErrors = validatePostContent(content);
          if (contentErrors.length > 0) {
            return res.status(400).json(generateErrorResponse(contentErrors[0]));
          }
        }
      }
      
      // 验证用户是否存在且活跃
      if (!userExists(userId)) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      if (!isUserActive(userId)) {
        return res.status(403).json(generateErrorResponse('账号已被禁用，无法发帖'));
      }
      
      // 创建新帖子
      const posts = readData(POSTS_FILE);
      const users = readData(USERS_FILE);
      const isAnonymous = anonymous === 'true';
      
      const newPost = {
        id: uuidv4(),
        userId,
        username: isAnonymous ? '匿名用户' : username,
        school: isAnonymous ? '' : school,
        grade: isAnonymous ? '' : grade,
        className: isAnonymous ? '' : className,
        content,
        anonymous: isAnonymous,
        images: images,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        comments: [],
        viewCount: 0,
        isDeleted: false
      };
      
      posts.unshift(newPost);
      writeData(POSTS_FILE, posts);

      // 更新用户发帖数和活跃度
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].postCount = (users[userIndex].postCount || 0) + 1;
        
        // 增加活跃度（发布帖子+1活跃度）
        const updatedUser = addActivity(users[userIndex], 1);
        users[userIndex].activity = updatedUser.activity;
        users[userIndex].level = updatedUser.level;
        
        writeData(USERS_FILE, users);
        
        // 如果用户升级了，记录日志
        if (updatedUser.levelUp) {
          logger.logUserAction('用户升级', userId, username, {
            newLevel: updatedUser.level,
            activity: updatedUser.activity
          });
        }
      }

      // 记录发帖日志
      logger.logUserAction('发布帖子', userId, username, {
        postId: newPost.id,
        anonymous: isAnonymous,
        hasImages: images.length > 0,
        imageCount: images.length,
        contentLength: content ? content.length : 0
      });

      res.status(201).json(generateSuccessResponse({ post: newPost }, '帖子发布成功'));
    } catch (error) {
      logger.logError('发布帖子失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 点赞帖子
  likePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        logger.logWarn('点赞失败：用户ID为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);

      if (postIndex === -1) {
        logger.logWarn('点赞失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const post = posts[postIndex];
      const userIndex = post.likedBy.indexOf(userId);

      // 如果用户已经点赞，则取消点赞
      if (userIndex !== -1) {
        post.likes = Math.max(0, post.likes - 1);
        post.likedBy.splice(userIndex, 1);

        logger.logUserAction('取消点赞', userId, post.userId, {
          postId,
          currentLikes: post.likes
        });
      } else {
        // 否则添加点赞
        post.likes += 1;
        post.likedBy.push(userId);

        logger.logUserAction('点赞帖子', userId, post.userId, {
          postId,
          currentLikes: post.likes
        });
      }

      writeData(POSTS_FILE, posts);

      // 如果是点赞操作（不是取消点赞），创建通知
      if (userIndex === -1) {
        notificationController.createLikeNotification(postId, userId, post.userId);
      }

      res.json(generateSuccessResponse({
        likes: post.likes,
        liked: userIndex === -1
      }, userIndex === -1 ? '点赞成功' : '取消点赞成功'));
    } catch (error) {
      logger.logError('点赞操作失败', { error: error.message, postId: req.params.id, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 添加评论
  addComment(req, res) {
    try {
      const postId = req.params.id;
      const { userId, username, content, anonymous } = req.body;

      if (!userId || !username || !content) {
        logger.logWarn('添加评论失败：缺少必要参数', { postId, userId });
        return res.status(400).json(generateErrorResponse('用户ID、用户名和评论内容不能为空'));
      }

      // 验证评论内容
      const contentErrors = validateCommentContent(content);
      if (contentErrors.length > 0) {
        logger.logWarn('添加评论失败：内容验证失败', { postId, userId, error: contentErrors[0] });
        return res.status(400).json(generateErrorResponse(contentErrors[0]));
      }

      // 验证用户是否存在且活跃
      if (!userExists(userId)) {
        logger.logWarn('添加评论失败：用户不存在', { userId });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      if (!isUserActive(userId)) {
        logger.logSecurityEvent('封禁用户尝试评论', { userId, postId });
        return res.status(403).json(generateErrorResponse('账号已被封禁，无法评论'));
      }

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);

      if (postIndex === -1) {
        logger.logWarn('添加评论失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const post = posts[postIndex];
      const isAnonymous = anonymous === true || anonymous === 'true';

      const newComment = {
        id: uuidv4(),
        userId,
        username: isAnonymous ? '匿名同学' : username,
        content,
        anonymous: isAnonymous,
        timestamp: new Date().toISOString()
      };

      if (!post.comments) {
        post.comments = [];
      }

      post.comments.unshift(newComment);
      writeData(POSTS_FILE, posts);

      // 更新用户评论数和活跃度
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].commentCount = (users[userIndex].commentCount || 0) + 1;
        
        // 增加活跃度（发布评论+1活跃度）
        const updatedUser = addActivity(users[userIndex], 1);
        users[userIndex].activity = updatedUser.activity;
        users[userIndex].level = updatedUser.level;
        
        writeData(USERS_FILE, users);
        
        // 如果用户升级了，记录日志
        if (updatedUser.levelUp) {
          logger.logUserAction('用户升级', userId, username, {
            newLevel: updatedUser.level,
            activity: updatedUser.activity
          });
        }
      }

      // 记录添加评论日志
      logger.logUserAction('添加评论', userId, username, {
        postId,
        commentId: newComment.id,
        anonymous: isAnonymous,
        contentLength: content.length
      });
      
      // 创建评论通知
      notificationController.createCommentNotification(postId, userId, content, post.userId);
      
      res.status(201).json(generateSuccessResponse({ comment: newComment }, '评论添加成功'));
    } catch (error) {
      logger.logError('评论操作失败', { error: error.message, postId: req.params.id, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 删除评论
  deleteComment(req, res) {
    try {
      const { id: postId, commentId } = req.params;
      const { userId, replyId, nestedReplyId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);
      
      if (postIndex === -1) {
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }
      
      const post = posts[postIndex];
      const commentIndex = post.comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json(generateErrorResponse('评论不存在'));
      }
      
      const comment = post.comments[commentIndex];
      
      // 如果提供了 nestedReplyId，则删除嵌套回复（二级回复）
      if (nestedReplyId) {
        if (!replyId) {
          return res.status(400).json(generateErrorResponse('必须提供 replyId'));
        }
        
        if (!comment.replies || !Array.isArray(comment.replies)) {
          return res.status(404).json(generateErrorResponse('回复不存在'));
        }
        
        const parentReply = comment.replies.find(r => r.id === replyId);
        if (!parentReply) {
          return res.status(404).json(generateErrorResponse('回复不存在'));
        }
        
        if (!parentReply.replies || !Array.isArray(parentReply.replies)) {
          return res.status(404).json(generateErrorResponse('嵌套回复不存在'));
        }
        
        const nestedReplyIndex = parentReply.replies.findIndex(r => r.id === nestedReplyId);
        if (nestedReplyIndex === -1) {
          return res.status(404).json(generateErrorResponse('嵌套回复不存在'));
        }
        
        const nestedReply = parentReply.replies[nestedReplyIndex];
        
        // 检查权限：只有嵌套回复作者或帖子作者可以删除
        if (nestedReply.userId !== userId && post.userId !== userId) {
          return res.status(403).json(generateErrorResponse('无权限删除此回复'));
        }
        
        parentReply.replies.splice(nestedReplyIndex, 1);
        writeData(POSTS_FILE, posts);
        
        return res.json(generateSuccessResponse({}, '嵌套回复删除成功'));
      }
      
      // 如果提供了 replyId，则删除回复（一级回复）
      if (replyId) {
        if (!comment.replies || !Array.isArray(comment.replies)) {
          return res.status(404).json(generateErrorResponse('回复不存在'));
        }
        
        const replyIndex = comment.replies.findIndex(r => r.id === replyId);
        if (replyIndex === -1) {
          return res.status(404).json(generateErrorResponse('回复不存在'));
        }
        
        const reply = comment.replies[replyIndex];
        
        // 检查权限：只有回复作者或帖子作者可以删除回复
        if (reply.userId !== userId && post.userId !== userId) {
          return res.status(403).json(generateErrorResponse('无权限删除此回复'));
        }
        
        comment.replies.splice(replyIndex, 1);
        writeData(POSTS_FILE, posts);
        
        return res.json(generateSuccessResponse({}, '回复删除成功'));
      }
      
      // 否则删除评论
      // 检查权限：只有评论作者或帖子作者可以删除评论
      if (!canDeleteComment(comment, post, userId)) {
        return res.status(403).json(generateErrorResponse('无权限删除此评论'));
      }
      
      post.comments.splice(commentIndex, 1);
      writeData(POSTS_FILE, posts);
      
      res.json(generateSuccessResponse({}, '评论删除成功'));
    } catch (error) {
      logger.logError('删除评论失败', { error: error.message, postId: req.params.id, commentId: req.params.commentId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户删除自己的帖子
  deletePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        logger.logWarn('删除帖子失败：用户ID为空', { postId });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);

      if (postIndex === -1) {
        logger.logWarn('删除帖子失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const post = posts[postIndex];

      // 检查权限：只有帖子作者可以删除自己的帖子
      if (post.userId !== userId) {
        logger.logSecurityEvent('删除帖子失败：权限不足', {
          postId,
          postUserId: post.userId,
          requestUserId: userId
        });
        return res.status(403).json(generateErrorResponse('无权限删除此帖子'));
      }
      
      // 标记帖子为已删除（软删除）
      posts[postIndex].isDeleted = true;
      posts[postIndex].deletedAt = new Date().toISOString();
      posts[postIndex].deletedBy = userId;

      writeData(POSTS_FILE, posts);

      // 更新用户发帖数
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].postCount = Math.max(0, (users[userIndex].postCount || 0) - 1);
        writeData(USERS_FILE, users);
      }

      // 记录删除帖子日志
      logger.logUserAction('删除帖子', userId, post.username, {
        postId,
        postAuthor: post.username,
        deleteReason: '用户自行删除'
      });

      // 记录删除操作到备份文件
      try {
        const deletedPosts = readData(DELETED_POSTS_FILE);
        deletedPosts.unshift({
          ...post,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
          reason: '用户自行删除',
          permanentDelete: false
        });
        writeData(DELETED_POSTS_FILE, deletedPosts);
      } catch (backupError) {
        logger.logError('备份删除记录失败', { error: backupError.message, postId });
      }
      
      res.json(generateSuccessResponse({}, '帖子删除成功'));
    } catch (error) {
      console.error('删除帖子错误:', error);
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 回复评论
  replyComment(req, res) {
    try {
      const { id: postId, commentId } = req.params;
      const { userId, username, content, anonymous, replyToId } = req.body;

      if (!userId || !username || !content) {
        logger.logWarn('回复评论失败：缺少必要参数', { postId, commentId, userId });
        return res.status(400).json(generateErrorResponse('用户ID、用户名和回复内容不能为空'));
      }

      // 验证评论内容
      const contentErrors = validateCommentContent(content);
      if (contentErrors.length > 0) {
        logger.logWarn('回复评论失败：内容验证失败', { postId, commentId, userId, error: contentErrors[0] });
        return res.status(400).json(generateErrorResponse(contentErrors[0]));
      }

      // 验证用户是否存在且活跃
      if (!userExists(userId)) {
        logger.logWarn('回复评论失败：用户不存在', { userId });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      if (!isUserActive(userId)) {
        logger.logSecurityEvent('封禁用户尝试回复评论', { userId, postId, commentId });
        return res.status(403).json(generateErrorResponse('账号已被封禁，无法回复'));
      }

      const posts = readData(POSTS_FILE);
      const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);

      if (postIndex === -1) {
        logger.logWarn('回复评论失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const post = posts[postIndex];
      const commentIndex = post.comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json(generateErrorResponse('评论不存在'));
      }
      
      const comment = post.comments[commentIndex];
      const isAnonymous = anonymous === true || anonymous === 'true';
      
      // 辅助函数：获取回复的层级（用于调试，不限制层级）
      const getReplyLevel = (replies, targetId, level = 0) => {
        if (!replies || replies.length === 0) {
          return level;
        }
        
        for (let reply of replies) {
          if (reply.id === targetId) {
            return level + 1;
          }
          if (reply.replies && reply.replies.length > 0) {
            const foundLevel = getReplyLevel(reply.replies, targetId, level + 1);
            if (foundLevel > 0) {
              return foundLevel;
            }
          }
        }
        
        return level;
      };
      
      // 允许无限嵌套回复
      
      // 创建回复
      const newReply = {
        id: uuidv4(),
        userId,
        username: isAnonymous ? '匿名同学' : username,
        content,
        anonymous: isAnonymous,
        replyTo: replyToId || null, // 回复的目标ID
        timestamp: new Date().toISOString()
      };
      
      // 查找回复的辅助函数
      const findReply = (replies, targetId) => {
        if (!replies || !Array.isArray(replies)) {
          return null;
        }
        
        for (let reply of replies) {
          if (reply.id === targetId) {
            return reply;
          }
          if (reply.replies && reply.replies.length > 0) {
            const found = findReply(reply.replies, targetId);
            if (found) {
              return found;
            }
          }
        }
        
        return null;
      };
      
      let targetUserId = comment.userId; // 默认通知评论作者
      
      // 如果回复的是回复
      if (replyToId) {
        const targetReply = findReply(comment.replies, replyToId);
        if (!targetReply) {
          return res.status(404).json(generateErrorResponse('被回复的回复不存在'));
        }
        
        targetUserId = targetReply.userId; // 通知被回复的回复作者
        
        // 直接将新回复添加到被回复的回复的回复列表中
        if (!targetReply.replies) {
          targetReply.replies = [];
        }
        targetReply.replies.push(newReply);
      } else {
        // 回复评论，添加到评论的回复列表中
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push(newReply);
      }
      
      writeData(POSTS_FILE, posts);
      
      // 更新用户评论数和活跃度
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].commentCount = (users[userIndex].commentCount || 0) + 1;
        
        // 增加活跃度（回复评论+1活跃度）
        const updatedUser = addActivity(users[userIndex], 1);
        users[userIndex].activity = updatedUser.activity;
        users[userIndex].level = updatedUser.level;
        
        writeData(USERS_FILE, users);
        
        // 如果用户升级了，记录日志
        if (updatedUser.levelUp) {
          logger.logUserAction('用户升级', userId, username, {
            newLevel: updatedUser.level,
            activity: updatedUser.activity
          });
        }
      }

      // 记录回复评论日志
      logger.logUserAction('回复评论', userId, username, {
        postId,
        commentId,
        replyToId,
        isAnonymous,
        contentLength: content.length
      });

      // 创建回复通知
      notificationController.createCommentReplyNotification(postId, commentId, userId, content, targetUserId);

      res.status(201).json(generateSuccessResponse({ reply: newReply }, '回复添加成功'));
    } catch (error) {
      logger.logError('回复评论失败', { error: error.message, postId: req.params.id, commentId: req.params.commentId, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },
};

module.exports = postController;