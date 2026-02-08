// 设置页面管理模块
console.log('settings.js 文件开始加载...');

const settingsManager = {
  // 状态
  state: {
    currentTheme: 'light',
    isSaving: false,
    initialSettings: null
  },

  // DOM元素
  dom: {},

  // 初始化
  init: function() {
    console.log('settingsManager.init called');
    console.log('userManager.state.currentUser:', userManager.state.currentUser);
    console.log('userManager.state.settings:', userManager.state.settings);
    
    // 获取 DOM 元素
    this.dom = {
      themeOptions: document.querySelectorAll('.theme-option'),
      applyThemeBtn: document.getElementById('apply-theme'),
      resetThemeBtn: document.getElementById('reset-theme'),
      accountForm: document.getElementById('account-form'),
      saveAccountBtn: document.getElementById('save-account'),
      cancelAccountBtn: document.getElementById('cancel-account'),
      usernameInput: document.getElementById('username'),
      currentPasswordInput: document.getElementById('current-password'),
      newPasswordInput: document.getElementById('new-password'),
      confirmPasswordInput: document.getElementById('confirm-password'),
      sidebarUsername: document.getElementById('sidebar-username'),
      sidebarUserClass: document.getElementById('sidebar-user-class'),
      avatarUploadInput: document.getElementById('avatar-upload'),
      uploadAvatarBtn: document.getElementById('upload-avatar-btn'),
      removeAvatarBtn: document.getElementById('remove-avatar-btn'),
      avatarPreview: document.getElementById('avatar-preview'),
      avatarOverlay: document.querySelector('.avatar-overlay')
    };
    
    console.log('DOM 元素获取完成:', this.dom);
    
    // 检查用户是否登录
    if (!userManager.state.currentUser) {
      // 显示警告通知
      utils.showNotification('您尚未登录，设置功能需要登录后才能使用', 'error', 5000);
      
      // 在设置内容顶部添加登录警告横幅
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        const warningBanner = document.createElement('div');
        warningBanner.className = 'login-warning-banner';
        warningBanner.innerHTML = `
          <div class="warning-banner-content">
            <i class="fas fa-exclamation-circle"></i>
            <div class="warning-text">
              <h3>需要登录</h3>
              <p>设置功能需要登录后才能使用。请先登录您的账户。</p>
            </div>
            <div class="warning-actions">
              <a href="login.html" class="settings-button primary small">
                <i class="fas fa-sign-in-alt"></i> 立即登录
              </a>
              <a href="index.html" class="settings-button secondary small">
                <i class="fas fa-home"></i> 返回首页
              </a>
            </div>
          </div>
        `;
        
        // 插入到设置内容顶部
        if (settingsContent.firstChild) {
          settingsContent.insertBefore(warningBanner, settingsContent.firstChild);
        } else {
          settingsContent.appendChild(warningBanner);
        }
      }
      
      // 不返回，继续初始化，让用户可以看到设置界面但不能修改
      // 功能会在用户尝试操作时显示错误消息
    }
    
    // 加载当前设置
    this.loadCurrentSettings();
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 初始化表单
    this.initForm();
    
    // 标记初始化完成
    console.log('settingsManager 初始化完成');
  },

  // 加载当前设置
  loadCurrentSettings: function() {
    console.log('loadCurrentSettings called');
    
    // 检查用户是否登录
    const currentUser = userManager.state.currentUser;
    
    if (currentUser) {
      // 从userManager获取当前设置
      const userSettings = userManager.state.settings;
      this.state.initialSettings = { ...userSettings };
      
      // 设置当前主题
      this.state.currentTheme = userSettings.theme || 'light';
      
      // 更新主题选项UI
      this.updateThemeSelection();
      
      // 填充表单数据
      this.fillFormData();
      
      // 更新侧边栏用户信息
      this.updateSidebarUserInfo();
      
      // 更新头像预览
      this.updateAvatarPreview();
    } else {
      // 用户未登录，使用默认设置
      this.state.initialSettings = { theme: 'light' };
      this.state.currentTheme = 'light';
      
      // 更新主题选项UI
      this.updateThemeSelection();
      
      // 清空表单数据
      this.fillFormData();
      
      // 更新侧边栏为访客状态
      this.updateSidebarUserInfo();
    }
  },

  // 更新侧边栏用户信息
  updateSidebarUserInfo: function() {
    const currentUser = userManager.state.currentUser;
    
    if (currentUser && this.dom.sidebarUsername && this.dom.sidebarUserClass) {
      // 显示毕业状态
      const gradeDisplay = currentUser.grade === "已毕业" ? 
        `已毕业 (${currentUser.enrollmentYear}级)` : 
        `${currentUser.school} ${currentUser.grade} ${currentUser.className}`;
      
      this.dom.sidebarUsername.textContent = currentUser.username;
      this.dom.sidebarUserClass.textContent = gradeDisplay;
    } else if (!currentUser && this.dom.sidebarUsername && this.dom.sidebarUserClass) {
      this.dom.sidebarUsername.textContent = '访客';
      this.dom.sidebarUserClass.textContent = '请登录查看信息';
    }
  },

  // 更新主题选择UI
  updateThemeSelection: function() {
    console.log('updateThemeSelection called, theme:', this.state.currentTheme);
    
    // 重新获取主题选项（确保DOM已加载）
    const themeOptions = document.querySelectorAll('.theme-option');
    console.log(`updateThemeSelection: 找到 ${themeOptions.length} 个主题选项`);
    
    themeOptions.forEach(option => {
      const theme = option.dataset.theme;
      console.log(`检查选项: ${theme}, 当前主题: ${this.state.currentTheme}`);
      
      // 移除所有active类
      option.classList.remove('active');
      
      // 如果主题匹配当前主题，添加active类
      if (theme === this.state.currentTheme) {
        option.classList.add('active');
        console.log(`为选项 ${theme} 添加 active 类`);
      }
    });
  },

  // 填充表单数据
  fillFormData: function() {
    const currentUser = userManager.state.currentUser;
    if (!currentUser) return;
    
    // 设置用户名
    if (this.dom.usernameInput) {
      this.dom.usernameInput.value = currentUser.username || '';
    }
    
    // 清空密码字段
    if (this.dom.currentPasswordInput) {
      this.dom.currentPasswordInput.value = '';
    }
    
    if (this.dom.newPasswordInput) {
      this.dom.newPasswordInput.value = '';
    }
    
    if (this.dom.confirmPasswordInput) {
      this.dom.confirmPasswordInput.value = '';
    }
  },

  // 设置事件监听器
  setupEventListeners: function() {
    console.log('setupEventListeners called');
    
    // 重新获取主题选项（确保DOM已加载）
    const themeOptions = document.querySelectorAll('.theme-option');
    console.log(`找到 ${themeOptions.length} 个主题选项`);
    
    // 为每个主题选项单独绑定点击事件
    themeOptions.forEach((option, index) => {
      const theme = option.dataset.theme;
      console.log(`为主题选项 ${index} (${theme}) 绑定点击事件`);
      
      // 移除可能存在的旧事件监听器（通过克隆节点）
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);
      
      // 添加新的事件监听器
      newOption.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedTheme = newOption.dataset.theme;
        console.log('主题选项被点击:', selectedTheme);
        
        // 检查用户是否登录
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再修改主题设置', 'error');
          return;
        }
        
        // 调用选择主题函数
        this.selectTheme(selectedTheme);
      });
    });
    
    console.log('主题选项点击事件监听器已绑定');
    
    // 应用主题按钮
    if (this.dom.applyThemeBtn) {
      this.dom.applyThemeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applySelectedTheme();
      });
    }
    
    // 重置主题按钮
    if (this.dom.resetThemeBtn) {
      this.dom.resetThemeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetTheme();
      });
    }
    
    // 账户表单提交事件
    if (this.dom.accountForm) {
      this.dom.accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAccountSettings();
      });
    }
    
    // 取消按钮
    if (this.dom.cancelAccountBtn) {
      this.dom.cancelAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetForm();
      });
    }
    
    // 密码验证
    console.log('设置密码验证事件监听器');
    console.log('newPasswordInput 元素:', this.dom.newPasswordInput);
    console.log('confirmPasswordInput 元素:', this.dom.confirmPasswordInput);
    
    if (this.dom.newPasswordInput) {
      this.dom.newPasswordInput.addEventListener('input', () => {
        console.log('新密码输入变化');
        this.validatePassword();
      });
    } else {
      console.error('newPasswordInput 元素未找到，无法绑定事件');
    }
    
    if (this.dom.confirmPasswordInput) {
      this.dom.confirmPasswordInput.addEventListener('input', () => {
        console.log('确认密码输入变化');
        this.validatePasswordConfirmation();
      });
    } else {
      console.error('confirmPasswordInput 元素未找到，无法绑定事件');
    }
    
    // 头像上传按钮
    if (this.dom.uploadAvatarBtn) {
      this.dom.uploadAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再上传头像', 'error');
          return;
        }
        this.dom.avatarUploadInput.click();
      });
    }
    
    // 头像文件选择
    if (this.dom.avatarUploadInput) {
      this.dom.avatarUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.uploadAvatar(file);
        }
      });
    }
    
    // 头像预览点击
    if (this.dom.avatarOverlay) {
      this.dom.avatarOverlay.addEventListener('click', () => {
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再上传头像', 'error');
          return;
        }
        this.dom.avatarUploadInput.click();
      });
    }
    
    // 移除头像按钮
    if (this.dom.removeAvatarBtn) {
      this.dom.removeAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再移除头像', 'error');
          return;
        }
        this.removeAvatar();
      });
    }
  },

  // 初始化表单
  initForm: function() {
    // 设置初始表单状态
    this.state.isSaving = false;
  },

  // 选择主题
  selectTheme: async function(theme) {
    console.log('selectTheme called:', theme);
    
    // 检查用户是否登录
    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再修改主题设置', 'error');
      return;
    }
    
    // 更新当前选中的主题
    this.state.currentTheme = theme;
    
    // 更新UI
    this.updateThemeSelection();
    
    // 立即应用主题到当前页面
    if (theme === 'auto') {
      // 自动模式：检测系统主题
      const systemTheme = this.detectSystemTheme();
      userManager.applyTheme(systemTheme);
    } else {
      // 手动模式：直接应用选择的主题
      userManager.applyTheme(theme);
    }
    
    // 如果是自动模式，监听系统主题变化
    if (theme === 'auto') {
      this.setupThemeAutoDetection();
    }
    
    // 立即保存设置到服务器（不显示加载状态，因为已经实时应用）
    const settings = { theme: this.state.currentTheme };
    await userManager.updateSettings(settings);
  },

  // 检测系统主题
  detectSystemTheme: function() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const systemTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    console.log('检测到系统主题:', systemTheme);
    return systemTheme;
  },

  // 应用选中的主题
  async applySelectedTheme() {
    console.log('applySelectedTheme called, theme:', this.state.currentTheme);
    
    try {
      // 检查用户是否登录
      if (!userManager.state.currentUser) {
        utils.showNotification('请先登录后再修改主题设置', 'error');
        return;
      }
      
      // 准备设置数据
      const settings = {
        theme: this.state.currentTheme
      };
      
      // 显示加载状态
      this.dom.applyThemeBtn.disabled = true;
      this.dom.applyThemeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 应用中...';
      
      // 立即应用主题到当前页面
      if (this.state.currentTheme === 'auto') {
        // 自动模式：检测系统主题
        const systemTheme = this.detectSystemTheme();
        userManager.applyTheme(systemTheme);
      } else {
        // 手动模式：直接应用选择的主题
        userManager.applyTheme(this.state.currentTheme);
      }
      
      // 通过userManager保存设置到服务器
      const success = await userManager.updateSettings(settings);
      
      if (success) {
        utils.showNotification('主题已应用并保存', 'success');
        this.showSaveStatus('主题已成功应用并保存', 'success', 'theme');
        
        // 如果是自动模式，监听系统主题变化
        if (this.state.currentTheme === 'auto') {
          this.setupThemeAutoDetection();
        }
      } else {
        utils.showNotification('主题应用失败，请重试', 'error');
        this.showSaveStatus('主题应用失败，请重试', 'error', 'theme');
      }
    } catch (error) {
      console.error('应用主题失败:', error);
      utils.showNotification('应用主题失败: ' + error.message, 'error');
    } finally {
      // 恢复按钮状态
      this.dom.applyThemeBtn.disabled = false;
      this.dom.applyThemeBtn.innerHTML = '<i class="fas fa-check"></i> 应用主题';
    }
  },

  // 设置主题自动检测
  setupThemeAutoDetection: function() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 定义处理函数
    const handleThemeChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      console.log('系统主题变化，应用新主题:', newTheme);
      userManager.applyTheme(newTheme);
    };
    
    // 添加监听器
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // 存储监听器以便后续清理（如果需要）
    this.themeChangeListener = handleThemeChange;
  },

  // 重置主题
  async resetTheme() {
    console.log('resetTheme called');
    
    try {
      // 检查用户是否登录
      if (!userManager.state.currentUser) {
        utils.showNotification('请先登录后再修改主题设置', 'error');
        return;
      }
      
      // 重置为默认主题（light）
      this.state.currentTheme = 'light';
      this.updateThemeSelection();
      
      // 立即应用主题
      userManager.applyTheme('light');
      
      // 保存设置到服务器
      const success = await userManager.updateSettings({ theme: 'light' });
      
      if (success) {
        utils.showNotification('已恢复默认主题', 'success');
        this.showSaveStatus('已恢复默认主题', 'success', 'theme');
      } else {
        utils.showNotification('重置主题失败，请重试', 'error');
        this.showSaveStatus('重置主题失败，请重试', 'error', 'theme');
      }
    } catch (error) {
      console.error('重置主题失败:', error);
      utils.showNotification('重置主题失败: ' + error.message, 'error');
    }
  },

  // 验证密码
  validatePassword: function() {
    if (!this.dom.newPasswordInput) {
      console.error('newPasswordInput 元素未找到');
      return;
    }
    
    const password = this.dom.newPasswordInput.value;
    const strengthIndicator = document.getElementById('password-strength');
    
    if (!strengthIndicator) {
      console.error('password-strength 元素未找到');
      return;
    }
    
    console.log('密码验证被触发，密码长度:', password.length);
    
    // 简单的密码强度检查
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    console.log('密码强度得分:', strength);
    
    // 更新强度指示器
    strengthIndicator.className = 'strength-meter';
    strengthIndicator.style.width = `${strength * 25}%`;
    
    if (strength === 0) {
      strengthIndicator.className += ' strength-weak';
      console.log('密码强度: 弱');
    } else if (strength <= 2) {
      strengthIndicator.className += ' strength-medium';
      console.log('密码强度: 中等');
    } else {
      strengthIndicator.className += ' strength-strong';
      console.log('密码强度: 强');
    }
  },

  // 验证密码确认
  validatePasswordConfirmation: function() {
    const password = this.dom.newPasswordInput.value;
    const confirmPassword = this.dom.confirmPasswordInput.value;
    
    if (!password || !confirmPassword) return;
    
    if (password !== confirmPassword) {
      this.dom.confirmPasswordInput.style.borderColor = 'var(--error-color)';
      return false;
    } else {
      this.dom.confirmPasswordInput.style.borderColor = 'var(--success-color)';
      return true;
    }
  },

  // 保存账户设置
  async saveAccountSettings() {
    console.log('saveAccountSettings called');
    
    // 防止重复提交
    if (this.state.isSaving) return;
    this.state.isSaving = true;
    
    try {
      // 检查用户是否登录
      if (!userManager.state.currentUser) {
        utils.showNotification('请先登录后再修改账户设置', 'error');
        this.state.isSaving = false;
        return;
      }
      
      // 获取表单数据
      const formData = {
        username: this.dom.usernameInput.value.trim(),
        currentPassword: this.dom.currentPasswordInput.value,
        newPassword: this.dom.newPasswordInput.value,
        confirmPassword: this.dom.confirmPasswordInput.value
      };
      
      // 验证数据
      if (!this.validateAccountForm(formData)) {
        this.state.isSaving = false;
        return;
      }
      
      // 准备发送到服务器的数据
      const updateData = {};
      
      // 如果用户名有变化，添加用户名
      if (formData.username !== userManager.state.currentUser.username) {
        updateData.username = formData.username;
      }
      
      // 如果提供了新密码，验证并添加密码字段
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          utils.showNotification('修改密码需要提供当前密码', 'error');
          this.state.isSaving = false;
          return;
        }
        
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // 如果没有更改，直接返回
      if (Object.keys(updateData).length === 0) {
        utils.showNotification('没有检测到任何更改', 'info');
        this.state.isSaving = false;
        return;
      }
      
      // 显示加载状态
      this.dom.saveAccountBtn.disabled = true;
      this.dom.saveAccountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
      
      // 发送更新请求
      const response = await fetch(`/users/${userManager.state.currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地存储的用户数据
        const forumUser = JSON.parse(localStorage.getItem('forumUser') || '{}');
        if (updateData.username) {
          forumUser.username = updateData.username;
        }
        
        // 更新当前用户状态
        Object.assign(userManager.state.currentUser, forumUser);
        
        // 更新本地存储
        localStorage.setItem('forumUser', JSON.stringify(forumUser));
        
        // 更新UI
        userManager.updateUserUI(userManager.state.currentUser);
        
        // 显示成功消息
        utils.showNotification('账户设置已保存', 'success');
        this.showSaveStatus('账户设置已成功保存', 'success', 'account');
        
        // 重置表单
        this.resetForm();
      } else {
        throw new Error(data.message || '保存失败');
      }
      
    } catch (error) {
      console.error('保存账户设置失败:', error);
      utils.showNotification('保存失败: ' + error.message, 'error');
    } finally {
      // 恢复按钮状态
      this.dom.saveAccountBtn.disabled = false;
      this.dom.saveAccountBtn.innerHTML = '<i class="fas fa-save"></i> 保存账户设置';
      this.state.isSaving = false;
    }
  },

  // 验证账户表单
  validateAccountForm: function(formData) {
    // 验证用户名
    if (!formData.username) {
      utils.showNotification('昵称不能为空', 'error');
      return false;
    }
    
    if (formData.username.length < 2 || formData.username.length > 20) {
      utils.showNotification('昵称长度必须在2-20个字符之间', 'error');
      return false;
    }
    
    // 验证密码（如果提供了新密码）
    if (formData.newPassword) {
      // 密码长度
      if (formData.newPassword.length < 6) {
        utils.showNotification('新密码长度至少为6个字符', 'error');
        return false;
      }
      
      // 密码确认
      if (formData.newPassword !== formData.confirmPassword) {
        utils.showNotification('两次输入的密码不一致', 'error');
        return false;
      }
      
      // 新密码不能与当前密码相同
      if (formData.newPassword === formData.currentPassword) {
        utils.showNotification('新密码不能与当前密码相同', 'error');
        return false;
      }
    }
    
    return true;
  },

  // 重置表单
  resetForm: function() {
    this.fillFormData();
    utils.showNotification('表单已重置', 'info');
  },

  // 显示保存状态
  showSaveStatus: function(message, type = 'info', target = 'account') {
    // 确定目标元素ID
    const elementId = target === 'theme' ? 'theme-save-status' : 'account-save-status';
    
    // 获取状态元素
    let statusElement = document.getElementById(elementId);
    if (!statusElement) {
      console.warn(`状态元素 ${elementId} 未找到`);
      return;
    }
    
    // 设置内容和样式
    statusElement.textContent = message;
    statusElement.className = `save-status ${type}`;
    statusElement.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      statusElement.className = 'save-status';
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 300);
    }, 3000);
  },

  // 上传头像
  async uploadAvatar(file) {
    try {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        utils.showNotification('只支持 JPG、PNG、GIF、WEBP 格式的图片', 'error');
        return;
      }
      
      // 验证文件大小（2MB限制）
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        utils.showNotification('图片大小不能超过 2MB', 'error');
        return;
      }
      
      const formData = new FormData();
      formData.append('avatar', file);
      
      utils.showNotification('头像上传中...', 'info');
      
      const response = await fetch(`/users/${userManager.state.currentUser.id}/avatar`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        utils.showNotification('头像上传成功', 'success');
        
        // 更新预览
        if (data.avatarUrl) {
          this.dom.avatarPreview.src = data.avatarUrl;
        }
        
        // 显示移除头像按钮
        this.dom.removeAvatarBtn.style.display = 'inline-flex';
        
        // 更新用户信息
        if (data.user) {
          userManager.state.currentUser = { ...userManager.state.currentUser, ...data.user };
          // 更新头像缓存
          userManager.updateUserAvatar(data.user.avatar);
        }
        
        // 清空文件输入
        this.dom.avatarUploadInput.value = '';
      } else {
        utils.showNotification(data.message || '头像上传失败', 'error');
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      utils.showNotification('头像上传失败，请稍后重试', 'error');
    }
  },

  // 移除头像
  async removeAvatar() {
    if (!confirm('确定要移除头像吗？移除后将使用默认头像')) {
      return;
    }
    
    try {
      utils.showNotification('头像移除中...', 'info');
      
      const response = await fetch(`/users/${userManager.state.currentUser.id}/avatar`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        utils.showNotification('头像已移除', 'success');
        
        // 更新预览为默认头像
        this.dom.avatarPreview.src = '/images/default-avatar.svg';
        
        // 隐藏移除头像按钮
        this.dom.removeAvatarBtn.style.display = 'none';
        
        // 更新用户信息
        if (data.user) {
          userManager.state.currentUser = { ...userManager.state.currentUser, ...data.user };
          // 更新头像缓存
          userManager.updateUserAvatar(null);
        }
      } else {
        utils.showNotification(data.message || '移除头像失败', 'error');
      }
    } catch (error) {
      console.error('移除头像失败:', error);
      utils.showNotification('移除头像失败，请稍后重试', 'error');
    }
  },

  // 更新头像预览
  updateAvatarPreview: function() {
    const currentUser = userManager.state.currentUser;
    if (currentUser && currentUser.avatar) {
      this.dom.avatarPreview.src = currentUser.avatar;
      this.dom.removeAvatarBtn.style.display = 'inline-flex';
    } else {
      this.dom.avatarPreview.src = '/images/default-avatar.svg';
      this.dom.removeAvatarBtn.style.display = 'none';
    }
  }
};

// 自动检测系统主题并应用（仅当当前主题为auto时）
function setupAutoThemeDetection() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 检查当前主题是否为auto
  if (userManager.state.settings.theme === 'auto') {
    const systemTheme = mediaQuery.matches ? 'dark' : 'light';
    userManager.applyTheme(systemTheme);
  }
  
  // 监听系统主题变化
  mediaQuery.addEventListener('change', (e) => {
    if (userManager.state.settings.theme === 'auto') {
      const newTheme = e.matches ? 'dark' : 'light';
      console.log('系统主题变化，应用新主题:', newTheme);
      userManager.applyTheme(newTheme);
    }
  });
}

// 页面加载完成后初始化自动主题检测
document.addEventListener('DOMContentLoaded', () => {
  if (userManager.state.currentUser) {
    setupAutoThemeDetection();
  }
});

console.log('settings.js 文件执行完成');
console.log('window.settingsManager:', window.settingsManager);