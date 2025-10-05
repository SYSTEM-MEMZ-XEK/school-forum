// 用户管理模块
const userManager = {
  // 全局状态
  state: {
    currentUser: null
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
    const savedUser = localStorage.getItem('forumUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.state.currentUser = user;
      this.updateUserUI(user);
      this.fillPostFormWithUserData(user);
      utils.showNotification(`欢迎回来，${user.username}！`, 'success');
    }
  },

  // 更新用户界面
  updateUserUI: function(user) {
    const userPanel = document.getElementById('user-panel');
    if (!userPanel) return;

    if (user) {
      // 显示毕业状态
      const gradeDisplay = user.grade === "已毕业" ? 
        `已毕业 (${user.enrollmentYear}级)` : 
        `${user.school} ${user.grade} ${user.className}`;
      
      if (this.dom.username) this.dom.username.textContent = user.username;
      if (this.dom.userClass) this.dom.userClass.textContent = gradeDisplay;
      
      // 更新按钮状态
      if (this.dom.loginBtn) this.dom.loginBtn.style.display = 'none';
      if (this.dom.registerBtn) this.dom.registerBtn.style.display = 'none';
      
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
      if (this.dom.loginBtn) this.dom.loginBtn.style.display = 'inline-block';
      if (this.dom.registerBtn) this.dom.registerBtn.style.display = 'inline-block';
      
      // 移除退出按钮
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.remove();
      }
    }
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
          <div class="user-info-avatar">${user.className.slice(0,1)}</div>
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
  },

  // 用户退出
  logoutUser: function() {
    // 清除本地存储
    localStorage.removeItem('forumUser');
    
    // 重置状态
    this.state.currentUser = null;
    
    // 更新UI
    this.updateUserUI(null);
    
    // 重新加载帖子
    if (postsManager.loadPosts) {
      postsManager.loadPosts();
    }
    
    // 显示通知
    utils.showNotification('您已成功退出登录', 'success');
  },

  // 设置事件监听器（用于首页的登录/注册按钮）
  setupEventListeners: function() {
    // 登录按钮
    if (this.dom.loginBtn) {
      this.dom.loginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
      });
    }

    // 注册按钮
    if (this.dom.registerBtn) {
      this.dom.registerBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
      });
    }
  }
};