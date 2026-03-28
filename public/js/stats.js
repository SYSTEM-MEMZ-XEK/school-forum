// 统计数据模块
const statsManager = {
  // DOM元素
  dom: {
    todayPosts: document.getElementById('today-posts'),
    totalUsers: document.getElementById('total-users'),
    totalPosts: document.getElementById('total-posts'),
    totalComments: document.getElementById('total-comments')
  },

  // 初始化
  init: function() {
    this.loadStats();
  },

  // 加载统计数据
  loadStats: async function() {
    try {
      const response = await fetch('/stats');
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const stats = data.stats;
        if (this.dom.todayPosts) this.dom.todayPosts.textContent = stats.todayPosts;
        if (this.dom.totalUsers) this.dom.totalUsers.textContent = stats.totalUsers;
        if (this.dom.totalPosts) this.dom.totalPosts.textContent = stats.totalPosts;
        if (this.dom.totalComments) this.dom.totalComments.textContent = stats.totalComments;
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      utils.showNotification('加载统计数据失败', 'error');
    }
  }
};