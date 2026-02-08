// 全局状态
const state = {
  currentUser: null
};

// DOM元素（登录页面专用）
const dom = {
  loginBtn: document.getElementById('confirm-login'),
  registerBtn: document.getElementById('confirm-register'),
  adminLoginBtn: document.getElementById('confirm-admin-login'),
  qqLogin: document.getElementById('qq-login'),
  qqAdmin: document.getElementById('qq-admin'),
  qqRegister: document.getElementById('qq-register'),
  usernameRegister: document.getElementById('username-register'),
  schoolRegister: document.getElementById('school-register'),
  enrollmentYearRegister: document.getElementById('enrollment-year-register'),
  classRegister: document.getElementById('class-register'),
  passwordLogin: document.getElementById('password-login'),
  passwordAdmin: document.getElementById('password-admin'),
  passwordRegister: document.getElementById('password-register'),
  confirmPassword: document.getElementById('confirm-password'),
  notificationArea: document.getElementById('notificationArea')
};

// 初始化函数
document.addEventListener('DOMContentLoaded', () => {
  // 初始化入学年份选项
  initEnrollmentYearOptions();
  
  // 设置事件监听器
  setupEventListeners();
  
  // 检查是否已登录，如果已登录则跳转到首页
  checkAutoLogin();
});

// 初始化入学年份选项
function initEnrollmentYearOptions() {
  const enrollmentYearSelect = document.getElementById('enrollment-year-register');
  if (!enrollmentYearSelect) return;
  
  const currentYear = new Date().getFullYear();
  
  // 生成从当前年份前5年到后1年的选项
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}年`;
    enrollmentYearSelect.appendChild(option);
  }
}

// 检查自动登录，如果已登录则跳转到首页
function checkAutoLogin() {
  const savedUser = localStorage.getItem('forumUser');
  if (savedUser) {
    window.location.href = 'index.html';
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 表单切换
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      // 更新活动标签
      tabButtons.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 隐藏所有表单
      document.getElementById('login-form').classList.remove('active');
      document.getElementById('register-form').classList.remove('active');
      document.getElementById('admin-login-form').classList.remove('active');
      
      // 显示对应表单
      if (tab.dataset.tab === 'login') {
        document.getElementById('login-form').classList.add('active');
      } else if (tab.dataset.tab === 'register') {
        document.getElementById('register-form').classList.add('active');
      } else if (tab.dataset.tab === 'admin-login') {
        document.getElementById('admin-login-form').classList.add('active');
      }
    });
  });

  // 登录确认按钮
  if (dom.loginBtn) {
    dom.loginBtn.addEventListener('click', loginUser);
  }

  // 注册确认按钮
  if (dom.registerBtn) {
    dom.registerBtn.addEventListener('click', registerUser);
  }

  // 管理员登录确认按钮
  if (dom.adminLoginBtn) {
    dom.adminLoginBtn.addEventListener('click', loginAdmin);
  }

  // 回车键支持
  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const activeForm = document.querySelector('.form-section.active');
      if (activeForm.id === 'login-form') {
        loginUser();
      } else if (activeForm.id === 'register-form') {
        registerUser();
      } else if (activeForm.id === 'admin-login-form') {
        loginAdmin();
      }
    }
  });
}

// 用户注册
async function registerUser() {
  // 获取表单值
  const qq = dom.qqRegister?.value.trim();
  const username = dom.usernameRegister?.value.trim();
  const password = dom.passwordRegister?.value;
  const confirmPassword = dom.confirmPassword?.value;
  const school = dom.schoolRegister?.value;
  const enrollmentYear = parseInt(dom.enrollmentYearRegister?.value);
  const className = dom.classRegister?.value;
  
  // 验证输入
  if (!qq) {
    showNotification('QQ号不能为空', 'error');
    return;
  }
  
  if (!username) {
    showNotification('用户名不能为空', 'error');
    return;
  }
  
  if (!password) {
    showNotification('密码不能为空', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showNotification('两次输入的密码不一致', 'error');
    return;
  }
  
  if (!school || !enrollmentYear || !className) {
    showNotification('请选择学校、入学年份和班级', 'error');
    return;
  }
  
  if (dom.registerBtn) {
    dom.registerBtn.disabled = true;
    dom.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';
  }
  
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qq,
        username,
        password,
        school,
        enrollmentYear,
        className
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '注册失败');
    }
    
    const data = await response.json();
    if (data.success) {
      state.currentUser = data.user;
      localStorage.setItem('forumUser', JSON.stringify(data.user));
      
      showNotification(`注册成功，欢迎 ${data.user.username}！正在跳转...`, 'success');
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  } catch (error) {
    console.error('注册失败:', error);
    showNotification(error.message || '注册失败，请稍后重试', 'error');
  } finally {
    if (dom.registerBtn) {
      dom.registerBtn.disabled = false;
      dom.registerBtn.innerHTML = '立即注册';
    }
  }
}

// 用户登录
async function loginUser() {
  const qq = dom.qqLogin?.value.trim();
  const password = dom.passwordLogin?.value;
  
  if (!qq) {
    showNotification('QQ号不能为空', 'error');
    return;
  }
  
  if (!password) {
    showNotification('密码不能为空', 'error');
    return;
  }
  
  if (dom.loginBtn) {
    dom.loginBtn.disabled = true;
    dom.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
  }
  
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qq,
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登录失败');
    }
    
    const data = await response.json();
    if (data.success) {
      // 添加管理员标记到用户信息
      const userData = data.user;
      if (data.isAdmin) {
        userData.isAdmin = true;
      }
      
      state.currentUser = userData;
      localStorage.setItem('forumUser', JSON.stringify(userData));
      
      // 检查是否是管理员
      if (userData.isAdmin) {
        showNotification(`管理员 ${userData.username} 登录成功！正在跳转...`, 'success');
      } else {
        showNotification(`欢迎回来，${userData.username}！正在跳转...`, 'success');
      }
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  } catch (error) {
    console.error('登录失败:', error);
    showNotification(error.message || '登录失败，请检查QQ号和密码', 'error');
  } finally {
    if (dom.loginBtn) {
      dom.loginBtn.disabled = false;
      dom.loginBtn.innerHTML = '立即登录';
    }
  }
}

// 管理员登录
async function loginAdmin() {
  const qq = dom.qqAdmin?.value.trim();
  const password = dom.passwordAdmin?.value;
  
  if (!qq) {
    showNotification('管理员QQ号不能为空', 'error');
    return;
  }
  
  if (!password) {
    showNotification('管理员密码不能为空', 'error');
    return;
  }
  
  if (dom.adminLoginBtn) {
    dom.adminLoginBtn.disabled = true;
    dom.adminLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';
  }
  
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qq,
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登录失败');
    }
    
    const data = await response.json();
    if (data.success) {
      // 检查是否是管理员
      if (!data.isAdmin) {
        throw new Error('您不是管理员，无法访问后台管理');
      }
      
      // 添加管理员标记到用户信息
      const userData = data.user;
      userData.isAdmin = true;
      
      state.currentUser = userData;
      localStorage.setItem('forumUser', JSON.stringify(userData));
      
      showNotification(`管理员 ${userData.username} 登录成功！正在跳转到管理后台...`, 'success');
      
      // 延迟跳转到管理后台
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 1500);
    }
  } catch (error) {
    console.error('管理员登录失败:', error);
    showNotification(error.message || '管理员登录失败，请检查QQ号和密码', 'error');
  } finally {
    if (dom.adminLoginBtn) {
      dom.adminLoginBtn.disabled = false;
      dom.adminLoginBtn.innerHTML = '管理员登录';
    }
  }
}

// 消息通知函数
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification-message ${type}`;
  
  notification.innerHTML = `
    <i class="fas fa-${
      type === 'success' ? 'check-circle' : 
      type === 'error' ? 'exclamation-circle' : 'info-circle'
    }"></i>
    <span>${message}</span>
  `;
  
  if (dom.notificationArea) {
    dom.notificationArea.appendChild(notification);
    
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
  }
}