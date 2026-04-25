// 页面初始化模板
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // 基础用户管理
    if (window.userManager) {
      window.userManager.init();
      window.userManager.setupEventListeners();
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
