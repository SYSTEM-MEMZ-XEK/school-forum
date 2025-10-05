// 工具函数模块
const utils = {
  // DOM元素
  dom: {
    notificationArea: document.getElementById('notificationArea')
  },

  // 消息通知函数
  showNotification: function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-message ${type}`;
    
    notification.innerHTML = `
      <i class="fas fa-${
        type === 'success' ? 'check-circle' : 
        type === 'error' ? 'exclamation-circle' : 'info-circle'
      }"></i>
      <span>${message}</span>
    `;
    
    if (this.dom.notificationArea) {
      this.dom.notificationArea.appendChild(notification);
      
      // 添加动画效果
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // 自动移除通知
      setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // 等待动画完成再移除元素
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
  },

  // 日期格式化函数
  formatDate: function(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    
    // 如果是今天，显示时间
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 显示完整日期
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 自动刷新
  startAutoRefresh: function() {
    setInterval(() => {
      if (postsManager.loadPosts) postsManager.loadPosts();
      if (statsManager.loadStats) statsManager.loadStats();
    }, 60000); // 每1分钟刷新一次
  }
};