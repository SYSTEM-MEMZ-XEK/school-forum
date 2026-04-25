// 全部栏目页面脚本
(function() {
  // 页面状态
  const categoriesPageState = {
    categories: [],
    filteredCategories: [],
    initialized: false
  };

  // 初始化页面
  async function initPage() {
    if (categoriesPageState.initialized) return;
    categoriesPageState.initialized = true;

    // 初始化用户管理器
    if (typeof userManager !== 'undefined') {
      userManager.init();
      userManager.setupEventListeners();
    }

    // 加载栏目
    await loadCategories();

    // 设置事件监听
    setupEventListeners();
  }

  // 加载栏目
  async function loadCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    try {
      await window.categoryManager.init();
      const categories = window.categoryManager.state.categories.filter(c => c.isActive !== false);

      if (categories.length === 0) {
        grid.innerHTML = '<div class="categories-empty"><i class="fas fa-folder-open"></i><p>暂无栏目</p></div>';
        return;
      }

      categoriesPageState.categories = categories;
      categoriesPageState.filteredCategories = categories;

      renderCategories(categories);
    } catch (error) {
      console.error('加载栏目失败:', error);
      grid.innerHTML = '<div class="categories-empty"><i class="fas fa-exclamation-triangle"></i><p>加载失败，请刷新页面重试</p></div>';
    }
  }

  // 渲染栏目列表
  function renderCategories(categories) {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    if (!categories || categories.length === 0) {
      grid.innerHTML = '<div class="categories-empty"><i class="fas fa-search"></i><p>没有找到匹配的栏目</p></div>';
      return;
    }

    grid.innerHTML = categories.map(cat => `
      <a href="category.html?id=${cat.id}" class="category-card">
        <div class="category-card-icon" style="background: ${cat.color || '#4361ee'}20;">
          <i class="fas ${cat.icon || 'fa-folder'}" style="color: ${cat.color || '#4361ee'}"></i>
        </div>
        <div class="category-card-content">
          <h3>${window.utils.escapeHtml(cat.name)}</h3>
          <p>${window.utils.escapeHtml(cat.description || '暂无描述')}</p>
        </div>
        <div class="category-card-footer">
          <span class="category-card-count"><i class="fas fa-file-alt"></i> ${cat.postCount || 0} 篇帖子</span>
        </div>
      </a>
    `).join('');
  }

  // 搜索栏目
  function searchCategories(keyword) {
    const kw = keyword.toLowerCase().trim();
    if (!kw) {
      categoriesPageState.filteredCategories = categoriesPageState.categories;
    } else {
      categoriesPageState.filteredCategories = categoriesPageState.categories.filter(cat =>
        cat.name.toLowerCase().includes(kw) ||
        (cat.description && cat.description.toLowerCase().includes(kw))
      );
    }
    renderCategories(categoriesPageState.filteredCategories);
  }

  // 设置事件监听
  function setupEventListeners() {
    // 搜索
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchCategories(searchInput.value);
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
      });
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCategories(searchInput.value);
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => searchCategories(searchInput.value));
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearBtn.style.display = 'none';
        searchCategories('');
      });
    }

    // 图片预览
    const modal = document.getElementById('image-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
      modal.querySelector('.image-modal-close')?.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
  }

  // 打开申请栏目模态框
  window.openApplyCategoryModal = function() {
    if (!window.userManager || !window.userManager.state.currentUser) {
      window.utils.showNotification('请先登录', 'warning');
      return;
    }
    const modal = document.getElementById('applyCategoryModal');
    if (!modal) return;
    const nameInput = document.getElementById('apply-category-name');
    const descInput = document.getElementById('apply-category-desc');
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    const statusEl = document.getElementById('apply-category-status');
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
    modal.style.display = 'flex';
  };

  // 关闭申请栏目模态框
  window.closeApplyCategoryModal = function() {
    const modal = document.getElementById('applyCategoryModal');
    if (modal) modal.style.display = 'none';
  };

  // 提交栏目申请
  window.submitApplyCategory = async function() {
    const nameInput = document.getElementById('apply-category-name');
    const descInput = document.getElementById('apply-category-desc');
    if (!nameInput || !descInput) return;

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

    if (description.length < 10) {
      descInput.focus();
      if (statusEl) {
        statusEl.textContent = '描述至少需要10个字';
        statusEl.className = 'save-status error';
        statusEl.style.display = 'block';
      }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...'; }
    if (statusEl) { statusEl.style.display = 'none'; }

    try {
      const result = await window.categoryManager.applyForCategory(name, description);
      if (result.success) {
        if (statusEl) {
          statusEl.textContent = '申请已提交，等待管理员审核';
          statusEl.className = 'save-status success';
          statusEl.style.display = 'block';
        }
        setTimeout(window.closeApplyCategoryModal, 1800);
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
  };

  // 点击模态框背景关闭
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('applyCategoryModal');
    if (modal && e.target === modal) {
      window.closeApplyCategoryModal();
    }
  });

  // DOM 加载完成后初始化
  document.addEventListener('DOMContentLoaded', initPage);
})();
