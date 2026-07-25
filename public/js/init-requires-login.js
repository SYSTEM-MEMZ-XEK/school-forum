// 需要登录的页面初始化模板
(function() {
  document.addEventListener('DOMContentLoaded', async function() {
    if (typeof window.userManager === 'undefined') {
      console.error('userManager 未定义，请检查 user.js 文件是否已加载');
      setTimeout(function() { window.location.href = 'login.html'; }, 100);
      return;
    }

    // 等待 userManager 完成异步初始化（含服务端验证）
    try {
      await window.userManager.initAsync();
    } catch (err) {
      console.error('userManager.initAsync 失败:', err);
    }

    window.userManager.setupEventListeners();

    // 校验登录状态（此时 checkAutoLogin 已完成）
    if (!checkLoginStatus()) {
      return;
    }

    initPageManager();

    function checkLoginStatus() {
      var savedUser = localStorage.getItem('forumUser');

      if (!savedUser) {
        window.utils.showNotification('请先登录', 'error');
        setTimeout(function() { window.location.href = 'login.html'; }, 100);
        return false;
      }

      var user = null;
      try {
        user = JSON.parse(savedUser);
        if (!user || !user.id || !user.username) {
          throw new Error('用户数据格式无效');
        }
      } catch (error) {
        console.error('解析用户数据失败:', error);
        window.utils.showNotification('登录信息已失效，请重新登录', 'error');
        setTimeout(function() { window.location.href = 'login.html'; }, 100);
        return false;
      }

      if (!window.userManager.state.currentUser) {
        window.userManager.state.currentUser = user;
      }

      return true;
    }

    function initPageManager() {
      if (window.pageManagers && Array.isArray(window.pageManagers)) {
        window.pageManagers.forEach(function(name) {
          if (window[name]) {
            window[name].init();
          }
        });
      } else if (window.pageManagerName && window[window.pageManagerName]) {
        window[window.pageManagerName].init();
      }
    }
  });
})();
