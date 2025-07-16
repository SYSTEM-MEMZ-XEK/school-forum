// 全局状态
const state = {
  currentUser: null,
  posts: [],
  currentPostId: null,
  isAdminPanelVisible: false
};

// DOM元素
const dom = {
  postsContainer: document.getElementById('posts-container'),
  submitPostBtn: document.getElementById('submit-post'),
  loginModal: document.getElementById('login-modal'),
  commentModal: document.getElementById('comment-modal'),
  commentContent: document.getElementById('comment-content'),
  commentAnonymous: document.getElementById('comment-anonymous'),
  submitCommentBtn: document.getElementById('submit-comment'),
  loginBtn: document.getElementById('login-btn'),
  registerBtn: document.getElementById('register-btn'),
  confirmLoginBtn: document.getElementById('confirm-login'),
  confirmRegisterBtn: document.getElementById('confirm-register'),
  qqLogin: document.getElementById('qq-login'),
  qqRegister: document.getElementById('qq-register'),
  usernameRegister: document.getElementById('username-register'),
  schoolRegister: document.getElementById('school-register'),
  enrollmentYearRegister: document.getElementById('enrollment-year-register'),
  classRegister: document.getElementById('class-register'),
  username: document.getElementById('username'),
  userClass: document.getElementById('user-class'),
  notificationArea: document.getElementById('notificationArea'),
  todayPosts: document.getElementById('today-posts'),
  totalUsers: document.getElementById('total-users'),
  totalPosts: document.getElementById('total-posts'),
  totalComments: document.getElementById('total-comments'),
  contentInput: document.getElementById('content'),
  anonymousCheckbox: document.getElementById('anonymous'),
  passwordLogin: document.getElementById('password-login'),
  passwordRegister: document.getElementById('password-register'),
  confirmPassword: document.getElementById('confirm-password')
};

// 初始化函数
document.addEventListener('DOMContentLoaded', () => {
  // 初始化入学年份选项
  initEnrollmentYearOptions();
  
  // 其他初始化代码保持不变
  initApp();
  setupEventListeners();
  checkAutoLogin();
});

// 初始化入学年份选项
function initEnrollmentYearOptions() {
  const enrollmentYearSelect = document.getElementById('enrollment-year-register');
  const currentYear = new Date().getFullYear();
  
  // 生成从当前年份前5年到后1年的选项
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}年`;
    enrollmentYearSelect.appendChild(option);
  }
}

// 检查自动登录
function checkAutoLogin() {
  const savedUser = localStorage.getItem('forumUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    state.currentUser = user;
    updateUserUI(user);
    fillPostFormWithUserData(user);
    showNotification(`欢迎回来，${user.username}！`, 'success');
  }
}

// 初始化应用
async function initApp() {
  try {
    await loadPosts();
    await loadStats();
    startAutoRefresh();
  } catch (error) {
    console.error('初始化失败:', error);
    showNotification('系统初始化失败，请刷新页面', 'error');
  }
}

// 加载帖子
async function loadPosts() {
  const container = dom.postsContainer;
  container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
  
  try {
    const response = await fetch('/posts');
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }
    
    const posts = await response.json();
    state.posts = posts;
    renderPosts(posts);
  } catch (error) {
    console.error('加载帖子失败:', error);
    container.innerHTML = '<div class="empty-state">帖子加载失败，请稍后再试</div>';
    showNotification(error.message || '加载帖子失败', 'error');
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const response = await fetch('/stats');
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      const stats = data.stats;
      dom.todayPosts.textContent = stats.todayPosts;
      dom.totalUsers.textContent = stats.totalUsers;
      dom.totalPosts.textContent = stats.totalPosts;
      dom.totalComments.textContent = stats.totalComments;
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    showNotification('加载统计数据失败', 'error');
  }
}

// 渲染帖子
function renderPosts(posts) {
  const container = dom.postsContainer;
  
  if (!posts || posts.length === 0) {
    container.innerHTML = '<div class="empty-state">暂时没有帖子，成为第一个发表的人吧！</div>';
    return;
  }
  
  container.innerHTML = '';
  
  // 按时间倒序排序
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp));
  
  sortedPosts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.dataset.id = post.id;
    
    // 检查当前用户是否点赞过此帖
    const userLiked = state.currentUser && post.likedBy && post.likedBy.includes(state.currentUser.id);
    
    // 确保用户名正确显示
    const displayUsername = post.anonymous ? '匿名用户' : (post.username || '未知用户');
    
    postElement.innerHTML = `
      <div class="post-header">
        <div class="user-info">
          <div class="avatar ${post.anonymous ? 'anonymous-avatar' : ''}">
            ${post.anonymous ? '匿' : (post.className ? post.className.slice(0,1) : '?')}
          </div>
          <div class="user-details">
            <h3>${displayUsername}</h3>
            ${post.anonymous ? '' : 
              `<div class="class-info">${post.school || ''} | ${post.grade || ''} ${post.className || ''}</div>`
            }
          </div>
        </div>
        <div class="post-time">
          <i class="far fa-clock"></i> ${formatDate(post.timestamp)}
        </div>
      </div>
      
      <div class="post-content">
        ${post.anonymous ? '<span class="tag anonymous-tag">匿名</span>' : 
        `<span class="tag">${post.grade || ''}</span>
         <span class="tag">${post.className || ''}</span>`}
        ${post.content}
      </div>
      
      <div class="post-footer">
        <div class="action-buttons">
          <div class="action-btn like-btn ${userLiked ? 'active' : ''}" data-id="${post.id}">
            <i class="fas fa-heart ${userLiked ? 'active' : ''}"></i> 点赞 <span>${post.likes || 0}</span>
          </div>
          <div class="action-btn comment-btn" data-id="${post.id}">
            <i class="fas fa-comment"></i> 评论 <span>${post.comments ? post.comments.length : 0}</span>
          </div>
        </div>
      </div>
      
      <div class="comments-section">
        <div class="comments-header">
          <h4>评论</h4>
          <div class="add-comment-btn" data-id="${post.id}">添加评论</div>
        </div>
        
        ${renderComments(post)}
      </div>
    `;
    
    container.appendChild(postElement);
  });
}

// 渲染评论
function renderComments(post) {
  if (!post.comments || post.comments.length === 0) {
    return '<div class="empty-state">暂无评论</div>';
  }
  
  // 只显示最新3条评论
  const commentsToShow = [...post.comments].slice(0, 3);
  
  let commentsHTML = '<div class="comments-list">';
  
  commentsToShow.forEach(comment => {
    // 确保评论用户名正确显示
    const commentUsername = comment.anonymous ? '匿名同学' : (comment.username || '用户');
    
    commentsHTML += `
      <div class="comment">
        <div class="comment-header">
          <div class="comment-user">${commentUsername}</div>
          <div class="comment-time">${formatDate(comment.timestamp)}</div>
        </div>
        <div class="comment-content">${comment.content}</div>
      </div>
    `;
  });
  
  // 如果评论超过3条，添加"查看更多"按钮
  if (post.comments.length > 3) {
    commentsHTML += `
      <div class="view-all-comments" data-id="${post.id}">
        查看全部 ${post.comments.length} 条评论
      </div>
    `;
  }
  
  commentsHTML += '</div>';
  
  return commentsHTML;
}

// 设置事件监听器
function setupEventListeners() {
  // 发帖按钮
  dom.submitPostBtn.addEventListener('click', submitNewPost);
  
  // 登录按钮
  dom.loginBtn.addEventListener('click', () => {
    dom.loginModal.style.display = 'flex';
  });
  
  // 注册按钮
  dom.registerBtn.addEventListener('click', () => {
    dom.loginModal.style.display = 'flex';
    document.querySelector('[data-tab="register"]').click();
  });
  
  // 登录确认按钮
  dom.confirmLoginBtn.addEventListener('click', loginUser);
  
  // 注册确认按钮
  dom.confirmRegisterBtn.addEventListener('click', registerUser);
  
  // 关闭模态框
  const closeButtons = document.querySelectorAll('.close-modal');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.loginModal.style.display = 'none';
      dom.commentModal.style.display = 'none';
    });
  });
  
  // 表单切换
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      // 更新活动标签
      tabButtons.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 显示对应表单
      if (tab.dataset.tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
      } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
      }
    });
  });
  
  // 点击评论按钮
  document.addEventListener('click', async (e) => {
    // 处理点赞按钮点击
    if (e.target.closest('.like-btn')) {
      const likeBtn = e.target.closest('.like-btn');
      const postId = likeBtn.dataset.id;
      
      if (!state.currentUser) {
        showNotification('请先登录后再点赞', 'error');
        dom.loginModal.style.display = 'flex';
        return;
      }
      
      try {
        const response = await fetch(`/posts/${postId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: state.currentUser.id
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '操作失败');
        }
        
        const data = await response.json();
        if (data.success) {
          // 更新UI
          const likesSpan = likeBtn.querySelector('span');
          const heartIcon = likeBtn.querySelector('i');
          
          likesSpan.textContent = data.likes;
          
          if (likeBtn.classList.contains('active')) {
            likeBtn.classList.remove('active');
            heartIcon.classList.remove('active');
          } else {
            likeBtn.classList.add('active');
            heartIcon.classList.add('active');
          }
        }
      } catch (error) {
        console.error('点赞失败:', error);
        showNotification(error.message || '操作失败', 'error');
      }
    }
    
    // 处理添加评论按钮
    if (e.target.closest('.add-comment-btn')) {
      const btn = e.target.closest('.add-comment-btn');
      state.currentPostId = btn.dataset.id;
      
      if (!state.currentUser) {
        showNotification('请先登录后再评论', 'error');
        dom.loginModal.style.display = 'flex';
        return;
      }
      
      dom.commentContent.value = '';
      dom.commentAnonymous.checked = false;
      dom.commentModal.style.display = 'flex';
    }
    
    // 处理"查看全部评论"按钮点击
    if (e.target.closest('.view-all-comments')) {
      const btn = e.target.closest('.view-all-comments');
      const postId = btn.dataset.id;
      
      // 找到对应的帖子
      const post = state.posts.find(p => p.id === postId);
      if (!post || !post.comments) return;
      
      // 获取帖子DOM元素
      const postElement = document.querySelector(`.post[data-id="${postId}"]`);
      if (!postElement) return;
      
      // 更新评论部分
      const commentsSection = postElement.querySelector('.comments-section');
      if (commentsSection) {
        commentsSection.innerHTML = `
          <div class="comments-header">
            <h4>评论</h4>
            <div class="add-comment-btn" data-id="${postId}">添加评论</div>
          </div>
          ${renderAllComments(post)}
        `;
      }
    }
    
    // 处理评论提交按钮
    if (e.target.id === 'submit-comment') {
      const content = dom.commentContent.value.trim();
      
      if (!content) {
        showNotification('评论内容不能为空', 'error');
        return;
      }
      
      if (content.length > 500) {
        showNotification('评论内容过长，最多500个字符', 'error');
        return;
      }
      
      dom.submitCommentBtn.disabled = true;
      dom.submitCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
      
      try {
        const response = await fetch(`/posts/${state.currentPostId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: state.currentUser.id,
            username: state.currentUser.username, // 添加用户名
            content,
            anonymous: dom.commentAnonymous.checked
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '操作失败');
        }
        
        const data = await response.json();
        if (data.success) {
          showNotification('评论发布成功！', 'success');
          await loadPosts();
          await loadStats();
          dom.commentModal.style.display = 'none';
        }
      } catch (error) {
        console.error('评论失败:', error);
        showNotification(error.message || '评论发布失败', 'error');
      } finally {
        dom.submitCommentBtn.disabled = false;
        dom.submitCommentBtn.innerHTML = '发表评论';
      }
    }
  });

  // 匿名状态切换监听器
  dom.anonymousCheckbox.addEventListener('change', function() {
    const isAnonymous = this.checked;
    showNotification(isAnonymous ? 
      "已启用匿名模式，个人信息将被隐藏" : 
      "已禁用匿名模式，个人信息将显示",
      isAnonymous ? 'info' : 'success'
    );
  });
}

// 提交新帖子
async function submitNewPost() {
  const content = dom.contentInput.value;
  const anonymous = dom.anonymousCheckbox.checked;
  
  // 禁用按钮防止重复提交
  dom.submitPostBtn.disabled = true;
  dom.submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';
  
  try {
    // 验证输入
    if (!content.trim()) {
      throw new Error('帖子内容不能为空');
    }
    
    if (!state.currentUser) {
      throw new Error('请先登录后再发帖');
    }
    
    // 直接使用当前用户信息
    const school = state.currentUser.school;
    const grade = state.currentUser.grade;
    const className = state.currentUser.className;
    const username = state.currentUser.username; // 获取用户名
    
    // 发布请求
    const response = await fetch('/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: state.currentUser.id,
        username, // 添加用户名
        school,
        grade,
        className,
        content,
        anonymous
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '发布失败');
    }
    
    const data = await response.json();
    if (data.success) {
      showNotification('帖子发布成功！', 'success');
      await loadPosts();
      await loadStats();
      dom.contentInput.value = '';
      dom.anonymousCheckbox.checked = false;
    }
  } catch (error) {
    console.error('发布失败:', error);
    showNotification(error.message || '发布失败，请稍后重试', 'error');
  } finally {
    // 重新启用按钮
    dom.submitPostBtn.disabled = false;
    dom.submitPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发布帖子';
  }
}

// 用户注册
async function registerUser() {
  // 获取表单值
  const qq = dom.qqRegister.value.trim();
  const username = dom.usernameRegister.value.trim();
  const password = dom.passwordRegister.value;
  const confirmPassword = dom.confirmPassword.value;
  const school = dom.schoolRegister.value;
  const enrollmentYear = parseInt(dom.enrollmentYearRegister.value);
  const className = dom.classRegister.value;
  
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
  
  dom.confirmRegisterBtn.disabled = true;
  dom.confirmRegisterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';
  
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
      updateUserUI(data.user);
      fillPostFormWithUserData(data.user);
      localStorage.setItem('forumUser', JSON.stringify(data.user));
      
      dom.loginModal.style.display = 'none';
      showNotification(`注册成功，欢迎 ${data.user.username}！`, 'success');
      await loadStats();
    }
  } catch (error) {
    console.error('注册失败:', error);
    showNotification(error.message || '注册失败，请稍后重试', 'error');
  } finally {
    dom.confirmRegisterBtn.disabled = false;
    dom.confirmRegisterBtn.innerHTML = '立即注册';
  }
}

// 用户登录
async function loginUser() {
  const qq = dom.qqLogin.value.trim();
  const password = dom.passwordLogin.value;
  
  if (!qq) {
    showNotification('QQ号不能为空', 'error');
    return;
  }
  
  if (!password) {
    showNotification('密码不能为空', 'error');
    return;
  }
  
  dom.confirmLoginBtn.disabled = true;
  dom.confirmLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
  
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
      state.currentUser = data.user;
      updateUserUI(data.user);
      fillPostFormWithUserData(data.user);
      localStorage.setItem('forumUser', JSON.stringify(data.user));
      
      dom.loginModal.style.display = 'none';
      showNotification(`欢迎回来，${data.user.username}！`, 'success');
      await loadStats();
    }
  } catch (error) {
    console.error('登录失败:', error);
    showNotification(error.message || '登录失败，请检查QQ号和密码', 'error');
  } finally {
    dom.confirmLoginBtn.disabled = false;
    dom.confirmLoginBtn.innerHTML = '立即登录';
  }
}

// 用户退出
function logoutUser() {
  // 清除本地存储
  localStorage.removeItem('forumUser');
  
  // 重置状态
  state.currentUser = null;
  
  // 更新UI
  updateUserUI(null);
  
  // 重新加载帖子
  loadPosts();
  
  // 显示通知
  showNotification('您已成功退出登录', 'success');
}

// 更新用户界面
function updateUserUI(user) {
  const userPanel = document.getElementById('user-panel');
  
  if (user) {
    // 显示毕业状态
    const gradeDisplay = user.grade === "已毕业" ? 
      `已毕业 (${user.enrollmentYear}级)` : 
      `${user.school} ${user.grade} ${user.className}`;
    
    document.getElementById('username').textContent = user.username;
    document.getElementById('user-class').textContent = gradeDisplay;
    
    // 更新按钮状态
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('register-btn').style.display = 'none';
    
    // 添加退出按钮
    if (!document.getElementById('logout-btn')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logout-btn';
      logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 退出';
      logoutBtn.className = 'logout-button';
      document.getElementById('user-actions').appendChild(logoutBtn);
      
      // 添加事件监听
      logoutBtn.addEventListener('click', logoutUser);
    }
  } else {
    document.getElementById('username').textContent = '访客';
    document.getElementById('user-class').textContent = '请登录查看信息';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('register-btn').style.display = 'inline-block';
    
    // 移除退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.remove();
    }
  }
}

// 使用用户数据填充发帖表单
function fillPostFormWithUserData(user) {
  const userInfoDisplay = document.getElementById('user-info-display');
  
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
}

// 渲染所有评论（不再限制数量）
function renderAllComments(post) {
  if (!post.comments || post.comments.length === 0) {
    return '<div class="empty-state">暂无评论</div>';
  }
  
  let commentsHTML = '<div class="comments-list">';
  
  post.comments.forEach(comment => {
    const commentUsername = comment.anonymous ? '匿名同学' : comment.username;
    
    commentsHTML += `
      <div class="comment">
        <div class="comment-header">
          <div class="comment-user">${commentUsername}</div>
          <div class="comment-time">${formatDate(comment.timestamp)}</div>
        </div>
        <div class="comment-content">${comment.content}</div>
      </div>
    `;
  });
  
  commentsHTML += '</div>';
  
  return commentsHTML;
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

// 日期格式化函数
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  
  // 如果是今天，显示时间
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 如果是昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 显示完整日期
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 自动刷新
function startAutoRefresh() {
  setInterval(() => {
    loadPosts();
    loadStats();
  }, 60000); // 每1分钟刷新一次
}

// 全局监听点击事件关闭模态框
window.addEventListener('click', (e) => {
  if (e.target === dom.loginModal) {
    dom.loginModal.style.display = 'none';
  }
  
  if (e.target === dom.commentModal) {
    dom.commentModal.style.display = 'none';
  }
});