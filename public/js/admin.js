// 管理员管理模块
const adminManager = {
    // 全局状态
    state: {
        currentAdmin: null,
        currentSection: 'dashboard',
        currentLogLevel: 'ALL',
        selectedUserId: null,
        selectedPostId: null,
        selectedCommentId: null,
        currentPage: {
            posts: 1,
            users: 1,
            comments: 1
        },
        searchQuery: {
            posts: '',
            users: '',
            comments: ''
        },
        currentClassInfo: [], // 当前编辑的班级信息
        // 举报管理状态
        currentReportStatus: 'all',
        reportsData: [],
        // 添加请求超时设置
        requestTimeout: 30000 // 30秒超时
    },

    // 初始化
    init: function() {
  return new Promise(async (resolve, reject) => {
    try {
      const isAuthed = await this.checkAdminAuth();
      if (isAuthed) {
        this.displayAdminInfo();
        this.loadDashboard();
        this.setupEventListeners();
        resolve(true);
      } else {
        reject(new Error('管理员权限验证失败'));
      }
    } catch (error) {
      console.error('初始化失败:', error);
      reject(error);
    }
  });
},

// 显示管理员信息
displayAdminInfo: function() {
  const adminInfo = document.getElementById('admin-info');
  if (adminInfo && this.state.currentAdmin) {
    adminInfo.innerHTML = `
      <i class="fas fa-user-shield"></i>
      当前管理员: ${this.state.currentAdmin.username} <span style="color: #dc2626; margin-left: 5px; font-size: 14px;">管理员</span> |
      ${this.state.currentAdmin.school} ${this.state.currentAdmin.grade} ${this.state.currentAdmin.className}
    `;
  }
},

  // 获取携带 adminToken 的请求头（所有管理员 API 请求必须使用此函数）
  getAdminHeaders: function(extra) {
    const token = localStorage.getItem('adminToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return Object.assign(headers, extra);
  },

    // 检查管理员权限 - 带服务器验证
checkAdminAuth: async function() {
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
    
    // 向服务器验证用户状态（同时获取服务端的 isAdmin 结果）
    const verifyResult = await this.verifyUserWithServer(user);
    if (!verifyResult) {
      return false;
    }
    
    // 直接使用服务端返回的管理员标记，无需前端维护硬编码白名单
    if (!verifyResult.isAdmin) {
      alert('您不是管理员，无法访问此页面');
      window.location.href = '/index.html';
      return false;
    }
    
    // 检查用户状态（服务端已检查，此处为双重保险）
    if (verifyResult.user && verifyResult.user.isActive === false) {
      alert('您的账号已被禁用，无法访问管理员面板');
      window.location.href = '/index.html';
      return false;
    }
    
    this.state.currentAdmin = verifyResult.user || user;
    console.log('管理员验证通过，当前管理员:', this.state.currentAdmin.username);
    return true;
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    alert('管理员权限验证失败');
    window.location.href = '/index.html';
    return false;
  }
},

// 向服务器验证用户状态，返回 { isAdmin, user } 或 false
verifyUserWithServer: async function(user) {
  try {
    const response = await fetch('/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.id })
    });
    
    if (!response.ok) {
      localStorage.removeItem('forumUser');
      alert('登录状态已失效，请重新登录');
      window.location.href = 'login.html';
      return false;
    }
    
    const data = await response.json();
    
    if (data.success && data.valid) {
      const serverUser = data.user;
      
      // 检查关键字段是否一致
      const fieldsToCheck = ['username', 'qq', 'school', 'enrollmentYear', 'className'];
      for (const field of fieldsToCheck) {
        if (user[field] !== serverUser[field]) {
          localStorage.removeItem('forumUser');
          alert('账户信息已变更，请重新登录');
          window.location.href = 'login.html';
          return false;
        }
      }
      
      // 检查用户是否被禁用
      if (serverUser.isActive === false) {
        localStorage.removeItem('forumUser');
        alert('您的账号已被禁用');
        window.location.href = '/index.html';
        return false;
      }
      
      // 返回服务端的 isAdmin 和用户信息
      return { isAdmin: data.isAdmin || false, user: serverUser };
    }
    
    localStorage.removeItem('forumUser');
    return false;
  } catch (error) {
    console.error('验证用户状态失败:', error);
    // 网络错误时保持登录状态，但无法判断 isAdmin，保守地返回 false
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
        
        // 处理举报模态框 - 操作类型切换
        document.querySelectorAll('input[name="process-action"]').forEach(radio => {
            radio.addEventListener('change', () => this.toggleBanDuration());
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
  if (type === 'error' && (message.includes('权限') || message.includes('管理员'))) {
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      setTimeout(() => {
        notification.remove();
        window.location.href = '/index.html';
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
  
  // 确保所有管理员请求都包含管理员ID 和 Authorization 头
  if (this.state.currentAdmin) {
    // 统一注入 Authorization 头（adminToken）
    if (!options.headers) {
      options.headers = {};
    }
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${adminToken}`;
    }

    // 如果是GET请求，在URL中添加adminId参数
    if ((!options.method || options.method === 'GET') && !url.includes('adminId=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}adminId=${this.state.currentAdmin.id}`;
      console.log('GET请求URL已添加adminId:', url);
    }
    
    // 对于非GET请求，在body中添加adminId
    if (options.method && options.method !== 'GET') {
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
            case 'comments':
                this.loadComments();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'banned-users':
                this.loadBannedUsers();
                break;
            case 'logs':
                this.loadLogDates();
                this.loadLogs();
                break;
            case 'stats':
                this.loadDetailedStats();
                break;
            case 'settings':
                this.loadConfig();
                this.loadAdmins();
                this.loadRunMode();
                break;
            case 'reports':
                this.loadReports();
                this.updateReportsStats();
                break;
            case 'ip-stats':
                this.loadIpStats();
                break;
            case 'announcements':
                this.loadAnnouncements();
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
          <button class="action-btn btn-info" onclick="adminManager.viewPostDetail('${post.id}')">
            <i class="fas fa-eye"></i> 详情
          </button>
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

    // 加载可用日志日期列表
    loadLogDates: async function() {
        try {
            const response = await this.fetchWithTimeout('/admin/logs/dates');
            if (!response.ok) {
                throw new Error('加载日期列表失败');
            }

            const data = await response.json();
            if (data.success && data.dates) {
                this.renderLogDateSelect(data.dates);
            }
        } catch (error) {
            console.error('加载日志日期列表失败:', error);
        }
    },

    // 渲染日志日期选择器
    renderLogDateSelect: function(dates) {
        const select = document.getElementById('log-date-select');
        if (!select) return;

        if (!dates || dates.length === 0) {
            select.innerHTML = '<option value="">暂无日志</option>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        select.innerHTML = dates.map(date => `
            <option value="${date}" ${date === today ? 'selected' : ''}>
                ${date} ${date === today ? '(今天)' : ''}
            </option>
        `).join('');

        // 更新日期信息
        this.updateLogDateInfo(dates[0]);
    },

    // 更新日志日期信息
    updateLogDateInfo: function(date) {
        const infoElement = document.getElementById('log-date-info');
        if (!infoElement) return;

        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
            infoElement.innerHTML = '<span class="current-date"><i class="fas fa-calendar-day"></i> 今天</span>';
        } else {
            infoElement.innerHTML = `<span class="other-date"><i class="fas fa-history"></i> 历史记录</span>`;
        }
    },

    // 加载日志
    loadLogs: async function(page = 1) {
        try {
            const container = document.getElementById('logs-list');
            if (!container) return;

            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';

            const dateSelect = document.getElementById('log-date-select');
            const selectedDate = dateSelect?.value || '';

            const level = this.state.currentLogLevel || 'ALL';
            const search = document.getElementById('logs-search')?.value || '';

            const params = new URLSearchParams({
                page,
                limit: 50,
                level,
                search
            });

            if (selectedDate) {
                params.append('date', selectedDate);
            }

            const response = await this.fetchWithTimeout(`/admin/logs?${params}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '加载日志失败');
            }

            const data = await response.json();

            if (data.success) {
                this.renderLogsList(data.logs);
                this.renderLogsPagination(data.pagination);
                this.updateLogStats(data.logs, data.pagination);
            } else {
                throw new Error(data.message || '加载日志失败');
            }
        } catch (error) {
            console.error('加载日志失败:', error);
            this.showNotification('加载日志失败: ' + error.message, 'error');

            const container = document.getElementById('logs-list');
            if (container) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i> 无日志数据</div>';
            }
        }
    },

    // 更新日志统计信息
    updateLogStats: function(logs, pagination) {
        const stats = {
            INFO: 0,
            WARN: 0,
            ERROR: 0,
            SUCCESS: 0
        };

        logs.forEach(log => {
            const level = log.level ? log.level.toUpperCase() : '';
            if (stats[level] !== undefined) {
                stats[level]++;
            }
        });

        // 使用分页中的总数，如果没有则使用当前页日志数
        const total = pagination ? pagination.totalLogs : logs.length;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-info').textContent = stats.INFO;
        document.getElementById('stat-warn').textContent = stats.WARN;
        document.getElementById('stat-error').textContent = stats.ERROR;
        document.getElementById('stat-success').textContent = stats.SUCCESS;
    },

    // 过滤日志级别
    filterLogsByLevel: function(level) {
        this.state.currentLogLevel = level;

        // 更新按钮状态
        document.querySelectorAll('.log-level-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.level === level) {
                btn.classList.add('active');
            }
        });

        this.loadLogs(1);
    },

    // 处理日志搜索
    handleLogSearch: function(event) {
        if (event.key === 'Enter') {
            this.loadLogs(1);
        }
    },

    // 刷新日志
    refreshLogs: function() {
        this.loadLogDates();
        this.loadLogs(1);
    },

    // 渲染日志列表
    renderLogsList: function(logs) {
        const container = document.getElementById('logs-list');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>暂无日志</p>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map((log, index) => {
            const levelClass = this.getLogLevelClass(log.level);
            const level = log.level;
            const hasData = log.data && Object.keys(log.data).length > 0;
            
            return `
                <div class="console-log-item ${levelClass}" id="log-item-${index}">
                    <div class="console-log-line" onclick="adminManager.toggleLogExpand('log-item-${index}', ${hasData})">
                        <span class="console-timestamp">${this.formatTimeOnly(log.timestamp)}</span>
                        <span class="console-level [${level}]">[${level}]</span>
                        <span class="console-message">${this.escapeHtml(log.message)}</span>
                        ${hasData ? `<span class="console-expand-icon"><i class="fas fa-chevron-down"></i></span>` : ''}
                    </div>
                    ${hasData ? `
                        <div class="console-log-data">
                            <pre class="console-data-content">${this.escapeHtml(JSON.stringify(log.data, null, 2))}</pre>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // 格式化时间（只显示时分秒和毫秒）
    formatTimeOnly: function(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    },

    // 获取日志级别样式（直接返回颜色）
    getLogLevelClass: function(level) {
        const colors = {
            'INFO': 'log-info',
            'WARN': 'log-warn',
            'ERROR': 'log-error',
            'SUCCESS': 'log-success',
            'USER': 'log-user',
            'SYSTEM': 'log-system',
            'SECURITY': 'log-security'
        };
        return colors[level] || 'log-info';
    },

    // 切换日志展开状态
    toggleLogExpand: function(itemId, hasData) {
        if (!hasData) return;
        
        const item = document.getElementById(itemId);
        if (!item) return;
        
        item.classList.toggle('expanded');
    },

    // 渲染日志分页
    renderLogsPagination: function(pagination) {
        const container = document.getElementById('logs-pagination');
        if (!container) return;

        if (!pagination || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        if (pagination.hasPrev) {
            html += `<button onclick="adminManager.loadLogs(${pagination.currentPage - 1})" class="page-btn"><i class="fas fa-chevron-left"></i></button>`;
        }

        html += `<span class="page-info">第 ${pagination.currentPage} / ${pagination.totalPages} 页 (共 ${pagination.totalLogs} 条)</span>`;

        if (pagination.hasNext) {
            html += `<button onclick="adminManager.loadLogs(${pagination.currentPage + 1})" class="page-btn"><i class="fas fa-chevron-right"></i></button>`;
        }

        container.innerHTML = html;
    },

    // 清空日志
    clearLogs: async function() {
        try {
            const dateSelect = document.getElementById('log-date-select');
            const selectedDate = dateSelect?.value || '';

            const response = await this.fetchWithTimeout('/admin/logs', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    date: selectedDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '清空日志失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('日志已清空', 'success');
                this.loadLogs();
            } else {
                throw new Error(data.message || '清空日志失败');
            }
        } catch (error) {
            console.error('清空日志失败:', error);
            this.showNotification('清空日志失败: ' + error.message, 'error');
        }
    },

    // 显示清空日志模态框
    showClearLogsModal: function() {
        const dateSelect = document.getElementById('log-date-select');
        const selectedDate = dateSelect?.value || '';

        if (!selectedDate) {
            this.showNotification('请先选择日期', 'warning');
            return;
        }

        document.getElementById('clear-logs-date').textContent = selectedDate;
        document.getElementById('clearLogsModal').style.display = 'flex';
    },

    // 确认清空日志
    confirmClearLogs: async function() {
        this.closeModal('clearLogsModal');
        await this.clearLogs();
    },

    // 显示删除日志文件模态框
    showDeleteLogsModal: function() {
        const dateSelect = document.getElementById('log-date-select');
        const selectedDate = dateSelect?.value || '';

        if (!selectedDate) {
            this.showNotification('请先选择日期', 'warning');
            return;
        }

        document.getElementById('delete-logs-date').textContent = selectedDate;
        document.getElementById('deleteLogsModal').style.display = 'flex';
    },

    // 确认删除日志文件
    confirmDeleteLogs: async function() {
        try {
            this.closeModal('deleteLogsModal');

            const dateSelect = document.getElementById('log-date-select');
            const selectedDate = dateSelect?.value || '';

            if (!selectedDate) {
                this.showNotification('请先选择日期', 'warning');
                return;
            }

            const response = await this.fetchWithTimeout('/admin/logs/date', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    date: selectedDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '删除日志文件失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('日志文件已删除', 'success');
                this.loadLogDates();
                this.loadLogs();
            } else {
                throw new Error(data.message || '删除日志文件失败');
            }
        } catch (error) {
            console.error('删除日志文件失败:', error);
            this.showNotification('删除日志文件失败: ' + error.message, 'error');
        }
    },

    // 加载IP访问统计
    loadIpStats: async function() {
        try {
            const container = document.getElementById('ip-stats-list');
            if (!container) return;

            container.innerHTML = '<tr><td colspan="4" class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';

            // 加载摘要
            const summaryResponse = await this.fetchWithTimeout('/admin/ip-stats/summary');
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                if (summaryData.success) {
                    document.getElementById('ip-total-visits').textContent = summaryData.summary.totalVisits || 0;
                    document.getElementById('ip-unique-count').textContent = summaryData.summary.uniqueIps || 0;
                }
            }

            // 加载IP列表
            const response = await this.fetchWithTimeout('/admin/ip-stats?limit=100');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '加载IP统计失败');
            }

            const data = await response.json();

            if (data.success) {
                this.renderIpStatsList(data.stats);
            } else {
                throw new Error(data.message || '加载IP统计失败');
            }
        } catch (error) {
            console.error('加载IP统计失败:', error);
            this.showNotification('加载IP统计失败: ' + error.message, 'error');

            const container = document.getElementById('ip-stats-list');
            if (container) {
                container.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-network-wired"></i> 无IP统计数据</td></tr>';
            }
        }
    },

    // 渲染IP统计列表
    renderIpStatsList: function(stats) {
        const container = document.getElementById('ip-stats-list');
        if (!container) return;

        if (!stats || stats.length === 0) {
            container.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-network-wired"></i> 暂无IP访问记录</td></tr>';
            return;
        }

        container.innerHTML = stats.map(stat => `
            <tr>
                <td><code>${this.escapeHtml(stat.ip)}</code></td>
                <td><strong>${stat.count}</strong> 次</td>
                <td>${stat.lastAccess ? this.formatDate(stat.lastAccess) : '-'}</td>
                <td>
                    <button class="action-btn btn-danger" onclick="adminManager.clearIpStat('${this.escapeHtml(stat.ip)}')" title="清除">
                        <i class="fas fa-trash"></i> 清除
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 清除指定IP统计
    clearIpStat: async function(ip) {
        if (!confirm(`确定要清除 IP ${ip} 的访问统计吗？`)) {
            return;
        }

        try {
            const response = await this.fetchWithTimeout(`/admin/ip-stats/${encodeURIComponent(ip)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    ip: ip
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '清除IP统计失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification(`IP ${ip} 统计已清除`, 'success');
                this.loadIpStats();
            } else {
                throw new Error(data.message || '清除IP统计失败');
            }
        } catch (error) {
            console.error('清除IP统计失败:', error);
            this.showNotification('清除IP统计失败: ' + error.message, 'error');
        }
    },

    // 显示清除所有IP统计确认框
    showClearAllIpStatsModal: function() {
        if (confirm('确定要清除所有IP访问统计吗？此操作不可恢复！')) {
            this.clearAllIpStats();
        }
    },

    // 清除所有IP统计
    clearAllIpStats: async function() {
        try {
            const response = await this.fetchWithTimeout('/admin/ip-stats', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '清除所有IP统计失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('所有IP统计已清除', 'success');
                this.loadIpStats();
            } else {
                throw new Error(data.message || '清除所有IP统计失败');
            }
        } catch (error) {
            console.error('清除所有IP统计失败:', error);
            this.showNotification('清除所有IP统计失败: ' + error.message, 'error');
        }
    },

    // 加载配置
    loadConfig: async function() {
        try {
            const response = await this.fetchWithTimeout(`/admin/config?adminId=${this.state.currentAdmin.id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '加载配置失败');
            }

            const data = await response.json();

            if (data.success) {
                const config = data.config;
                
                // 填充配置到表单
                document.getElementById('upload-allowed-types').value = config.upload.allowedTypes.join(', ');
                document.getElementById('upload-max-size').value = config.upload.maxFileSize / (1024 * 1024);
                document.getElementById('upload-max-files').value = config.upload.maxFiles;
                document.getElementById('content-post-limit').value = config.contentLimits.post;
                document.getElementById('content-comment-limit').value = config.contentLimits.comment;
                document.getElementById('content-username-min').value = config.contentLimits.username.min;
                document.getElementById('content-username-max').value = config.contentLimits.username.max;
                document.getElementById('content-qq-min').value = config.contentLimits.qq.min;
                document.getElementById('content-qq-max').value = config.contentLimits.qq.max;
                document.getElementById('content-password-min').value = config.contentLimits.password.min;
                document.getElementById('pagination-default-page').value = config.pagination.defaultPage;
                document.getElementById('pagination-default-limit').value = config.pagination.defaultLimit;
                
                // 加载学校列表
                if (config.schools) {
                    this.renderSchoolsList(config.schools);
                }
            } else {
                throw new Error(data.message || '加载配置失败');
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showNotification('加载配置失败: ' + error.message, 'error');
        }
    },

    // 加载学校配置
    loadSchools: async function() {
        try {
            const response = await this.fetchWithTimeout('/schools');
            if (!response.ok) {
                throw new Error('加载学校配置失败');
            }

            const data = await response.json();

            if (data.success && data.schools) {
                this.renderSchoolsList(data.schools);
            }
        } catch (error) {
            console.error('加载学校配置失败:', error);
            this.showNotification('加载学校配置失败: ' + error.message, 'error');
        }
    },

    // 渲染学校列表
    renderSchoolsList: function(schools) {
        const schoolsList = document.getElementById('schools-list');
        if (!schoolsList) return;

        if (!schools || schools.length === 0) {
            schoolsList.innerHTML = '<div class="empty-state">暂无学校配置</div>';
            return;
        }

        schoolsList.innerHTML = schools.map(school => {
            // 生成班级信息显示
            let classInfoText = '';
            if (school.classInfo && Array.isArray(school.classInfo) && school.classInfo.length > 0) {
                const sortedClassInfo = [...school.classInfo].sort((a, b) => b.year - a.year);
                classInfoText = sortedClassInfo.map(info => `${info.year}年:${info.classCount}班`).join(', ');
            } else if (school.classCount) {
                classInfoText = `固定班级数: ${school.classCount}`;
            } else {
                classInfoText = '暂无班级配置';
            }

            return `
            <div class="school-item" data-school-id="${school.id}">
                <div class="school-info">
                    <h4>${this.escapeHtml(school.name)}</h4>
                    <p>${this.escapeHtml(classInfoText)}</p>
                </div>
                <div class="school-actions">
                    <button onclick="adminManager.editSchool('${school.id}')" class="action-btn btn-info" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button onclick="adminManager.deleteSchool('${school.id}', '${this.escapeHtml(school.name)}')" class="action-btn btn-danger" style="padding: 5px 10px;">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            `;
        }).join('');
    },

    // 显示添加学校模态框
    showAddSchoolModal: function() {
        document.getElementById('schoolModalTitle').textContent = '添加学校';
        document.getElementById('school-id').value = '';
        document.getElementById('school-id').disabled = false;
        document.getElementById('school-name').value = '';
        // 清空班级信息列表
        this.state.currentClassInfo = [];
        this.renderClassInfoList();
        // 清空输入框
        document.getElementById('new-class-year').value = '';
        document.getElementById('new-class-count').value = '';
        this.openModal('schoolModal');
    },

    // 编辑学校
    editSchool: async function(schoolId) {
        try {
            // 从后端获取最新配置
            const response = await this.fetchWithTimeout(`/admin/config?adminId=${this.state.currentAdmin.id}`);
            if (!response.ok) {
                throw new Error('获取配置失败');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || '获取配置失败');
            }

            const config = data.config;
            const school = config.schools.find(s => s.id === schoolId);

            if (!school) {
                this.showNotification('学校不存在', 'error');
                return;
            }

            document.getElementById('schoolModalTitle').textContent = '编辑学校';
            document.getElementById('school-id').value = school.id;
            document.getElementById('school-id').disabled = true;
            document.getElementById('school-name').value = school.name;

            // 加载班级信息
            this.state.currentClassInfo = school.classInfo && Array.isArray(school.classInfo) 
                ? [...school.classInfo] 
                : [];
            
            this.renderClassInfoList();

            // 清空输入框
            document.getElementById('new-class-year').value = '';
            document.getElementById('new-class-count').value = '';

            this.openModal('schoolModal');
        } catch (error) {
            console.error('加载学校信息失败:', error);
            this.showNotification('加载学校信息失败: ' + error.message, 'error');
        }
    },

    // 保存学校
    saveSchool: async function() {
        const schoolId = document.getElementById('school-id').value.trim();
        const schoolName = document.getElementById('school-name').value.trim();

        if (!schoolId) {
            this.showNotification('学校ID不能为空', 'error');
            return;
        }

        if (!schoolName) {
            this.showNotification('学校名称不能为空', 'error');
            return;
        }

        // 验证班级信息
        if (!this.state.currentClassInfo || this.state.currentClassInfo.length === 0) {
            this.showNotification('请至少添加一个入学年份的班级配置', 'error');
            return;
        }

        // 验证班级信息数据
        for (let i = 0; i < this.state.currentClassInfo.length; i++) {
            const info = this.state.currentClassInfo[i];
            if (!info.year || !info.classCount) {
                this.showNotification('班级配置数据不完整，请检查', 'error');
                return;
            }
            if (info.year < 2000 || info.year > 2100) {
                this.showNotification(`入学年份 ${info.year} 无效，请输入2000-2100之间的年份`, 'error');
                return;
            }
            if (info.classCount < 1 || info.classCount > 100) {
                this.showNotification(`班级数 ${info.classCount} 无效，请输入1-100之间的数字`, 'error');
                return;
            }
        }

        // 检查年份是否重复
        const years = this.state.currentClassInfo.map(info => info.year);
        const uniqueYears = new Set(years);
        if (years.length !== uniqueYears.size) {
            this.showNotification('入学年份不能重复', 'error');
            return;
        }

        // 获取当前配置
        try {
            const response = await this.fetchWithTimeout(`/admin/config?adminId=${this.state.currentAdmin.id}`);
            if (!response.ok) {
                throw new Error('获取配置失败');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || '获取配置失败');
            }

            const config = data.config;
            const schools = config.schools || [];

            // 检查是添加还是编辑
            const isEdit = schools.some(s => s.id === schoolId);

            if (isEdit) {
                // 编辑模式：更新学校
                const schoolIndex = schools.findIndex(s => s.id === schoolId);
                if (schoolIndex !== -1) {
                    schools[schoolIndex] = { 
                        id: schoolId, 
                        name: schoolName, 
                        classInfo: [...this.state.currentClassInfo] 
                    };
                }
            } else {
                // 添加模式：检查ID是否已存在
                if (schools.some(s => s.id === schoolId)) {
                    this.showNotification('学校ID已存在', 'error');
                    return;
                }
                schools.push({ 
                    id: schoolId, 
                    name: schoolName, 
                    classInfo: [...this.state.currentClassInfo] 
                });
            }

            // 保存配置
            const updateResponse = await this.fetchWithTimeout('/admin/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    updates: { schools }
                })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || '保存学校配置失败');
            }

            const updateData = await updateResponse.json();
            if (updateData.success) {
                this.showNotification('学校配置已保存', 'success');
                this.closeModal('schoolModal');
                this.loadSchools();
            } else {
                throw new Error(updateData.message || '保存学校配置失败');
            }
        } catch (error) {
            console.error('保存学校配置失败:', error);
            this.showNotification('保存学校配置失败: ' + error.message, 'error');
        }
    },

    // 添加班级信息
    addClassInfo: function() {
        const year = parseInt(document.getElementById('new-class-year').value);
        const count = parseInt(document.getElementById('new-class-count').value);

        if (!year || year < 2000 || year > 2100) {
            this.showNotification('请输入有效的入学年份（2000-2100）', 'error');
            return;
        }

        if (!count || count < 1 || count > 100) {
            this.showNotification('请输入有效的班级数（1-100）', 'error');
            return;
        }

        // 检查年份是否已存在
        if (this.state.currentClassInfo && this.state.currentClassInfo.some(info => info.year === year)) {
            this.showNotification(`入学年份 ${year} 已存在`, 'error');
            return;
        }

        // 添加到列表
        if (!this.state.currentClassInfo) {
            this.state.currentClassInfo = [];
        }
        this.state.currentClassInfo.push({ year, classCount: count });

        // 清空输入框
        document.getElementById('new-class-year').value = '';
        document.getElementById('new-class-count').value = '';

        // 重新渲染列表
        this.renderClassInfoList();
    },

    // 删除班级信息
    removeClassInfo: function(year) {
        if (!this.state.currentClassInfo) return;

        this.state.currentClassInfo = this.state.currentClassInfo.filter(info => info.year !== year);
        this.renderClassInfoList();
    },

    // 渲染班级信息列表
    renderClassInfoList: function() {
        const classInfoList = document.getElementById('class-info-list');
        if (!classInfoList) return;

        if (!this.state.currentClassInfo || this.state.currentClassInfo.length === 0) {
            classInfoList.innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 14px; color: #999;">暂无班级配置</div>';
            return;
        }

        // 按年份降序排列
        const sortedClassInfo = [...this.state.currentClassInfo].sort((a, b) => b.year - a.year);

        classInfoList.innerHTML = sortedClassInfo.map(info => `
            <div class="class-info-item">
                <span class="class-info-year">${info.year}年</span>
                <span class="class-info-count">${info.classCount}班</span>
                <button onclick="adminManager.removeClassInfo(${info.year})" class="action-btn btn-danger" style="padding: 3px 8px; font-size: 12px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    // 删除学校
    deleteSchool: function(schoolId, schoolName) {
        document.getElementById('deleteSchoolName').textContent = schoolName;
        document.getElementById('deleteSchoolId').value = schoolId;
        this.openModal('deleteSchoolModal');
    },

    // 确认删除学校
    confirmDeleteSchool: async function() {
        const schoolId = document.getElementById('deleteSchoolId').value;

        try {
            const response = await this.fetchWithTimeout(`/admin/config?adminId=${this.state.currentAdmin.id}`);
            if (!response.ok) {
                throw new Error('获取配置失败');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || '获取配置失败');
            }

            const config = data.config;
            const schools = config.schools || [];

            // 删除学校
            const filteredSchools = schools.filter(s => s.id !== schoolId);

            // 保存配置
            const updateResponse = await this.fetchWithTimeout('/admin/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    updates: { schools: filteredSchools }
                })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || '删除学校配置失败');
            }

            const updateData = await updateResponse.json();
            if (updateData.success) {
                this.showNotification('学校配置已删除', 'success');
                this.closeModal('deleteSchoolModal');
                this.loadSchools();
            } else {
                throw new Error(updateData.message || '删除学校配置失败');
            }
        } catch (error) {
            console.error('删除学校配置失败:', error);
            this.showNotification('删除学校配置失败: ' + error.message, 'error');
        }
    },

    // 保存配置
    saveConfig: async function() {
        try {
            const updates = {
                upload: {
                    allowedTypes: document.getElementById('upload-allowed-types').value.split(',').map(t => t.trim()).filter(t => t),
                    maxFileSize: parseInt(document.getElementById('upload-max-size').value) * 1024 * 1024,
                    maxFiles: parseInt(document.getElementById('upload-max-files').value)
                },
                contentLimits: {
                    post: parseInt(document.getElementById('content-post-limit').value),
                    comment: parseInt(document.getElementById('content-comment-limit').value),
                    username: {
                        min: parseInt(document.getElementById('content-username-min').value),
                        max: parseInt(document.getElementById('content-username-max').value)
                    },
                    qq: {
                        min: parseInt(document.getElementById('content-qq-min').value),
                        max: parseInt(document.getElementById('content-qq-max').value)
                    },
                    password: {
                        min: parseInt(document.getElementById('content-password-min').value)
                    }
                },
                pagination: {
                    defaultPage: parseInt(document.getElementById('pagination-default-page').value),
                    defaultLimit: parseInt(document.getElementById('pagination-default-limit').value)
                }
            };

            const response = await this.fetchWithTimeout('/admin/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    updates
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '保存配置失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('配置已保存并立即生效', 'success');
            } else {
                throw new Error(data.message || '保存配置失败');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showNotification('保存配置失败: ' + error.message, 'error');
        }
    },

    // 加载管理员列表
    loadAdmins: async function() {
        try {
            const response = await this.fetchWithTimeout(`/admin/admins?adminId=${this.state.currentAdmin.id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '加载管理员列表失败');
            }

            const data = await response.json();

            if (data.success) {
                this.renderAdminList(data.admins);
            } else {
                throw new Error(data.message || '加载管理员列表失败');
            }
        } catch (error) {
            console.error('加载管理员列表失败:', error);
            this.showNotification('加载管理员列表失败: ' + error.message, 'error');
        }
    },

    // 渲染管理员列表
    renderAdminList: function(admins) {
        const container = document.getElementById('admin-list');
        if (!container) return;

        if (!admins || admins.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-user-shield"></i> 暂无管理员</div>';
            return;
        }

        container.innerHTML = admins.map(admin => `
            <div class="admin-item">
                <div class="admin-info">
                    <div class="admin-name">
                        <i class="fas fa-user-shield"></i> ${this.escapeHtml(admin.username)}
                    </div>
                    <div class="admin-meta">
                        <span class="admin-id">ID: ${this.escapeHtml(admin.id)}</span>
                        ${admin.qq ? `<span class="admin-qq">QQ: ${this.escapeHtml(admin.qq)}</span>` : ''}
                    </div>
                </div>
                <div class="admin-actions">
                    <button onclick="adminManager.showDeleteAdminModal('${admin.id}', '${admin.username}')" 
                            class="action-btn btn-danger"
                            title="删除管理员">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
    },

    // 显示添加管理员模态框
    showAddAdminModal: function() {
        document.getElementById('newAdminId').value = '';
        this.openModal('addAdminModal');
    },

    // 确认添加管理员
    confirmAddAdmin: async function() {
        try {
            const newAdminId = document.getElementById('newAdminId').value.trim();

            if (!newAdminId) {
                this.showNotification('请输入用户ID或QQ号', 'warning');
                return;
            }

            const response = await this.fetchWithTimeout('/admin/admins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    newAdminId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '添加管理员失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('管理员已添加', 'success');
                this.closeModal('addAdminModal');
                this.loadAdmins();
            } else {
                throw new Error(data.message || '添加管理员失败');
            }
        } catch (error) {
            console.error('添加管理员失败:', error);
            this.showNotification('添加管理员失败: ' + error.message, 'error');
        }
    },

    // 显示删除管理员模态框
    showDeleteAdminModal: function(adminId, adminName) {
        document.getElementById('deleteAdminId').value = adminId;
        document.getElementById('deleteAdminName').textContent = adminName;
        this.openModal('deleteAdminModal');
    },

    // 确认删除管理员
    confirmDeleteAdmin: async function() {
        try {
            const targetAdminId = document.getElementById('deleteAdminId').value;

            const response = await this.fetchWithTimeout('/admin/admins', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    targetAdminId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '删除管理员失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('管理员已删除', 'success');
                this.closeModal('deleteAdminModal');
                this.loadAdmins();
            } else {
                throw new Error(data.message || '删除管理员失败');
            }
        } catch (error) {
            console.error('删除管理员失败:', error);
            this.showNotification('删除管理员失败: ' + error.message, 'error');
        }
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
        // 更新标题显示被封禁用户名
        const banModalTitle = document.querySelector('#banModal .modal-header h3');
        if (banModalTitle) banModalTitle.textContent = `封禁用户：${username}`;
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

    // 打开模态框
    openModal: function(modalId) {
        document.getElementById(modalId).style.display = 'flex';
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

    // 加载评论列表
    loadComments: async function(page = 1) {
        try {
            const container = document.getElementById('comments-list');
            if (!container) return;
            
            container.innerHTML = '<tr><td colspan="5" class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
            
            let url = `/admin/comments?page=${page}&limit=20`;
            if (this.state.searchQuery.comments) {
                url += `&search=${encodeURIComponent(this.state.searchQuery.comments)}`;
            }
            
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '加载评论列表失败');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderCommentsList(data.comments);
                this.renderPagination('comments', data.pagination);
                this.state.currentPage.comments = page;
            } else {
                throw new Error(data.message || '加载评论列表失败');
            }
        } catch (error) {
            console.error('加载评论列表失败:', error);
            this.showNotification('加载评论列表失败: ' + error.message, 'error');
            
            const container = document.getElementById('comments-list');
            if (container) {
                container.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-comments"></i> 无评论数据</td></tr>';
            }
        }
    },

    // 渲染评论列表
    renderCommentsList: function(comments) {
        const container = document.getElementById('comments-list');
        if (!container) return;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-comments"></i> 暂无评论</td></tr>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <tr>
                <td>
                    <div class="comment-content-preview" title="${this.escapeHtml(comment.content)}">
                        ${this.escapeHtml(comment.content.substring(0, 100))}${comment.content.length > 100 ? '...' : ''}
                    </div>
                </td>
                <td>
                    <strong>${comment.anonymous ? '匿名用户' : (comment.username || '未知用户')}</strong>
                    ${!comment.anonymous ? `
                    <div style="font-size: 12px; color: #666;">
                        ${comment.school || ''} ${comment.grade || ''} ${comment.className || ''}
                    </div>
                    ` : ''}
                </td>
                <td>
                    <div style="font-size: 12px; cursor: pointer; color: var(--primary-color);" onclick="adminManager.viewPostDetail('${comment.postId}')">
                        <i class="fas fa-external-link-alt"></i> 点击查看
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ID: ${comment.postId ? comment.postId.substring(0, 8) + '...' : 'N/A'}
                    </div>
                </td>
                <td>${this.formatDate(comment.timestamp)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-danger" onclick="adminManager.showDeleteCommentModal('${comment.id}', '${comment.postId}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // 搜索评论
    searchComments: function() {
        const query = document.getElementById('comments-search').value;
        this.state.searchQuery.comments = query;
        this.state.currentPage.comments = 1;
        this.loadComments(1);
    },

    // 显示删除评论模态框
    showDeleteCommentModal: function(commentId, postId) {
        this.state.selectedCommentId = commentId;
        this.state.selectedPostId = postId;
        document.getElementById('deleteCommentModal').style.display = 'flex';
        document.getElementById('deleteCommentReason').value = '违反论坛规定';
    },

    // 确认删除评论
    confirmDeleteComment: async function() {
        const commentId = this.state.selectedCommentId;
        const postId = this.state.selectedPostId;
        const reason = document.getElementById('deleteCommentReason').value;

        if (!reason.trim()) {
            this.showNotification('请输入删除原因', 'error');
            return;
        }

        try {
            const response = await this.fetchWithTimeout(`/admin/comments/${commentId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    postId: postId,
                    reason: reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '删除评论失败');
            }

            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.closeModal('deleteCommentModal');
                this.loadComments(this.state.currentPage.comments);
            }
        } catch (error) {
            console.error('删除评论失败:', error);
            this.showNotification('删除评论失败: ' + error.message, 'error');
        }
    },

    // 查看帖子详情
    viewPostDetail: async function(postId) {
        try {
            const response = await this.fetchWithTimeout(`/posts/${postId}`);
            if (!response.ok) {
                throw new Error('加载帖子详情失败');
            }

            const data = await response.json();
            
            if (data.success) {
                this.renderPostDetail(data.post);
                document.getElementById('viewPostModal').style.display = 'flex';
            } else {
                throw new Error(data.message || '加载帖子详情失败');
            }
        } catch (error) {
            console.error('加载帖子详情失败:', error);
            this.showNotification('加载帖子详情失败: ' + error.message, 'error');
        }
    },

    // 递归渲染评论树（包括所有嵌套回复）
    renderCommentsTree: function(comments, depth = 0) {
        if (!comments || comments.length === 0) {
            return '';
        }

        return comments.map(comment => {
            const repliesHtml = comment.replies && comment.replies.length > 0 
                ? `<div class="admin-comment-replies">${this.renderCommentsTree(comment.replies, depth + 1)}</div>` 
                : '';

            return `
                <div class="admin-comment-item" data-depth="${depth}">
                    <div class="comment-header">
                        <div class="comment-author">
                            <strong>${comment.anonymous ? '匿名用户' : (comment.username || '未知用户')}</strong>
                            ${comment.replyTo ? `<span class="reply-indicator">↳ 回复</span>` : ''}
                        </div>
                        <span class="comment-time">${this.formatDate(comment.timestamp)}</span>
                    </div>
                    <div class="comment-body">${this.renderMarkdownContent(comment.content)}</div>
                    ${repliesHtml}
                </div>
            `;
        }).join('');
    },

    // 渲染帖子详情
    renderPostDetail: function(post) {
        const container = document.getElementById('post-detail-content');
        if (!container) return;

        // 递归渲染评论列表（包括所有嵌套回复）
        const commentList = post.comments && post.comments.length > 0 ? 
            this.renderCommentsTree(post.comments) : 
            '<div class="empty-state">暂无评论</div>';

        // 渲染帖子内容（使用 Markdown）
        const renderedContent = this.renderMarkdownContent(post.content);

        // 渲染图片
        const imagesHtml = post.images && post.images.length > 0 ? 
            `<div class="post-images-gallery">
                ${post.images.map(img => `<img src="${img.url}" alt="图片" class="post-detail-image">`).join('')}
            </div>` : '';

        container.innerHTML = `
            <div class="admin-post-detail">
                <div class="post-detail-sidebar">
                    <div class="post-info-section">
                        <h4><i class="fas fa-user"></i> 作者信息</h4>
                        <p><strong>用户名：</strong>${post.anonymous ? '匿名用户' : (post.username || '未知用户')}</p>
                        ${!post.anonymous ? `
                        <p><strong>学校：</strong>${post.school || '未设置'}</p>
                        <p><strong>年级：</strong>${post.grade || '未设置'}</p>
                        <p><strong>班级：</strong>${post.className || '未设置'}</p>
                        ` : ''}
                        <p><strong>发布时间：</strong>${this.formatDate(post.timestamp)}</p>
                    </div>
                    
                    <div class="post-stats-section">
                        <h4><i class="fas fa-chart-line"></i> 统计数据</h4>
                        <p><strong>点赞数：</strong>${post.likes || 0}</p>
                        <p><strong>评论数：</strong>${post.comments ? post.comments.length : 0}</p>
                        <p><strong>浏览量：</strong>${post.viewCount || 0}</p>
                    </div>
                </div>
                
                <div class="post-detail-main">
                    <div class="post-content-section">
                        <h4><i class="fas fa-file-alt"></i> 帖子内容</h4>
                        <div class="post-body-scrollable">${renderedContent}</div>
                        ${imagesHtml}
                    </div>
                    
                    <div class="post-comments-section">
                        <h4><i class="fas fa-comments"></i> 评论列表</h4>
                        <div class="comments-list-scrollable">${commentList}</div>
                    </div>
                </div>
            </div>
        `;

        // 渲染 LaTeX 公式
        if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise([container]).catch((err) => console.error('MathJax typeset failed:', err));
        }
    },

    // 渲染 Markdown 内容
    renderMarkdownContent: function(text) {
        if (!text) return '';

        // 检查 markdown-it 是否已加载
        let markdownItGlobal = window.markdownit || window.markdownIt || window.markdown_it || window.MarkdownIt;
        
        if (!markdownItGlobal) {
            // 如果没有 markdown-it，使用简单的 HTML 转义
            return '<p>' + this.escapeHtml(text) + '</p>';
        }

        try {
            // 保护公式不被 markdown 处理
            const { protectedText, placeholders } = this.protectMathFormulas(text);
            
            const md = markdownItGlobal({
                html: true,
                linkify: true,
                typographer: true
            });
            const html = md.render(protectedText);
            
            // 恢复公式
            return this.restoreMathFormulas(html, placeholders);
        } catch (error) {
            console.error('Markdown 渲染失败:', error);
            return '<p>' + this.escapeHtml(text) + '</p>';
        }
    },

    // 保护数学公式不被 markdown 处理
    protectMathFormulas: function(text) {
        const placeholders = [];
        let index = 0;
        
        const replaceWithPlaceholder = (match) => {
            const placeholder = `MATHJAXPH${index}PH`;
            placeholders.push({ placeholder, formula: match });
            index++;
            return placeholder;
        };
        
        let protectedText = text.replace(/\$\$[\s\S]*?\$\$/g, replaceWithPlaceholder);
        protectedText = protectedText.replace(/\\[[\s\S]*?\\]/g, replaceWithPlaceholder);
        protectedText = protectedText.replace(/\$(?!\$)([^\$\n]+?)\$/g, replaceWithPlaceholder);
        protectedText = protectedText.replace(/\\\([\s\S]*?\\\)/g, replaceWithPlaceholder);
        
        return { protectedText, placeholders };
    },

    // 恢复数学公式
    restoreMathFormulas: function(html, placeholders) {
        let result = html;
        placeholders.forEach(({ placeholder, formula }) => {
            result = result.replace(new RegExp(placeholder, 'g'), formula);
        });
        return result;
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

    // 格式化日期时间（用于日志）
    formatDateTime: function(isoString) {
        if (!isoString) return '未知时间';

        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    },

    // 退出管理
    logout: function() {
        if (confirm('确定要退出管理后台吗？')) {
            window.location.href = 'index.html';
        }
    },

    // ========== 举报管理 ==========
    
    // 加载举报列表
    loadReports: async function(status = '') {
        try {
            let url = '/admin/reports';
            const params = new URLSearchParams();
            
            if (status && status !== 'all') {
                params.append('status', status);
            }
            
            // 添加类型筛选
            const typeFilter = document.getElementById('reports-type-filter')?.value;
            if (typeFilter) {
                params.append('targetType', typeFilter);
            }
            
            // 添加原因筛选
            const reasonFilter = document.getElementById('reports-reason-filter')?.value;
            if (reasonFilter) {
                params.append('reason', reasonFilter);
            }
            
            // 添加搜索
            const searchQuery = document.getElementById('reports-search')?.value?.trim();
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await this.fetchWithTimeout(url);
            
            const data = await response.json();
            
            if (data.success) {
                this.renderReports(data.reports);
                this.updateReportsStats();
            } else {
                throw new Error(data.message || '加载举报列表失败');
            }
        } catch (error) {
            console.error('加载举报列表失败:', error);
            document.getElementById('reports-list').innerHTML = `
                <div class="reports-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>加载失败</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },
    
    // 加载举报统计
    updateReportsStats: async function() {
        try {
            const response = await this.fetchWithTimeout('/admin/reports/stats');
            
            const data = await response.json();
            
            if (data.success) {
                const stats = data.stats;
                document.getElementById('reports-total').textContent = stats.total;
                document.getElementById('reports-pending').textContent = stats.pending;
                document.getElementById('reports-processed').textContent = stats.processed;
                document.getElementById('reports-rejected').textContent = stats.rejected;
                
                // 更新待处理徽章
                const pendingBadge = document.getElementById('pending-badge');
                if (pendingBadge) {
                    pendingBadge.textContent = stats.pending;
                    pendingBadge.style.display = stats.pending > 0 ? 'inline-flex' : 'none';
                }
            }
        } catch (error) {
            console.error('加载举报统计失败:', error);
        }
    },
    
    // 渲染举报列表 - 现代化卡片布局
    renderReports: function(reports) {
        const container = document.getElementById('reports-list');
        
        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="reports-empty">
                    <i class="fas fa-inbox"></i>
                    <h4>暂无举报记录</h4>
                    <p>当前筛选条件下没有举报数据</p>
                </div>
            `;
            return;
        }
        
        // 存储举报数据供详情查看使用
        this.state.reportsData = reports;
        
        container.innerHTML = reports.map(report => {
            const statusClass = report.status === 'pending' ? 'status-pending' : 
                               report.status === 'processed' ? 'status-processed' : 'status-rejected';
            const statusText = report.status === 'pending' ? '待处理' : 
                              report.status === 'processed' ? '已处理' : '已驳回';
            
            // 获取原因图标
            const reasonIcon = this.getReasonIcon(report.reason);
            
            // 获取时间显示
            const timeDisplay = this.formatRelativeTime(report.createdAt);
            
            return `
                <div class="report-card ${statusClass}">
                    <div class="report-card-header">
                        <div class="report-type-tag ${report.targetType}">
                            <i class="fas fa-${report.targetType === 'post' ? 'file-alt' : 'comment'}"></i>
                            ${report.targetType === 'post' ? '帖子举报' : '评论举报'}
                        </div>
                        <span class="report-status-tag ${report.status}">${statusText}</span>
                    </div>
                    
                    <div class="report-card-body">
                        <div class="report-reason-section">
                            <div class="reason-icon">
                                <i class="fas fa-${reasonIcon}"></i>
                            </div>
                            <div class="reason-info">
                                <span class="reason-label">举报原因</span>
                                <span class="reason-text">${this.escapeHtml(report.reasonText)}</span>
                            </div>
                        </div>
                        
                        <div class="report-content-preview">
                            <div class="preview-label">
                                <i class="fas fa-quote-left"></i> 被举报内容
                            </div>
                            <div class="preview-text">${this.escapeHtml(report.targetContent.substring(0, 150))}${report.targetContent.length > 150 ? '...' : ''}</div>
                        </div>
                    </div>
                    
                    <div class="report-card-footer">
                        <div class="report-meta">
                            <div class="meta-item">
                                <i class="fas fa-user-edit"></i>
                                举报人: <strong>${this.escapeHtml(report.reporterUsername || '未知')}</strong>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-user-slash"></i>
                                被举报: <strong>${this.escapeHtml(report.targetUsername || '未知')}</strong>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-clock"></i>
                                ${timeDisplay}
                            </div>
                        </div>
                        <div class="report-actions">
                            <button class="action-btn-sm view" onclick="adminManager.viewReportDetail('${report.id}')">
                                <i class="fas fa-eye"></i> 详情
                            </button>
                            ${report.status === 'pending' ? `
                                <button class="action-btn-sm approve" onclick="adminManager.showProcessModal('${report.id}', 'approve')">
                                    <i class="fas fa-check"></i> 处理
                                </button>
                                <button class="action-btn-sm reject" onclick="adminManager.showProcessModal('${report.id}', 'reject')">
                                    <i class="fas fa-times"></i> 驳回
                                </button>
                            ` : `
                                <span class="action-btn-sm processed">
                                    ${report.status === 'processed' ? `封禁 ${report.banDuration} 天` : '已驳回'}
                                </span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // 获取举报原因图标
    getReasonIcon: function(reason) {
        const icons = {
            'SPAM': 'ad',
            'HARASSMENT': 'angry',
            'INAPPROPRIATE': 'eye-slash',
            'COPYRIGHT': 'copyright',
            'FALSE_INFO': 'exclamation-triangle',
            'OTHER': 'question-circle'
        };
        return icons[reason] || 'flag';
    },
    
    // 格式化相对时间
    formatRelativeTime: function(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins} 分钟前`;
        if (diffHours < 24) return `${diffHours} 小时前`;
        if (diffDays < 7) return `${diffDays} 天前`;
        return this.formatDate(timestamp);
    },
    
    // 筛选举报
    filterReports: function(status) {
        // 更新标签状态
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.status === status) {
                tab.classList.add('active');
            }
        });
        
        this.state.currentReportStatus = status;
        this.loadReports(status);
    },
    
    // 按类型筛选
    filterReportsByType: function() {
        const status = this.state.currentReportStatus || 'all';
        this.loadReports(status);
    },
    
    // 按原因筛选
    filterReportsByReason: function() {
        const status = this.state.currentReportStatus || 'all';
        this.loadReports(status);
    },
    
    // 处理搜索
    handleReportsSearch: function(event) {
        if (event.key === 'Enter') {
            const status = this.state.currentReportStatus || 'all';
            this.loadReports(status);
        }
    },
    
    // 显示处理模态��
    showProcessModal: function(reportId, defaultAction) {
        const report = this.state.reportsData?.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('找不到举报信息', 'error');
            return;
        }
        
        document.getElementById('current-report-id').value = reportId;
        document.getElementById('process-report-type').textContent = report.targetType === 'post' ? '帖子' : '评论';
        document.getElementById('process-report-reason').textContent = report.reasonText;
        document.getElementById('process-target-user').textContent = report.targetUsername || '未知';
        
        // 设置默认操作
        const actionRadios = document.querySelectorAll('input[name="process-action"]');
        actionRadios.forEach(radio => {
            radio.checked = radio.value === defaultAction;
        });
        
        // 显示/隐藏封禁时长
        this.toggleBanDuration();
        
        // 重置备注
        document.getElementById('process-note').value = '';
        
        this.openModal('processReportModal');
    },
    
    // 切换封禁时长显示
    toggleBanDuration: function() {
        const selectedAction = document.querySelector('input[name="process-action"]:checked')?.value;
        const banDurationGroup = document.getElementById('ban-duration-group');
        banDurationGroup.style.display = selectedAction === 'approve' ? 'block' : 'none';
    },
    
    // 确认处理举报
    confirmProcessReport: async function() {
        const reportId = document.getElementById('current-report-id').value;
        const action = document.querySelector('input[name="process-action"]:checked')?.value;
        const banDuration = parseInt(document.getElementById('process-ban-duration').value);
        const note = document.getElementById('process-note').value.trim();
        
        if (!reportId || !action) {
            this.showNotification('参数错误', 'error');
            return;
        }
        
        const confirmText = action === 'approve' 
            ? `确定要通过此举报并封禁该用户 ${banDuration === 365 ? '永久' : banDuration + '天'}吗？`
            : '确定要驳回此举报吗？';
        
        if (!confirm(confirmText)) return;
        
        try {
            const response = await this.fetchWithTimeout(`/admin/reports/${reportId}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    banDuration: banDuration,
                    note: note
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(action === 'approve' ? '举报已处理，用户已被封禁' : '举报已驳回', 'success');
                this.closeModal('processReportModal');
                this.loadReports(this.state.currentReportStatus || 'all');
                this.updateReportsStats();
            } else {
                throw new Error(data.message || '处理失败');
            }
        } catch (error) {
            console.error('处理举报失败:', error);
            this.showNotification('处理举报失败: ' + error.message, 'error');
        }
    },
    
    // 处理举报（兼容旧版本调用）
    processReport: async function(reportId, action, note = '') {
        this.showProcessModal(reportId, action);
    },
    
    // 显示驳回模态框
    showRejectModal: function(reportId) {
        this.showProcessModal(reportId, 'reject');
    },
    
    // 查看举报详情
    viewReportDetail: function(reportId) {
        const report = this.state.reportsData?.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('找不到举报信息', 'error');
            return;
        }
        
        const statusClass = report.status === 'pending' ? 'pending' : 
                           report.status === 'processed' ? 'processed' : 'rejected';
        const statusText = report.status === 'pending' ? '待处理' : 
                          report.status === 'processed' ? '已处理' : '已驳回';
        
        const reasonIcon = this.getReasonIcon(report.reason);
        
        let processedInfo = '';
        if (report.status !== 'pending') {
            processedInfo = `
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-history"></i> 处理记录
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">处理时间</span>
                            <span class="detail-value">${this.formatDate(report.processedAt)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">处理结果</span>
                            <span class="detail-value">${report.result === 'violation_confirmed' ? '违规确认' : '未发现违规'}</span>
                        </div>
                        ${report.banDuration ? `
                        <div class="detail-item">
                            <span class="detail-label">封禁时长</span>
                            <span class="detail-value">${report.banDuration === 365 ? '永久封禁' : report.banDuration + '天'}</span>
                        </div>
                        ` : ''}
                        ${report.note ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">处理备注</span>
                            <span class="detail-value">${this.escapeHtml(report.note)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        const content = `
            <div class="detail-section">
                <div class="detail-status-banner ${statusClass}">
                    <span><i class="fas fa-${report.status === 'pending' ? 'clock' : report.status === 'processed' ? 'check-circle' : 'times-circle'}"></i> ${statusText}</span>
                    ${report.status === 'pending' ? '<span>等待管理员处理</span>' : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-info-circle"></i> 举报信息
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">举报类型</span>
                        <span class="detail-value">${report.targetType === 'post' ? '帖子举报' : '评论举报'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">举报原因</span>
                        <span class="detail-value">${this.escapeHtml(report.reasonText)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">举报人</span>
                        <span class="detail-value">${this.escapeHtml(report.reporterUsername || '未知')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">举��时间</span>
                        <span class="detail-value">${this.formatDate(report.createdAt)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-user-slash"></i> 被举报用户
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">用户名</span>
                        <span class="detail-value">${this.escapeHtml(report.targetUsername || '未知')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">用户ID</span>
                        <span class="detail-value">${report.targetUserId ? report.targetUserId.substring(0, 8) + '...' : '未知'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-file-alt"></i> 被举报内容
                </div>
                <div class="detail-content-box">
                    ${this.escapeHtml(report.targetContent)}
                </div>
            </div>
            
            ${processedInfo}
            
            ${report.status === 'pending' ? `
            <div class="detail-actions">
                <button class="action-btn btn-success" onclick="adminManager.closeModal('reportDetailModal'); adminManager.showProcessModal('${report.id}', 'approve')">
                    <i class="fas fa-check"></i> 通过举报
                </button>
                <button class="action-btn btn-warning" onclick="adminManager.closeModal('reportDetailModal'); adminManager.showProcessModal('${report.id}', 'reject')">
                    <i class="fas fa-times"></i> 驳回举报
                </button>
            </div>
            ` : ''}
        `;
        
        document.getElementById('report-detail-content').innerHTML = content;
        this.openModal('reportDetailModal');
    },

    // =============== 运行模式管理 ===============

    /**
     * 加载当前运行模式
     */
    loadRunMode: async function() {
        try {
            const response = await this.fetchWithTimeout('/run-mode');
            if (!response.ok) {
                throw new Error('获取运行模式失败');
            }

            const data = await response.json();
            if (data.success) {
                this.updateRunModeUI(data.data);
                return data.data;
            } else {
                throw new Error(data.message || '获取运行模式失败');
            }
        } catch (error) {
            console.error('加载运行模式失败:', error);
            // 设置默认状态
            this.updateRunModeUI({ mode: 'normal' });
            return null;
        }
    },

    /**
     * 更新运行模式 UI
     */
    updateRunModeUI: function(runModeData) {
        const mode = runModeData.mode || 'normal';
        
        // 更新当前模式显示
        const modeBadge = document.getElementById('current-mode-badge');
        if (modeBadge) {
            modeBadge.className = 'mode-badge mode-' + mode;
            const modeNames = {
                'normal': '正常',
                'debug': '调试',
                'maintenance': '维护',
                'self_destruct': '自毁'
            };
            modeBadge.textContent = modeNames[mode] || mode;
        }

        // 更新按钮状态
        const btnNormal = document.getElementById('btn-mode-normal');
        const btnDebug = document.getElementById('btn-mode-debug');
        const btnMaintenance = document.getElementById('btn-mode-maintenance');

        if (btnNormal) btnNormal.classList.toggle('active', mode === 'normal');
        if (btnDebug) btnDebug.classList.toggle('active', mode === 'debug');
        if (btnMaintenance) btnMaintenance.classList.toggle('active', mode === 'maintenance');

        // 显示/隐藏维护配置
        const maintenanceConfig = document.getElementById('maintenance-config');
        if (maintenanceConfig) {
            maintenanceConfig.style.display = mode === 'maintenance' ? 'block' : 'none';
        }

        // 如果是维护模式，更新维护消息
        if (mode === 'maintenance' && runModeData.maintenanceMessage) {
            const msgInput = document.getElementById('maintenance-message');
            if (msgInput) msgInput.value = runModeData.maintenanceMessage;
        }

        // 如果是自毁模式，显示警告
        if (mode === 'self_destruct') {
            this.showNotification('论坛当前处于自毁模式！', 'error');
        }
    },

    /**
     * 设置运行模式
     */
    setRunMode: async function(mode) {
        if (!this.state.currentAdmin) {
            this.showNotification('请先登录管理员账号', 'error');
            return;
        }

        const modeNames = {
            'normal': '正常',
            'debug': '调试',
            'maintenance': '维护'
        };

        if (!confirm(`确定要切换到${modeNames[mode]}模式吗？`)) {
            return;
        }

        try {
            const response = await this.fetchWithTimeout('/admin/run-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: mode,
                    adminId: this.state.currentAdmin.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '设置运行模式失败');
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification(`已切换到${modeNames[mode]}模式`, 'success');
                this.updateRunModeUI({ mode: mode });
                
                // 如果是维护模式，显示特殊提示
                if (mode === 'maintenance') {
                    this.showNotification('维护模式已启用，普通用户将无法访问论坛', 'warning');
                }
            } else {
                throw new Error(data.message || '设置运行模式失败');
            }
        } catch (error) {
            console.error('设置运行模式失败:', error);
            this.showNotification('设置运行模式失败: ' + error.message, 'error');
        }
    },

    /**
     * 显示维护模式设置模态框
     */
    showMaintenanceModal: function() {
        const msgInput = document.getElementById('maintenance-message');
        const modalInput = document.getElementById('maintenance-modal-message');
        
        if (msgInput && modalInput) {
            modalInput.value = msgInput.value || '网站正在维护中，请稍后再试';
        }
        
        this.openModal('maintenanceModal');
    },

    /**
     * 确认启用维护模式
     */
    confirmMaintenanceMode: async function() {
        if (!this.state.currentAdmin) {
            this.showNotification('请先登录管理员账号', 'error');
            return;
        }

        const message = document.getElementById('maintenance-modal-message')?.value || 
                       '网站正在维护中，请稍后再试';

        try {
            const response = await this.fetchWithTimeout('/admin/run-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: 'maintenance',
                    adminId: this.state.currentAdmin.id,
                    maintenanceMessage: message
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '启用维护模式失败');
            }

            const data = await response.json();

            if (data.success) {
                this.closeModal('maintenanceModal');
                this.showNotification('维护模式已启用', 'success');
                this.updateRunModeUI({ mode: 'maintenance', maintenanceMessage: message });
                
                // 更新维护消息输入框
                const msgInput = document.getElementById('maintenance-message');
                if (msgInput) msgInput.value = message;
            } else {
                throw new Error(data.message || '启用维护模式失败');
            }
        } catch (error) {
            console.error('启用维护模式失败:', error);
            this.showNotification('启用维护模式失败: ' + error.message, 'error');
        }
    },

    /**
     * 显示自毁模式确认模态框
     */
    showSelfDestructModal: function(level) {
        const levelInfo = {
            3: {
                title: '三级自毁 - 删除所有内容',
                desc: '删除所有帖子、评论、私信、通知、收藏、关注等数据。用户账号将被保留。',
                confirmation: '确认删除所有内容',
                color: '#f59e0b'
            },
            2: {
                title: '二级自毁 - 清空数据库',
                desc: '清空整个数据库，删除所有集合和数据。此操作将删除所有用户、帖子、评论等所有信息。',
                confirmation: '确认清空数据库',
                color: '#ef4444'
            },
            1: {
                title: '一级自毁 - 删除论坛文件',
                desc: '删除论坛相关文件和代码，包括前端资源、后端源代码等。此操作将导致论坛完全无法运行！',
                confirmation: '确认销毁论坛',
                color: '#dc2626'
            }
        };

        const info = levelInfo[level];
        if (!info) return;

        // 填充模态框内容
        const destructInfo = document.getElementById('destruct-info');
        if (destructInfo) {
            destructInfo.innerHTML = `
                <h4 style="color: ${info.color}; margin-bottom: 10px;">${info.title}</h4>
                <p>${info.desc}</p>
                <div class="destruct-level-indicator" style="margin-top: 15px;">
                    <span class="level-label">自毁级别：</span>
                    <span class="level-value" style="color: ${info.color}; font-weight: bold; font-size: 18px;">${level}级</span>
                </div>
            `;
        }

        // 设置确认提示
        const hint = document.getElementById('confirmation-hint');
        if (hint) {
            hint.innerHTML = `请输入 "<strong>${info.confirmation}</strong>" 以确认操作`;
        }

        // 设置确认输入框的占位符
        const confirmationInput = document.getElementById('destruct-confirmation');
        if (confirmationInput) {
            confirmationInput.value = '';
            confirmationInput.placeholder = info.confirmation;
        }

        // 存储当前自毁级别
        this.state.currentDestructLevel = level;
        this.state.destructConfirmation = info.confirmation;

        this.openModal('selfDestructModal');
    },

    /**
     * 确认执行自毁模式
     */
    confirmSelfDestruct: async function() {
        if (!this.state.currentAdmin) {
            this.showNotification('请先登录管理员账号', 'error');
            return;
        }

        const level = this.state.currentDestructLevel;
        const expectedConfirmation = this.state.destructConfirmation;
        const actualConfirmation = document.getElementById('destruct-confirmation')?.value;

        // 验证确认字符串
        if (actualConfirmation !== expectedConfirmation) {
            this.showNotification('确认字符串不正确，请重新输入', 'error');
            return;
        }

        // 最后一次确认
        if (!confirm(`确定要执行${level}级自毁吗？此操作不可恢复！`)) {
            return;
        }

        // 再次确认（针对危险操作）
        if (level <= 2) {
            const finalConfirm = prompt(`这是最后一步确认！\n请再次输入 "${expectedConfirmation}" 以确认执行：`);
            if (finalConfirm !== expectedConfirmation) {
                this.showNotification('确认取消', 'info');
                return;
            }
        }

        try {
            this.closeModal('selfDestructModal');
            this.showNotification(`正在执行${level}级自毁...`, 'warning');

            const endpoint = `/admin/self-destruct/level${level}`;
            
            const response = await this.fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: this.state.currentAdmin.id,
                    confirmation: expectedConfirmation
                }),
                timeout: 60000  // 自毁操作使用 60 秒超时
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '自毁操作执行失败');
            }

            const data = await response.json();

            if (data.success) {
                let message = `${level}级自毁执行完成`;
                
                if (level === 3 && data.data) {
                    message += `：已删除 ${data.data.posts || 0} 个帖子`;
                } else if (level === 2 && data.data) {
                    message += `：已删除 ${data.data.droppedCollections || 0} 个集合`;
                } else if (level === 1 && data.data) {
                    message += `：已删除 ${data.data.deletedCount || 0} 个文件`;
                }
                
                this.showNotification(message, 'success');
                this.updateRunModeUI({ mode: 'self_destruct', selfDestructLevel: level });

                // 如果是一级自毁，提示服务器可能需要重启
                if (level === 1) {
                    setTimeout(() => {
                        alert('一级自毁已完成！论坛文件已被删除，服务器可能需要重启才能继续运行。');
                    }, 1000);
                }
            } else {
                throw new Error(data.message || '自毁操作执行失败');
            }
        } catch (error) {
            console.error('自毁操作执行失败:', error);
            this.showNotification('自毁操作执行失败: ' + error.message, 'error');
        }
    },
    
    // ==================== 公告管理功能 ====================
    
    // 公告状态
    announcementsState: {
        list: [],
        page: 1,
        limit: 10,
        total: 0
    },
    
    // 加载公告列表
    loadAnnouncements: async function(page = 1) {
        try {
            this.announcementsState.page = page;
            const skip = (page - 1) * this.announcementsState.limit;
            
            const response = await this.fetchWithTimeout(
                `/admin/announcements?page=${page}&limit=${this.announcementsState.limit}`
            );
            
            if (!response.ok) throw new Error('加载公告失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.announcementsState.list = data.announcements;
                this.announcementsState.total = data.pagination.total;
                
                this.renderAnnouncementsList(data.announcements);
                this.renderAnnouncementsPagination(data.pagination);
                this.updateAnnouncementsStats(data.announcements, data.pagination.total);
            }
        } catch (error) {
            console.error('加载公告失败:', error);
            this.showNotification('加载公告失败: ' + error.message, 'error');
            document.getElementById('announcements-list').innerHTML = 
                '<div class="empty-state"><i class="fas fa-inbox"></i> 暂无公告</div>';
        }
    },
    
    // 渲染公告列表
    renderAnnouncementsList: function(announcements) {
        const container = document.getElementById('announcements-list');
        if (!container) return;
        
        if (!announcements || announcements.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bullhorn"></i> 暂无公告</div>';
            return;
        }
        
        container.innerHTML = announcements.map(announcement => {
            const typeClass = `type-${announcement.type}`;
            const statusClass = announcement.isActive ? 'status-active' : 'status-inactive';
            const pinnedIcon = announcement.isPinned ? '<i class="fas fa-thumbtack pinned-icon" title="已置顶"></i>' : '';
            const positionText = {
                'top': '顶部横幅',
                'popup': '弹窗提示',
                'list': '列表展示'
            }[announcement.displayPosition] || announcement.displayPosition;
            
            return `
                <div class="announcement-card ${typeClass} ${statusClass}">
                    <div class="announcement-header">
                        <div class="announcement-title">
                            ${pinnedIcon}
                            <span>${this.escapeHtml(announcement.title)}</span>
                        </div>
                        <div class="announcement-badges">
                            <span class="badge type-badge ${announcement.type}">${this.getAnnouncementTypeText(announcement.type)}</span>
                            <span class="badge position-badge">${positionText}</span>
                            ${announcement.isActive ? 
                                '<span class="badge status-badge active">已启用</span>' : 
                                '<span class="badge status-badge inactive">已禁用</span>'}
                        </div>
                    </div>
                    <div class="announcement-content">
                        ${this.escapeHtml(announcement.content).substring(0, 150)}${announcement.content.length > 150 ? '...' : ''}
                    </div>
                    <div class="announcement-meta">
                        <span><i class="fas fa-user"></i> ${announcement.createdBy?.username || '未知'}</span>
                        <span><i class="fas fa-clock"></i> ${this.formatDate(announcement.createdAt)}</span>
                        <span><i class="fas fa-eye"></i> ${announcement.viewCount || 0} 次浏览</span>
                    </div>
                    <div class="announcement-actions">
                        <button onclick="adminManager.toggleAnnouncementStatus('${announcement._id}', ${announcement.isActive})" 
                                class="action-btn ${announcement.isActive ? 'btn-warning' : 'btn-success'}" 
                                title="${announcement.isActive ? '禁用' : '启用'}">
                            <i class="fas fa-${announcement.isActive ? 'pause' : 'play'}"></i>
                        </button>
                        <button onclick="adminManager.toggleAnnouncementPinned('${announcement._id}', ${announcement.isPinned})" 
                                class="action-btn ${announcement.isPinned ? 'btn-primary' : 'btn-default'}" 
                                title="${announcement.isPinned ? '取消置顶' : '置顶'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button onclick="adminManager.editAnnouncement('${announcement._id}')" 
                                class="action-btn btn-info" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="adminManager.showDeleteAnnouncementModal('${announcement._id}', '${this.escapeHtml(announcement.title)}')" 
                                class="action-btn btn-danger" title="删除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // 更新公告统计
    updateAnnouncementsStats: function(announcements, totalCount) {
        const active = announcements.filter(a => a.isActive).length;
        const pinned = announcements.filter(a => a.isPinned).length;
        
        // 总数使用服务端分页返回的总量，而非当前页的数组长度
        document.getElementById('announcements-total').textContent = totalCount !== undefined ? totalCount : announcements.length;
        document.getElementById('announcements-active').textContent = active;
        document.getElementById('announcements-pinned').textContent = pinned;
    },
    
    // 渲染公告分页
    renderAnnouncementsPagination: function(pagination) {
        const container = document.getElementById('announcements-pagination');
        if (!container) return;
        
        const { total, page, totalPages } = pagination;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // 上一页
        html += `<button ${page <= 1 ? 'disabled' : ''} onclick="adminManager.loadAnnouncements(${page - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // 页码
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="adminManager.loadAnnouncements(${i})">${i}</button>`;
        }
        
        // 下一页
        html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="adminManager.loadAnnouncements(${page + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        container.innerHTML = html;
    },
    
    // 获取公告类型文本
    getAnnouncementTypeText: function(type) {
        const types = {
            'info': '普通',
            'success': '成功',
            'warning': '警告',
            'danger': '危险'
        };
        return types[type] || type;
    },
    
    // 显示添加公告模态框
    showAddAnnouncementModal: function() {
        document.getElementById('announcementModalTitle').innerHTML = '<i class="fas fa-bullhorn"></i> 发布公告';
        document.getElementById('announcement-title').value = '';
        document.getElementById('announcement-content').value = '';
        document.getElementById('announcement-type').value = 'info';
        document.getElementById('announcement-position').value = 'top';
        document.getElementById('announcement-start-time').value = '';
        document.getElementById('announcement-end-time').value = '';
        document.getElementById('announcement-is-active').checked = true;
        document.getElementById('announcement-is-pinned').checked = false;
        document.getElementById('announcement-edit-id').value = '';
        document.getElementById('announcement-char-count').textContent = '0';
        
        this.openModal('announcementModal');
    },
    
    // 编辑公告
    editAnnouncement: async function(id) {
        try {
            const response = await this.fetchWithTimeout(`/announcements/${id}`);
            if (!response.ok) throw new Error('获取公告详情失败');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            const announcement = data.announcement;
            
            document.getElementById('announcementModalTitle').innerHTML = '<i class="fas fa-edit"></i> 编辑公告';
            document.getElementById('announcement-title').value = announcement.title;
            document.getElementById('announcement-content').value = announcement.content;
            document.getElementById('announcement-type').value = announcement.type;
            document.getElementById('announcement-position').value = announcement.displayPosition;
            document.getElementById('announcement-start-time').value = announcement.startTime ? 
                new Date(announcement.startTime).toISOString().slice(0, 16) : '';
            document.getElementById('announcement-end-time').value = announcement.endTime ? 
                new Date(announcement.endTime).toISOString().slice(0, 16) : '';
            document.getElementById('announcement-is-active').checked = announcement.isActive;
            document.getElementById('announcement-is-pinned').checked = announcement.isPinned;
            document.getElementById('announcement-edit-id').value = id;
            document.getElementById('announcement-char-count').textContent = announcement.content.length;
            
            this.openModal('announcementModal');
        } catch (error) {
            console.error('获取公告详情失败:', error);
            this.showNotification('获取公告详情失败: ' + error.message, 'error');
        }
    },
    
    // 保存公告
    saveAnnouncement: async function() {
        try {
            const title = document.getElementById('announcement-title').value.trim();
            const content = document.getElementById('announcement-content').value.trim();
            
            if (!title) {
                this.showNotification('请输入公告标题', 'error');
                return;
            }
            
            if (!content) {
                this.showNotification('请输入公告内容', 'error');
                return;
            }
            
            const announcementData = {
                title,
                content,
                type: document.getElementById('announcement-type').value,
                displayPosition: document.getElementById('announcement-position').value,
                isActive: document.getElementById('announcement-is-active').checked,
                isPinned: document.getElementById('announcement-is-pinned').checked,
                startTime: document.getElementById('announcement-start-time').value || null,
                endTime: document.getElementById('announcement-end-time').value || null
            };
            
            const editId = document.getElementById('announcement-edit-id').value;
            const isEdit = !!editId;
            
            const url = isEdit ? `/admin/announcements/${editId}` : '/admin/announcements';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.fetchWithTimeout(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '保存失败');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(isEdit ? '公告更新成功' : '公告发布成功', 'success');
                this.closeModal('announcementModal');
                this.loadAnnouncements(this.announcementsState.page);
            } else {
                throw new Error(data.message || '保存失败');
            }
        } catch (error) {
            console.error('保存公告失败:', error);
            this.showNotification('保存公告失败: ' + error.message, 'error');
        }
    },
    
    // 切换公告状态
    toggleAnnouncementStatus: async function(id, currentStatus) {
        try {
            const response = await this.fetchWithTimeout(
                `/admin/announcements/${id}/toggle-status`,
                { method: 'PATCH' }
            );
            
            if (!response.ok) throw new Error('切换状态失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.loadAnnouncements(this.announcementsState.page);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('切换公告状态失败:', error);
            this.showNotification('切换状态失败: ' + error.message, 'error');
        }
    },
    
    // 切换置顶状态
    toggleAnnouncementPinned: async function(id, currentPinned) {
        try {
            const response = await this.fetchWithTimeout(
                `/admin/announcements/${id}/toggle-pinned`,
                { method: 'PATCH' }
            );
            
            if (!response.ok) throw new Error('切换置顶失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.loadAnnouncements(this.announcementsState.page);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('切换置顶状态失败:', error);
            this.showNotification('切换置顶失败: ' + error.message, 'error');
        }
    },
    
    // 显示删除公告确认框
    showDeleteAnnouncementModal: function(id, title) {
        document.getElementById('delete-announcement-id').value = id;
        document.getElementById('delete-announcement-title').textContent = title;
        this.openModal('deleteAnnouncementModal');
    },
    
    // 确认删除公告
    confirmDeleteAnnouncement: async function() {
        try {
            const id = document.getElementById('delete-announcement-id').value;
            
            const response = await this.fetchWithTimeout(
                `/admin/announcements/${id}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) throw new Error('删除失败');
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('公告已删除', 'success');
                this.closeModal('deleteAnnouncementModal');
                this.loadAnnouncements(this.announcementsState.page);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('删除公告失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
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

function searchComments() {
    adminManager.searchComments();
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

function confirmDeleteComment() {
    adminManager.confirmDeleteComment();
}

// 日志管理函数
function loadLogs(page) {
    adminManager.loadLogs(page);
}

function refreshLogs() {
    adminManager.loadLogs();
}

function clearLogs() {
    if (confirm('确定要清空所有日志吗？此操作不可恢复！')) {
        adminManager.clearLogs();
    }
}

function logout() {
    adminManager.logout();
}

// IP统计管理函数
function loadIpStats() {
    adminManager.loadIpStats();
}

// 公告管理函数
function loadAnnouncements(page) {
    adminManager.loadAnnouncements(page);
}

// 初始化管理员系统 - 最终版
document.addEventListener('DOMContentLoaded', () => {
  adminManager.init().catch(error => {
    console.error('管理员系统初始化失败:', error);
    // 初始化失败时跳转到首页
    window.location.href = 'index.html';
  });
});
