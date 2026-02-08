// 个人主页管理模块
const profileManager = {
  // 全局状态
  state: {
    userId: null,
    userData: null,
    userStats: null,
    userPosts: [],
    currentFilter: 'all'
  },

  // DOM元素
  dom: {
    profileAvatar: document.getElementById('profile-avatar'),
    profileUsername: document.getElementById('profile-username'),
    profileClass: document.getElementById('profile-class'),
    postCount: document.getElementById('post-count'),
    commentCount: document.getElementById('comment-count'),
    likeCount: document.getElementById('like-count'),
    joinDate: document.getElementById('join-date'),
    lastLogin: document.getElementById('last-login'),
    postsCount: document.getElementById('posts-count'),
    profilePostsContainer: document.getElementById('profile-posts-container'),
    noPostsMessage: document.getElementById('no-posts-message'),
    filterButtons: document.querySelectorAll('.filter-btn')
  },

  // 初始化
  init: function() {
    this.getUserIdFromURL();
    if (this.state.userId) {
      this.loadUserProfile();
      this.setupEventListeners();
      this.updateUserPanel();
    } else {
      this.showError('用户ID无效');
    }
  },

  // 从URL获取用户ID
  getUserIdFromURL: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (userId) {
      this.state.userId = userId;
    } else {
      // 如果没有用户ID，检查当前登录用户
      const currentUser = userManager.state.currentUser;
      if (currentUser) {
        this.state.userId = currentUser.id;
        // 更新URL但不刷新页面
        const newUrl = `${window.location.pathname}?id=${currentUser.id}`;
        window.history.replaceState({}, '', newUrl);
      } else {
        // 未登录且没有用户ID，重定向到首页
        utils.showNotification('请先登录或指定用户ID', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      }
    }
  },

  // 加载用户个人资料
  loadUserProfile: async function() {
    try {
      const response = await fetch(`/users/${this.state.userId}`);
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API返回的用户数据:', data); // 调试日志
      
      if (data.success) {
        this.state.userData = data.user;
        this.state.userStats = data.stats;
        this.state.userPosts = data.recentPosts || [];
        
        // 检查用户数据
        console.log('用户对象:', {
          id: data.user?.id,
          username: data.user?.username,
          activity: data.user?.activity,
          level: data.user?.level,
          postCount: data.user?.postCount,
          commentCount: data.user?.commentCount
        });
        
        this.renderUserProfile();
        this.renderUserPosts();
      } else {
        throw new Error(data.message || '加载用户资料失败');
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
      this.showError(error.message || '加载用户资料失败');
    }
  },

  // 渲染用户个人资料
  renderUserProfile: function() {
    const user = this.state.userData;
    if (!user) return;
    
    // 渲染头像
    if (user.avatar) {
      // 如果用户有头像，使用背景图片显示
      this.dom.profileAvatar.style.backgroundImage = `url(${user.avatar})`;
      this.dom.profileAvatar.style.backgroundSize = 'cover';
      this.dom.profileAvatar.style.backgroundPosition = 'center';
      this.dom.profileAvatar.innerHTML = '';
    } else {
      // 如果没有头像，显示班级名称首字母
      const avatarChar = user.className ? user.className.slice(0,1) : '?';
      this.dom.profileAvatar.style.backgroundImage = '';
      this.dom.profileAvatar.innerHTML = avatarChar;
    }
    
    // 渲染用户名（如果是管理员，添加管理员标识）
    this.dom.profileUsername.innerHTML = user.isAdmin ?
      `${user.username} <span style="color: #dc2626; margin-left: 8px; font-size: 14px;">管理员</span>` :
      user.username;
    
    // 渲染班级信息
    const gradeDisplay = user.grade === "已毕业" ? 
      `已毕业 · ${user.school} ${user.enrollmentYear}级 ${user.className}` :
      `${user.school} · ${user.grade} ${user.className}`;
    this.dom.profileClass.textContent = gradeDisplay;
    
    // 渲染等级信息
    const level = user.level || 1;
    const activity = user.activity || 0;
    const profileLevelElement = document.getElementById('profile-level');
    if (profileLevelElement) {
      profileLevelElement.innerHTML = window.levelSystem.renderLevelBadge(level, true);
    }
    
    // 渲染活跃度
    const activityElement = document.getElementById('activity-count');
    if (activityElement) {
      activityElement.textContent = activity;
    }
    
    // 渲染统计数据
    const stats = this.calculateUserStats();
    this.dom.postCount.textContent = stats.postCount;
    this.dom.commentCount.textContent = stats.commentCount;
    this.dom.likeCount.textContent = stats.totalLikes;
    this.dom.postsCount.textContent = `(${stats.postCount})`;
    
    // 渲染加入时间和最后登录时间
    if (user.createdAt) {
      const joinDate = new Date(user.createdAt);
      this.dom.joinDate.textContent = `加入时间：${joinDate.toLocaleDateString('zh-CN')}`;
    }
    
    if (user.lastLogin) {
      const lastLogin = new Date(user.lastLogin);
      this.dom.lastLogin.textContent = `最后登录：${lastLogin.toLocaleDateString('zh-CN')}`;
    }
  },

  // 计算用户统计数据
  calculateUserStats: function() {
    // 如果API返回了stats数据，直接使用
    if (this.state.userStats) {
      return {
        postCount: this.state.userStats.postCount || 0,
        commentCount: this.state.userStats.commentCount || 0,
        totalLikes: this.state.userStats.totalLikes || 0
      };
    }
    
    // 否则从用户数据和帖子数据计算
    const user = this.state.userData;
    const posts = this.state.userPosts;
    
    return {
      postCount: posts.length,
      commentCount: user.commentCount || 0,
      totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0)
    };
  },

  // 渲染用户帖子
  renderUserPosts: function() {
    const container = this.dom.profilePostsContainer;
    if (!container) return;
    
    const filteredPosts = this.getFilteredPosts();
    
    if (filteredPosts.length === 0) {
      container.style.display = 'none';
      this.dom.noPostsMessage.style.display = 'block';
      return;
    }
    
    container.style.display = 'block';
    this.dom.noPostsMessage.style.display = 'none';
    
    container.innerHTML = '';
    
    filteredPosts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.className = 'profile-post';
      postElement.dataset.id = post.id;
      
      // 格式化时间
      const postTime = new Date(post.timestamp);
      const timeDisplay = utils.formatDate(post.timestamp);
      
      // 计算评论数
      const commentCount = post.comments ? post.comments.length : 0;
      
      postElement.innerHTML = `
        <div class="profile-post-header">
          <div class="profile-post-time">
            <i class="far fa-clock"></i> ${timeDisplay}
          </div>
        </div>
        
        <div class="profile-post-content">
          ${post.anonymous ? '<span class="tag anonymous-tag">匿名</span>' : 
          `<span class="tag">${post.grade || ''}</span>
           <span class="tag">${post.className || ''}</span>`}
          ${this.renderPostContentPreview(post.content)}
        </div>
        
        <div class="profile-post-footer">
          <div class="profile-post-stats">
            <div class="profile-post-stat likes">
              <i class="fas fa-heart"></i> ${post.likes || 0}
            </div>
            <div class="profile-post-stat comments">
              <i class="fas fa-comment"></i> ${commentCount}
            </div>
            <div class="profile-post-stat views">
              <i class="fas fa-eye"></i> ${post.viewCount || 0}
            </div>
          </div>
          
          <div class="profile-post-actions">
            <button class="profile-post-action view" data-id="${post.id}">
              <i class="fas fa-external-link-alt"></i> 查看详情
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(postElement);
    });
    
    // 添加查看详情按钮事件
    this.addPostActionListeners();
  },

  // 获取筛选后的帖子
  getFilteredPosts: function() {
    let posts = [...this.state.userPosts];
    
    switch (this.state.currentFilter) {
      case 'recent':
        // 按时间倒序排序
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case 'popular':
        // 按点赞数倒序排序
        posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'all':
      default:
        // 默认按时间倒序排序
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
    }
    
    return posts;
  },

  // 渲染帖子内容预览
  renderPostContentPreview: function(content) {
    if (!content) return '<p class="empty-content">[无文本内容]</p>';
    
    // 限制预览长度
    const maxLength = 200;
    let preview = content;
    
    if (content.length > maxLength) {
      preview = content.substring(0, maxLength) + '...';
    }
    
    // 简单的Markdown处理
    preview = preview.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    preview = preview.replace(/\*(.*?)\*/g, '<em>$1</em>');
    preview = preview.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // 处理换行
    preview = preview.replace(/\n/g, '<br>');
    
    return `<p>${preview}</p>`;
  },

  // 添加帖子操作事件监听
  addPostActionListeners: function() {
    const viewButtons = document.querySelectorAll('.profile-post-action.view');
    
    viewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const postId = e.currentTarget.dataset.id;
        this.viewPostDetails(postId);
      });
    });
  },

  // 查看帖子详情
  viewPostDetails: function(postId) {
    // 在新标签页中打开帖子详情
    window.open(`index.html?post=${postId}`, '_blank');
  },

  // 设置事件监听器
  setupEventListeners: function() {
    // 筛选按钮事件
    this.dom.filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.applyFilter(filter);
      });
    });
    
    // 图片预览模态框关闭事件
    const imageModalClose = document.querySelector('.image-modal-close');
    if (imageModalClose) {
      imageModalClose.addEventListener('click', () => {
        const modal = document.getElementById('image-modal');
        if (modal) {
          modal.style.display = 'none';
        }
      });
    }
    
    // 点击模态框背景关闭
    const imageModal = document.getElementById('image-modal');
    if (imageModal) {
      imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
          imageModal.style.display = 'none';
        }
      });
    }
  },

  // 应用筛选
  applyFilter: function(filter) {
    // 更新按钮状态
    this.dom.filterButtons.forEach(button => {
      if (button.dataset.filter === filter) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // 更新筛选状态
    this.state.currentFilter = filter;
    
    // 重新渲染帖子
    this.renderUserPosts();
  },

  // 显示错误
  showError: function(message) {
    const container = this.dom.profilePostsContainer;
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button onclick="window.location.href='index.html'" class="post-button" style="margin-top: 20px;">
            返回首页
          </button>
        </div>
      `;
    }
    
    utils.showNotification(message, 'error');
  },

  // 更新侧边栏用户面板
  updateUserPanel: function() {
    const currentUser = userManager.state.currentUser;
    if (!currentUser) return;
    
    const usernameElement = document.getElementById('username');
    const userClassElement = document.getElementById('user-class');
    const userLevelProgressElement = document.getElementById('user-level-progress');
    
    if (usernameElement) {
      usernameElement.textContent = currentUser.username;
    }
    
    if (userClassElement) {
      const gradeDisplay = currentUser.grade === "已毕业" ? 
        `已毕业 · ${currentUser.className}` :
        `${currentUser.grade} ${currentUser.className}`;
      userClassElement.textContent = gradeDisplay;
    }
    
    if (userLevelProgressElement) {
      const level = currentUser.level || 1;
      const activity = currentUser.activity || 0;
      userLevelProgressElement.innerHTML = window.levelSystem.renderLevelProgressBar(activity);
    }
  },

  // 显示图片预览模态框
  showImageModal: function(imageUrl) {
    const modal = document.getElementById('image-modal');
    if (!modal) return;
    
    // 设置图片并显示模态框
    modal.querySelector('.image-modal-content img').src = imageUrl;
    modal.style.display = 'flex';
  }
};