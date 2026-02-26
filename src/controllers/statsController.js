const { 
  getPosts,
  getUsers
} = require('../utils/dataUtils');
const { 
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { getPaginationConfig } = require('../config/constants');
const logger = require('../utils/logger');

const statsController = {
  // 获取统计数据
  async getStats(req, res) {
    try {
      const users = await getUsers();
      const posts = await getPosts();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate >= today && !post.isDeleted;
      });
      
      const activeUsers = users.filter(user => 
        user.lastLogin && new Date(user.lastLogin) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      
      const stats = {
        totalUsers: users.length,
        totalPosts: posts.filter(p => !p.isDeleted).length,
        todayPosts: todayPosts.length,
        totalComments: posts.reduce((sum, post) => 
          sum + (post.comments ? post.comments.length : 0), 0),
        totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
        activeUsers: activeUsers,
        anonymousPosts: posts.filter(p => p.anonymous && !p.isDeleted).length
      };
      
      res.json(generateSuccessResponse({ stats }));
    } catch (error) {
      logger.logError('获取统计失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 搜索功能
  async search(req, res) {
    try {
      const paginationConfig = getPaginationConfig();
      const { q, type = 'posts', page = paginationConfig.defaultPage, limit = paginationConfig.defaultLimit } = req.query;
      
      if (!q) {
        return res.status(400).json(generateErrorResponse('搜索关键词不能为空'));
      }
      
      if (type === 'posts') {
        const posts = await getPosts();
        const filteredPosts = posts.filter(post => 
          post.content.toLowerCase().includes(q.toLowerCase()) && !post.isDeleted
        );
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
        
        res.json(generateSuccessResponse({
          results: paginatedPosts,
          total: filteredPosts.length,
          type: 'posts'
        }));
      } else if (type === 'users') {
        const users = await getUsers();
        const filteredUsers = users.filter(user => 
          user.username.toLowerCase().includes(q.toLowerCase())
        ).map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        
        res.json(generateSuccessResponse({
          results: filteredUsers,
          total: filteredUsers.length,
          type: 'users'
        }));
      } else {
        return res.status(400).json(generateErrorResponse('不支持的搜索类型'));
      }
    } catch (error) {
      logger.logError('搜索失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = statsController;
