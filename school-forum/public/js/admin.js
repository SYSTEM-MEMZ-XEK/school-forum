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
      当前管理员: ${this.state.currentAdmin.username} <span style="color: #dc2626; margin-left: 5px; font-size: 14px;">管理员</span> |
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
      window.location.href = '/index.html';
      return false;
    }
    
    // 检查用户状态
    if (user.isActive === false) {
      alert('您的账号已被禁用，无法访问管理员面板');
      window.location.href = '/index.html';
      return false;
    }
    
    this.state.currentAdmin = user;
    console.log('管理员验证通过，当前管理员:', user.username);
    return true;
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    alert('管理员权限验证失败');
    window.location.href = '/index.html';
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

            const level = this.currentLogLevel || 'ALL';
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
                this.updateLogStats(data.logs);
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
    updateLogStats: function(logs) {
        const stats = {
            total: logs.length,
            info: 0,
            warn: 0,
            error: 0,
            success: 0
        };

        logs.forEach(log => {
            const level = log.level.toUpperCase();
            if (stats[level] !== undefined) {
                stats[level]++;
            }
        });

        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-info').textContent = stats.info;
        document.getElementById('stat-warn').textContent = stats.warn;
        document.getElementById('stat-error').textContent = stats.error;
        document.getElementById('stat-success').textContent = stats.success;
    },

    // 过滤日志级别
    filterLogsByLevel: function(level) {
        this.currentLogLevel = level;

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
            container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i> 暂无日志</div>';
            return;
        }

        container.innerHTML = logs.map(log => {
            const levelClass = this.getLogLevelClass(log.level);
            const levelIcon = this.getLogLevelIcon(log.level);
            const timestamp = this.formatDateTime(log.timestamp);

            return `
                <div class="log-item ${levelClass}">
                    <div class="log-header">
                        <div class="log-time">
                            <i class="fas fa-clock"></i>
                            ${timestamp}
                        </div>
                        <div class="log-level-badge ${levelClass}">
                            <i class="${levelIcon}"></i>
                            ${log.level}
                        </div>
                    </div>
                    <div class="log-message">${this.escapeHtml(log.message)}</div>
                    ${log.data ? `
                        <div class="log-data-container">
                            <details>
                                <summary class="log-data-toggle">
                                    <i class="fas fa-code"></i> 查看数据
                                </summary>
                                <pre class="log-data">${this.escapeHtml(JSON.stringify(log.data, null, 2))}</pre>
                            </details>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // 获取日志级别样式
    getLogLevelClass: function(level) {
        const classes = {
            'INFO': 'log-info',
            'WARN': 'log-warn',
            'ERROR': 'log-error',
            'SUCCESS': 'log-success',
            'USER': 'log-user',
            'SYSTEM': 'log-system',
            'SECURITY': 'log-security'
        };
        return classes[level] || 'log-info';
    },

    // 获取日志级别图标
    getLogLevelIcon: function(level) {
        const icons = {
            'INFO': 'fas fa-info-circle',
            'WARN': 'fas fa-exclamation-triangle',
            'ERROR': 'fas fa-times-circle',
            'SUCCESS': 'fas fa-check-circle',
            'USER': 'fas fa-user',
            'SYSTEM': 'fas fa-cog',
            'SECURITY': 'fas fa-shield-alt'
        };
        return icons[level] || 'fas fa-info-circle';
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
            html += `<button onclick="loadLogs(${pagination.currentPage - 1})" class="page-btn"><i class="fas fa-chevron-left"></i></button>`;
        }

        html += `<span class="page-info">第 ${pagination.currentPage} / ${pagination.totalPages} 页 (共 ${pagination.totalLogs} 条)</span>`;

        if (pagination.hasNext) {
            html += `<button onclick="loadLogs(${pagination.currentPage + 1})" class="page-btn"><i class="fas fa-chevron-right"></i></button>`;
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
            } else {
                throw new Error(data.message || '加载配置失败');
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showNotification('加载配置失败: ' + error.message, 'error');
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
                this.showNotification('配置已保存，重启后生效', 'success');
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
            const md = markdownItGlobal({
                html: true,
                linkify: true,
                typographer: true
            });
            return md.render(text);
        } catch (error) {
            console.error('Markdown 渲染失败:', error);
            return '<p>' + this.escapeHtml(text) + '</p>';
        }
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
function loadLogs() {
    adminManager.loadLogs();
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
// 初始化管理员系统 - 最终版
document.addEventListener('DOMContentLoaded', () => {
  adminManager.init().catch(error => {
    console.error('管理员系统初始化失败:', error);
    // 初始化失败时跳转到首页
    window.location.href = 'index.html';
  });
});
