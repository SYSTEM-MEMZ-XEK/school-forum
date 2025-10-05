// 管理员管理模块
const adminManager = {
    // 全局状态
    state: {
        currentAdmin: null,
        currentSection: 'dashboard',
        selectedUserId: null,
        selectedPostId: null,
        currentPage: {
            posts: 1,
            users: 1
        },
        searchQuery: {
            posts: '',
            users: ''
        },
        // 添加请求超时设置
        requestTimeout: 30000 // 30秒超时
    },

    // 初始化
    init: function() {
  return new Promise((resolve, reject) => {
    if (this.checkAdminAuth()) {
      this.displayAdminInfo();
      this.loadDashboard();
      this.setupEventListeners();
      resolve();
    } else {
      reject(new Error('管理员权限验证失败'));
    }
  });
},

// 显示管理员信息
displayAdminInfo: function() {
  const adminInfo = document.getElementById('admin-info');
  if (adminInfo && this.state.currentAdmin) {
    adminInfo.innerHTML = `
      <i class="fas fa-user-shield"></i> 
      当前管理员: ${this.state.currentAdmin.username} | 
      ${this.state.currentAdmin.school} ${this.state.currentAdmin.grade} ${this.state.currentAdmin.className}
    `;
  }
},

    // 检查管理员权限 - 带调试信息
checkAdminAuth: function() {
  const savedUser = localStorage.getItem('forumUser');
  console.log('从localStorage读取的用户信息:', savedUser);
  
  if (!savedUser) {
    alert('请先登录管理员账号');
    window.location.href = 'login.html';
    return false;
  }

  try {
    const user = JSON.parse(savedUser);
    console.log('解析后的用户信息:', user);
    
    // 检查是否是管理员
    const adminQQList = ['1635075096']; // 与后端保持一致
    const adminIdList = ['cc99c0f3-7cb9-423a-b2d4-d328a6f33293']; // 用户ID列表
    
    const isAdmin = adminQQList.includes(user.qq) || adminIdList.includes(user.id);
    
    console.log('管理员检查结果:', { 
      qq: user.qq, 
      id: user.id, 
      isAdmin: isAdmin,
      adminQQList: adminQQList,
      adminIdList: adminIdList
    });
    
    if (!isAdmin) {
      alert('您不是管理员，无法访问此页面');
      window.location.href = 'unauthorized.html';
      return false;
    }
    
    // 检查用户状态
    if (user.isActive === false) {
      alert('您的账号已被禁用，无法访问管理员面板');
      window.location.href = 'unauthorized.html';
      return false;
    }
    
    this.state.currentAdmin = user;
    console.log('管理员验证通过，当前管理员:', user.username);
    return true;
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    alert('管理员权限验证失败');
    window.location.href = 'unauthorized.html';
    return false;
  }
},
    // 设置事件监听器
    setupEventListeners: function() {
        // 全局错误处理
        window.addEventListener('error', (e) => {
            this.showNotification('发生错误: ' + e.message, 'error');
        });

        // 回车键搜索
        document.getElementById('posts-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchPosts();
        });

        document.getElementById('users-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });
    },

    // 显示通知 - 增强权限处理
showNotification: function(message, type = 'info') {
  // 创建临时通知元素
  const notification = document.createElement('div');
  notification.className = `notification-message ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${
      type === 'success' ? 'check-circle' : 
      type === 'error' ? 'exclamation-circle' : 'info-circle'
    }"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // 添加样式
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '10000',
    maxWidth: '350px'
  });
  
  // 如果是权限错误，强制跳转
  if (message.includes('权限') || message.includes('管理员') || type === 'error') {
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      setTimeout(() => {
        notification.remove();
        // 如果是权限相关错误，跳转到首页
        if (message.includes('权限') || message.includes('管理员')) {
          window.location.href = 'unauthorized.html';
        }
      }, 300);
    }, 3000);
  } else {
    // 正常通知的自动移除
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // 显示动画
  setTimeout(() => notification.classList.add('show'), 10);
},

// 增强的fetchWithTimeout函数 - 带调试信息
fetchWithTimeout: function(url, options = {}) {
  const { timeout = this.state.requestTimeout } = options;
  
  console.log('发送管理员请求:', { url, method: options.method, currentAdmin: this.state.currentAdmin });
  
  // 确保所有管理员请求都包含管理员ID
  if (this.state.currentAdmin) {
    // 如果是GET请求，在URL中添加adminId参数
    if ((!options.method || options.method === 'GET') && !url.includes('adminId=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}adminId=${this.state.currentAdmin.id}`;
      console.log('GET请求URL已添加adminId:', url);
    }
    
    // 对于非GET请求，在body中添加adminId
    if (options.method && options.method !== 'GET') {
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      
      // 处理请求体
      if (options.body) {
        try {
          const bodyObj = typeof options.body === 'string' ? 
            JSON.parse(options.body) : options.body;
          bodyObj.adminId = this.state.currentAdmin.id;
          options.body = JSON.stringify(bodyObj);
          console.log('非GET请求体已添加adminId:', options.body);
        } catch (e) {
          console.error('处理请求体失败:', e);
          // 如果解析失败，创建新的body
          options.body = JSON.stringify({ 
            adminId: this.state.currentAdmin.id,
            ...(typeof options.body === 'string' ? JSON.parse(options.body) : options.body)
          });
        }
      } else {
        options.body = JSON.stringify({ adminId: this.state.currentAdmin.id });
        console.log('空请求体已添加adminId:', options.body);
      }
    }
  } else {
    console.error('没有当前管理员信息，无法添加adminId');
  }
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`请求超时 (${timeout}ms)`));
    }, timeout);

    fetch(url, options)
      .then(response => {
        clearTimeout(timer);
        
        console.log('收到响应:', { status: response.status, url });
        
        // 检查权限错误
        if (response.status === 401 || response.status === 403) {
          response.json().then(data => {
            console.error('权限错误详情:', data);
            reject(new Error(data.message || '管理员权限不足或已失效，请重新登录'));
          }).catch(() => {
            reject(new Error('管理员权限不足或已失效，请重新登录'));
          });
          return;
        }
        
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        console.error('请求错误:', err);
        reject(err);
      });
  });
},

    // 切换页面部分
    showSection: function(sectionId) {
        // 更新导航按钮状态
        document.querySelectorAll('.admin-nav button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 隐藏所有部分
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // 显示目标部分
        document.getElementById(sectionId).classList.add('active');
        this.state.currentSection = sectionId;
        
        // 加载对应部分的数据
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'banned-users':
                this.loadBannedUsers();
                break;
            case 'stats':
                this.loadDetailedStats();
                break;
        }
    },

    // 加载仪表盘
    loadDashboard: async function() {
  try {
    // 设置加载状态
    const statsContainer = document.getElementById('dashboard-stats');
    const postsContainer = document.getElementById('recent-posts');
    const usersContainer = document.getElementById('recent-users');
    
    if (statsContainer) statsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    if (postsContainer) postsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    if (usersContainer) usersContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    
    // 加载统计数据 - 使用增强的fetch
    const statsResponse = await this.fetchWithTimeout('/admin/stats');
    if (!statsResponse.ok) throw new Error('加载统计数据失败');
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      this.renderDashboardStats(statsData.stats);
    }
    
    // 加载最近活动 - 使用增强的fetch
    const activityResponse = await this.fetchWithTimeout('/admin/recent-activity');
    if (!activityResponse.ok) throw new Error('加载最近活动失败');
    const activityData = await activityResponse.json();
    
    if (activityData.success) {
      this.renderRecentActivity(activityData.recentPosts, activityData.recentUsers);
    }
  } catch (error) {
    console.error('加载仪表盘失败:', error);
    this.showNotification('加载仪表盘数据失败: ' + error.message, 'error');
    
    // 显示无数据状态
    const statsContainer = document.getElementById('dashboard-stats');
    const postsContainer = document.getElementById('recent-posts');
    const usersContainer = document.getElementById('recent-users');
    
    if (statsContainer) statsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i> 无统计数据</div>';
    if (postsContainer) postsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> 无最近帖子</div>';
    if (usersContainer) usersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i> 无新用户</div>';
  }
},

    // 渲染仪表盘统计
    renderDashboardStats: function(stats) {
        const container = document.getElementById('dashboard-stats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-card">
                <span class="stat-number">${stats.totalUsers || 0}</span>
                <div class="stat-label">总用户数</div>
            </div>
            <div class="stat-card success">
                <span class="stat-number">${stats.activeUsers || 0}</span>
                <div class="stat-label">活跃用户</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.totalPosts || 0}</span>
                <div class="stat-label">总帖子数</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.todayPosts || 0}</span>
                <div class="stat-label">今日发帖</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.totalComments || 0}</span>
                <div class="stat-label">总评论数</div>
            </div>
            <div class="stat-card warning">
                <span class="stat-number">${stats.anonymousPosts || 0}</span>
                <div class="stat-label">匿名帖子</div>
            </div>
            <div class="stat-card danger">
                <span class="stat-number">${stats.bannedUsers || 0}</span>
                <div class="stat-label">封禁用户</div>
            </div>
        `;
    },

    // 渲染最近活动
    renderRecentActivity: function(posts, users) {
        // 渲染最近帖子
        const postsContainer = document.getElementById('recent-posts');
        if (postsContainer) {
            if (!posts || posts.length === 0) {
                postsContainer.innerHTML = '<div class="empty-state">暂无最近帖子</div>';
            } else {
                postsContainer.innerHTML = posts.slice(0, 5).map(post => `
                    <div class="activity-item">
                        <div class="activity-content">
                            <strong>${post.anonymous ? '匿名用户' : post.username}</strong>
                            <div class="post-content-preview">${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}</div>
                        </div>
                        <div class="activity-meta">
                            ${this.formatDate(post.timestamp)}
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // 渲染最近用户
        const usersContainer = document.getElementById('recent-users');
        if (usersContainer) {
            if (!users || users.length === 0) {
                usersContainer.innerHTML = '<div class="empty-state">暂无新用户</div>';
            } else {
                usersContainer.innerHTML = users.slice(0, 5).map(user => `
                    <div class="activity-item">
                        <div class="activity-content">
                            <strong>${user.username}</strong>
                            <div>${user.school} · ${user.grade} ${user.className}</div>
                        </div>
                        <div class="activity-meta">
                            ${this.formatDate(user.createdAt)}
                        </div>
                    </div>
                `).join('');
            }
        }
    },


loadPosts: async function(page = 1) {
  try {
    const container = document.getElementById('posts-list');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="5" class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    let url = `/admin/posts?page=${page}&limit=20`;
    if (this.state.searchQuery.posts) {
      url += `&search=${encodeURIComponent(this.state.searchQuery.posts)}`;
    }
    
    // 使用增强的fetch，会自动添加adminId
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '加载帖子列表失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.renderPostsList(data.posts);
      this.renderPagination('posts', data.pagination);
      this.state.currentPage.posts = page;
    } else {
      throw new Error(data.message || '加载帖子列表失败');
    }
  } catch (error) {
    console.error('加载帖子列表失败:', error);
    this.showNotification('加载帖子列表失败: ' + error.message, 'error');
    
    const container = document.getElementById('posts-list');
    if (container) {
      container.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i> 无帖子数据</td></tr>';
    }
  }
},

    // 渲染帖子列表
renderPostsList: function(posts) {
  const container = document.getElementById('posts-list');
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i> 暂无帖子</td></tr>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <tr>
      <td>
        <div class="post-content-preview" title="${this.escapeHtml(post.content)}">
          ${this.escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}
        </div>
        ${post.images && post.images.length > 0 ? 
          `<small><i class="fas fa-image"></i> ${post.images.length}张图片</small>` : ''
        }
      </td>
      <td>
        <strong>${post.anonymous ? '匿名用户' : (post.username || '未知用户')}</strong>
        ${!post.anonymous ? `
        <div style="font-size: 12px; color: #666;">
          ${post.school || ''} ${post.grade || ''} ${post.className || ''}
        </div>
        ` : ''}
      </td>
      <td>${this.formatDate(post.timestamp)}</td>
      <td>
        <div>👍 ${post.likes || 0}</div>
        <div>💬 ${post.comments ? post.comments.length : 0}</div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn btn-danger" onclick="adminManager.showDeletePostModal('${post.id}')">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
      </td>
    </tr>
  `).join('');
},

        // HTML转义函数，防止XSS攻击
        escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
        },

    // 加载用户列表
    loadUsers: async function(page = 1) {
  try {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    let url = `/admin/users?page=${page}&limit=20`;
    if (this.state.searchQuery.users) {
      url += `&search=${encodeURIComponent(this.state.searchQuery.users)}`;
    }
    
    // 使用增强的fetch
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '加载用户列表失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.renderUsersList(data.users);
      this.renderPagination('users', data.pagination);
      this.state.currentPage.users = page;
    } else {
      throw new Error(data.message || '加载用户列表失败');
    }
  } catch (error) {
    console.error('加载用户列表失败:', error);
    this.showNotification('加载用户列表失败: ' + error.message, 'error');
    
    const container = document.getElementById('users-list');
    if (container) {
      container.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-users"></i> 无用户数据</td></tr>';
    }
  }
},

    // 渲染用户列表
    renderUsersList: function(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-users"></i> 暂无用户</td></tr>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <tr>
                <td>
                    <strong>${user.username}</strong>
                    <div style="font-size: 12px; color: #666;">ID: ${user.id ? user.id.substring(0, 8) + '...' : 'N/A'}</div>
                </td>
                <td>${user.qq || '未设置'}</td>
                <td>
                    <div>${user.school || '未设置'}</div>
                    <div style="font-size: 12px; color: #666;">
                        ${user.grade || ''} ${user.className || ''}
                    </div>
                </td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div>📝 ${user.postCount || 0}</div>
                    <div>💬 ${user.commentCount || 0}</div>
                </td>
                <td>
                    <span class="user-status ${user.isActive === false ? 'status-banned' : 'status-active'}">
                        ${user.isActive === false ? '已封禁' : '正常'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${user.isActive === false ? 
                            `<button class="action-btn btn-success" onclick="adminManager.showUnbanModal('${user.id}', '${user.username}')">
                                <i class="fas fa-unlock"></i> 解封
                            </button>` :
                            `<button class="action-btn btn-warning" onclick="adminManager.showBanModal('${user.id}', '${user.username}')">
                                <i class="fas fa-ban"></i> 封禁
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // 加载封禁用户列表
loadBannedUsers: async function() {
  try {
    const container = document.getElementById('banned-users-list');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    // 使用增强的fetch
    const response = await this.fetchWithTimeout('/admin/banned-users');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '加载封禁用户列表失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.renderBannedUsersList(data.bannedUsers);
    } else {
      throw new Error(data.message || '加载封禁用户列表失败');
    }
  } catch (error) {
    console.error('加载封禁用户列表失败:', error);
    this.showNotification('加载封禁用户列表失败: ' + error.message, 'error');
    
    const container = document.getElementById('banned-users-list');
    if (container) {
      container.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-ban"></i> 无封禁用户数据</td></tr>';
    }
  }
},

    // 渲染封禁用户列表
    renderBannedUsersList: function(users) {
        const container = document.getElementById('banned-users-list');
        if (!container) return;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-ban"></i> 暂无封禁用户</td></tr>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.qq || '未设置'}</td>
                <td>${user.banReason || '违反论坛规定'}</td>
                <td>${this.formatDate(user.banStartTime)}</td>
                <td>${user.banEndTime ? this.formatDate(user.banEndTime) : '永久封禁'}</td>
                <td>${user.bannedBy || '系统'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-success" onclick="adminManager.showUnbanModal('${user.id}', '${user.username}')">
                            <i class="fas fa-unlock"></i> 解封
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // 加载详细统计
    loadDetailedStats: async function() {
  try {
    // 使用增强的fetch
    const response = await this.fetchWithTimeout('/admin/stats');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '加载详细统计失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.renderDetailedStats(data.stats);
    } else {
      throw new Error(data.message || '加载详细统计失败');
    }
  } catch (error) {
    console.error('加载详细统计失败:', error);
    this.showNotification('加载详细统计失败: ' + error.message, 'error');
    
    // 显示无数据状态
    const basicContainer = document.getElementById('detailed-stats-basic');
    const gradeContainer = document.getElementById('grade-distribution');
    const schoolContainer = document.getElementById('school-distribution');
    const activeContainer = document.getElementById('active-users-ranking');
    
    if (basicContainer) basicContainer.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i> 无统计数据</div>';
    if (gradeContainer) gradeContainer.innerHTML = '<div class="empty-state">无年级分布数据</div>';
    if (schoolContainer) schoolContainer.innerHTML = '<div class="empty-state">无学校分布数据</div>';
    if (activeContainer) activeContainer.innerHTML = '<div class="empty-state">无活跃用户数据</div>';
  }
},

    // 渲染详细统计
    renderDetailedStats: function(stats) {
        // 基础统计
        const basicContainer = document.getElementById('detailed-stats-basic');
        if (basicContainer) {
            basicContainer.innerHTML = `
                <div class="stat-card">
                    <span class="stat-number">${stats.totalUsers || 0}</span>
                    <div class="stat-label">总用户数</div>
                </div>
                <div class="stat-card success">
                    <span class="stat-number">${stats.activeUsers || 0}</span>
                    <div class="stat-label">活跃用户</div>
                </div>
                <div class="stat-card warning">
                    <span class="stat-number">${stats.inactiveUsers || 0}</span>
                    <div class="stat-label">不活跃用户</div>
                </div>
                <div class="stat-card danger">
                    <span class="stat-number">${stats.bannedUsers || 0}</span>
                    <div class="stat-label">封禁用户</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.totalPosts || 0}</span>
                    <div class="stat-label">总帖子数</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.totalComments || 0}</span>
                    <div class="stat-label">总评论数</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.totalLikes || 0}</span>
                    <div class="stat-label">总点赞数</div>
                </div>
                <div class="stat-card warning">
                    <span class="stat-number">${stats.anonymousPosts || 0}</span>
                    <div class="stat-label">匿名帖子</div>
                </div>
            `;
        }
        
        // 年级分布
        const gradeContainer = document.getElementById('grade-distribution');
        if (gradeContainer && stats.gradeDistribution) {
            gradeContainer.innerHTML = Object.entries(stats.gradeDistribution)
                .map(([grade, count]) => `
                    <div class="distribution-item">
                        <span>${grade}</span>
                        <span>${count} 人</span>
                    </div>
                `).join('');
        }
        
        // 学校分布
        const schoolContainer = document.getElementById('school-distribution');
        if (schoolContainer && stats.schoolDistribution) {
            schoolContainer.innerHTML = Object.entries(stats.schoolDistribution)
                .map(([school, count]) => `
                    <div class="distribution-item">
                        <span>${school}</span>
                        <span>${count} 人</span>
                    </div>
                `).join('');
        }
        
        // 活跃用户排行
        const activeContainer = document.getElementById('active-users-ranking');
        if (activeContainer && stats.topActiveUsers) {
            activeContainer.innerHTML = stats.topActiveUsers
                .map((user, index) => `
                    <div class="distribution-item">
                        <div>
                            <strong>${index + 1}. ${user.username}</strong>
                            <div style="font-size: 12px; color: #666;">
                                ${user.school} · ${user.grade}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div>${user.totalActivity} 活跃度</div>
                            <div style="font-size: 12px; color: #666;">
                                ${user.postCount}帖 / ${user.commentCount}评
                            </div>
                        </div>
                    </div>
                `).join('');
        }
    },

    // 渲染分页
    renderPagination: function(type, pagination) {
        const container = document.getElementById(`${type}-pagination`);
        if (!container || !pagination) return;
        
        const currentPage = this.state.currentPage[type];
        const totalPages = pagination.totalPages || 1;
        
        let html = '';
        
        // 上一页按钮
        if (currentPage > 1) {
            html += `<button onclick="adminManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage - 1})">上一页</button>`;
        }
        
        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<button class="active">${i}</button>`;
            } else {
                html += `<button onclick="adminManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">${i}</button>`;
            }
        }
        
        // 下一页按钮
        if (currentPage < totalPages) {
            html += `<button onclick="adminManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage + 1})">下一页</button>`;
        }
        
        container.innerHTML = html;
    },

    // 搜索帖子
    searchPosts: function() {
        const query = document.getElementById('posts-search').value;
        this.state.searchQuery.posts = query;
        this.state.currentPage.posts = 1;
        this.loadPosts(1);
    },

    // 搜索用户
    searchUsers: function() {
        const query = document.getElementById('users-search').value;
        this.state.searchQuery.users = query;
        this.state.currentPage.users = 1;
        this.loadUsers(1);
    },

    // 显示封禁用户模态框
    showBanModal: function(userId, username) {
        this.state.selectedUserId = userId;
        document.getElementById('banModal').style.display = 'flex';
        document.getElementById('banReason').value = '违反论坛规定';
    },

    // 显示解封用户模态框
    showUnbanModal: function(userId, username) {
        this.state.selectedUserId = userId;
        document.getElementById('unban-username').textContent = username;
        document.getElementById('unbanModal').style.display = 'flex';
    },

    // 显示删除帖子模态框
    showDeletePostModal: function(postId) {
        this.state.selectedPostId = postId;
        document.getElementById('deletePostModal').style.display = 'flex';
        document.getElementById('deleteReason').value = '违反论坛规定';
    },

    // 关闭模态框
    closeModal: function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    // 确认封禁用户
    confirmBan: async function() {
        if (!this.state.selectedUserId) return;
        
        const duration = document.getElementById('banDuration').value;
        const reason = document.getElementById('banReason').value;
        
        try {
            const response = await this.fetchWithTimeout(`/admin/users/${this.state.selectedUserId}/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    duration: parseInt(duration),
                    reason: reason
                })
            });
            
            if (!response.ok) throw new Error('封禁用户失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.closeModal('banModal');
                this.loadUsers();
                this.loadBannedUsers();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('封禁用户失败:', error);
            this.showNotification('封禁用户失败', 'error');
        }
    },

    // 确认解封用户
    confirmUnban: async function() {
        if (!this.state.selectedUserId) return;
        
        try {
            const response = await this.fetchWithTimeout(`/admin/users/${this.state.selectedUserId}/unban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id
                })
            });
            
            if (!response.ok) throw new Error('解封用户失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.closeModal('unbanModal');
                this.loadUsers();
                this.loadBannedUsers();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('解封用户失败:', error);
            this.showNotification('解封用户失败', 'error');
        }
    },

    // 确认删除帖子
    // 确认删除帖子
confirmDeletePost: async function() {
  if (!this.state.selectedPostId) return;
  
  const reason = document.getElementById('deleteReason').value;
  
  if (!reason.trim()) {
    this.showNotification('请填写删除原因', 'error');
    return;
  }
  
  try {
    const response = await this.fetchWithTimeout(`/admin/posts/${this.state.selectedPostId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminId: this.state.currentAdmin.id,
        reason: reason
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '删除帖子失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      this.showNotification(data.message, 'success');
      this.closeModal('deletePostModal');
      
      // 立即重新加载帖子列表，确保删除的帖子不再显示
      await this.loadPosts(this.state.currentPage.posts);
      this.loadDashboard();
    }
  } catch (error) {
    console.error('删除帖子失败:', error);
    this.showNotification('删除帖子失败: ' + error.message, 'error');
  }
},

    // 刷新仪表盘
    refreshDashboard: function() {
        this.loadDashboard();
        this.showNotification('仪表盘已刷新', 'success');
    },

    // 格式化日期
    formatDate: function(isoString) {
        if (!isoString) return '未知时间';
        
        const date = new Date(isoString);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },

    // 退出管理
    logout: function() {
        if (confirm('确定要退出管理后台吗？')) {
            window.location.href = 'index.html';
        }
    }
};

// 全局函数供HTML调用
function showSection(sectionId) {
    adminManager.showSection(sectionId);
}

function refreshDashboard() {
    adminManager.refreshDashboard();
}

function searchPosts() {
    adminManager.searchPosts();
}

function searchUsers() {
    adminManager.searchUsers();
}

function loadBannedUsers() {
    adminManager.loadBannedUsers();
}

function loadDetailedStats() {
    adminManager.loadDetailedStats();
}

function closeModal(modalId) {
    adminManager.closeModal(modalId);
}

function confirmBan() {
    adminManager.confirmBan();
}

function confirmUnban() {
    adminManager.confirmUnban();
}

function confirmDeletePost() {
    adminManager.confirmDeletePost();
}

function logout() {
    adminManager.logout();
}
// 初始化管理员系统 - 最终版
document.addEventListener('DOMContentLoaded', () => {
  adminManager.init().catch(error => {
    console.error('管理员系统初始化失败:', error);
    // 初始化失败时跳转到首页
    window.location.href = 'index.html';
  });
});
