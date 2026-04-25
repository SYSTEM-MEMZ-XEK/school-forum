// 页面初始化模板 - 基础版（userManager）
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.userManager) {
      window.userManager.init();
      window.userManager.setupEventListeners();
    }
  });
})();
