// 关注/粉丝列表页面管理模块
const followListManager = {
  // 全局状态
  state: {
    userId: null,
    type: 'following', // 'following' 或 'followers'
    currentUser: null,
    userData: null,
    followingCount: 0,
    followerCount: 0,
    list: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 20
  },

  // DOM元素
  dom: {
    backBtn: document.getElementById('back-btn'),
    userAvatar: document.getElementById('user-avatar'),
    userUsername: document.getElementById('user-username'),
    userClass: document.getElementById('user-class'),
    viewProfileBtn: document.getElementById('view-profile-btn'),
    listTitle: document.getElementById('list-title'),
    listCount: document.getElementById('list-count'),
    followingTab: document.getElementById('following-tab'),
    followersTab: document.getElementById('followers-tab'),
    followingCount: document.getElementById('following-count'),
    followersCount: document.getElementById('followers-count'),
    listContainer: document.getElementById('follow-list-container'),
    paginationContainer: document.getElementById('pagination-container'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    paginationInfo: document.getElementById('pagination-info')
  },

  // 初始化
  init: function() {
    this.parseURLParams();
    this.loadCurrentUser();
    this.loadUserData();
    this.loadFollowStats();
    this.loadList();
    this.setupEventListeners();
  },

  // 解析URL参数
  parseURLParams: function() {
    const urlParams = new URLSearchParams(window.location.search);
    this.state.userId = urlParams.get('id');
    this.state.type = urlParams.get('type') || 'following';

    if (!this.state.userId) {
      utils.showNotification('用户ID无效', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
      return;
    }

    // 更新标签页状态
    this.updateTabState();
  },

  // 更新标签页状态
  updateTabState: function() {
    if (this.state.type === 'following') {
      this.dom.followingTab.classList.add('active');
      this.dom.followersTab.classList.remove('active');
      this.dom.listTitle.innerHTML = '<i class="fas fa-user-plus"></i> 关注列表 <span class="list-count" id="list-count">(0)</span>';
    } else {
      this.dom.followingTab.classList.remove('active');
      this.dom.followersTab.classList.add('active');
      this.dom.listTitle.innerHTML = '<i class="fas fa-users"></i> 粉丝列表 <span class="list-count" id="list-count">(0)</span>';
    }
    // 重新获取 list-count 元素引用
    this.dom.listCount = document.getElementById('list-count');
  },

  // 加载当前登录用户
  loadCurrentUser: function() {
    const savedUser = localStorage.getItem('forumUser');
    if (savedUser) {
      try {
        this.state.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('解析用户数据失败:', e);
      }
    }
  },

  // 加载用户数据
  loadUserData: async function() {
    try {
      const response = await fetch(`/users/${this.state.userId}`);
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.state.userData = data.user;
        this.renderUserInfo();
      } else {
        throw new Error(data.message || '加载用户资料失败');
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
      utils.showNotification(error.message || '加载用户资料失败', 'error');
    }
  },

  // 渲染用户信息
  renderUserInfo: function() {
    const user = this.state.userData;
    if (!user) return;

    // 渲染头像
    if (user.avatar) {
      this.dom.userAvatar.style.backgroundImage = `url(${user.avatar})`;
      this.dom.userAvatar.style.backgroundSize = 'cover';
      this.dom.userAvatar.style.backgroundPosition = 'center';
      this.dom.userAvatar.innerHTML = '';
    } else {
      const avatarChar = user.className ? user.className.slice(0, 1) : '?';
      this.dom.userAvatar.style.backgroundImage = '';
      this.dom.userAvatar.innerHTML = avatarChar;
    }

    // 渲染用户名
    this.dom.userUsername.textContent = user.username;

    // 渲染班级信息
    const gradeDisplay = user.grade === "已毕业" ?
      `已毕业 · ${user.school} ${user.enrollmentYear}级 ${user.className}` :
      `${user.school} · ${user.grade} ${user.className}`;
    this.dom.userClass.textContent = gradeDisplay;

    // 设置查看主页按钮链接
    this.dom.viewProfileBtn.href = `profile.html?id=${user.id}`;

    // 更新返回按钮
    this.dom.backBtn.href = `profile.html?id=${user.id}`;
    this.dom.backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> 返回主页';
  },

  // 加载关注统计
  loadFollowStats: async function() {
    try {
      const response = await fetch(`/follow/stats/${this.state.userId}`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.success) {
        this.state.followingCount = data.followingCount || 0;
        this.state.followerCount = data.followerCount || 0;

        this.dom.followingCount.textContent = this.state.followingCount;
        this.dom.followersCount.textContent = this.state.followerCount;
      }
    } catch (error) {
      console.error('加载关注统计失败:', error);
    }
  },

  // 加载列表
  loadList: async function(page = 1) {
    const container = this.dom.listContainer;

    if (page === 1) {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    }

    try {
      // 构建URL，添加当前用户ID用于判断关注状态
      let endpoint = this.state.type === 'following'
        ? `/following/${this.state.userId}?page=${page}&limit=${this.state.limit}`
        : `/followers/${this.state.userId}?page=${page}&limit=${this.state.limit}`;
      
      // 如果有当前登录用户，添加参数
      if (this.state.currentUser) {
        endpoint += `&currentUserId=${this.state.currentUser.id}`;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.state.list = data.list;
        this.state.currentPage = data.pagination.currentPage;
        this.state.totalPages = data.pagination.totalPages;
        this.state.total = data.pagination.total;

        this.renderList();
        this.updatePagination();

        // 更新数量显示
        if (this.dom.listCount) {
          this.dom.listCount.textContent = `(${this.state.total})`;
        }
      } else {
        throw new Error(data.message || '加载失败');
      }
    } catch (error) {
      console.error('加载列表失败:', error);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>加载失败，请稍后重试</p>
        </div>
      `;
    }
  },

  // 渲染列表
  renderList: function() {
    const container = this.dom.listContainer;

    if (this.state.list.length === 0) {
      const emptyMessage = this.state.type === 'following' ? '还没有关注任何人' : '还没有粉丝';
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>${emptyMessage}</p>
        </div>
      `;
      this.dom.paginationContainer.style.display = 'none';
      return;
    }

    this.dom.paginationContainer.style.display = 'flex';
    container.innerHTML = '';

    this.state.list.forEach(user => {
      const card = document.createElement('div');
      card.className = 'follow-user-card';
      card.dataset.userId = user.id;

      // 检查是否是自己的主页
      const isOwnProfile = this.state.currentUser && user.id === this.state.currentUser.id;

      // 检查关注状态
      const isFollowing = user.isFollowing !== undefined ? user.isFollowing : false;

      card.innerHTML = `
        <div class="user-avatar" ${user.avatar ? `style="background-image: url('${user.avatar}'); background-size: cover; background-position: center;"` : ''}>
          ${!user.avatar ? (user.className ? user.className.slice(0, 1) : '?') : ''}
        </div>
        <div class="user-info">
          <div class="user-name">
            ${this.escapeHtml(user.username)}
            ${user.isAdmin ? '<span class="admin-badge"><i class="fas fa-shield-alt"></i> 管理员</span>' : ''}
          </div>
          <div class="user-class">${user.school || ''} · ${user.grade || ''} ${user.className || ''}</div>
          ${user.followedAt ? `<div class="follow-time">关注于 ${this.formatDate(user.followedAt)}</div>` : ''}
        </div>
        <button class="follow-action-btn ${isOwnProfile ? 'own-profile' : (isFollowing ? 'following' : 'not-following')}"
                data-user-id="${user.id}"
                data-following="${isFollowing}">
          ${isOwnProfile ? '' : (isFollowing ? '<i class="fas fa-user-check"></i> 已关注' : '<i class="fas fa-user-plus"></i> 关注')}
        </button>
      `;

      container.appendChild(card);
    });

    // 添加事件监听
    this.addCardEventListeners();
  },

  // 添加卡片事件监听
  addCardEventListeners: function() {
    const self = this;

    // 点击卡片跳转到个人主页
    this.dom.listContainer.querySelectorAll('.follow-user-card').forEach(card => {
      card.addEventListener('click', function(e) {
        // 如果点击的是按钮，不跳转
        if (e.target.closest('.follow-action-btn')) return;

        const userId = this.dataset.userId;
        window.location.href = `profile.html?id=${userId}`;
      });
    });

    // 关注/取消关注按钮
    this.dom.listContainer.querySelectorAll('.follow-action-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        await self.handleFollowAction(this);
      });
    });
  },

  // 处理关注/取消关注
  handleFollowAction: async function(btn) {
    if (!this.state.currentUser) {
      utils.showNotification('请先登录', 'error');
      window.location.href = 'login.html';
      return;
    }

    if (btn.classList.contains('processing')) return;

    const targetUserId = btn.dataset.userId;
    const isFollowing = btn.dataset.following === 'true';

    btn.classList.add('processing');
    btn.disabled = true;

    try {
      // 关注使用 POST /follow，取消关注使用 POST /unfollow
      const url = isFollowing ? '/unfollow' : '/follow';
      const response = await fetch(url, {
        method: 'POST',
        headers: userManager.getAuthHeaders(),
        body: JSON.stringify({
          followerId: this.state.currentUser.id,
          followingId: targetUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        // 更新按钮状态
        btn.dataset.following = data.following;
        btn.className = `follow-action-btn ${data.following ? 'following' : 'not-following'}`;
        btn.innerHTML = data.following
          ? '<i class="fas fa-user-check"></i> 已关注'
          : '<i class="fas fa-user-plus"></i> 关注';

        // 更新统计
        await this.loadFollowStats();

        utils.showNotification(data.message || (data.following ? '关注成功' : '取消关注成功'), 'success');
      } else {
        throw new Error(data.message || '操作失败');
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      utils.showNotification(error.message || '操作失败', 'error');
    } finally {
      btn.classList.remove('processing');
      btn.disabled = false;
    }
  },

  // 更新分页
  updatePagination: function() {
    this.dom.prevBtn.disabled = this.state.currentPage <= 1;
    this.dom.nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
    this.dom.paginationInfo.textContent = `第 ${this.state.currentPage} / ${this.state.totalPages || 1} 页`;
  },

  // 设置事件监听器
  setupEventListeners: function() {
    const self = this;

    // 标签页切换
    this.dom.followingTab.addEventListener('click', function() {
      if (self.state.type !== 'following') {
        self.switchType('following');
      }
    });

    this.dom.followersTab.addEventListener('click', function() {
      if (self.state.type !== 'followers') {
        self.switchType('followers');
      }
    });

    // 分页按钮
    this.dom.prevBtn.addEventListener('click', function() {
      if (self.state.currentPage > 1) {
        self.loadList(self.state.currentPage - 1);
      }
    });

    this.dom.nextBtn.addEventListener('click', function() {
      if (self.state.currentPage < self.state.totalPages) {
        self.loadList(self.state.currentPage + 1);
      }
    });
  },

  // 切换类型
  switchType: function(type) {
    this.state.type = type;
    this.state.currentPage = 1;

    // 更新URL
    const newUrl = `${window.location.pathname}?id=${this.state.userId}&type=${type}`;
    window.history.pushState({}, '', newUrl);

    // 更新标签页状态
    this.updateTabState();

    // 重新加载列表
    this.loadList();
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  },

  // HTML 转义
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
