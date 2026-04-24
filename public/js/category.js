// 栏目管理模块
const categoryManager = {
  // 全局状态
  state: {
    categories: [],
    currentCategory: null,
    initialized: false
  },

  // 初始化
  init: async function() {
    if (this.state.initialized) return;
    this.state.initialized = true;
    await this.loadCategories();
  },

  // 加载所有已启用栏目
  loadCategories: async function() {
    try {
      const response = await fetch('/categories');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        this.state.categories = data.categories || [];
      }
      return this.state.categories;
    } catch (error) {
      console.error('加载栏目失败:', error);
      return [];
    }
  },

  // 获取单个栏目
  getCategory: async function(categoryId) {
    try {
      const response = await fetch(`/categories/${categoryId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        this.state.currentCategory = data.category;
        return data.category;
      }
    } catch (error) {
      console.error('获取栏目失败:', error);
      return null;
    }
  },

  // 申请新建栏目
  applyForCategory: async function(categoryName, description) {
    try {
      const response = await fetch('/category-applications', {
        method: 'POST',
        headers: userManager.getAuthHeaders(),
        body: JSON.stringify({ categoryName, description })
      });
      const data = await response.json();
      if (data.success) {
        utils.showNotification(data.message || '申请已提交', 'success');
        return { success: true };
      } else {
        utils.showNotification(data.message || '申请提交失败', 'error');
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('申请栏目失败:', error);
      utils.showNotification('申请提交失败，请稍后重试', 'error');
      return { success: false };
    }
  },

  // 渲染栏目列表（供其他模块调用）
  renderCategoryNav: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = this.state.categories;
    if (!categories || categories.length === 0) {
      container.innerHTML = '<div class="no-categories">暂无栏目</div>';
      return;
    }

    container.innerHTML = categories.map(cat => `
      <a href="category.html?id=${cat.id}" class="category-nav-item" data-category-id="${cat.id}">
        <i class="fas ${cat.icon || 'fa-folder'}" style="color: ${cat.color || '#4361ee'}"></i>
        <span>${utils.escapeHtml(cat.name)}</span>
        ${cat.postCount !== undefined ? `<span class="category-count">${cat.postCount}</span>` : ''}
      </a>
    `).join('');
  }
};
