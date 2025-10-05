// 帖子管理模块
const postsManager = {
  // 全局状态
  state: {
    posts: [],
    currentPostId: null,
    selectedImages: [],
    isSelectingFiles: false // 新增：防止重复选择
  },

  // DOM元素
  dom: {
    postsContainer: document.getElementById('posts-container'),
    submitPostBtn: document.getElementById('submit-post'),
    contentInput: document.getElementById('content'),
    anonymousCheckbox: document.getElementById('anonymous'),
    imageUpload: document.getElementById('image-upload'),
    imageUploadArea: document.getElementById('image-upload-area'),
    imagePreview: document.getElementById('image-preview')
  },

  // 初始化
  init: function() {
    this.loadPosts();
    this.setupEventListeners();
    this.setupImageUploadListeners();
  },

  // 加载帖子
  // posts.js 中的 loadPosts 函数完整修复
loadPosts: async function() {
  const container = this.dom.postsContainer;
  if (!container) return;

  container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
  
  try {
    const response = await fetch('/posts');
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      this.state.posts = data.posts;
      this.renderPosts(data.posts);
    } else {
      throw new Error(data.message || '加载帖子失败');
    }
  } catch (error) {
    console.error('加载帖子失败:', error);
    if (container) {
      container.innerHTML = '<div class="empty-state">帖子加载失败，请稍后再试</div>';
    }
    utils.showNotification(error.message || '加载帖子失败', 'error');
  }
},

  // 渲染帖子
  renderPosts: function(posts) {
    const container = this.dom.postsContainer;
    if (!container) return;
    
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
      const currentUser = userManager.state.currentUser;
      const userLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.id);
      
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
            <i class="far fa-clock"></i> ${utils.formatDate(post.timestamp)}
          </div>
        </div>
        
        <div class="post-content">
          ${post.anonymous ? '<span class="tag anonymous-tag">匿名</span>' : 
          `<span class="tag">${post.grade || ''}</span>
           <span class="tag">${post.className || ''}</span>`}
          ${this.escapeHtml(post.content)}
          ${post.images && post.images.length > 0 ? this.renderPostImages(post.images) : ''}
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
          
          ${this.renderComments(post)}
        </div>
      `;
      
      container.appendChild(postElement);
    });
  },

  // 渲染评论
  renderComments: function(post) {
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
            <div class="comment-user">${this.escapeHtml(commentUsername)}</div>
            <div class="comment-time">${utils.formatDate(comment.timestamp)}</div>
          </div>
          <div class="comment-content">${this.escapeHtml(comment.content)}</div>
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
  },

  // 渲染所有评论（不再限制数量）
  renderAllComments: function(post) {
    if (!post.comments || post.comments.length === 0) {
      return '<div class="empty-state">暂无评论</div>';
    }
    
    let commentsHTML = '<div class="comments-list">';
    
    post.comments.forEach(comment => {
      const commentUsername = comment.anonymous ? '匿名同学' : comment.username;
      
      commentsHTML += `
        <div class="comment">
          <div class="comment-header">
            <div class="comment-user">${this.escapeHtml(commentUsername)}</div>
            <div class="comment-time">${utils.formatDate(comment.timestamp)}</div>
          </div>
          <div class="comment-content">${this.escapeHtml(comment.content)}</div>
        </div>
      `;
    });
    
    commentsHTML += '</div>';
    
    return commentsHTML;
  },

  // 设置事件监听器
  setupEventListeners: function() {
    // 发帖按钮
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.addEventListener('click', () => this.submitNewPost());
    }
    
    // 匿名状态切换监听器
    if (this.dom.anonymousCheckbox) {
      this.dom.anonymousCheckbox.addEventListener('change', function() {
        const isAnonymous = this.checked;
        utils.showNotification(isAnonymous ? 
          "已启用匿名模式，个人信息将被隐藏" : 
          "已禁用匿名模式，个人信息将显示",
          isAnonymous ? 'info' : 'success'
        );
      });
    }
    
    // 全局点击事件监听
    document.addEventListener('click', async (e) => {
      // 处理点赞按钮点击
      if (e.target.closest('.like-btn')) {
        const likeBtn = e.target.closest('.like-btn');
        const postId = likeBtn.dataset.id;
        
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再点赞', 'error');
          window.location.href = 'login.html';
          return;
        }
        
        try {
          const response = await fetch(`/posts/${postId}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: userManager.state.currentUser.id
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
          utils.showNotification(error.message || '操作失败', 'error');
        }
      }
      
      // 处理添加评论按钮
      if (e.target.closest('.add-comment-btn')) {
        const btn = e.target.closest('.add-comment-btn');
        this.state.currentPostId = btn.dataset.id;
        
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再评论', 'error');
          window.location.href = 'login.html';
          return;
        }
        
        commentsManager.showCommentModal(this.state.currentPostId);
      }
      
      // 处理"查看全部评论"按钮点击
      if (e.target.closest('.view-all-comments')) {
        const btn = e.target.closest('.view-all-comments');
        const postId = btn.dataset.id;
        
        // 找到对应的帖子
        const post = this.state.posts.find(p => p.id === postId);
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
            ${this.renderAllComments(post)}
          `;
        }
      }
    });
  },

  // 设置图片上传事件监听器
  setupImageUploadListeners: function() {
    if (!this.dom.imageUploadArea || !this.dom.imageUpload) return;
    
    // 点击上传区域触发文件选择
    this.dom.imageUploadArea.addEventListener('click', (e) => {
      // 防止重复触发
      if (this.state.isSelectingFiles) return;
      
      this.state.isSelectingFiles = true;
      this.dom.imageUpload.click();
      
      // 重置选择状态
      setTimeout(() => {
        this.state.isSelectingFiles = false;
      }, 100);
    });
    
    // 文件选择变化
    this.dom.imageUpload.addEventListener('change', (e) => {
      this.handleImageSelection(e.target.files);
      // 重置input，允许选择相同文件
      e.target.value = '';
    });
    
    // 阻止文件输入框的点击事件冒泡
    this.dom.imageUpload.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // 拖拽功能
    this.dom.imageUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dom.imageUploadArea.classList.add('dragover');
    });
    
    this.dom.imageUploadArea.addEventListener('dragleave', () => {
      this.dom.imageUploadArea.classList.remove('dragover');
    });
    
    this.dom.imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dom.imageUploadArea.classList.remove('dragover');
      this.handleImageSelection(e.dataTransfer.files);
    });
  },

  // 处理图片选择
  handleImageSelection: function(files) {
    if (!files || files.length === 0) return;
    
    // 检查总图片数量
    const remainingSlots = 20 - this.state.selectedImages.length;
    if (remainingSlots <= 0) {
      utils.showNotification('最多只能上传20张图片', 'error');
      return;
    }
    
    const filesArray = Array.from(files).slice(0, remainingSlots);
    let validFilesCount = 0;
    
    filesArray.forEach(file => {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        utils.showNotification(`文件 "${file.name}" 不是支持的图片格式（仅支持 JPG, PNG, GIF, WebP）`, 'error');
        return;
      }
      
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        utils.showNotification(`图片 "${file.name}" 超过10MB限制`, 'error');
        return;
      }
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          file: file,
          previewUrl: e.target.result,
          id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        
        this.state.selectedImages.push(imageData);
        this.renderImagePreview(imageData);
        validFilesCount++;
        
        // 显示成功消息
        if (validFilesCount === filesArray.length) {
          utils.showNotification(`成功添加 ${validFilesCount} 张图片`, 'success');
        }
      };
      
      reader.onerror = () => {
        utils.showNotification(`读取文件 "${file.name}" 时发生错误`, 'error');
      };
      
      reader.readAsDataURL(file);
    });
  },

  // 渲染图片预览
  renderImagePreview: function(imageData) {
    if (!this.dom.imagePreview) return;
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.id = imageData.id;
    
    previewItem.innerHTML = `
      <img src="${imageData.previewUrl}" alt="预览图片">
      <button type="button" class="remove-btn" onclick="postsManager.removeImage('${imageData.id}')">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    this.dom.imagePreview.appendChild(previewItem);
  },

  // 移除图片
  removeImage: function(imageId) {
    this.state.selectedImages = this.state.selectedImages.filter(img => img.id !== imageId);
    
    const previewItem = this.dom.imagePreview.querySelector(`[data-id="${imageId}"]`);
    if (previewItem) {
      previewItem.remove();
    }
    
    utils.showNotification('已移除图片', 'info');
  },

  // 清空所有图片
  clearImages: function() {
    this.state.selectedImages = [];
    if (this.dom.imagePreview) {
      this.dom.imagePreview.innerHTML = '';
    }
  },

  // 渲染帖子中的图片
  renderPostImages: function(images) {
    if (!images || images.length === 0) return '';
    
    let imagesHTML = '<div class="post-images">';
    
    images.forEach(image => {
      imagesHTML += `
        <img src="${image.url}" alt="${this.escapeHtml(image.originalname)}" class="post-image" onclick="postsManager.showImageModal('${image.url}')">
      `;
    });
    
    imagesHTML += '</div>';
    return imagesHTML;
  },

  // 显示图片预览模态框
  showImageModal: function(imageUrl) {
    const modal = document.getElementById('image-modal');
    if (!modal) return;
    
    // 设置图片并显示模态框
    modal.querySelector('.image-modal-content img').src = imageUrl;
    modal.style.display = 'flex';
  },

  // 提交新帖子
  submitNewPost: async function() {
    const content = this.dom.contentInput?.value;
    const anonymous = this.dom.anonymousCheckbox?.checked;
    
    // 禁用按钮防止重复提交
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.disabled = true;
      this.dom.submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';
    }
    
    try {
      // 验证输入
      if (!content?.trim()) {
        throw new Error('帖子内容不能为空');
      }
      
      if (content.length > 5000) {
        throw new Error('帖子内容过长，最多5000个字符');
      }
      
      if (!userManager.state.currentUser) {
        throw new Error('请先登录后再发帖');
      }
      
      // 验证图片数量
      if (this.state.selectedImages.length > 20) {
        throw new Error('最多只能上传20张图片');
      }
      
      // 直接使用当前用户信息
      const school = userManager.state.currentUser.school;
      const grade = userManager.state.currentUser.grade;
      const className = userManager.state.currentUser.className;
      const username = userManager.state.currentUser.username;
      
      // 创建FormData对象用于文件上传
      const formData = new FormData();
      formData.append('userId', userManager.state.currentUser.id);
      formData.append('username', username);
      formData.append('school', school);
      formData.append('grade', grade);
      formData.append('className', className);
      formData.append('content', content);
      formData.append('anonymous', anonymous.toString());
      
      // 添加图片文件
      this.state.selectedImages.forEach((image) => {
        formData.append('images', image.file);
      });
      
      // 发布请求（使用FormData）
      const response = await fetch('/posts', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '发布失败');
      }
      
      const data = await response.json();
      if (data.success) {
        utils.showNotification(`帖子发布成功${this.state.selectedImages.length > 0 ? '，包含' + this.state.selectedImages.length + '张图片' : ''}！`, 'success');
        await this.loadPosts();
        await statsManager.loadStats();
        if (this.dom.contentInput) this.dom.contentInput.value = '';
        if (this.dom.anonymousCheckbox) this.dom.anonymousCheckbox.checked = false;
        this.clearImages();
      }
    } catch (error) {
      console.error('发布失败:', error);
      utils.showNotification(error.message || '发布失败，请稍后重试', 'error');
    } finally {
      // 重新启用按钮
      if (this.dom.submitPostBtn) {
        this.dom.submitPostBtn.disabled = false;
        this.dom.submitPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发布帖子';
      }
    }
  },

  // HTML转义函数，防止XSS攻击
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};