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
  },

  // 渲染首页侧边栏栏目列表
  renderSidebarCategoryList: function() {
    const container = document.getElementById('sidebar-categories');
    if (!container) return;

    const categories = this.state.categories;
    if (!categories || categories.length === 0) {
      container.innerHTML = '<div class="category-sidebar-empty">暂无栏目</div>';
      return;
    }

    container.innerHTML = categories.map(cat => `
      <a href="category.html?id=${cat.id}" class="category-sidebar-item">
        <i class="fas ${cat.icon || 'fa-folder'}" style="color: ${cat.color || '#4361ee'}"></i>
        <span>${utils.escapeHtml(cat.name)}</span>
        ${cat.postCount !== undefined ? `<span class="category-sidebar-count">${cat.postCount}</span>` : ''}
      </a>
    `).join('');
  }
};

// ======== 申请栏目模态框函数 ========

// 打开申请栏目模态框
function openApplyCategoryModal() {
  if (!userManager.state.currentUser) {
    if (typeof utils !== 'undefined') utils.showNotification('请先登录', 'warning');
    return;
  }
  const modal = document.getElementById('applyCategoryModal');
  if (!modal) return;
  document.getElementById('apply-category-name').value = '';
  document.getElementById('apply-category-desc').value = '';
  const statusEl = document.getElementById('apply-category-status');
  if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  modal.style.display = 'flex';
}

// 关闭申请栏目模态框
function closeApplyCategoryModal() {
  const modal = document.getElementById('applyCategoryModal');
  if (modal) modal.style.display = 'none';
}

// 提交栏目申请
async function submitApplyCategory() {
  const nameInput = document.getElementById('apply-category-name');
  const descInput = document.getElementById('apply-category-desc');
  const name = nameInput.value.trim();
  const description = descInput.value.trim();
  const statusEl = document.getElementById('apply-category-status');
  const submitBtn = document.getElementById('apply-category-submit-btn');

  if (!name) {
    nameInput.focus();
    if (statusEl) {
      statusEl.textContent = '请输入栏目名称';
      statusEl.className = 'save-status error';
      statusEl.style.display = 'block';
    }
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...'; }
  if (statusEl) { statusEl.style.display = 'none'; }

  try {
    const result = await categoryManager.applyForCategory(name, description);
    if (result.success) {
      if (statusEl) {
        statusEl.textContent = '申请已提交，等待管理员审核';
        statusEl.className = 'save-status success';
        statusEl.style.display = 'block';
      }
      setTimeout(closeApplyCategoryModal, 1800);
    } else {
      if (statusEl) {
        statusEl.textContent = result.message || '提交失败';
        statusEl.className = 'save-status error';
        statusEl.style.display = 'block';
      }
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = '提交失败，请稍后重试';
      statusEl.className = 'save-status error';
      statusEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交申请'; }
  }
}

// 点击模态框背景关闭
document.addEventListener('click', (e) => {
  const modal = document.getElementById('applyCategoryModal');
  if (modal && e.target === modal) {
    closeApplyCategoryModal();
  }
});
