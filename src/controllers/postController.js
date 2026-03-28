const { v4: uuidv4 } = require('uuid');
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getUsers,
  getUserById,
  updateUser,
  Post
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
const { getPaginationConfig, getContentLimits } = require('../config/constants');
const logger = require('../utils/logger');
const notificationController = require('./notificationController');
const Favorite = require('../models/Favorite');

const postController = {
  // 获取帖子列表（支持分页、搜索和排序）
  async getPosts(req, res) {
    try {
      const paginationConfig = getPaginationConfig();
      const { page = paginationConfig.defaultPage, limit = paginationConfig.defaultLimit, search = '', sortBy = 'latest' } = req.query;

      // 记录访问日志
      logger.logInfo('获取帖子列表', {
        page,
        limit,
        search: search || '无',
        sortBy,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      const posts = await getPosts();
      const users = await getUsers();
      
      let filteredPosts = posts.filter(post => !post.isDeleted);
      
      // 搜索功能
      if (search) {
        filteredPosts = filteredPosts.filter(post => 
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
        );
        
        // 搜索结果排序功能
        // 先获取所有帖子的收藏数（用于综合排序和收藏数排序）
        const postIds = filteredPosts.map(p => p.id);
        const favoriteCounts = await Favorite.aggregate([
          { $match: { postId: { $in: postIds } } },
          { $group: { _id: '$postId', count: { $sum: 1 } } }
        ]);
        
        // 创建收藏数映射
        const favoriteMap = {};
        favoriteCounts.forEach(item => {
          favoriteMap[item._id] = item.count;
        });
        
        // 添加收藏数到帖子对象
        filteredPosts = filteredPosts.map(post => ({
          ...post,
          favoriteCount: favoriteMap[post.id] || 0
        }));
        
        // 计算热度分数（用于综合排序）
        const calculateHotScore = (post) => {
          const likes = post.likes || 0;
          const favorites = post.favoriteCount || 0;
          const views = post.viewCount || 0;
          const comments = post.comments ? post.comments.length : 0;
          
          // 时间衰减因子：帖子越新，权重越高
          const postDate = new Date(post.timestamp);
          const now = new Date();
          const daysSincePost = Math.max(0, (now - postDate) / (1000 * 60 * 60 * 24));
          const timeDecay = Math.exp(-daysSincePost / 7); // 7天衰减周期
          
          // 综合热度 = 点赞*3 + 收藏*4 + 评论*5 + 浏览*0.1，再乘以时间衰减
          const hotScore = (likes * 3 + favorites * 4 + comments * 5 + views * 0.1) * timeDecay;
          return hotScore;
        };
        
        const sortFunctions = {
          // 综合：结合点赞、收藏、浏览、评论的综合热度排序
          relevance: (a, b) => calculateHotScore(b) - calculateHotScore(a),
          // 最新发布：按时间排序
          latest: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
          // 点赞数排序（降序）
          likes: (a, b) => (b.likes || 0) - (a.likes || 0),
          // 收藏数排序（降序）
          favorites: (a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0),
          // 浏览量排序（降序）
          views: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
          // 评论数排序（降序）
          comments: (a, b) => {
            const aComments = a.comments ? a.comments.length : 0;
            const bComments = b.comments ? b.comments.length : 0;
            return bComments - aComments;
          }
        };
        
        const sortFunction = sortFunctions[sortBy] || sortFunctions.latest;
        filteredPosts.sort(sortFunction);
        
        logger.logInfo('搜索结果排序', { 
          search, 
          sortBy, 
          resultCount: filteredPosts.length,
          topPosts: filteredPosts.slice(0, 3).map(p => ({
            id: p.id,
            likes: p.likes,
            favoriteCount: p.favoriteCount,
            viewCount: p.viewCount,
            commentCount: p.comments ? p.comments.length : 0
          }))
        });
      } else {
        // 没有搜索时，按时间排序（最新在前）
        filteredPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      
      // 为每个帖子添加用户头像信息
      const postsWithAvatar = filteredPosts.map(post => {
        const user = users.find(u => u.id === post.userId);
        return {
          ...post,
          userAvatar: user && user.avatar ? user.avatar : null
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
  async getPostById(req, res) {
    try {
      const postId = req.params.id;

      // 记录访问帖子详情日志
      logger.logInfo('访问帖子详情', {
        postId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      // 获取用户头像信息
      const user = await getUserById(post.userId);

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
  async incrementViewCount(req, res) {
    try {
      const postId = req.params.id;

      logger.logInfo('增加帖子浏览量', {
        postId,
        ip: req.ip
      });

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('增加浏览量失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      // 增加浏览量
      const oldViewCount = post.viewCount || 0;
      await updatePost(postId, { viewCount: oldViewCount + 1 });

      logger.logInfo('浏览量已更新', {
        postId,
        oldViewCount,
        newViewCount: oldViewCount + 1
      });

      res.json(generateSuccessResponse({
        viewCount: oldViewCount + 1
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
      if (!await userExists(userId)) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      if (!await isUserActive(userId)) {
        return res.status(403).json(generateErrorResponse('账号已被禁用，无法发帖'));
      }
      
      // 创建新帖子
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
      
      await createPost(newPost);

      // 更新用户发帖数
      const user = await getUserById(userId);
      if (user) {
        await updateUser(userId, { postCount: (user.postCount || 0) + 1 });
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
  async likePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        logger.logWarn('点赞失败：用户ID为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('点赞失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const likedBy = post.likedBy || [];
      const dislikedBy = post.dislikedBy || [];
      const userIndex = likedBy.indexOf(userId);
      const userDislikeIndex = dislikedBy.indexOf(userId);

      let newLikes, newLikedBy, newDislikes, newDislikedBy, liked;
      
      // 如果用户已经点踩，先取消点踩
      if (userDislikeIndex !== -1) {
        newDislikes = Math.max(0, (post.dislikes || 0) - 1);
        newDislikedBy = dislikedBy.filter(id => id !== userId);
      } else {
        newDislikes = post.dislikes || 0;
        newDislikedBy = dislikedBy;
      }
      
      // 如果用户已经点赞，则取消点赞
      if (userIndex !== -1) {
        newLikes = Math.max(0, post.likes - 1);
        newLikedBy = likedBy.filter(id => id !== userId);
        liked = false;

        logger.logUserAction('取消点赞', userId, post.userId, {
          postId,
          currentLikes: newLikes
        });
      } else {
        // 否则添加点赞
        newLikes = post.likes + 1;
        newLikedBy = [...likedBy, userId];
        liked = true;

        logger.logUserAction('点赞帖子', userId, post.userId, {
          postId,
          currentLikes: newLikes
        });
      }

      await updatePost(postId, { likes: newLikes, likedBy: newLikedBy, dislikes: newDislikes, dislikedBy: newDislikedBy });

      // 如果是点赞操作（不是取消点赞），创建通知
      if (liked) {
        notificationController.createLikeNotification(postId, userId, post.userId);
      }

      res.json(generateSuccessResponse({
        likes: newLikes,
        liked: liked,
        dislikes: newDislikes,
        disliked: false
      }, liked ? '点赞成功' : '取消点赞成功'));
    } catch (error) {
      logger.logError('点赞操作失败', { error: error.message, postId: req.params.id, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 点踩帖子
  async dislikePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        logger.logWarn('点踩失败：用户ID为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('点踩失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const likedBy = post.likedBy || [];
      const dislikedBy = post.dislikedBy || [];
      const userIndex = dislikedBy.indexOf(userId);
      const userLikeIndex = likedBy.indexOf(userId);

      let newDislikes, newDislikedBy, newLikes, newLikedBy, disliked;
      
      // 如果用户已经点赞，先取消点赞
      if (userLikeIndex !== -1) {
        newLikes = Math.max(0, post.likes - 1);
        newLikedBy = likedBy.filter(id => id !== userId);
      } else {
        newLikes = post.likes || 0;
        newLikedBy = likedBy;
      }
      
      // 如果用户已经点踩，则取消点踩
      if (userIndex !== -1) {
        newDislikes = Math.max(0, (post.dislikes || 0) - 1);
        newDislikedBy = dislikedBy.filter(id => id !== userId);
        disliked = false;

        logger.logUserAction('取消点踩', userId, post.userId, {
          postId,
          currentDislikes: newDislikes
        });
      } else {
        // 否则添加点踩
        newDislikes = (post.dislikes || 0) + 1;
        newDislikedBy = [...dislikedBy, userId];
        disliked = true;

        logger.logUserAction('点踩帖子', userId, post.userId, {
          postId,
          currentDislikes: newDislikes
        });
      }

      await updatePost(postId, { likes: newLikes, likedBy: newLikedBy, dislikes: newDislikes, dislikedBy: newDislikedBy });

      res.json(generateSuccessResponse({
        dislikes: newDislikes,
        disliked: disliked,
        likes: newLikes,
        liked: false
      }, disliked ? '点踩成功' : '取消点踩成功'));
    } catch (error) {
      logger.logError('点踩操作失败', { error: error.message, postId: req.params.id, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 添加评论
  async addComment(req, res) {
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
      if (!await userExists(userId)) {
        logger.logWarn('添加评论失败：用户不存在', { userId });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      if (!await isUserActive(userId)) {
        logger.logSecurityEvent('封禁用户尝试评论', { userId, postId });
        return res.status(403).json(generateErrorResponse('账号已被封禁，无法评论'));
      }

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('添加评论失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const isAnonymous = anonymous === true || anonymous === 'true';

      const newComment = {
        id: uuidv4(),
        userId,
        username: isAnonymous ? '匿名同学' : username,
        content,
        anonymous: isAnonymous,
        timestamp: new Date().toISOString()
      };

      const comments = post.comments || [];
      comments.unshift(newComment);

      await updatePost(postId, { comments });

      // 更新用户评论数
      const user = await getUserById(userId);
      if (user) {
        await updateUser(userId, { commentCount: (user.commentCount || 0) + 1 });
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
  async deleteComment(req, res) {
    try {
      const { id: postId, commentId } = req.params;
      const { userId, replyId, nestedReplyId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const post = await getPostById(postId);
      
      if (!post || post.isDeleted) {
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }
      
      const comments = post.comments || [];
      const commentIndex = comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json(generateErrorResponse('评论不存在'));
      }
      
      const comment = comments[commentIndex];
      
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
        await updatePost(postId, { comments });
        
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
        await updatePost(postId, { comments });
        
        return res.json(generateSuccessResponse({}, '回复删除成功'));
      }
      
      // 否则删除评论
      // 检查权限：只有评论作者或帖子作者可以删除评论
      if (!canDeleteComment(comment, post, userId)) {
        return res.status(403).json(generateErrorResponse('无权限删除此评论'));
      }
      
      comments.splice(commentIndex, 1);
      await updatePost(postId, { comments });
      
      res.json(generateSuccessResponse({}, '评论删除成功'));
    } catch (error) {
      logger.logError('删除评论失败', { error: error.message, postId: req.params.id, commentId: req.params.commentId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户删除自己的帖子
  async deletePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        logger.logWarn('删除帖子失败：用户ID为空', { postId });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const post = await getPostById(postId, true);

      if (!post || post.isDeleted) {
        logger.logWarn('删除帖子失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

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
      await deletePost(postId, userId, '用户自行删除');

      // 更新用户发帖数
      const user = await getUserById(userId);
      if (user) {
        await updateUser(userId, { postCount: Math.max(0, (user.postCount || 0) - 1) });
      }

      // 记录删除帖子日志
      logger.logUserAction('删除帖子', userId, post.username, {
        postId,
        postAuthor: post.username,
        deleteReason: '用户自行删除'
      });
      
      res.json(generateSuccessResponse({}, '帖子删除成功'));
    } catch (error) {
      console.error('删除帖子错误:', error);
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户编辑自己的帖子
  async updatePost(req, res) {
    try {
      const postId = req.params.id;
      const { userId, content, deletedImages } = req.body;

      if (!userId) {
        logger.logWarn('编辑帖子失败：用户ID为空', { postId });
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('编辑帖子失败：帖子不存在', { postId, userId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      // 检查权限：只有帖子作者可以编辑自己的帖子
      if (post.userId !== userId) {
        logger.logSecurityEvent('编辑帖子失败：权限不足', {
          postId,
          postUserId: post.userId,
          requestUserId: userId
        });
        return res.status(403).json(generateErrorResponse('无权限编辑此帖子'));
      }

      // 处理上传的新图片
      const newImages = processUploadedFiles(req.files);

      // 处理要删除的图片
      let currentImages = post.images || [];
      if (deletedImages) {
        try {
          const deletedImagesList = JSON.parse(deletedImages);
          currentImages = currentImages.filter(img => !deletedImagesList.includes(img.url));
        } catch (e) {
          logger.logError('解析删除图片列表失败', { error: e.message });
        }
      }

      // 合并图片
      const allImages = [...currentImages, ...newImages];

      // 验证内容
      if (allImages.length === 0) {
        if (!content || content.trim().length === 0) {
          return res.status(400).json(generateErrorResponse('帖子内容不能为空'));
        }
      }

      if (content && content.length > getContentLimits().post) {
        return res.status(400).json(generateErrorResponse(`帖子内容过长，最多${getContentLimits().post}个字符`));
      }

      // 更新帖子
      const updateData = {
        content: content || post.content,
        images: allImages,
        updatedAt: new Date().toISOString()
      };

      const updatedPost = await updatePost(postId, updateData);

      // 记录编辑帖子日志
      logger.logUserAction('编辑帖子', userId, post.username, {
        postId,
        contentLength: content ? content.length : 0,
        newImageCount: newImages.length,
        totalImageCount: allImages.length
      });

      res.json(generateSuccessResponse({ post: updatedPost }, '帖子编辑成功'));
    } catch (error) {
      logger.logError('编辑帖子失败', { error: error.message, postId: req.params.id, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 回复评论
  async replyComment(req, res) {
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
      if (!await userExists(userId)) {
        logger.logWarn('回复评论失败：用户不存在', { userId });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      if (!await isUserActive(userId)) {
        logger.logSecurityEvent('封禁用户尝试回复评论', { userId, postId, commentId });
        return res.status(403).json(generateErrorResponse('账号已被封禁，无法回复'));
      }

      const post = await getPostById(postId);

      if (!post || post.isDeleted) {
        logger.logWarn('回复评论失败：帖子不存在', { postId });
        return res.status(404).json(generateErrorResponse('帖子不存在'));
      }

      const comments = post.comments || [];
      const commentIndex = comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json(generateErrorResponse('评论不存在'));
      }
      
      const comment = comments[commentIndex];
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
      
      await updatePost(postId, { comments });
      
      // 更新用户评论数
      const user = await getUserById(userId);
      if (user) {
        await updateUser(userId, { commentCount: (user.commentCount || 0) + 1 });
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
