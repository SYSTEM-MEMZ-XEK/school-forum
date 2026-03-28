// 简洁版编辑页面功能
const simpleEditManager = {
  // 状态
  state: {
    selectedImages: [],
    currentUser: null,
    md: null, // markdown-it 实例
    isEditMode: false,
    editPostId: null,
    existingImages: [], // 已有的图片
    deletedImages: [], // 要删除的图片
    config: null // 配置信息
  },
  
  // DOM元素
  dom: {
    backBtn: document.getElementById('back-btn'),
    submitPostBtn: document.getElementById('submit-post'),
    contentInput: document.getElementById('content'),
    previewArea: document.getElementById('preview-area'),
    charCount: document.getElementById('char-count'),
    previewStatus: document.getElementById('preview-status'),
    imageUpload: document.getElementById('image-upload'),
    imageUploadArea: document.getElementById('image-upload-area'),
    imagePreview: document.getElementById('image-preview'),
    textFileUpload: document.getElementById('text-file-upload'),
    textUploadArea: document.getElementById('text-upload-area'),
    textFileInfo: document.getElementById('text-file-info'),
    textFileName: document.getElementById('text-file-name'),
    removeTextFileBtn: document.getElementById('remove-text-file'),
    pageTitle: document.querySelector('.simple-header-left h1')
  },
  
  // 初始化
  init: async function() {
    await this.loadConfig();
    this.initializeMarkdownRenderer();
    this.checkLoginStatus();
    this.checkEditMode();
    this.setupEventListeners();
    this.setupEditor();
    this.setupUpload();
    this.updatePreview();
  },
  
  // 加载配置
  loadConfig: async function() {
    // 设置默认配置
    this.state.config = {
      contentLimits: {
        post: 50000,
        comment: 500
      },
      upload: {
        maxFiles: 20,
        maxFileSize: 32 * 1024 * 1024
      }
    };
    
    // 获取公开配置
    try {
      const response = await fetch('/config/public');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          this.state.config = data.config;
        }
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error);
    }
  },
  
  // 检查是否是编辑模式
  checkEditMode: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const editPostId = urlParams.get('edit');
    
    if (editPostId) {
      this.state.isEditMode = true;
      this.state.editPostId = editPostId;
      this.loadPostForEdit(editPostId);
      
      // 更新页面标题
      if (this.dom.pageTitle) {
        this.dom.pageTitle.innerHTML = '<i class="fas fa-edit"></i> 编辑帖子';
      }
      
      // 更新按钮文本
      if (this.dom.submitPostBtn) {
        this.dom.submitPostBtn.innerHTML = '<i class="fas fa-save"></i> 保存修改';
      }
    }
  },
  
  // 加载帖子用于编辑
  loadPostForEdit: async function(postId) {
    try {
      const response = await fetch(`/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('加载帖子失败');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '加载帖子失败');
      }
      
      const post = data.post;
      
      // 检查是否是帖子作者
      if (this.state.currentUser && post.userId !== this.state.currentUser.id) {
        utils.showNotification('您没有权限编辑此帖子', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
        return;
      }
      
      // 填充内容
      if (this.dom.contentInput) {
        this.dom.contentInput.value = post.content || '';
        this.updateCharCount();
        this.updatePreview();
      }
      
      // 加载已有图片
      if (post.images && post.images.length > 0) {
        this.state.existingImages = post.images;
        this.renderExistingImages(post.images);
      }
      
      utils.showNotification('帖子内容已加载', 'info');
    } catch (error) {
      console.error('加载帖子失败:', error);
      utils.showNotification(error.message || '加载帖子失败', 'error');
    }
  },
  
  // 渲染已有图片
  renderExistingImages: function(images) {
    if (!this.dom.imagePreview) return;
    
    images.forEach(image => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item existing-image';
      previewItem.dataset.url = image.url;
      
      previewItem.innerHTML = `
        <img src="${image.url}" alt="${this.escapeHtml(image.originalname || '图片')}">
        <button type="button" class="remove-btn" onclick="simpleEditManager.removeExistingImage('${image.url}')">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      this.dom.imagePreview.appendChild(previewItem);
    });
  },
  
  // 移除已有图片
  removeExistingImage: function(imageUrl) {
    // 添加到删除列表
    this.state.deletedImages.push(imageUrl);
    
    // 从现有图片列表中移除
    this.state.existingImages = this.state.existingImages.filter(img => img.url !== imageUrl);
    
    // 从预览中移除
    const previewItem = this.dom.imagePreview.querySelector(`[data-url="${imageUrl}"]`);
    if (previewItem) {
      previewItem.remove();
    }
    
    utils.showNotification('图片已标记为删除', 'info');
  },
  
  // 初始化 markdown 渲染器
  initializeMarkdownRenderer: function() {
    // 检查 markdown-it 是否已加载（支持多种可能的全局变量名）
    const markdownItGlobal = window.markdownit || window.markdownIt || window.markdown_it || window.MarkdownIt;
    
    if (!markdownItGlobal) {
      console.warn('markdown-it 未加载，等待加载...');
      setTimeout(() => this.initializeMarkdownRenderer(), 100);
      return;
    }

    try {
      // 创建 markdown-it 实例并配置（简化配置，只支持基本markdown）
      this.state.md = markdownItGlobal({
        html: true, // 允许 HTML 标签
        linkify: true, // 自动将 URL 转换为链接
        typographer: true, // 启用 typographer 扩展
        // 移除highlight配置，不支持代码高亮
        highlight: null
      });

      console.log('Markdown 渲染器初始化完成（简化配置）');
    } catch (error) {
      console.error('初始化 markdown 渲染器失败:', error);
    }
  },

  // HTML转义函数
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 检查登录状态
  checkLoginStatus: async function() {
    const savedUser = localStorage.getItem('forumUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        
        // 向服务器验证用户状态
        const isValid = await this.verifyUserWithServer(user);
        
        if (isValid) {
          this.state.currentUser = user;
          this.enableUploadAreas();
          this.enableSubmitButton();
        } else {
          this.state.currentUser = null;
          this.disableUploadAreas();
          this.disableSubmitButton();
          utils.showNotification('请先登录后再发布帖子', 'error');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        }
      } catch (error) {
        console.error('解析用户数据失败:', error);
        localStorage.removeItem('forumUser');
        this.disableUploadAreas();
        this.disableSubmitButton();
      }
    } else {
      this.disableUploadAreas();
      this.disableSubmitButton();
    }
  },
  
  // 向服务器验证用户状态
  verifyUserWithServer: async function(user) {
    try {
      const response = await fetch('/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) {
        localStorage.removeItem('forumUser');
        utils.showNotification('登录状态已失效，请重新登录', 'error');
        return false;
      }
      
      const data = await response.json();
      
      if (data.success && data.valid) {
        const serverUser = data.user;
        
        // 检查关键字段是否一致
        const fieldsToCheck = ['username', 'qq', 'school', 'enrollmentYear', 'className'];
        for (const field of fieldsToCheck) {
          if (user[field] !== serverUser[field]) {
            localStorage.removeItem('forumUser');
            utils.showNotification('账户信息已变更，请重新登录', 'error');
            return false;
          }
        }
        
        // 检查管理员状态
        const localIsAdmin = user.isAdmin || false;
        const serverIsAdmin = data.isAdmin || false;
        if (localIsAdmin !== serverIsAdmin) {
          localStorage.removeItem('forumUser');
          utils.showNotification('账户权限已变更，请重新登录', 'error');
          return false;
        }
        
        // 检查用户是否被禁用
        if (serverUser.isActive === false) {
          localStorage.removeItem('forumUser');
          utils.showNotification('您的账号已被禁用', 'error');
          return false;
        }
        
        return true;
      }
      
      localStorage.removeItem('forumUser');
      return false;
    } catch (error) {
      console.error('验证用户状态失败:', error);
      // 网络错误时保持登录状态
      return true;
    }
  },
  
  // 启用上传区域
  enableUploadAreas: function() {
    // 图片上传区域
    if (this.dom.imageUploadArea && this.dom.imageUpload) {
      this.dom.imageUploadArea.classList.remove('disabled');
      this.dom.imageUploadArea.title = '点击或拖拽图片到这里';
      this.dom.imageUpload.disabled = false;
    }
    
    // 文本文件上传区域
    if (this.dom.textUploadArea && this.dom.textFileUpload) {
      this.dom.textUploadArea.classList.remove('disabled');
      this.dom.textUploadArea.title = '点击上传文本文件';
      this.dom.textFileUpload.disabled = false;
    }
  },
  
  // 禁用上传区域
  disableUploadAreas: function() {
    // 图片上传区域
    if (this.dom.imageUploadArea && this.dom.imageUpload) {
      this.dom.imageUploadArea.classList.add('disabled');
      this.dom.imageUploadArea.title = '请先登录后再上传图片';
      this.dom.imageUpload.disabled = true;
    }
    
    // 文本文件上传区域
    if (this.dom.textUploadArea && this.dom.textFileUpload) {
      this.dom.textUploadArea.classList.add('disabled');
      this.dom.textUploadArea.title = '请先登录后再上传文件';
      this.dom.textFileUpload.disabled = true;
    }
  },
  
  // 启用提交按钮
  enableSubmitButton: function() {
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.disabled = false;
    }
  },
  
  // 禁用提交按钮
  disableSubmitButton: function() {
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.disabled = true;
    }
  },
  
  // 设置事件监听器
  setupEventListeners: function() {
    // 返回按钮
    if (this.dom.backBtn) {
      this.dom.backBtn.addEventListener('click', () => {
        if (this.state.isEditMode) {
          window.location.href = `post-detail.html?id=${this.state.editPostId}`;
        } else {
          window.location.href = 'index.html';
        }
      });
    }
    
    // 提交按钮
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.addEventListener('click', () => {
        if (this.state.isEditMode) {
          this.updatePost();
        } else {
          this.submitNewPost();
        }
      });
    }
  },
  
  // 设置编辑器
  setupEditor: function() {
    if (!this.dom.contentInput) return;
    
    // 输入事件监听
    this.dom.contentInput.addEventListener('input', () => {
      this.updateCharCount();
      this.updatePreview();
    });
    
    // 初始字符计数
    this.updateCharCount();
  },
  
  // 更新字符计数
  updateCharCount: function() {
    if (!this.dom.contentInput || !this.dom.charCount) return;
    
    const content = this.dom.contentInput.value;
    const charCount = content.length;
    
    this.dom.charCount.textContent = charCount;
  },
  
  // 更新预览
  updatePreview: function() {
    if (!this.dom.contentInput || !this.dom.previewArea) return;
    
    const content = this.dom.contentInput.value;
    
    if (!content.trim()) {
      this.dom.previewArea.innerHTML = `
        <div class="empty-preview">
          <i class="fas fa-file-alt"></i>
          <p>预览将在这里显示</p>
          <small>开始输入内容以查看预览效果</small>
        </div>
      `;
      this.updatePreviewStatus('等待输入');
      return;
    }
    
    // 渲染Markdown
    const html = this.renderMarkdown(content);
    this.dom.previewArea.innerHTML = html;
    
    // 渲染 MathJax 公式（使用防抖）
    if (this.mathjaxTimeout) {
      clearTimeout(this.mathjaxTimeout);
    }
    this.mathjaxTimeout = setTimeout(() => {
      if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
        MathJax.typesetPromise([this.dom.previewArea]).catch((err) => console.error('MathJax typeset failed:', err));
      }
    }, 300);
    
    // 更新状态
    this.updatePreviewStatus('已更新');
  },
  
  // 更新预览状态
  updatePreviewStatus: function(status) {
    if (this.dom.previewStatus) {
      this.dom.previewStatus.textContent = status;
    }
  },


  
  // 渲染Markdown
  renderMarkdown: function(text) {
    if (!text) return '';
    
    // 检测并转换 HTML 内容为 Markdown 代码块（实时预览时处理）
    let processedText = text;
    if (typeof utils !== 'undefined' && utils.detectAndEscapeHtml) {
      processedText = utils.detectAndEscapeHtml(text);
    }
    
    // 如果 markdown-it 未初始化，使用简单转义
    if (!this.state.md) {
      return '<p>' + this.escapeHtml(processedText) + '</p>';
    }
    
    try {
      // 保护公式不被 markdown 处理
      const { protectedText, placeholders } = this.protectMathFormulas(processedText);
      
      // 使用 markdown-it 渲染
      const html = this.state.md.render(protectedText);
      
      // 恢复公式
      return this.restoreMathFormulas(html, placeholders);
    } catch (error) {
      console.error('Markdown 渲染失败:', error);
      return '<p>' + this.escapeHtml(processedText) + '</p>';
    }
  },

  // 保护数学公式不被 markdown 处理
  protectMathFormulas: function(text) {
    const placeholders = [];
    let index = 0;
    
    // 替换函数
    const replaceWithPlaceholder = (match) => {
      const placeholder = `MATHJAXPH${index}PH`;
      placeholders.push({ placeholder, formula: match });
      index++;
      return placeholder;
    };
    
    // 按顺序处理各种公式格式
    // 1. 独立公式块 $$...$$ (先处理长的，避免被 $...$ 部分匹配)
    let protectedText = text.replace(/\$\$[\s\S]*?\$\$/g, replaceWithPlaceholder);
    // 2. 独立公式块 \[...\]
    protectedText = protectedText.replace(/\\[[\s\S]*?\\]/g, replaceWithPlaceholder);
    // 3. 行内公式 $...$ (非贪婪，排除 $$)
    protectedText = protectedText.replace(/\$(?!\$)([^\$\n]+?)\$/g, replaceWithPlaceholder);
    // 4. 行内公式 \(...\)
    protectedText = protectedText.replace(/\\\([\s\S]*?\\\)/g, replaceWithPlaceholder);
    
    return { protectedText, placeholders };
  },

  // 恢复数学公式
  restoreMathFormulas: function(html, placeholders) {
    let result = html;
    placeholders.forEach(({ placeholder, formula }) => {
      result = result.replace(new RegExp(placeholder, 'g'), formula);
    });
    return result;
  },
  
  // 设置上传
  setupUpload: function() {
    this.setupImageUpload();
    this.setupTextFileUpload();
  },
  
  // 设置图片上传
  setupImageUpload: function() {
    if (!this.dom.imageUploadArea || !this.dom.imageUpload) return;
    
    // 点击上传区域
    this.dom.imageUploadArea.addEventListener('click', () => {
      if (!this.dom.imageUploadArea.classList.contains('disabled')) {
        this.dom.imageUpload.click();
      }
    });
    
    // 文件选择变化
    this.dom.imageUpload.addEventListener('change', (e) => {
      this.handleImageSelection(e.target.files);
      e.target.value = '';
    });
    
    // 拖拽功能
    this.dom.imageUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.dom.imageUploadArea.classList.contains('disabled')) {
        this.dom.imageUploadArea.classList.add('dragover');
      }
    });
    
    this.dom.imageUploadArea.addEventListener('dragleave', () => {
      this.dom.imageUploadArea.classList.remove('dragover');
    });
    
    this.dom.imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dom.imageUploadArea.classList.remove('dragover');
      
      if (!this.dom.imageUploadArea.classList.contains('disabled')) {
        this.handleImageSelection(e.dataTransfer.files);
      }
    });
  },
  
  // 处理图片选择
  handleImageSelection: function(files) {
    if (!files || files.length === 0) return;
    
    const totalImages = this.state.selectedImages.length + this.state.existingImages.length;
    const remainingSlots = 20 - totalImages;
    if (remainingSlots <= 0) {
      utils.showNotification('最多只能上传20张图片', 'error');
      return;
    }
    
    const filesArray = Array.from(files).slice(0, remainingSlots);
    
    filesArray.forEach(file => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        utils.showNotification(`文件 "${file.name}" 不是支持的图片格式`, 'error');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        utils.showNotification(`图片 "${file.name}" 超过10MB限制`, 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          file: file,
          previewUrl: e.target.result,
          id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        
        this.state.selectedImages.push(imageData);
        this.renderImagePreview(imageData);
        
        utils.showNotification(`已添加图片: ${file.name}`, 'success');
      };
      
      reader.readAsDataURL(file);
    });
  },
  
  // 渲染图片预览
  renderImagePreview: function(imageData) {
    if (!this.dom.imagePreview) return;
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.id = imageData.id;
    
    previewItem.innerHTML = `
      <img src="${imageData.previewUrl}" alt="预览图片">
      <button type="button" class="remove-btn" onclick="simpleEditManager.removeImage('${imageData.id}')">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    this.dom.imagePreview.appendChild(previewItem);
  },
  
  // 移除图片
  removeImage: function(imageId) {
    this.state.selectedImages = this.state.selectedImages.filter(img => img.id !== imageId);
    
    const previewItem = this.dom.imagePreview.querySelector(`[data-id="${imageId}"]`);
    if (previewItem) {
      previewItem.remove();
    }
    
    utils.showNotification('已移除图片', 'info');
  },
  
  // 设置文本文件上传
  setupTextFileUpload: function() {
    if (!this.dom.textUploadArea || !this.dom.textFileUpload) return;
    
    // 点击上传区域
    this.dom.textUploadArea.addEventListener('click', () => {
      if (!this.dom.textUploadArea.classList.contains('disabled')) {
        this.dom.textFileUpload.click();
      }
    });
    
    // 文件选择变化
    this.dom.textFileUpload.addEventListener('change', (e) => {
      this.handleTextFileSelection(e.target.files[0]);
    });
    
    // 移除文本文件按钮
    if (this.dom.removeTextFileBtn) {
      this.dom.removeTextFileBtn.addEventListener('click', () => {
        this.removeTextFile();
      });
    }
  },
  
  // 处理文本文件选择
  handleTextFileSelection: function(file) {
    if (!file) return;
    
    const allowedTypes = ['.txt', '.md'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      utils.showNotification('只支持.txt和.md格式的文件', 'error');
      return;
    }
    
    if (file.size > 1024 * 1024) {
      utils.showNotification('文件大小不能超过1MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      if (this.dom.contentInput) {
        this.dom.contentInput.value = content;
        this.updateCharCount();
        this.updatePreview();
      }
      
      this.showTextFileInfo(file.name, file.size);
      utils.showNotification(`已加载文件: ${file.name}`, 'success');
    };
    
    reader.readAsText(file, 'UTF-8');
  },
  
  // 显示文本文件信息
  showTextFileInfo: function(filename, filesize) {
    if (!this.dom.textFileInfo || !this.dom.textFileName) return;
    
    const sizeStr = filesize < 1024 ? 
      `${filesize} B` : 
      filesize < 1024 * 1024 ? 
        `${(filesize / 1024).toFixed(1)} KB` : 
        `${(filesize / (1024 * 1024)).toFixed(1)} MB`;
    
    this.dom.textFileName.textContent = `${filename} (${sizeStr})`;
    this.dom.textFileInfo.style.display = 'flex';
  },
  
  // 移除文本文件
  removeTextFile: function() {
    if (this.dom.textFileInfo) {
      this.dom.textFileInfo.style.display = 'none';
    }
    
    if (this.dom.textFileUpload) {
      this.dom.textFileUpload.value = '';
    }
    
    utils.showNotification('已移除文本文件', 'info');
  },
  
  // 更新帖子
  updatePost: async function() {
    const content = this.dom.contentInput?.value;
    
    // 禁用按钮防止重复提交
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.disabled = true;
      this.dom.submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    }
    
    try {
      // 验证输入
      if (!this.state.currentUser) {
        throw new Error('请先登录');
      }
      
      // 计算总图片数
      const totalImages = this.state.selectedImages.length + this.state.existingImages.length;
      
      // 验证内容
      if (totalImages === 0) {
        if (!content || content.trim().length === 0) {
          throw new Error('帖子内容不能为空');
        }
      }
      
      const maxPostLength = this.state.config?.contentLimits?.post || 50000;
      if (content && content.length > maxPostLength) {
        throw new Error(`帖子内容过长，最多${maxPostLength}个字符`);
      }
      
      // 检测并转换 HTML 内容为 Markdown 代码块
      const processedContent = typeof utils !== 'undefined' && utils.detectAndEscapeHtml 
        ? utils.detectAndEscapeHtml(content || '') 
        : content;
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('userId', this.state.currentUser.id);
      formData.append('content', processedContent);
      formData.append('deletedImages', JSON.stringify(this.state.deletedImages));
      
      // 添加新图片文件
      this.state.selectedImages.forEach((image) => {
        formData.append('images', image.file);
      });
      
      // 发送请求
      const response = await fetch(`/posts/${this.state.editPostId}`, {
        method: 'PUT',
        body: formData
      });
      
      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回了无效的响应格式');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '保存失败');
      }
      
      if (data.success) {
        utils.showNotification('帖子修改成功！', 'success');
        
        // 延迟跳转到帖子详情页
        setTimeout(() => {
          window.location.href = `post-detail.html?id=${this.state.editPostId}`;
        }, 1500);
      }
    } catch (error) {
      console.error('修改失败:', error);
      if (typeof utils !== 'undefined' && utils.showNotification) {
        utils.showNotification(error.message || '修改失败，请稍后重试', 'error');
      } else {
        alert(error.message || '修改失败，请稍后重试');
      }
    } finally {
      // 重新启用按钮
      if (this.dom.submitPostBtn) {
        this.dom.submitPostBtn.disabled = false;
        this.dom.submitPostBtn.innerHTML = '<i class="fas fa-save"></i> 保存修改';
      }
    }
  },
  
  // 提交新帖子
  submitNewPost: async function() {
    const content = this.dom.contentInput?.value;
    
    // 禁用按钮防止重复提交
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.disabled = true;
      this.dom.submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';
    }
    
    try {
      // 验证输入
      if (!this.state.currentUser) {
        throw new Error('请先登录后再发帖');
      }
      
      // 验证图片数量
      const maxFiles = this.state.config?.upload?.maxFiles || 20;
      if (this.state.selectedImages.length > maxFiles) {
        throw new Error(`最多只能上传${maxFiles}张图片`);
      }
      
      // 获取配置中的帖子长度限制
      const maxPostLength = this.state.config?.contentLimits?.post || 50000;
      
      // 验证内容
      if (this.state.selectedImages.length === 0) {
        // 没有图片时，需要验证文本内容
        if (!content) {
          throw new Error('帖子内容不能为空');
        }
        
        if (content.trim().length === 0) {
          throw new Error('帖子内容不能为空或只包含空白字符');
        }
        
        if (content.length > maxPostLength) {
          throw new Error(`帖子内容过长，最多${maxPostLength}个字符`);
        }
      } else {
        // 有图片时，如果提供了内容，验证内容长度
        if (content && content.length > 0) {
          if (content.length > maxPostLength) {
            throw new Error(`帖子内容过长，最多${maxPostLength}个字符`);
          }
        }
      }
      
      // 检测并转换 HTML 内容为 Markdown 代码块
      const processedContent = typeof utils !== 'undefined' && utils.detectAndEscapeHtml 
        ? utils.detectAndEscapeHtml(content) 
        : content;
      
      // 准备数据
      const school = this.state.currentUser.school;
      const grade = this.state.currentUser.grade;
      const className = this.state.currentUser.className;
      const username = this.state.currentUser.username;
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('userId', this.state.currentUser.id);
      formData.append('username', username);
      formData.append('school', school);
      formData.append('grade', grade);
      formData.append('className', className);
      formData.append('content', processedContent);
      formData.append('anonymous', 'false');
      formData.append('title', '');
      formData.append('tags', '');
      
      // 添加图片文件
      this.state.selectedImages.forEach((image) => {
        formData.append('images', image.file);
      });
      
      // 发布请求
      const response = await fetch('/posts', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '发布失败');
      }
      
      const data = await response.json();
      if (data.success) {
        utils.showNotification(`帖子发布成功${this.state.selectedImages.length > 0 ? '，包含' + this.state.selectedImages.length + '张图片' : ''}！`, 'success');
        
        // 清空表单
        if (this.dom.contentInput) this.dom.contentInput.value = '';
        this.state.selectedImages = [];
        if (this.dom.imagePreview) this.dom.imagePreview.innerHTML = '';
        this.removeTextFile();
        this.updateCharCount();
        this.updatePreview();
        
        // 延迟跳转
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      }
    } catch (error) {
      console.error('发布失败:', error);
      if (typeof utils !== 'undefined' && utils.showNotification) {
        utils.showNotification(error.message || '发布失败，请稍后重试', 'error');
      } else {
        alert(error.message || '发布失败，请稍后重试');
      }
    } finally {
      // 重新启用按钮
      if (this.dom.submitPostBtn) {
        this.dom.submitPostBtn.disabled = false;
        this.dom.submitPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发布帖子';
      }
    }
  }
};

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('edit-simple.js DOMContentLoaded');
  console.log('utils 可用性检查:', typeof utils);
  console.log('window.utils 可用性检查:', typeof window.utils);
  simpleEditManager.init();
});
