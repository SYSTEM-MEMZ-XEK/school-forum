// 工具函数模块
const utils = {
  // HTML 转义函数
  escapeHtml: function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 检测并转换危险 HTML 内容为 Markdown 代码块
  // 只检测可能导致 XSS 或破坏页面布局的危险标签
  // 允许安全的内联 HTML 标签（如 u, b, i, strong, em, span, a, img 等）
  detectAndEscapeHtml: function(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    // 危险 HTML 标签列表（可能导致 XSS 或破坏页面布局）
    // 这些标签应该被转义处理
    const dangerousTags = [
      'script', 'style', 'iframe', 'object', 'embed', 
      'form', 'input', 'button', 'select', 'textarea',
      'link', 'meta', 'base', 
      'svg', 'canvas', 'template', 'noscript',
      'frame', 'frameset', 'applet', 
      'basefont', 'bgsound', 'keygen', 'listing', 'plaintext', 'xmp'
    ].join('|');
    
    const dangerousTagPattern = new RegExp(`<(${dangerousTags})\\b[^>]*>`, 'i');
    
    // 检测是否包含危险 HTML 标签
    if (dangerousTagPattern.test(content)) {
      // 检测是否已经是代码块中的内容（避免重复处理）
      const codeBlockPattern = /^```[\s\S]*```$/;
      const isAlreadyCodeBlock = codeBlockPattern.test(content.trim());
      
      if (!isAlreadyCodeBlock) {
        // 将整个内容用 Markdown 代码块包裹
        return '```html\n' + content + '\n```';
      }
    }
    
    return content;
  },

  // 消息通知函数
  showNotification: function(message, type = 'info') {
    console.log('showNotification 被调用:', message, type);

    const notification = document.createElement('div');
    notification.className = `notification-message ${type}`;

    notification.innerHTML = `
      <i class="fas fa-${
        type === 'success' ? 'check-circle' :
        type === 'error' ? 'exclamation-circle' : 'info-circle'
      }"></i>
      <span>${message}</span>
    `;

    // 每次调用时重新获取 notificationArea
    let notificationArea = document.getElementById('notificationArea');

    // 如果 notificationArea 不存在，创建一个
    if (!notificationArea) {
      console.log('notificationArea 不存在，创建一个');
      notificationArea = document.createElement('div');
      notificationArea.id = 'notificationArea';
      notificationArea.className = 'notification-area';
      document.body.appendChild(notificationArea);
    }

    console.log('notificationArea 元素:', notificationArea);
    notificationArea.appendChild(notification);

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
      if (typeof postsManager !== 'undefined' && postsManager.loadPosts) postsManager.loadPosts();
      if (typeof statsManager !== 'undefined' && statsManager.loadStats) statsManager.loadStats();
    }, 60000); // 每1分钟刷新一次
  },

  // 时间格式化（相对时间）
  timeAgo: function(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) {
      return '刚刚';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}分钟前`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}小时前`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}天前`;
    }
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}周前`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}个月前`;
    }

    const years = Math.floor(days / 365);
    return `${years}年前`;
  }
};

// 确保 utils 对象在全局作用域中可用
window.utils = utils;

console.log('utils.js 加载完成，utils 对象:', utils);
console.log('window.utils:', window.utils);