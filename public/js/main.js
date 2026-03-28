// 主应用文件 - 协调各个模块
const app = {
  // 初始化应用
  init: function() {
    console.log('app.init: 开始初始化应用');
    
    // 初始化用户管理（必须最先执行）
    if (typeof userManager !== 'undefined') {
      console.log('app.init: 初始化用户管理器');
      userManager.init();
      userManager.setupEventListeners();
    }
    
    // 初始化帖子管理（依赖用户管理器）
    if (typeof postsManager !== 'undefined') {
      console.log('app.init: 初始化帖子管理器');
      postsManager.init();
    }
    
    // 初始化评论管理
    if (typeof commentsManager !== 'undefined') {
      commentsManager.init();
    }
    
    // 初始化统计数据
    if (typeof statsManager !== 'undefined') {
      statsManager.init();
    }
    
    // 启动自动刷新
    if (typeof utils !== 'undefined' && utils.startAutoRefresh) {
      utils.startAutoRefresh();
    }
    
    // 初始化图片模态框事件
    this.setupImageModal();
    
    console.log('校园论坛应用初始化完成');
  },
  
  // 设置图片模态框事件
  setupImageModal: function() {
    const modal = document.getElementById('image-modal');
    if (!modal) return;
    
    // 添加关闭事件
    const closeBtn = modal.querySelector('.image-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
};

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});