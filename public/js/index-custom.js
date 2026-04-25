// 首页自定义脚本 - 发布帖子跳转逻辑
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // 新帖子按钮事件
    const newPostBtn = document.getElementById('new-post-btn');
    const newPostPlaceholder = document.getElementById('new-post-placeholder');
    
    if (newPostBtn) {
      newPostBtn.addEventListener('click', function() {
        // 检查是否已登录
        const savedUser = localStorage.getItem('forumUser');
        if (savedUser) {
          window.location.href = 'edit-simple.html';
        } else {
          window.utils.showNotification('请先登录后再发布帖子', 'error');
          window.location.href = 'login.html';
        }
      });
    }
    
    if (newPostPlaceholder) {
      newPostPlaceholder.addEventListener('click', function() {
        const savedUser = localStorage.getItem('forumUser');
        if (savedUser) {
          window.location.href = 'edit-simple.html';
        } else {
          window.utils.showNotification('请先登录后再发布帖子', 'error');
          window.location.href = 'login.html';
        }
      });
    }
  });
})();
