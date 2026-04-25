// 设置页面初始化
(function() {
  console.log('scripts 加载完成');
  console.log('typeof settingsManager:', typeof window.settingsManager);

  document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded 事件触发');
    
    // 初始化用户管理并等待完成
    if (window.userManager?.initAsync) {
      await window.userManager.initAsync();
    } else if (window.userManager) {
      window.userManager.init();
    }
    
    console.log('开始初始化设置页面');
    console.log('typeof settingsManager:', typeof window.settingsManager);
    
    // 初始化设置页面
    if (typeof window.settingsManager === 'object' && window.settingsManager !== null) {
      window.settingsManager.init();
    } else {
      console.error('settingsManager 未定义！');
    }
    
    // 设置登录/注册按钮事件
    if (window.userManager?.setupEventListeners) {
      window.userManager.setupEventListeners();
    }
  });
})();
