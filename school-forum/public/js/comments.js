// 评论管理模块
const commentsManager = {
  // DOM元素
  dom: {
    commentModal: document.getElementById('comment-modal'),
    commentContent: document.getElementById('comment-content'),
    commentAnonymous: document.getElementById('comment-anonymous'),
    submitCommentBtn: document.getElementById('submit-comment')
  },

  // 初始化
  init: function() {
    this.setupEventListeners();
  },

  // 设置事件监听器
  setupEventListeners: function() {
    // 关闭模态框
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideCommentModal();
      });
    });

    // 评论提交按钮
    if (this.dom.submitCommentBtn) {
      this.dom.submitCommentBtn.addEventListener('click', () => this.submitComment());
    }

    // 全局点击事件关闭模态框
    window.addEventListener('click', (e) => {
      if (e.target === this.dom.commentModal) {
        this.hideCommentModal();
      }
    });
  },

  // 显示评论模态框
  showCommentModal: function(postId) {
    if (this.dom.commentModal) {
      this.dom.commentModal.dataset.postId = postId;
      this.dom.commentContent.value = '';
      if (this.dom.commentAnonymous) this.dom.commentAnonymous.checked = false;
      this.dom.commentModal.style.display = 'flex';
    }
  },

  // 隐藏评论模态框
  hideCommentModal: function() {
    if (this.dom.commentModal) {
      this.dom.commentModal.style.display = 'none';
    }
  },

  // 提交评论
  submitComment: async function() {
    const content = this.dom.commentContent?.value.trim();
    const postId = this.dom.commentModal?.dataset.postId;
    
    if (!content) {
      utils.showNotification('评论内容不能为空', 'error');
      return;
    }
    
    if (content.length > 500) {
      utils.showNotification('评论内容过长，最多500个字符', 'error');
      return;
    }
    
    if (!postId) {
      utils.showNotification('帖子ID不存在', 'error');
      return;
    }
    
    if (!userManager.state.currentUser) {
      utils.showNotification('请先登录后再评论', 'error');
      window.location.href = 'login.html';
      return;
    }
    
    if (this.dom.submitCommentBtn) {
      this.dom.submitCommentBtn.disabled = true;
      this.dom.submitCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    }
    
    try {
      const response = await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userManager.state.currentUser.id,
          username: userManager.state.currentUser.username,
          content,
          anonymous: this.dom.commentAnonymous?.checked || false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }
      
      const data = await response.json();
      if (data.success) {
        utils.showNotification('评论发布成功！', 'success');
        if (postsManager.loadPosts) await postsManager.loadPosts();
        if (statsManager.loadStats) await statsManager.loadStats();
        this.hideCommentModal();
      }
    } catch (error) {
      console.error('评论失败:', error);
      utils.showNotification(error.message || '评论发布失败', 'error');
    } finally {
      if (this.dom.submitCommentBtn) {
        this.dom.submitCommentBtn.disabled = false;
        this.dom.submitCommentBtn.innerHTML = '发表评论';
      }
    }
  }
};