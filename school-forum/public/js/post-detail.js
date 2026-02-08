// 帖子详情页管理器
const postDetailManager = {
  postId: null,
  post: null,
  md: null,
  hljs: null,

  // 初始化
  init: function() {
    // 从 URL 获取帖子 ID
    const urlParams = new URLSearchParams(window.location.search);
    this.postId = urlParams.get('id');

    if (!this.postId) {
      utils.showNotification('帖子 ID 无效', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
      return;
    }

    // 初始化 markdown 渲染器
    this.initializeMarkdownRenderer();

    // 初始化用户管理
    if (typeof userManager !== 'undefined') {
      userManager.init();
      userManager.setupEventListeners();
    }

    // 设置事件监听器
    this.setupEventListeners();

    // 加载帖子详情
    this.loadPostDetail();
  },

  // 初始化 markdown 渲染器
  initializeMarkdownRenderer: function() {
    let markdownItGlobal = window.markdownit || window.markdownIt || window.markdown_it || window.MarkdownIt;
    
    if (!markdownItGlobal) {
      this.md = null;
      return;
    }

    try {
      let hljsGlobal = window.hljs;
      if (hljsGlobal) {
        this.hljs = hljsGlobal;
      } else {
        console.warn('highlight.js 未加载，代码高亮将不可用');
        this.hljs = null;
      }

      this.md = markdownItGlobal({
        html: true,
        linkify: true,
        typographer: true,
        highlight: this.hljs ? function(str, lang) {
          if (lang && hljsGlobal.getLanguage(lang)) {
            try {
              return hljsGlobal.highlight(str, { language: lang }).value;
            } catch (error) {
              console.error('代码高亮失败:', error);
            }
          }
          try {
            return hljsGlobal.highlightAuto(str).value;
          } catch (error) {
            console.error('代码高亮失败:', error);
            return '';
          }
        } : null
      });
    } catch (error) {
      console.error('初始化 markdown 渲染器失败:', error);
      this.md = null;
    }
  },

  // 加载帖子详情
  loadPostDetail: async function() {
    const loading = document.getElementById('loading');
    const postDetail = document.getElementById('post-detail');
    const commentsSection = document.getElementById('comments-section');

    try {
      const response = await fetch(`/posts/${this.postId}`);

      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.post = data.post;
        this.renderPostDetail();
        this.renderComments();

        // 增加浏览量
        this.incrementViewCount();
        
        // 显示内容，隐藏加载状态
        loading.style.display = 'none';
        postDetail.style.display = 'block';
        commentsSection.style.display = 'block';

        // 渲染 LaTeX 公式
        this.renderMathJax();
      } else {
        throw new Error(data.message || '加载帖子失败');
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error);
      loading.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message || '加载失败'}`;
      utils.showNotification(error.message || '加载帖子失败', 'error');
    }
  },

  // 渲染帖子详情
  renderPostDetail: function() {
    const container = document.getElementById('post-detail');
    const currentUser = userManager.state.currentUser;
    const userLiked = currentUser && this.post.likedBy && this.post.likedBy.includes(currentUser.id);
    const displayUsername = this.post.anonymous ? '匿名用户' : (this.post.username || '未知用户');

    container.innerHTML = `
      <div class="post-detail-header">
        <div class="post-detail-user">
          <div class="post-detail-avatar ${this.post.anonymous ? 'anonymous-avatar' : ''}" 
               ${!this.post.anonymous ? `data-user-id="${this.post.userId}"` : ''}
               ${!this.post.anonymous && this.post.userAvatar ? `style="background-image: url('${this.post.userAvatar}'); background-size: cover; background-position: center;"` : ''}>
            ${this.post.anonymous ? '匿' : (!this.post.userAvatar ? (this.post.className ? this.post.className.slice(0,1) : '?') : '')}
          </div>
          <div class="post-detail-user-info">
            <div class="post-detail-username">${displayUsername}</div>
            ${this.post.anonymous ? '' : 
              `<div class="post-detail-class">${this.post.school || ''} | ${this.post.grade || ''} ${this.post.className || ''}</div>`
            }
          </div>
          <div class="post-detail-time">
            <i class="far fa-clock"></i> ${utils.formatDate(this.post.timestamp)}
          </div>
        </div>
      </div>
      
      <div class="post-detail-body">
        <div class="post-detail-content-text">
          ${this.renderMarkdownContent(this.post.content)}
        </div>
        ${this.post.images && this.post.images.length > 0 ? this.renderPostImages(this.post.images) : ''}
      </div>
      
      <div class="post-detail-footer">
        <button class="post-detail-action-btn like-btn ${userLiked ? 'active' : ''}" data-id="${this.post.id}">
          <i class="fas fa-heart ${userLiked ? 'active' : ''}"></i> 点赞 <span>${this.post.likes || 0}</span>
        </button>
        <div class="post-detail-action-btn">
          <i class="fas fa-comment"></i> 评论 <span>${this.post.comments ? this.post.comments.length : 0}</span>
        </div>
        <div class="post-detail-action-btn post-detail-view-count">
          <i class="fas fa-eye"></i> 浏览 <span>${this.post.viewCount || 0}</span>
        </div>
        ${currentUser && currentUser.id === this.post.userId ?
          `<button class="post-detail-action-btn delete-btn" data-id="${this.post.id}">
            <i class="fas fa-trash"></i> 删除
          </button>` : ''
        }
      </div>
    `;
  },

  // 渲染 markdown 内容
  renderMarkdownContent: function(text) {
    if (!text) return '';
    
    if (!this.md) {
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
    
    try {
      const html = this.md.render(text);
      return html;
    } catch (error) {
      console.error('Markdown 渲染失败:', error);
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
  },

  // 渲染帖子中的图片
  renderPostImages: function(images) {
    if (!images || images.length === 0) return '';
    
    let imagesHTML = '<div class="post-detail-images">';
    
    images.forEach(image => {
      imagesHTML += `
        <img src="${image.url}" alt="${this.escapeHtml(image.originalname)}" 
             class="post-detail-image" onclick="postDetailManager.showImageModal('${image.url}')">
      `;
    });
    
    imagesHTML += '</div>';
    return imagesHTML;
  },

  // 渲染评论
  renderComments: function() {
    const container = document.getElementById('comments-list');
    const countSpan = document.getElementById('comment-count');

    if (!this.post.comments || this.post.comments.length === 0) {
      container.innerHTML = `
        <div class="empty-comments">
          <i class="fas fa-comments"></i>
          <p>暂无评论，快来发表第一条评论吧！</p>
        </div>
      `;
      countSpan.textContent = '0';
      return;
    }

    countSpan.textContent = this.post.comments.length;

    let commentsHTML = '';
    
    this.post.comments.forEach(comment => {
      const commentUsername = comment.anonymous ? '匿名同学' : (comment.username || '用户');
      const isCurrentUser = userManager.state.currentUser && 
                           userManager.state.currentUser.id === comment.userId;
      const isPostOwner = userManager.state.currentUser && 
                         userManager.state.currentUser.id === this.post.userId;
      const replyCount = comment.replies ? comment.replies.length : 0;

      commentsHTML += `
        <div class="comment-item" data-comment-id="${comment.id}">
          <div class="comment-header">
            <div class="comment-user">${this.escapeHtml(commentUsername)}</div>
            <div class="comment-time">${utils.formatDate(comment.timestamp)}</div>
          </div>
          <div class="comment-body">
            ${this.renderMarkdownContent(comment.content)}
          </div>
          <div class="comment-footer">
            <span class="comment-action reply-btn" data-comment-id="${comment.id}">
              <i class="fas fa-reply"></i> 回复 ${replyCount > 0 ? `(${replyCount})` : ''}
            </span>
            ${(isCurrentUser || isPostOwner) ? `
              <span class="comment-action delete-comment" data-comment-id="${comment.id}">
                <i class="fas fa-trash"></i> 删除
              </span>
            ` : ''}
          </div>
          
          <!-- 回复输入框（默认隐藏） -->
          <div class="reply-input-container" id="reply-input-${comment.id}" style="display: none;">
            <textarea class="reply-textarea" rows="2" placeholder="回复 ${this.escapeHtml(commentUsername)}..."></textarea>
            <div class="reply-input-actions">
              <label class="anonymous-checkbox">
                <input type="checkbox" class="reply-anonymous-checkbox">
                <span>匿名</span>
              </label>
              <button class="btn-primary btn-small submit-reply-btn" data-comment-id="${comment.id}">
                <i class="fas fa-paper-plane"></i> 回复
              </button>
            </div>
          </div>
          
          <!-- 回复列表 -->
          ${comment.replies && comment.replies.length > 0 ? `
            <div class="replies-list">
              ${this.renderReplies(comment.replies, comment.id, 2)}
            </div>
          ` : ''}
        </div>
      `;
    });

    container.innerHTML = commentsHTML;
  },

  // 递归渲染回复（带层级限制）
  renderReplies: function(replies, commentId, level) {
    if (!replies || replies.length === 0) {
      return '';
    }

    return replies.map(reply => {
      const replyUsername = reply.anonymous ? '匿名同学' : (reply.username || '用户');
      const isReplyCurrentUser = userManager.state.currentUser && 
                                 userManager.state.currentUser.id === reply.userId;
      const isReplyPostOwner = userManager.state.currentUser && 
                               userManager.state.currentUser.id === this.post.userId;
      const nestedReplyCount = reply.replies ? reply.replies.length : 0;
      
      // 如果回复了其他回复，显示被回复的用户名
      let replyToInfo = '';
      if (reply.replyTo) {
        const parentReply = this.findReplyById(replies, reply.replyTo);
        if (parentReply) {
          const parentUsername = parentReply.anonymous ? '匿名同学' : (parentReply.username || '用户');
          replyToInfo = `<span class="reply-to-tag">回复 ${this.escapeHtml(parentUsername)}</span> `;
        }
      }
      
      // 递归渲染嵌套回复
      let nestedRepliesHTML = '';
      if (reply.replies && reply.replies.length > 0) {
        nestedRepliesHTML = `
          <div class="${level >= 3 ? 'nested-replies-list' : 'replies-list'}">
            ${this.renderReplies(reply.replies, commentId, level + 1)}
          </div>
        `;
      }
      
      return `
        <div class="${level >= 3 ? 'nested-reply-item' : 'reply-item'}" data-reply-id="${reply.id}">
          <div class="${level >= 3 ? 'nested-reply-header' : 'reply-header'}">
            <div class="${level >= 3 ? 'nested-reply-user' : 'reply-user'}">${this.escapeHtml(replyUsername)}</div>
            <div class="${level >= 3 ? 'nested-reply-time' : 'reply-time'}">${utils.formatDate(reply.timestamp)}</div>
          </div>
          <div class="${level >= 3 ? 'nested-reply-body' : 'reply-body'}">
            ${replyToInfo}${this.renderMarkdownContent(reply.content)}
          </div>
          <div class="reply-footer">
            <span class="${level >= 3 ? 'nested-reply-action' : 'reply-action'} reply-reply-btn" data-comment-id="${commentId}" data-reply-id="${reply.id}" data-reply-username="${replyUsername}">
              <i class="fas fa-reply"></i> 回复 ${nestedReplyCount > 0 ? `(${nestedReplyCount})` : ''}
            </span>
            ${(isReplyCurrentUser || isReplyPostOwner) ? `
              <span class="${level >= 3 ? 'nested-reply-action' : 'reply-action'} delete-reply" data-comment-id="${commentId}" data-reply-id="${reply.id}">
                <i class="fas fa-trash"></i> 删除
              </span>
            ` : ''}
          </div>
          
          <!-- 嵌套回复输入框（默认隐藏） -->
          <div class="${level >= 2 ? 'nested-reply-input' : 'reply-input-container'}" id="nested-reply-input-${reply.id}" style="display: none;">
            <textarea class="reply-textarea" rows="2" placeholder="回复 ${this.escapeHtml(replyUsername)}..."></textarea>
            <div class="reply-input-actions">
              <label class="anonymous-checkbox">
                <input type="checkbox" class="reply-anonymous-checkbox">
                <span>匿名</span>
              </label>
              <button class="btn-primary btn-small submit-nested-reply-btn" data-comment-id="${commentId}" data-reply-id="${reply.id}">
                <i class="fas fa-paper-plane"></i> 回复
              </button>
            </div>
          </div>
          
          ${nestedRepliesHTML}
        </div>
      `;
    }).join('');
  },

  // 在回复列表中查找指定ID的回复
  findReplyById: function(replies, replyId) {
    for (let reply of replies) {
      if (reply.id === replyId) {
        return reply;
      }
      if (reply.replies && reply.replies.length > 0) {
        const found = this.findReplyById(reply.replies, replyId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  },

  // 渲染 LaTeX 公式
  renderMathJax: function() {
    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      console.log('开始渲染 MathJax 公式...');
      MathJax.typesetPromise().then(() => {
        console.log('MathJax 公式渲染完成');
      }).catch((err) => console.error('MathJax typeset failed:', err));
    }
  },

  // 显示图片预览模态框
  showImageModal: function(imageUrl) {
    // 创建模态框（如果不存在）
    let modal = document.getElementById('image-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-modal';
      modal.className = 'image-modal';
      modal.innerHTML = `
        <div class="image-modal-content">
          <img src="" alt="预览图片">
        </div>
        <div class="image-modal-close">&times;</div>
      `;
      document.body.appendChild(modal);

      // 添加关闭事件
      modal.querySelector('.image-modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    modal.querySelector('.image-modal-content img').src = imageUrl;
    modal.style.display = 'flex';
  },

  // 提交评论
  submitComment: async function() {
    const contentInput = document.getElementById('new-comment-content');
    const anonymousCheckbox = document.getElementById('new-comment-anonymous');
    const submitBtn = document.getElementById('submit-comment-btn');

    const content = contentInput.value.trim();
    const isAnonymous = anonymousCheckbox.checked;

    if (!content) {
      utils.showNotification('请输入评论内容', 'warning');
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再评论', 'error');
      window.location.href = 'login.html';
      return;
    }

    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发表中...';

    try {
      const response = await fetch(`/posts/${this.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          username: userManager.state.currentUser.username,
          content: content,
          anonymous: isAnonymous
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '发表评论失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('评论发表成功', 'success');
        contentInput.value = '';
        anonymousCheckbox.checked = false;
        
        // 重新加载帖子详情
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('发表评论失败:', error);
      utils.showNotification(error.message || '发表评论失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发表评论';
    }
  },

  // 删除评论
  deleteComment: async function(commentId) {
    if (!confirm('确定要删除这条评论吗？')) {
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再操作', 'error');
      return;
    }

    try {
      const response = await fetch(`/posts/${this.postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除评论失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('评论删除成功', 'success');
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      utils.showNotification(error.message || '删除评论失败', 'error');
    }
  },

  // 显示回复输入框
  showReplyInput: function(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    if (replyInput) {
      replyInput.style.display = replyInput.style.display === 'none' ? 'block' : 'none';
      if (replyInput.style.display === 'block') {
        replyInput.querySelector('textarea').focus();
      }
    }
  },

  // 提交回复
  submitReply: async function(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    const textarea = replyInput.querySelector('.reply-textarea');
    const anonymousCheckbox = replyInput.querySelector('.reply-anonymous-checkbox');
    const submitBtn = replyInput.querySelector('.submit-reply-btn');

    const content = textarea.value.trim();
    const isAnonymous = anonymousCheckbox.checked;

    if (!content) {
      utils.showNotification('请输入回复内容', 'warning');
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再回复', 'error');
      window.location.href = 'login.html';
      return;
    }

    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 回复中...';

    try {
      const response = await fetch(`/posts/${this.postId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          username: userManager.state.currentUser.username,
          content: content,
          anonymous: isAnonymous
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '回复失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('回复成功', 'success');
        textarea.value = '';
        anonymousCheckbox.checked = false;
        replyInput.style.display = 'none';
        
        // 重新加载帖子详情
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('回复失败:', error);
      utils.showNotification(error.message || '回复失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 回复';
    }
  },

  // 显示嵌套回复输入框
  showNestedReplyInput: function(replyId) {
    const replyInput = document.getElementById(`nested-reply-input-${replyId}`);
    if (replyInput) {
      replyInput.style.display = replyInput.style.display === 'none' ? 'block' : 'none';
      if (replyInput.style.display === 'block') {
        replyInput.querySelector('textarea').focus();
      }
    }
  },

  // 提交嵌套回复
  submitNestedReply: async function(commentId, replyId) {
    const replyInput = document.getElementById(`nested-reply-input-${replyId}`);
    const textarea = replyInput.querySelector('.reply-textarea');
    const anonymousCheckbox = replyInput.querySelector('.reply-anonymous-checkbox');
    const submitBtn = replyInput.querySelector('.submit-nested-reply-btn');

    const content = textarea.value.trim();
    const isAnonymous = anonymousCheckbox.checked;

    if (!content) {
      utils.showNotification('请输入回复内容', 'warning');
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再回复', 'error');
      window.location.href = 'login.html';
      return;
    }

    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 回复中...';

    try {
      const response = await fetch(`/posts/${this.postId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          username: userManager.state.currentUser.username,
          content: content,
          anonymous: isAnonymous,
          replyToId: replyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '回复失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('回复成功', 'success');
        textarea.value = '';
        anonymousCheckbox.checked = false;
        replyInput.style.display = 'none';
        
        // 重新加载帖子详情
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('回复失败:', error);
      utils.showNotification(error.message || '回复失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 回复';
    }
  },

  // 删除回复
  deleteReply: async function(commentId, replyId) {
    if (!confirm('确定要删除这条回复吗？')) {
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再操作', 'error');
      return;
    }

    try {
      const response = await fetch(`/posts/${this.postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          replyId: replyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除回复失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('回复删除成功', 'success');
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('删除回复失败:', error);
      utils.showNotification(error.message || '删除回复失败', 'error');
    }
  },

  // 删除嵌套回复
  deleteNestedReply: async function(commentId, replyId, nestedReplyId) {
    if (!confirm('确定要删除这条回复吗？')) {
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再操作', 'error');
      return;
    }

    try {
      const response = await fetch(`/posts/${this.postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          replyId: replyId,
          nestedReplyId: nestedReplyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除回复失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('回复删除成功', 'success');
        this.loadPostDetail();
      }
    } catch (error) {
      console.error('删除回复失败:', error);
      utils.showNotification(error.message || '删除回复失败', 'error');
    }
  },

  // 增加浏览量
  incrementViewCount: async function() {
    try {
      const response = await fetch(`/posts/${this.postId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地浏览量显示
          this.post.viewCount = data.viewCount;
          const viewCountElement = document.querySelector('.post-detail-view-count');
          if (viewCountElement) {
            viewCountElement.textContent = data.viewCount;
          }
        }
      }
    } catch (error) {
      console.error('增加浏览量失败:', error);
      // 浏览量更新失败不影响用户体验，不显示错误提示
    }
  },

  // 点赞/取消点赞
  toggleLike: async function() {
    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再点赞', 'error');
      window.location.href = 'login.html';
      return;
    }

    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn.classList.contains('processing')) {
      return;
    }

    likeBtn.classList.add('processing');

    try {
      const response = await fetch(`/posts/${this.postId}/like`, {
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
        const likesSpan = likeBtn.querySelector('span');
        const heartIcon = likeBtn.querySelector('i.fa-heart');

        if (likesSpan) {
          likesSpan.textContent = data.likes;
        }

        if (data.liked) {
          likeBtn.classList.add('active');
          if (heartIcon) heartIcon.classList.add('active');
        } else {
          likeBtn.classList.remove('active');
          if (heartIcon) heartIcon.classList.remove('active');
        }

        // 更新本地帖子数据
        this.post.likes = data.likes;
        if (data.liked) {
          if (!this.post.likedBy) this.post.likedBy = [];
          if (!this.post.likedBy.includes(userManager.state.currentUser.id)) {
            this.post.likedBy.push(userManager.state.currentUser.id);
          }
        } else {
          this.post.likedBy = (this.post.likedBy || []).filter(id => id !== userManager.state.currentUser.id);
        }
      }
    } catch (error) {
      console.error('点赞失败:', error);
      utils.showNotification(error.message || '操作失败', 'error');
    } finally {
      likeBtn.classList.remove('processing');
    }
  },

  // 删除帖子
  deletePost: async function() {
    if (!confirm('确定要删除这个帖子吗？此操作不可撤销。')) {
      return;
    }

    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再操作', 'error');
      return;
    }

    try {
      const response = await fetch(`/posts/${this.postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除失败');
      }

      const data = await response.json();
      if (data.success) {
        utils.showNotification('帖子删除成功', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      utils.showNotification(error.message || '删除失败', 'error');
    }
  },

  // 设置事件监听器
  setupEventListeners: function() {
    // 返回按钮
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }

    // 全局点击事件
    document.addEventListener('click', async (e) => {
      // 点赞按钮
      if (e.target.closest('.like-btn')) {
        this.toggleLike();
      }

      // 提交评论按钮
      if (e.target.closest('#submit-comment-btn')) {
        this.submitComment();
      }

      // 删除帖子按钮
      if (e.target.closest('.delete-btn')) {
        this.deletePost();
      }

      // 删除评论按钮
      if (e.target.closest('.delete-comment')) {
        const btn = e.target.closest('.delete-comment');
        const commentId = btn.dataset.commentId;
        this.deleteComment(commentId);
      }

      // 回复按钮
      if (e.target.closest('.reply-btn')) {
        const btn = e.target.closest('.reply-btn');
        const commentId = btn.dataset.commentId;
        this.showReplyInput(commentId);
      }

      // 提交回复按钮
      if (e.target.closest('.submit-reply-btn')) {
        const btn = e.target.closest('.submit-reply-btn');
        const commentId = btn.dataset.commentId;
        this.submitReply(commentId);
      }

      // 删除回复按钮
      if (e.target.closest('.delete-reply')) {
        const btn = e.target.closest('.delete-reply');
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        this.deleteReply(commentId, replyId);
      }

      // 回复回复按钮
      if (e.target.closest('.reply-reply-btn')) {
        const btn = e.target.closest('.reply-reply-btn');
        console.log('回复回复按钮被点击:', btn.dataset);
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        this.showNestedReplyInput(replyId);
      }

      // 提交嵌套回复按钮
      if (e.target.closest('.submit-nested-reply-btn')) {
        const btn = e.target.closest('.submit-nested-reply-btn');
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        this.submitNestedReply(commentId, replyId);
      }

      // 删除嵌套回复按钮
      if (e.target.closest('.delete-nested-reply')) {
        const btn = e.target.closest('.delete-nested-reply');
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        const nestedReplyId = btn.dataset.nestedReplyId;
        this.deleteNestedReply(commentId, replyId, nestedReplyId);
      }

      // 头像点击（跳转到个人主页）
      if (e.target.closest('.post-detail-avatar') && !e.target.closest('.post-detail-avatar.anonymous-avatar')) {
        const avatar = e.target.closest('.post-detail-avatar');
        const userId = avatar.dataset.userId;
        if (userId) {
          window.location.href = `profile.html?id=${userId}`;
        }
      }
    });
  },

  // HTML 转义函数
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  postDetailManager.init();
});