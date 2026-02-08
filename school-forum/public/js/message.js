// 消息通知管理模块
const messageManager = {
  // 全局状态
  state: {
    notifications: [],
    currentFilter: 'all',
    initialized: false
  },

  // DOM元素
  dom: {
    notificationsContainer: document.getElementById('notifications-container'),
    emptyState: document.getElementById('empty-state'),
    unreadCount: document.getElementById('unread-count'),
    likeCount: document.getElementById('like-count'),
    commentCount: document.getElementById('comment-count'),
    systemCount: document.getElementById('system-count'),
    totalCount: document.getElementById('total-count'),
    markAllReadBtn: document.getElementById('mark-all-read-btn'),
    filterButtons: document.querySelectorAll('.filter-btn')
  },

  // 初始化
  init: function() {
    // 防止重复初始化
    if (this.state.initialized) {
      return;
    }
    
    this.setupEventListeners();
    this.loadNotifications();
    
    this.state.initialized = true;
  },

  // 设置事件监听器
  setupEventListeners: function() {
    // 标记所有为已读按钮
    if (this.dom.markAllReadBtn) {
      this.dom.markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
    }
    
    // 筛选按钮
    this.dom.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.setFilter(filter);
      });
    });
    
    // 全局点击事件监听
    document.addEventListener('click', (e) => {
      // 标记单个通知为已读
      if (e.target.closest('.notification-btn.mark-read')) {
        const btn = e.target.closest('.notification-btn.mark-read');
        const notificationId = btn.dataset.id;
        this.markAsRead(notificationId);
      }
      
      // 点击帖子标题跳转
      if (e.target.classList.contains('post-title')) {
        const postId = e.target.dataset.postId;
        if (postId) {
          // 在新标签页打开帖子
          window.open(`/post.html?id=${postId}`, '_blank');
        }
      }
    });
  },

  // 加载通知
  loadNotifications: async function() {
    const container = this.dom.notificationsContainer;
    if (!container) return;
    
    let currentUser = userManager.state.currentUser;
    
    // 如果userManager中没有用户信息，尝试从localStorage获取
    if (!currentUser) {
      const savedUser = localStorage.getItem('forumUser');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          // 验证用户数据格式
          if (!currentUser || !currentUser.id || !currentUser.username) {
            currentUser = null;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
          currentUser = null;
        }
      }
    }
    
    if (!currentUser) {
      utils.showNotification('请先登录后查看消息', 'error');
      window.location.href = 'login.html';
      return;
    }
    
    try {
      const response = await fetch(`/notifications?userId=${currentUser.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '加载通知失败');
      }
      
      const data = await response.json();
      if (data.success) {
        this.state.notifications = data.notifications || [];
        this.updateStatistics();
        this.renderNotifications();
      } else {
        throw new Error(data.message || '加载通知失败');
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      utils.showNotification(error.message || '加载通知失败', 'error');
      
      if (container) {
        container.innerHTML = '<div class="empty-state">通知加载失败，请稍后再试</div>';
      }
    }
  },

  // 更新统计信息
  updateStatistics: function() {
    const notifications = this.state.notifications;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    const likeCount = notifications.filter(n => n.type === 'like').length;
    const commentCount = notifications.filter(n => n.type === 'comment' || n.type === 'comment_reply').length;
    const systemCount = notifications.filter(n => n.type === 'system').length;
    const totalCount = notifications.length;
    
    if (this.dom.unreadCount) this.dom.unreadCount.textContent = unreadCount;
    if (this.dom.likeCount) this.dom.likeCount.textContent = likeCount;
    if (this.dom.commentCount) this.dom.commentCount.textContent = commentCount;
    if (this.dom.totalCount) this.dom.totalCount.textContent = totalCount;
    
    // 如果有系统消息统计元素，更新它
    if (this.dom.systemCount) this.dom.systemCount.textContent = systemCount;
  },

  // 设置筛选器
  setFilter: function(filter) {
    // 更新按钮状态
    this.dom.filterButtons.forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 更新状态并重新渲染
    this.state.currentFilter = filter;
    this.renderNotifications();
  },

  // 渲染通知
  renderNotifications: function() {
    const container = this.dom.notificationsContainer;
    const emptyState = this.dom.emptyState;
    if (!container) return;
    
    // 根据当前筛选器过滤通知
    let filteredNotifications = this.state.notifications;
    
    switch (this.state.currentFilter) {
      case 'unread':
        filteredNotifications = filteredNotifications.filter(n => !n.read);
        break;
      case 'like':
        filteredNotifications = filteredNotifications.filter(n => n.type === 'like');
        break;
      case 'comment':
        filteredNotifications = filteredNotifications.filter(n => n.type === 'comment' || n.type === 'comment_reply');
        break;
      case 'system':
        filteredNotifications = filteredNotifications.filter(n => n.type === 'system');
        break;
      case 'all':
      default:
        // 全部显示
        break;
    }
    
    // 按时间倒序排序
    filteredNotifications = [...filteredNotifications].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有通知，显示空状态
    if (filteredNotifications.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
      return;
    }
    
    // 隐藏空状态
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
    
    // 渲染每个通知
    filteredNotifications.forEach(notification => {
      const notificationElement = document.createElement('div');
      notificationElement.className = `notification-item ${notification.read ? '' : 'unread'}`;
      notificationElement.dataset.id = notification.id;
      
      // 根据类型设置图标和文本
      let iconClass, iconName, actionText, contentHtml = '';
      
      if (notification.type === 'like') {
        iconClass = 'like';
        iconName = 'fas fa-heart';
        actionText = '点赞了你的帖子';
        contentHtml = `<span class="post-title" data-post-id="${notification.postId}">"${this.escapeHtml(notification.postTitle)}"</span>`;
      } else if (notification.type === 'comment') {
        iconClass = 'comment';
        iconName = 'fas fa-comment';
        actionText = '评论了你的帖子';
        contentHtml = `
          <span class="post-title" data-post-id="${notification.postId}">"${this.escapeHtml(notification.postTitle)}"</span>
          ${notification.content ? `<div class="notification-comment">${this.escapeHtml(notification.content)}</div>` : ''}
        `;
      } else if (notification.type === 'comment_reply') {
        iconClass = 'comment';
        iconName = 'fas fa-reply';
        actionText = '回复了你的评论';
        contentHtml = `
          <span class="post-title" data-post-id="${notification.postId}">"${this.escapeHtml(notification.postTitle)}"</span>
          ${notification.content ? `<div class="notification-comment">${this.escapeHtml(notification.content)}</div>` : ''}
        `;
      } else if (notification.type === 'system') {
        // 系统消息
        iconClass = 'system';
        iconName = 'fas fa-exclamation-circle';
        
        if (notification.systemType === 'post_deleted') {
          actionText = '您的帖子已被删除';
          contentHtml = `
            <div class="notification-system-content">
              <div class="notification-system-reason">
                <strong>删除原因：</strong>${this.escapeHtml(notification.reason)}
              </div>
              <div class="notification-system-detail">
                <strong>帖子内容：</strong>${this.escapeHtml(notification.postTitle)}
              </div>
              <div class="notification-system-admin">
                <strong>操作管理员：</strong>${this.escapeHtml(notification.adminName)}
              </div>
            </div>
          `;
        } else if (notification.systemType === 'comment_deleted') {
          actionText = '您的评论已被删除';
          contentHtml = `
            <div class="notification-system-content">
              <div class="notification-system-reason">
                <strong>删除原因：</strong>${this.escapeHtml(notification.reason)}
              </div>
              <div class="notification-system-detail">
                <strong>所属帖子：</strong>${this.escapeHtml(notification.postTitle)}
              </div>
              <div class="notification-system-admin">
                <strong>操作管理员：</strong>${this.escapeHtml(notification.adminName)}
              </div>
            </div>
          `;
        } else if (notification.systemType === 'account_banned') {
          actionText = '您的账号已被封禁';
          const banEndTime = notification.banEndTime ? new Date(notification.banEndTime) : null;
          const isPermanent = !banEndTime || banEndTime.getFullYear() > 2100;
          const banDurationText = isPermanent ? '永久封禁' : `封禁至 ${banEndTime.toLocaleDateString('zh-CN')}`;
          
          contentHtml = `
            <div class="notification-system-content">
              <div class="notification-system-reason">
                <strong>封禁原因：</strong>${this.escapeHtml(notification.reason)}
              </div>
              <div class="notification-system-detail">
                <strong>封禁时长：</strong>${banDurationText}
              </div>
              <div class="notification-system-admin">
                <strong>操作管理员：</strong>${this.escapeHtml(notification.adminName)}
              </div>
            </div>
          `;
        }
      }
      
      // 格式化时间
      const timeAgo = utils.timeAgo(notification.timestamp);
      
      // 构建HTML
      notificationElement.innerHTML = `
        <div class="notification-icon ${iconClass}">
          <i class="${iconName}"></i>
        </div>
        <div class="notification-content">
          ${notification.type !== 'system' ? `
            <div class="notification-user">${this.escapeHtml(notification.fromUsername)}</div>
          ` : `
            <div class="notification-user system-message">系统消息</div>
          `}
          <div class="notification-text">
            ${actionText}
            ${contentHtml}
          </div>
          <div class="notification-time">
            <i class="far fa-clock"></i> ${timeAgo}
          </div>
        </div>
        <div class="notification-actions">
          ${!notification.read ? `
            <button class="notification-btn mark-read" data-id="${notification.id}" title="标记为已读">
              <i class="fas fa-check"></i>
            </button>
          ` : ''}
        </div>
        ${!notification.read ? `<div class="unread-badge"></div>` : ''}
      `;
      
      container.appendChild(notificationElement);
    });
  },

  // 标记单个通知为已读
  markAsRead: async function(notificationId) {
    let currentUser = userManager.state.currentUser;
    
    // 如果userManager中没有用户信息，尝试从localStorage获取
    if (!currentUser) {
      const savedUser = localStorage.getItem('forumUser');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          // 验证用户数据格式
          if (!currentUser || !currentUser.id || !currentUser.username) {
            currentUser = null;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
          currentUser = null;
        }
      }
    }
    
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }
      
      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        const notificationIndex = this.state.notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
          this.state.notifications[notificationIndex].read = true;
        }
        
        // 更新UI
        this.updateStatistics();
        this.renderNotifications();
        
        utils.showNotification('通知已标记为已读', 'success');
      }
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      utils.showNotification(error.message || '操作失败', 'error');
    }
  },

  // 标记所有通知为已读
  markAllAsRead: async function() {
    let currentUser = userManager.state.currentUser;
    
    // 如果userManager中没有用户信息，尝试从localStorage获取
    if (!currentUser) {
      const savedUser = localStorage.getItem('forumUser');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          // 验证用户数据格式
          if (!currentUser || !currentUser.id || !currentUser.username) {
            currentUser = null;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
          currentUser = null;
        }
      }
    }
    
    if (!currentUser) return;
    
    // 确认操作
    if (!confirm('确定要标记所有通知为已读吗？')) {
      return;
    }
    
    try {
      const response = await fetch('/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }
      
      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        this.state.notifications.forEach(notification => {
          if (notification.userId === currentUser.id) {
            notification.read = true;
          }
        });
        
        // 更新UI
        this.updateStatistics();
        this.renderNotifications();
        
        utils.showNotification(`已标记${data.updatedCount || 0}条通知为已读`, 'success');
      }
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
      utils.showNotification(error.message || '操作失败', 'error');
    }
  },

  // HTML转义函数，防止XSS攻击
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};