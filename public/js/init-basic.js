// 页面初始化模板 - 基础版（userManager）
(function() {
  document.addEventListener('DOMContentLoaded', async function() {
    if (window.userManager) {
      window.userManager.init();
      window.userManager.setupEventListeners();
      // 等待服务器验证完成
      await window.userManager.initAsync();
    }
  });
})();
