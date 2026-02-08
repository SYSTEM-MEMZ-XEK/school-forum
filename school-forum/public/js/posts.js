// 帖子管理模块（使用 markdown-it 和 highlight.js）
const postsManager = {
  // 全局状态
  state: {
    posts: [],
    currentPostId: null,
    md: null, // markdown-it 实例
    hljs: null, // highlight.js 实例
    initialized: false, // 防止重复初始化
    viewTimers: {} // 帖子查看计时器 {postId: timerId}
  },

  // DOM元素
  dom: {
    postsContainer: document.getElementById('posts-container')
  },

  // 初始化
  init: function() {
    // 防止重复初始化
    if (this.state.initialized) {
      console.log('postsManager 已经初始化，跳过重复初始化');
      return;
    }
    
    // 性能监控
    console.time('postsManager.init');
    
    // 测量markdown渲染器初始化时间
    console.time('initializeMarkdownRenderer');
    this.initializeMarkdownRenderer();
    console.timeEnd('initializeMarkdownRenderer');
    
    // 加载帖子（异步，测量内部时间）
    this.loadPosts();
    
    this.setupEventListeners();
    
    // 标记为已初始化
    this.state.initialized = true;
    
    console.timeEnd('postsManager.init');
  },

  // 初始化 markdown 渲染器
  initializeMarkdownRenderer: function() {
    // 检查 markdown-it 是否已加载（支持多种可能的全局变量名）
    let markdownItGlobal = window.markdownit || window.markdownIt || window.markdown_it || window.MarkdownIt;
    
    if (!markdownItGlobal) {
      this.state.md = null;
      return;
    }

    try {
      // 使用之前检测到的markdown-it全局变量
      if (!markdownItGlobal) {
        throw new Error('markdown-it 全局变量未找到');
      }
      
      // 检查 highlight.js 是否已加载
      let hljsGlobal = window.hljs;
      if (hljsGlobal) {
        this.state.hljs = hljsGlobal;
      } else {
        console.warn('highlight.js 未加载，代码高亮将不可用');
        this.state.hljs = null;
      }
      
      // 创建 markdown-it 实例并配置
      this.state.md = markdownItGlobal({
        html: true, // 允许 HTML 标签
        linkify: true, // 自动将 URL 转换为链接
        typographer: true, // 启用 typographer 扩展
        // 配置代码高亮
        highlight: this.state.hljs ? function(str, lang) {
          if (lang && hljsGlobal.getLanguage(lang)) {
            try {
              return hljsGlobal.highlight(str, { language: lang }).value;
            } catch (error) {
              console.error('代码高亮失败:', error);
            }
          }
          // 如果语言未指定或不支持，使用自动检测
          try {
            return hljsGlobal.highlightAuto(str).value;
          } catch (error) {
            console.error('代码高亮失败:', error);
            return ''; // 使用默认转义
          }
        } : null
      });
    } catch (error) {
      console.error('初始化 markdown 渲染器失败:', error);
      this.state.md = null;
    }
  },

  // 加载帖子
  loadPosts: async function() {
    const container = this.dom.postsContainer;
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    
    // 性能监控
    console.time('postsManager.loadPosts');
    
    try {
      console.time('postsManager.fetchPosts');
      const response = await fetch('/posts');
      console.timeEnd('postsManager.fetchPosts');
      
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`);
      }
      
      console.time('postsManager.parseJSON');
      const data = await response.json();
      console.timeEnd('postsManager.parseJSON');
      
      if (data.success) {
        this.state.posts = data.posts;
        
        console.time('postsManager.renderPosts');
        this.renderPosts(data.posts);
        console.timeEnd('postsManager.renderPosts');
      } else {
        throw new Error(data.message || '加载帖子失败');
      }
    } catch (error) {
      console.error('加载帖子失败:', error);
      if (container) {
        container.innerHTML = '<div class="empty-state">帖子加载失败，请稍后再试</div>';
      }
      utils.showNotification(error.message || '加载帖子失败', 'error');
    } finally {
      console.timeEnd('postsManager.loadPosts');
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
      postElement.className = 'post clickable-post';
      postElement.dataset.id = post.id;
      postElement.style.cursor = 'pointer';
      
      // 检查当前用户是否点赞过此帖
      const currentUser = userManager.state.currentUser;
      const userLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.id);
      
      // 确保用户名正确显示
      const displayUsername = post.anonymous ? '匿名用户' : (post.username || '未知用户');
      
      // 截断内容（只显示前 300 个字符）
      const truncatedContent = this.truncateContent(post.content, 300);
      
      postElement.innerHTML = `
        <div class="post-header">
          <div class="user-info">
            ${post.anonymous ? 
              `<div class="avatar anonymous-avatar">匿</div>` : 
              `<div class="avatar clickable-avatar" data-user-id="${post.userId}" title="点击查看个人主页" ${post.userAvatar ? `style="background-image: url('${post.userAvatar}'); background-size: cover; background-position: center;"` : ''}>
                ${!post.userAvatar ? (post.className ? post.className.slice(0,1) : '?') : ''}
              </div>`
            }
            <div class="user-details">
              <div class="user-name-row">
                <h3>${displayUsername}</h3>
                ${post.userLevel ? window.levelSystem.renderLevelBadge(post.userLevel) : ''}
              </div>
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
          ${this.renderMarkdownContent(truncatedContent)}
          ${truncatedContent !== post.content ? '<p class="read-more">点击查看全文...</p>' : ''}
          ${post.images && post.images.length > 0 ? this.renderPostImages(post.images.slice(0, 3)) : ''}
        </div>
        
        <div class="post-footer">
          <div class="action-buttons">
            <div class="action-btn like-btn ${userLiked ? 'active' : ''}" data-id="${post.id}">
              <i class="fas fa-heart ${userLiked ? 'active' : ''}"></i> 点赞 <span>${post.likes || 0}</span>
            </div>
            <div class="action-btn comment-btn">
              <i class="fas fa-comment"></i> 评论 <span>${post.comments ? post.comments.length : 0}</span>
            </div>
            <div class="action-btn view-count-btn">
              <i class="fas fa-eye"></i> 浏览 <span>${post.viewCount || 0}</span>
            </div>
            ${currentUser && currentUser.id === post.userId ?
              `<div class="action-btn delete-btn" data-id="${post.id}">
                <i class="fas fa-trash"></i> 删除
              </div>` : ''
            }
          </div>
        </div>
      `;
      
      container.appendChild(postElement);
    });
    
    // 渲染 LaTeX 公式 (MathJax)
    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      console.log('开始渲染 MathJax 公式...');
      MathJax.typesetPromise([container]).then(() => {
        console.log('MathJax 公式渲染完成');
      }).catch((err) => console.error('MathJax typeset failed:', err));
    } else {
      console.log('MathJax 未就绪，等待加载...');
      // 等待 MathJax 加载完成后渲染
      const checkMathJax = setInterval(() => {
        if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
          clearInterval(checkMathJax);
          console.log('MathJax 已就绪，开始渲染...');
          MathJax.typesetPromise([container]).then(() => {
            console.log('MathJax 公式渲染完成');
          }).catch((err) => console.error('MathJax typeset failed:', err));
        }
      }, 100);
      // 10秒后停止检查
      setTimeout(() => clearInterval(checkMathJax), 10000);
    }
  },

  // 渲染 markdown 内容
  renderMarkdownContent: function(text) {
    if (!text) return '';
    
    // 如果 markdown-it 未初始化，使用简单转义
    if (!this.state.md) {
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
    
    try {
      // 使用 markdown-it 渲染
      const html = this.state.md.render(text);
      return html;
    } catch (error) {
      console.error('Markdown 渲染失败:', error);
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
  },

  // 截断内容
  truncateContent: function(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
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
          <div class="comment-content">${this.renderMarkdownContent(comment.content)}</div>
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
          <div class="comment-content">${this.renderMarkdownContent(comment.content)}</div>
        </div>
      `;
    });
    
    commentsHTML += '</div>';
    
    return commentsHTML;
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
  
    // 增加浏览量
    incrementViewCount: async function(postId) {
      try {
        const response = await fetch(`/posts/${postId}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 更新本地浏览量显示
            const viewCountBtn = document.querySelector(`.clickable-post[data-id="${postId}"] .view-count-btn span`);
            if (viewCountBtn) {
              viewCountBtn.textContent = data.viewCount;
            }
          }
        }
      } catch (error) {
        console.error('增加浏览量失败:', error);
        // 浏览量更新失败不影响用户体验，不显示错误提示
      }
    },
  
    // 设置事件监听器
    setupEventListeners: function() {
      // 鼠标悬停事件监听（5秒浏览逻辑）
      document.addEventListener('mouseover', (e) => {
        const post = e.target.closest('.clickable-post');
        if (post && post.dataset.id) {
          const postId = post.dataset.id;
  
          // 如果这个帖子还没有计时器，创建一个
          if (!this.state.viewTimers[postId]) {
            this.state.viewTimers[postId] = setTimeout(() => {
              // 5秒后增加浏览量
              this.incrementViewCount(postId);
              // 清除计时器
              delete this.state.viewTimers[postId];
            }, 5000);
          }
        }
      });
  
      // 鼠标移出事件监听
      document.addEventListener('mouseout', (e) => {
        const post = e.target.closest('.clickable-post');
        if (post && post.dataset.id) {
          const postId = post.dataset.id;
  
          // 清除计时器
          if (this.state.viewTimers[postId]) {
            clearTimeout(this.state.viewTimers[postId]);
            delete this.state.viewTimers[postId];
          }
        }
      });
  
      // 全局点击事件监听
    document.addEventListener('click', async (e) => {
      // 处理帖子点击（跳转到详情页）
      if (e.target.closest('.clickable-post')) {
        const post = e.target.closest('.clickable-post');

        // 如果点击的是操作按钮，不跳转
        if (e.target.closest('.action-btn') || e.target.closest('.clickable-avatar')) {
          return;
        }

        const postId = post.dataset.id;
        if (postId) {
          window.location.href = `post-detail.html?id=${postId}`;
        }
        return;
      }

      // 处理头像点击
      
      // 处理头像点击
      if (e.target.closest('.clickable-avatar')) {
        const avatar = e.target.closest('.clickable-avatar');
        const userId = avatar.dataset.userId;
        
        if (userId) {
          window.location.href = `profile.html?id=${userId}`;
        }
        return;
      }
      
      // 处理点赞按钮点击
      if (e.target.closest('.like-btn')) {
        const likeBtn = e.target.closest('.like-btn');
        const postId = likeBtn.dataset.id;
        
        // 防止重复点击
        if (likeBtn.classList.contains('processing')) {
          return;
        }
        
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再点赞', 'error');
          window.location.href = 'login.html';
          return;
        }
        
        // 禁用按钮并添加处理中状态
        likeBtn.classList.add('processing');
        
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
          console.log('点赞响应:', data); // 调试日志
          if (data.success) {
            // 更新UI
            const likesSpan = likeBtn.querySelector('span');
            const heartIcon = likeBtn.querySelector('i.fa-heart');
            
            if (likesSpan) {
              console.log('更新点赞数:', data.likes, 'liked状态:', data.liked); // 调试日志
              likesSpan.textContent = data.likes;
            }
            
            // 根据服务器返回的liked状态更新UI
            if (data.liked) {
              console.log('添加active类'); // 调试日志
              likeBtn.classList.add('active');
              if (heartIcon) heartIcon.classList.add('active');
            } else {
              console.log('移除active类'); // 调试日志
              likeBtn.classList.remove('active');
              if (heartIcon) heartIcon.classList.remove('active');
            }
          }
        } catch (error) {
          console.error('点赞失败:', error);
          utils.showNotification(error.message || '操作失败', 'error');
        } finally {
          // 移除处理中状态
          likeBtn.classList.remove('processing');
        }
      }
      
      // 处理删除按钮点击
      if (e.target.closest('.delete-btn')) {
        const deleteBtn = e.target.closest('.delete-btn');
        const postId = deleteBtn.dataset.id;
        
        if (!userManager.state.currentUser) {
          utils.showNotification('请先登录后再操作', 'error');
          window.location.href = 'login.html';
          return;
        }
        
        // 确认删除
        if (!confirm('确定要删除这个帖子吗？此操作不可撤销。')) {
          return;
        }
        
        try {
          const response = await fetch(`/posts/${postId}`, {
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
            throw new Error(errorData.message || '操作失败');
          }
          
          const data = await response.json();
          if (data.success) {
            utils.showNotification('帖子删除成功', 'success');
            
            // 从DOM中移除帖子
            const postElement = document.querySelector(`.post[data-id="${postId}"]`);
            if (postElement) {
              postElement.remove();
            }
            
            // 从状态中移除帖子
            const postIndex = this.state.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
              this.state.posts.splice(postIndex, 1);
            }
            
            // 如果所有帖子都被删除了，显示空状态
            if (this.state.posts.length === 0) {
              const container = this.dom.postsContainer;
              if (container) {
                container.innerHTML = '<div class="empty-state">暂时没有帖子，成为第一个发表的人吧！</div>';
              }
            }
          }
        } catch (error) {
          console.error('删除帖子失败:', error);
          utils.showNotification(error.message || '操作失败', 'error');
        }
      }
    });
  },

  // HTML转义函数，防止XSS攻击
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};