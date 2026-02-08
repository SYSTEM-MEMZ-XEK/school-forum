// 用户管理模块
const userManager = {
  // 全局状态
  state: {
    currentUser: null,
    settings: {
      theme: 'light' // 默认主题：light（明亮）或 dark（暗色）
    }
  },

  // DOM元素
  dom: {
    username: document.getElementById('username'),
    userClass: document.getElementById('user-class'),
    notificationArea: document.getElementById('notificationArea'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn')
  },

  // 初始化
  init: function() {
    this.checkAutoLogin();
  },

  // 检查自动登录
  checkAutoLogin: function() {
    console.log('checkAutoLogin: 开始检查自动登录状态');
    const savedUser = localStorage.getItem('forumUser');
    console.log('checkAutoLogin: localStorage中的forumUser数据:', savedUser ? '存在' : '不存在');
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('checkAutoLogin: 解析用户数据成功，用户名:', user.username);
        console.log('checkAutoLogin: 是否为管理员:', user.isAdmin);
        this.state.currentUser = user;
        // 加载用户设置
        this.loadSettings(user);
        this.updateUserUI(user);
        utils.showNotification(`欢迎回来，${user.username}！`, 'success');
      } catch (error) {
        console.error('checkAutoLogin: 解析用户数据失败:', error);
        // 清除无效数据
        localStorage.removeItem('forumUser');
        this.updateImageUploadStatus(null);
      }
    } else {
      console.log('checkAutoLogin: 用户未登录，更新图片上传状态');
      // 未登录时也需要更新图片上传状态
      this.updateImageUploadStatus(null);
    }
    console.log('checkAutoLogin: 完成');
  },

  // 更新用户界面
  updateUserUI: function(user) {
    console.log('updateUserUI: 开始更新用户界面，用户信息:', user);
    
    // 注意：不再检查user-panel元素，因为侧边栏用户面板已被移除
    
    if (user) {
      console.log('updateUserUI: 用户已登录，用户名:', user.username);
      // 显示毕业状态
      const gradeDisplay = user.grade === "已毕业" ? 
        `已毕业 (${user.enrollmentYear}级)` : 
        `${user.school} ${user.grade} ${user.className}`;
      
      if (this.dom.username) this.dom.username.textContent = user.username;
      if (this.dom.userClass) this.dom.userClass.textContent = gradeDisplay;
      
      // 更新按钮状态
      if (this.dom.loginBtn) this.dom.loginBtn.style.display = 'none';
      if (this.dom.registerBtn) this.dom.registerBtn.style.display = 'none';
      
      // 添加消息图标按钮
      if (!document.getElementById('message-btn')) {
        const messageBtn = document.createElement('button');
        messageBtn.id = 'message-btn';
        messageBtn.innerHTML = '<i class="fas fa-bell"></i> 消息';
        messageBtn.className = 'message-button';
        messageBtn.title = '查看消息通知';
        if (document.getElementById('user-actions')) {
          document.getElementById('user-actions').appendChild(messageBtn);
        }
        
        // 添加事件监听
        messageBtn.addEventListener('click', () => {
          window.location.href = 'message.html';
        });
      }
      
      // 添加设置按钮
      if (!document.getElementById('settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.innerHTML = '<i class="fas fa-cog"></i> 设置';
        settingsBtn.className = 'message-button';
        settingsBtn.title = '用户设置';
        if (document.getElementById('user-actions')) {
          document.getElementById('user-actions').appendChild(settingsBtn);
        }
        
        // 添加事件监听
        settingsBtn.addEventListener('click', () => {
          window.location.href = 'settings.html';
        });
      }
      
      // 添加退出按钮
      if (!document.getElementById('logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 退出';
        logoutBtn.className = 'logout-button';
        if (document.getElementById('user-actions')) {
          document.getElementById('user-actions').appendChild(logoutBtn);
        }
        
        // 添加事件监听
        logoutBtn.addEventListener('click', () => this.logoutUser());
      }
    } else {
      if (this.dom.username) this.dom.username.textContent = '访客';
      if (this.dom.userClass) this.dom.userClass.textContent = '请登录查看信息';
      
      // 更新按钮状态
      if (this.dom.loginBtn) this.dom.loginBtn.style.display = 'inline-block';
      if (this.dom.registerBtn) this.dom.registerBtn.style.display = 'inline-block';
      
      // 移除消息图标按钮
      const messageBtn = document.getElementById('message-btn');
      if (messageBtn) {
        messageBtn.remove();
      }
      
      // 移除设置按钮
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        settingsBtn.remove();
      }
      
      // 移除退出按钮
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.remove();
      }
    }
    
    // 更新图片上传区域状态
    this.updateImageUploadStatus(user);
    this.fillPostFormWithUserData(user);
    
    // 更新顶栏用户头像
    this.updateHeaderUserAvatar(user);
  },

  // 更新顶栏用户头像
  updateHeaderUserAvatar: function(user) {
    console.log('updateHeaderUserAvatar: 开始更新顶栏头像，用户信息:', user);
    
    const headerAvatar = document.getElementById('header-user-avatar');
    const headerUsername = document.getElementById('header-username');
    const headerUserClass = document.getElementById('header-user-class');
    const headerLogoutBtn = document.getElementById('header-logout-btn');
    
    console.log('updateHeaderUserAvatar: 获取的元素 - headerAvatar:', headerAvatar, 'headerUsername:', headerUsername, 'headerUserClass:', headerUserClass, 'headerLogoutBtn:', headerLogoutBtn);
    
    if (headerAvatar && headerUsername && headerUserClass) {
      console.log('updateHeaderUserAvatar: 所有必需元素都存在');
      
      if (user) {
        console.log('updateHeaderUserAvatar: 用户已登录，用户名:', user.username);
        // 显示毕业状态
        const gradeDisplay = user.grade === "已毕业" ? 
          `已毕业 (${user.enrollmentYear}级)` : 
          `${user.school} ${user.grade} ${user.className}`;
        
        console.log('updateHeaderUserAvatar: 班级信息:', gradeDisplay);
        
        // 更新头像信息
        headerUsername.innerHTML = user.isAdmin ?
          `${user.username} <span style="color: #dc2626; margin-left: 5px; font-size: 14px;">管理员</span>` :
          user.username;
        headerUserClass.textContent = gradeDisplay;
        
        // 添加等级显示
        const headerUserLevel = document.getElementById('header-user-level');
        if (headerUserLevel && typeof window.levelSystem !== 'undefined') {
          const level = user.level || 1;
          headerUserLevel.innerHTML = window.levelSystem.renderLevelBadge(level);
        }
        
        // 为管理员添加特殊样式
        if (user.isAdmin) {
          headerAvatar.classList.add('admin-avatar');
        } else {
          headerAvatar.classList.remove('admin-avatar');
        }
        
        // 如果是管理员，确保管理员控制面板选项存在
        if (user.isAdmin) {
          const headerMenu = headerAvatar.querySelector('.header-user-menu');
          if (headerMenu) {
            // 检查是否已有管理员选项
            let adminOption = headerMenu.querySelector('.header-menu-item.admin-panel');
            if (!adminOption) {
              // 创建管理员控制面板选项
              adminOption = document.createElement('a');
              adminOption.href = 'admin.html';
              adminOption.className = 'header-menu-item admin-panel';
              adminOption.innerHTML = '<i class="fas fa-shield-alt"></i> 管理员控制面板';
              
              // 在第一个选项之前插入
              const firstOption = headerMenu.querySelector('.header-menu-item');
              if (firstOption) {
                headerMenu.insertBefore(adminOption, firstOption);
              } else {
                headerMenu.appendChild(adminOption);
              }
            }
          }
        } else {
          // 如果不是管理员，移除管理员选项
          const adminOption = headerAvatar.querySelector('.header-menu-item.admin-panel');
          if (adminOption) {
            adminOption.remove();
          }
        }
        
        // 设置用户头像
        if (user.avatar) {
          // 如果有自定义头像，显示图片
          if (!headerAvatar.querySelector('img')) {
            // 创建图片元素
            const avatarImg = document.createElement('img');
            avatarImg.src = user.avatar;
            avatarImg.alt = user.username;
            avatarImg.className = 'header-avatar-image';
            
            // 移除默认图标
            const defaultIcon = headerAvatar.querySelector('i.fa-user-circle');
            if (defaultIcon) {
              defaultIcon.style.display = 'none';
            }
            
            headerAvatar.appendChild(avatarImg);
          } else {
            // 更新现有图片
            const avatarImg = headerAvatar.querySelector('img');
            if (avatarImg) {
              avatarImg.src = user.avatar;
            }
          }
        } else {
          // 如果没有自定义头像，显示默认图标
          const avatarImg = headerAvatar.querySelector('img');
          if (avatarImg) {
            avatarImg.remove();
          }
          const defaultIcon = headerAvatar.querySelector('i.fa-user-circle');
          if (defaultIcon) {
            defaultIcon.style.display = 'block';
          }
        }
        
        // 显示头像
        headerAvatar.style.display = 'block';
        console.log('updateHeaderUserAvatar: 头像显示已设置为 block');
        
        // 添加头像点击事件（打开/关闭下拉菜单）
        this.setupHeaderAvatarClickEvent(headerAvatar);
        
        // 添加退出按钮事件监听
        if (headerLogoutBtn) {
          console.log('updateHeaderUserAvatar: 设置退出按钮事件监听');
          // 移除现有的事件监听器
          const newLogoutBtn = headerLogoutBtn.cloneNode(true);
          headerLogoutBtn.parentNode.replaceChild(newLogoutBtn, headerLogoutBtn);
          
          // 添加新的事件监听
          newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logoutUser();
          });
        }
      } else {
        console.log('updateHeaderUserAvatar: 用户未登录，隐藏头像');
        // 隐藏头像
        headerAvatar.style.display = 'none';
        
        // 重置信息
        headerUsername.textContent = '用户名';
        headerUserClass.textContent = '班级信息';
        
        // 移除管理员样式
        headerAvatar.classList.remove('admin-avatar');
        
        // 移除头像点击事件
        headerAvatar.removeEventListener('click', this.handleAvatarClick);
      }
    } else {
      console.warn('updateHeaderUserAvatar: 未找到所有必需元素，无法更新顶栏头像');
      console.warn('headerAvatar:', headerAvatar, 'headerUsername:', headerUsername, 'headerUserClass:', headerUserClass);
    }
  },

  // 设置顶栏头像点击事件
  setupHeaderAvatarClickEvent: function(headerAvatar) {
    console.log('setupHeaderAvatarClickEvent: 设置头像点击事件');
    
    // 移除现有的事件监听器，防止重复绑定
    headerAvatar.removeEventListener('click', this.handleAvatarClick);
    
    // 定义点击处理函数
    this.handleAvatarClick = function(e) {
      console.log('头像被点击，当前active状态:', headerAvatar.classList.contains('active'));
      e.stopPropagation(); // 防止事件冒泡
      
      // 切换active类
      if (headerAvatar.classList.contains('active')) {
        headerAvatar.classList.remove('active');
        console.log('下拉菜单已关闭');
      } else {
        // 关闭其他可能打开的下拉菜单
        const allActiveAvatars = document.querySelectorAll('.header-user-avatar.active');
        allActiveAvatars.forEach(avatar => {
          if (avatar !== headerAvatar) {
            avatar.classList.remove('active');
          }
        });
        
        headerAvatar.classList.add('active');
        console.log('下拉菜单已打开');
      }
    };
    
    // 绑定点击事件
    headerAvatar.addEventListener('click', this.handleAvatarClick);
    
    // 点击页面其他地方关闭下拉菜单
    if (!this.documentClickHandler) {
      this.documentClickHandler = function(e) {
        // 如果点击的不是头像或下拉菜单内部
        const isClickInsideAvatar = headerAvatar.contains(e.target);
        const isClickInsideDropdown = headerAvatar.querySelector('.header-user-dropdown')?.contains(e.target);
        
        if (!isClickInsideAvatar && !isClickInsideDropdown) {
          headerAvatar.classList.remove('active');
        }
      };
      
      // 添加全局点击事件监听器
      document.addEventListener('click', this.documentClickHandler);
    }
    
    console.log('setupHeaderAvatarClickEvent: 点击事件设置完成');
  },

  // 使用用户数据填充发帖表单
  fillPostFormWithUserData: function(user) {
    const userInfoDisplay = document.getElementById('user-info-display');
    if (!userInfoDisplay) return;

    if (!user) {
      userInfoDisplay.style.display = 'none';
      return;
    }
    
    userInfoDisplay.innerHTML = `
      <div class="form-group">
        <label>您的身份信息</label>
        <div class="user-info-card">
          <div class="user-info-avatar clickable-avatar" id="user-info-avatar" title="点击查看个人主页" ${user.avatar ? `style="background-image: url('${user.avatar}'); background-size: cover; background-position: center;"` : ''}>
            ${!user.avatar ? (user.className ? user.className.slice(0,1) : '?') : ''}
          </div>
          <div class="user-info-details">
            <div class="user-info-name">${user.username}</div>
            <div class="user-info-class">
              ${user.grade === "已毕业" ? 
                `已毕业 · ${user.school} ${user.enrollmentYear}级 ${user.className}` :
                `${user.school} · ${user.grade} ${user.className}`
              }
            </div>
          </div>
        </div>
      </div>
      <div class="user-info-note">
        <i class="fas fa-info-circle"></i> 发帖时将使用您的注册信息
      </div>
    `;
    userInfoDisplay.style.display = 'block';
    
    // 为头像添加点击事件
    const userInfoAvatar = document.getElementById('user-info-avatar');
    if (userInfoAvatar) {
      userInfoAvatar.addEventListener('click', () => {
        window.location.href = `profile.html?id=${user.id}`;
      });
    }
  },

  // 更新上传区域状态
  updateImageUploadStatus: function(user) {
    // 图片上传区域
    const imageUploadArea = document.getElementById('image-upload-area');
    const imageUpload = document.getElementById('image-upload');
    
    if (imageUploadArea && imageUpload) {
      if (!user) {
        // 未登录时禁用图片上传
        imageUploadArea.classList.add('disabled');
        imageUploadArea.title = '请先登录后再上传图片';
        imageUpload.disabled = true;
      } else {
        // 登录时启用图片上传
        imageUploadArea.classList.remove('disabled');
        imageUploadArea.title = '';
        imageUpload.disabled = false;
      }
    }
    
    // 文本文件上传区域
    const textUploadArea = document.getElementById('text-upload-area');
    const textFileUpload = document.getElementById('text-file-upload');
    
    if (textUploadArea && textFileUpload) {
      if (!user) {
        // 未登录时禁用文本文件上传
        textUploadArea.classList.add('disabled');
        textUploadArea.title = '请先登录后再上传文件';
        textFileUpload.disabled = true;
      } else {
        // 登录时启用文本文件上传
        textUploadArea.classList.remove('disabled');
        textUploadArea.title = '点击上传文本文件';
        textFileUpload.disabled = false;
      }
    }
  },

  // 用户退出
  logoutUser: function() {
    // 清除本地存储
    localStorage.removeItem('forumUser');

    // 重置状态
    this.state.currentUser = null;

    // 更新UI
    this.updateUserUI(null);

    // 重新加载帖子（仅在 postsManager 存在时）
    if (typeof postsManager !== 'undefined' && postsManager.loadPosts) {
      postsManager.loadPosts();
    }

    // 显示通知
    utils.showNotification('您已成功退出登录', 'success');
  },

  // 设置事件监听器（用于首页的登录/注册按钮）
  setupEventListeners: function() {
    console.log('setupEventListeners: 开始设置按钮事件监听器');
    
    // 动态获取登录按钮
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    console.log('setupEventListeners: loginBtn 元素:', loginBtn);
    console.log('setupEventListeners: registerBtn 元素:', registerBtn);
    
    // 登录按钮
    if (loginBtn) {
      console.log('setupEventListeners: 为登录按钮添加事件监听器');
      loginBtn.addEventListener('click', (e) => {
        console.log('登录按钮被点击');
        e.preventDefault();
        window.location.href = 'login.html';
      });
    } else {
      console.warn('setupEventListeners: 未找到登录按钮元素');
    }
    
    // 注册按钮
    if (registerBtn) {
      console.log('setupEventListeners: 为注册按钮添加事件监听器');
      registerBtn.addEventListener('click', (e) => {
        console.log('注册按钮被点击');
        e.preventDefault();
        window.location.href = 'login.html?register=true'; // 可以跳转到注册页面或登录页面带注册参数
      });
    } else {
      console.warn('setupEventListeners: 未找到注册按钮元素');
    }
    
    console.log('setupEventListeners: 事件监听器设置完成');
  },

  // 应用主题
  applyTheme: function(theme) {
    const root = document.documentElement;
    
    // 定义主题变量
    const themes = {
      light: {
        '--primary-color': '#4361ee',
        '--primary-light': '#edf0fe',
        '--secondary-color': '#3f37c9',
        '--text-color': '#333333',
        '--text-light': '#666666',
        '--background-light': '#f5f7fb',
        '--background-card': '#ffffff',
        '--border-color': '#e0e0e0',
        '--success-color': '#4caf50',
        '--error-color': '#f44336',
        '--warning-color': '#ff9800',
        '--info-color': '#2196f3',
        '--shadow': '0 4px 12px rgba(0, 0, 0, 0.08)',
        '--code-bg': '#f5f5f5',
        '--inline-code-bg': '#f5f5f5',
        '--code-border': '#e0e0e0',
        '--code-header-bg': '#252526',
        '--code-text': '#333333',
        '--button-text': '#ffffff',
        '--icon-color': '#666666'
      },
      dark: {
        '--primary-color': '#6c8eff',
        '--primary-light': '#1e293b',
        '--secondary-color': '#5b67d8',
        '--text-color': '#e2e8f0',
        '--text-light': '#94a3b8',
        '--background-light': '#0f172a',
        '--background-card': '#1e293b',
        '--border-color': '#334155',
        '--success-color': '#4ade80',
        '--error-color': '#ff6b6b',
        '--warning-color': '#fbbf24',
        '--info-color': '#60a5fa',
        '--shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
        '--code-bg': '#1e1e1e',
        '--inline-code-bg': '#2d2d2d',
        '--code-border': '#404040',
        '--code-header-bg': '#252526',
        '--code-text': '#d4d4d4',
        '--button-text': '#ffffff',
        '--icon-color': '#94a3b8'
      }
    };
    
    const themeVars = themes[theme] || themes.light;
    
    // 应用CSS变量
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // 保存主题到状态
    this.state.settings.theme = theme;
    
    // 保存到localStorage
    const currentUser = this.state.currentUser;
    if (currentUser) {
      const forumUser = JSON.parse(localStorage.getItem('forumUser') || '{}');
      forumUser.settings = forumUser.settings || {};
      forumUser.settings.theme = theme;
      localStorage.setItem('forumUser', JSON.stringify(forumUser));
    }
    
    // 触发主题更改事件
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },

  // 加载用户设置
  loadSettings: function(user) {
    if (!user) return;
    
    // 合并用户设置
    if (user.settings) {
      Object.assign(this.state.settings, user.settings);
    }
    
    // 应用保存的主题
    if (this.state.settings.theme) {
      this.applyTheme(this.state.settings.theme);
    }
  },

  // 保存设置到服务器
  async saveSettings(settings) {
    const currentUser = this.state.currentUser;
    if (!currentUser) {
      utils.showNotification('请先登录后再修改设置', 'error');
      return false;
    }
    
    try {
      const response = await fetch(`/users/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存设置失败');
      }
      
      const data = await response.json();
      
      // 更新本地存储的用户数据
      if (data.success && data.user) {
        const forumUser = JSON.parse(localStorage.getItem('forumUser') || '{}');
        forumUser.settings = forumUser.settings || {};
        Object.assign(forumUser.settings, settings);
        localStorage.setItem('forumUser', JSON.stringify(forumUser));
        
        // 更新当前用户状态
        this.state.currentUser.settings = forumUser.settings;
        
        utils.showNotification('设置保存成功', 'success');
        return true;
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      utils.showNotification(error.message || '保存设置失败', 'error');
      return false;
    }
  },

  // 更新设置
  async updateSettings(newSettings) {
    // 合并新设置
    Object.assign(this.state.settings, newSettings);
    
    // 立即应用主题更改
    if (newSettings.theme !== undefined) {
      this.applyTheme(newSettings.theme);
    }
    
    // 保存到服务器
    return await this.saveSettings(this.state.settings);
  },

  // 更新用户头像
  updateUserAvatar: function(avatarUrl) {
    console.log('updateUserAvatar: 更新用户头像', avatarUrl);
    
    if (!this.state.currentUser) {
      console.warn('updateUserAvatar: 用户未登录');
      return;
    }
    
    // 更新当前用户状态
    this.state.currentUser.avatar = avatarUrl;
    
    // 更新本地存储
    const forumUser = JSON.parse(localStorage.getItem('forumUser') || '{}');
    forumUser.avatar = avatarUrl;
    localStorage.setItem('forumUser', JSON.stringify(forumUser));
    
    // 更新顶栏头像显示
    this.updateHeaderUserAvatar(this.state.currentUser);
    
    // 更新所有显示头像的元素
    this.updateAllUserAvatars(avatarUrl);
  },

  // 更新所有用户头像显示
  updateAllUserAvatars: function(avatarUrl) {
    if (!this.state.currentUser) {
      return;
    }
    
    // 调用 updateHeaderUserAvatar 来更新顶栏头像
    this.updateHeaderUserAvatar(this.state.currentUser);
    
    // 更新用户信息区域头像（如果存在）
    const userInfoAvatar = document.getElementById('user-info-avatar');
    if (userInfoAvatar) {
      if (avatarUrl) {
        userInfoAvatar.style.backgroundImage = `url(${avatarUrl})`;
      } else {
        userInfoAvatar.style.backgroundImage = '';
      }
    }
  }
};