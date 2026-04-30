// 页面初始化模板
(function() {
  document.addEventListener('DOMContentLoaded', async function() {
    // 基础用户管理（必须先完成，确保 userManager.state.currentUser 可用）
    if (window.userManager) {
      window.userManager.init();
      window.userManager.setupEventListeners();
      // 等待服务器验证完成，避免后续 manager 在 currentUser 准备好前执行
      await window.userManager.initAsync();
    }
    // 统计管理器
    if (window.statsManager) {
      window.statsManager.init();
    }
    // 页面特定管理器（通过 window.pageManagers 数组配置）
    if (window.pageManagers && Array.isArray(window.pageManagers)) {
      window.pageManagers.forEach(function(name) {
        if (window[name]) {
          window[name].init();
        }
      });
    }
  });
})();
