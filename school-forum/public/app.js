// 全局状态
const state = {
  currentUser: null,
  posts: [],
  currentPostId: null,
  isAdminPanelVisible: false,
  selectedImages: [],
  isAdmin: false,
  adminView: 'posts', // 'posts', 'users'
  adminUsers: [],
  banDurations: [
    { hours: 1, label: '1小时' },
    { hours: 24, label: '1天' },
    { hours: 72, label: '3天' },
    { hours: 168, label: '7天' },
    { hours: 720, label: '30天' },
    { hours: 8760, label: '永久' }
  ]
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
  confirmPassword: document.getElementById('confirm-password'),
  imageUpload: document.getElementById('image-upload'),
  imagePreview: document.getElementById('image-preview'),
  adminPanel: document.getElementById('admin-panel'),
  adminToggleBtn: document.getElementById('admin-toggle'),
  adminPostsView: document.getElementById('admin-posts-view'),
  adminUsersView: document.getElementById('admin-users-view'),
  adminPostsContainer: document.getElementById('admin-posts-container'),
  adminUsersContainer: document.getElementById('admin-users-container'),
  adminViewPostsBtn: document.getElementById('admin-view-posts'),
  adminViewUsersBtn: document.getElementById('admin-view-users'),
  banDurationSelect: document.getElementById('ban-duration')

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
  for (let year = currentYear - 3; year <= currentYear + 5; year++) {
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
  if (state.currentUser) {
    checkAdminStatus();
  }
}
  
// 添加管理员相关函数
function checkAdminStatus() {
  // 这里应该有从服务器获取用户角色的逻辑
  // 为简化，我们假设管理员用户名为 "admin"
  state.isAdmin = state.currentUser.username === "admin";
  
  if (state.isAdmin) {
    dom.adminToggleBtn.style.display = 'block';
    loadAdminData();
  }
}

async function loadAdminData() {
  if (state.adminView === 'posts') {
    await loadAdminPosts();
  } else {
    await loadAdminUsers();
  }
}

async function loadAdminPosts() {
  try {
    const response = await fetch('/posts');
    if (!response.ok) throw new Error('加载失败');
    
    const posts = await response.json();
    renderAdminPosts(posts);
  } catch (error) {
    console.error('加载管理员帖子失败:', error);
  }
}

function renderAdminPosts(posts) {
  const container = dom.adminPostsContainer;
  container.innerHTML = '';
  
  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'admin-post-item';
    postElement.dataset.id = post.id;
    
    postElement.innerHTML = `
      <div class="post-header">
        <div>
          <strong>${post.anonymous ? '匿名用户' : post.username}</strong>
          <span>${post.school || ''} ${post.grade || ''} ${post.className || ''}</span>
        </div>
        <div class="post-time">${formatDate(post.timestamp)}</div>
      </div>
      <div class="post-content">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
      <div class="admin-post-actions">
        <button class="admin-delete-post" data-id="${post.id}">
          <i class="fas fa-trash"></i> 删除
        </button>
        <button class="admin-ban-user" data-userid="${post.userId}" data-username="${post.username}">
          <i class="fas fa-ban"></i> 封禁用户
        </button>
        <button class="admin-delete-user" data-userid="${post.userId}" data-username="${post.username}">
          <i class="fas fa-user-slash"></i> 注销账号
        </button>
      </div>
    `;
    
    container.appendChild(postElement);
  });
}

async function loadAdminUsers() {
  try {
    const response = await fetch('/users'); // 需要添加获取所有用户的API
    if (!response.ok) throw new Error('加载失败');
    
    const users = await response.json();
    state.adminUsers = users;
    renderAdminUsers(users);
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
}

function renderAdminUsers(users) {
  const container = dom.adminUsersContainer;
  container.innerHTML = '';
  
  users.forEach(user => {
    const userElement = document.createElement('div');
    userElement.className = 'admin-user-item';
    userElement.dataset.id = user.id;
    
    const isBanned = user.banEnd && new Date(user.banEnd) > new Date();
    const banInfo = isBanned ? 
      `<span class="ban-info">封禁中 (至 ${formatDate(user.banEnd)})</span>` : '';
    
    userElement.innerHTML = `
      <div class="user-info">
        <div>
          <strong>${user.username}</strong>
          <span>${user.school || ''} ${user.grade || ''} ${user.className || ''}</span>
        </div>
        <div class="user-qq">QQ: ${user.qq}</div>
      </div>
      <div class="admin-user-actions">
        ${banInfo}
        <button class="admin-ban-user" data-userid="${user.id}" data-username="${user.username}">
          <i class="fas fa-ban"></i> ${isBanned ? '解封' : '封禁'}
        </button>
        <button class="admin-delete-user" data-userid="${user.id}" data-username="${user.username}">
          <i class="fas fa-user-slash"></i> 注销账号
        </button>
      </div>
    `;
    
    container.appendChild(userElement);
  });
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
        ${renderPostImages(post)}
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

// 渲染帖子图片
function renderPostImages(post) {
  if (!post.images || post.images.length === 0) return '';
  
  // 单张图片直接显示
  if (post.images.length === 1) {
    return `
      <div class="post-image-container">
        <img src="${post.images[0]}" alt="帖子图片" class="post-image" data-id="${post.id}" data-index="0">
      </div>
    `;
  }
  
  // 多张图片用网格显示
  return `
    <div class="post-images-grid">
      ${post.images.map((img, index) => `
        <img src="${img}" alt="帖子图片" class="post-image-thumb" data-id="${post.id}" data-index="${index}">
      `).join('')}
    </div>
  `;
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

// 处理图片上传
function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  const previewContainer = dom.imagePreview;
  
  // 清除之前的预览
  previewContainer.innerHTML = '';
  state.selectedImages = [];
  
  // 限制最多10张图片
  if (files.length > 10) {
    showNotification('最多只能上传10张图片', 'error');
    return;
  }
  
  files.forEach(file => {
    if (!file.type.match('image.*')) {
      showNotification('只能上传图片文件', 'error');
      return;
    }
    
    // 创建预览元素
    const reader = new FileReader();
    reader.onload = function(event) {
      const previewItem = document.createElement('div');
      previewItem.className = 'image-preview-item';
      
      previewItem.innerHTML = `
        <img src="${event.target.result}" alt="预览">
        <button class="remove-btn"><i class="fas fa-times"></i></button>
      `;
      
      // 添加到预览区域
      previewContainer.appendChild(previewItem);
      
      // 保存图片数据
      state.selectedImages.push({
        file,
        preview: event.target.result
      });
      
      // 添加移除按钮事件
      const removeBtn = previewItem.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => {
        previewItem.remove();
        state.selectedImages = state.selectedImages.filter(img => img.preview !== event.target.result);
      });
    };
    
    reader.readAsDataURL(file);
  });
}

// 显示图片查看器
function showImageViewer(images, currentIndex = 0) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'image-viewer-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
      <span class="close-modal">&times;</span>
      
      <div class="image-viewer-container">
        <img id="image-viewer" src="${images[currentIndex]}" alt="图片查看">
      </div>
      
      <div class="image-nav">
        <button class="image-nav-btn prev-btn"><i class="fas fa-chevron-left"></i> 上一张</button>
        <span id="image-counter">${currentIndex + 1} / ${images.length}</span>
        <button class="image-nav-btn next-btn">下一张 <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 添加关闭事件
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // 添加导航事件
  let currentImgIndex = currentIndex;
  
  const prevBtn = modal.querySelector('.prev-btn');
  prevBtn.addEventListener('click', () => {
    currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
    updateImageViewer(images, currentImgIndex);
  });
  
  const nextBtn = modal.querySelector('.next-btn');
  nextBtn.addEventListener('click', () => {
    currentImgIndex = (currentImgIndex + 1) % images.length;
    updateImageViewer(images, currentImgIndex);
  });
  
  // 键盘导航
  const handleKeyNavigation = (e) => {
    if (e.key === 'ArrowLeft') {
      currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
      updateImageViewer(images, currentImgIndex);
    } else if (e.key === 'ArrowRight') {
      currentImgIndex = (currentImgIndex + 1) % images.length;
      updateImageViewer(images, currentImgIndex);
    } else if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeyNavigation);
    }
  };
  
  document.addEventListener('keydown', handleKeyNavigation);
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.removeEventListener('keydown', handleKeyNavigation);
    }
  });
}

// 更新图片查看器
function updateImageViewer(images, index) {
  const imageViewer = document.getElementById('image-viewer');
  const imageCounter = document.getElementById('image-counter');
  
  if (imageViewer) {
    imageViewer.src = images[index];
  }
  
  if (imageCounter) {
    imageCounter.textContent = `${index + 1} / ${images.length}`;
  }
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
  
  // 图片上传事件
  if (dom.imageUpload) {
    dom.imageUpload.addEventListener('change', handleImageUpload);
  }

  // 管理员切换按钮
  if (dom.adminToggleBtn) {
    dom.adminToggleBtn.addEventListener('click', () => {
      state.isAdminPanelVisible = !state.isAdminPanelVisible;
      dom.adminPanel.style.display = state.isAdminPanelVisible ? 'block' : 'none';
      
      if (state.isAdminPanelVisible) {
        loadAdminData();
      }
    });
  }
  
  // 管理员视图切换
  dom.adminViewPostsBtn?.addEventListener('click', () => {
    state.adminView = 'posts';
    dom.adminViewPostsBtn.classList.add('active');
    dom.adminViewUsersBtn.classList.remove('active');
    dom.adminPostsView.style.display = 'block';
    dom.adminUsersView.style.display = 'none';
    loadAdminPosts();
  });
  
  dom.adminViewUsersBtn?.addEventListener('click', () => {
    state.adminView = 'users';
    dom.adminViewUsersBtn.classList.add('active');
    dom.adminViewPostsBtn.classList.remove('active');
    dom.adminPostsView.style.display = 'none';
    dom.adminUsersView.style.display = 'block';
    loadAdminUsers();
  });
  
  // 管理员操作事件委托
  document.addEventListener('click', async (e) => {
    // 删除帖子
    if (e.target.closest('.admin-delete-post')) {
      const btn = e.target.closest('.admin-delete-post');
      const postId = btn.dataset.id;
      
      if (confirm('确定要删除此帖子吗？此操作不可撤销。')) {
        try {
          const response = await fetch(`/posts/${postId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: state.currentUser.id,
              isAdmin: true
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '操作失败');
          }
          
          const data = await response.json();
          if (data.success) {
            showNotification('帖子已删除', 'success');
            loadAdminPosts();
            loadPosts(); // 刷新主帖子列表
          }
        } catch (error) {
          console.error('删除帖子失败:', error);
          showNotification(error.message || '删除失败', 'error');
        }
      }
    }
    
    // 封禁用户
    if (e.target.closest('.admin-ban-user')) {
      const btn = e.target.closest('.admin-ban-user');
      const userId = btn.dataset.userid;
      const username = btn.dataset.username;
      
      const user = state.adminUsers.find(u => u.id === userId);
      const isCurrentlyBanned = user?.banEnd && new Date(user.banEnd) > new Date();
      
      if (isCurrentlyBanned) {
        // 解封用户
        if (confirm(`确定要解封用户 ${username} 吗？`)) {
          await unbanUser(userId);
        }
      } else {
        // 封禁用户
        const duration = parseInt(dom.banDurationSelect.value);
        const durationLabel = state.banDurations.find(d => d.hours === duration)?.label || duration + '小时';
        
        if (confirm(`确定要封禁用户 ${username} 吗？封禁时长: ${durationLabel}`)) {
          await banUser(userId, duration);
        }
      }
    }
    
    // 注销用户
    if (e.target.closest('.admin-delete-user')) {
      const btn = e.target.closest('.admin-delete-user');
      const userId = btn.dataset.userid;
      const username = btn.dataset.username;
      
      if (confirm(`确定要永久注销用户 ${username} 的账号吗？此操作将删除该用户的所有帖子和数据，且不可撤销！`)) {
        try {
          const response = await fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              adminId: state.currentUser.id
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '操作失败');
          }
          
          const data = await response.json();
          if (data.success) {
            showNotification(`用户 ${username} 已被注销`, 'success');
            
            // 如果是注销当前用户，退出登录
            if (userId === state.currentUser.id) {
              logoutUser();
            }
            
            loadAdminUsers();
            loadPosts(); // 刷新帖子列表
          }
        } catch (error) {
          console.error('注销用户失败:', error);
          showNotification(error.message || '注销失败', 'error');
        }
      }
    }
  });
}

// 封禁用户函数
async function banUser(userId, duration) {
  try {
    const response = await fetch('/users/ban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        banDuration: duration,
        adminId: state.currentUser.id
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '操作失败');
    }
    
    const data = await response.json();
    if (data.success) {
      showNotification(data.message, 'success');
      loadAdminUsers();
    }
  } catch (error) {
    console.error('封禁用户失败:', error);
    showNotification(error.message || '封禁失败', 'error');
  }
}

// 解封用户函数
async function unbanUser(userId) {
  try {
    const users = []; // 这里应该有从服务器获取用户的逻辑
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('用户不存在');
    }
    
    users[userIndex].banEnd = null;
    // 这里应该有保存到服务器的逻辑
    
    showNotification('用户已解封', 'success');
    loadAdminUsers();
  } catch (error) {
    console.error('解封用户失败:', error);
    showNotification(error.message || '解封失败', 'error');
  }
}

// 用户自行注销账号
function deleteOwnAccount() {
  if (confirm('确定要永久注销您的账号吗？此操作将删除您的所有帖子和数据，且不可撤销！')) {
    fetch(`/users/${state.currentUser.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showNotification('您的账号已注销', 'success');
        logoutUser();
      }
    })
    .catch(error => {
      console.error('注销账号失败:', error);
      showNotification('注销失败，请重试', 'error');
    });
  }
}


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
      
      // 移除图片查看器
      const imageViewerModal = document.getElementById('image-viewer-modal');
      if (imageViewerModal) {
        imageViewerModal.remove();
      }
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
  
  // 点击帖子图片
  document.addEventListener('click', (e) => {
    if (e.target.matches('.post-image, .post-image-thumb')) {
      const img = e.target;
      const postId = img.dataset.id;
      const index = parseInt(img.dataset.index);
      
      // 找到对应的帖子
      const post = state.posts.find(p => p.id === postId);
      if (!post || !post.images || post.images.length === 0) return;
      
      // 显示图片查看器
      showImageViewer(post.images, index);
    }
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

    // 如果有图片，先上传图片
    let imageUrls = [];
    if (state.selectedImages.length > 0) {
      const formData = new FormData();
      
      state.selectedImages.forEach(img => {
        formData.append('images', img.file);
      });
      
      const uploadResponse = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || '图片上传失败');
      }
      
      const uploadData = await uploadResponse.json();
      imageUrls = uploadData.imageUrls;
    }
    
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
        anonymous,
        images: imageUrls // 添加图片链接
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
    // 清空图片预览
    if (dom.imagePreview) {
      dom.imagePreview.innerHTML = '';
    }
    state.selectedImages = [];
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
    if (!document.getElementById('delete-account-btn')) {
      const deleteBtn = document.createElement('button');
      deleteBtn.id = 'delete-account-btn';
      deleteBtn.innerHTML = '<i class="fas fa-user-slash"></i> 注销账号';
      deleteBtn.className = 'logout-button';
      document.getElementById('user-actions').appendChild(deleteBtn);
      
      deleteBtn.addEventListener('click', deleteOwnAccount);
    }
    
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
    // 移除注销按钮
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) deleteBtn.remove();
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
  
  // 移除图片查看器
  if (e.target.matches('.modal') && e.target.id === 'image-viewer-modal') {
    e.target.remove();
  }
});