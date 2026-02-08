// 简洁版编辑页面功能
const simpleEditManager = {
  // 状态
  state: {
    selectedImages: [],
    currentUser: null,
    md: null // markdown-it 实例
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
    removeTextFileBtn: document.getElementById('remove-text-file')
  },
  
  // 初始化
  init: function() {
    this.initializeMarkdownRenderer();
    this.checkLoginStatus();
    this.setupEventListeners();
    this.setupEditor();
    this.setupUpload();
    this.updatePreview();
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
  checkLoginStatus: function() {
    const savedUser = localStorage.getItem('forumUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.state.currentUser = user;
      this.enableUploadAreas();
      this.enableSubmitButton();
    } else {
      this.disableUploadAreas();
      this.disableSubmitButton();
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
        window.location.href = 'index.html';
      });
    }
    
    // 提交按钮
    if (this.dom.submitPostBtn) {
      this.dom.submitPostBtn.addEventListener('click', () => this.submitNewPost());
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
    
    // 如果 markdown-it 未初始化，使用简单转义
    if (!this.state.md) {
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
    
    try {
      // 使用 markdown-it 渲染
      const html = this.state.md.render(text);
      return html;
    } catch (error) {
      console.error('Markdown 渲染失败:', error);
      return '<p>' + this.escapeHtml(text) + '</p>';
    }
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
    
    const remainingSlots = 20 - this.state.selectedImages.length;
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
      if (this.state.selectedImages.length > 20) {
        throw new Error('最多只能上传20张图片');
      }
      
      // 验证内容
      if (this.state.selectedImages.length === 0) {
        // 没有图片时，需要验证文本内容
        if (!content) {
          throw new Error('帖子内容不能为空');
        }
        
        if (content.trim().length === 0) {
          throw new Error('帖子内容不能为空或只包含空白字符');
        }
        
        if (content.length > 10000) {
          throw new Error('帖子内容过长，最多10000个字符');
        }
      } else {
        // 有图片时，如果提供了内容，验证内容长度
        if (content && content.length > 0) {
          if (content.length > 10000) {
            throw new Error('帖子内容过长，最多10000个字符');
          }
        }
      }
      
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
      formData.append('content', content);
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