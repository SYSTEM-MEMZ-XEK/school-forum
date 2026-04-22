// 私信管理模块
const chatManager = {
  state: {
    conversations: [],
    currentConversation: null,
    currentOtherUser: null,
    messages: [],
    canSendMessage: true,
    sendPermissionReason: '',
    initialized: false,
    hasMoreMessages: true,
    oldestMessageDate: null
  },

  dom: {},

  init: function() {
    if (this.state.initialized) return;
    
    this.cacheDom();
    this.setupEventListeners();
    this.loadConversations();
    
    // 检查URL参数，是否直接打开某个会话
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    if (userId) {
      this.openConversationWithUser(userId);
    }
    
    this.state.initialized = true;
  },

  cacheDom: function() {
    this.dom = {
      conversationsPanel: document.getElementById('conversations-panel'),
      conversationsList: document.getElementById('conversations-list'),
      chatPanel: document.getElementById('chat-panel'),
      chatEmpty: document.getElementById('chat-empty'),
      chatHeader: document.getElementById('chat-header'),
      chatAvatar: document.getElementById('chat-avatar'),
      chatUsername: document.getElementById('chat-username'),
      chatRelation: document.getElementById('chat-relation'),
      messagesContainer: document.getElementById('messages-container'),
      messagesList: document.getElementById('messages-list'),
      messageInput: document.getElementById('message-input'),
      messageInputContainer: document.getElementById('message-input-container'),
      sendBtn: document.getElementById('send-btn'),
      newChatBtn: document.getElementById('new-chat-btn'),
      backToList: document.getElementById('back-to-list'),
      viewProfileBtn: document.getElementById('view-profile-btn'),
      permissionWarning: document.getElementById('permission-warning'),
      permissionText: document.getElementById('permission-text'),
      searchUserContainer: document.getElementById('search-user-container'),
      searchUserInput: document.getElementById('search-user-input'),
      closeSearchBtn: document.getElementById('close-search-btn'),
      contactableUsers: document.getElementById('contactable-users'),
      loadMoreMessages: document.getElementById('load-more-messages'),
      deleteModal: document.getElementById('delete-modal'),
      deleteModalText: document.getElementById('delete-modal-text'),
      cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn')
    };
  },

  setupEventListeners: function() {
    // 发送消息
    this.dom.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // 输入框事件
    this.dom.messageInput.addEventListener('input', () => this.handleInputChange());
    this.dom.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // 自动调整输入框高度
    this.dom.messageInput.addEventListener('input', () => {
      this.dom.messageInput.style.height = 'auto';
      this.dom.messageInput.style.height = Math.min(this.dom.messageInput.scrollHeight, 150) + 'px';
    });
    
    // 新建会话
    this.dom.newChatBtn.addEventListener('click', () => this.toggleNewChatPanel());
    
    // 关闭搜索
    this.dom.closeSearchBtn.addEventListener('click', () => this.toggleNewChatPanel(false));
    
    // 搜索用户
    this.dom.searchUserInput.addEventListener('input', (e) => this.searchContactableUsers(e.target.value));
    
    // 返回会话列表（移动端）
    this.dom.backToList.addEventListener('click', () => this.showConversationsPanel());
    
    // 加载更多消息
    this.dom.loadMoreMessages.addEventListener('click', () => this.loadMoreMessages());
    
    // 删除会话
    this.dom.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
    this.dom.confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteConversation());
  },

  getCurrentUser: function() {
    return userManager.state.currentUser || JSON.parse(localStorage.getItem('forumUser'));
  },

  // 加载会话列表
  loadConversations: async function() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/conversations?userId=${currentUser.id}`, {
        headers: userManager.getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        this.state.conversations = data.conversations;
        this.renderConversations();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      this.dom.conversationsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>加载失败，请刷新重试</p>
        </div>
      `;
    }
  },

  // 渲染会话列表
  renderConversations: function() {
    if (this.state.conversations.length === 0) {
      this.dom.conversationsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comment-slash"></i>
          <p>暂无私信</p>
          <p class="hint">点击右上角 <i class="fas fa-plus"></i> 发起私信</p>
        </div>
      `;
      return;
    }
    
    this.dom.conversationsList.innerHTML = this.state.conversations.map(conv => `
      <div class="conversation-item ${this.state.currentConversation?.id === conv.id ? 'active' : ''}" 
           data-id="${conv.id}" data-user-id="${conv.otherUser.id}">
        <div class="conversation-avatar">
          ${conv.otherUser.avatar 
            ? `<img src="${conv.otherUser.avatar}" alt="${conv.otherUser.username}">`
            : `<i class="fas fa-user-circle"></i>`
          }
          ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">${this.escapeHtml(conv.otherUser.username)}</span>
            <span class="conversation-time">${this.formatTime(conv.updatedAt)}</span>
          </div>
          <div class="conversation-preview">
            ${conv.lastMessage 
              ? `<span class="${conv.lastMessage.senderId === this.getCurrentUser()?.id ? 'sent' : ''}">${this.escapeHtml(conv.lastMessage.content.substring(0, 30))}${conv.lastMessage.content.length > 30 ? '...' : ''}</span>`
              : '<span class="no-message">暂无消息</span>'
            }
          </div>
        </div>
      </div>
    `).join('');
    
    // 绑定点击事件
    this.dom.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        this.openConversationWithUser(userId);
      });
      
      // 长按删除（移动端）
      let pressTimer;
      item.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
          this.showDeleteModal(item.dataset.id);
        }, 500);
      });
      item.addEventListener('touchend', () => clearTimeout(pressTimer));
      item.addEventListener('touchmove', () => clearTimeout(pressTimer));
      
      // 右键删除（桌面端）
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showDeleteModal(item.dataset.id);
      });
    });
  },

  // 打开与某用户的会话
  openConversationWithUser: async function(userId) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    this.state.currentOtherUser = { id: userId };
    
    // 先获取对方用户信息
    await this.fetchOtherUserInfo(userId);
    
    // 检查发送权限
    await this.checkSendPermission(currentUser.id, userId);
    
    // 加载消息
    await this.loadMessages(currentUser.id, userId);
    
    // 显示聊天面板
    this.showChatPanel();
    
    // 更新会话列表中的活跃状态
    this.dom.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.userId === userId);
    });
  },

  // 获取对方用户信息
  fetchOtherUserInfo: async function(userId) {
    try {
      const response = await fetch(`/users/${userId}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        this.state.currentOtherUser = {
          id: userId,
          username: data.user.username,
          avatar: data.user.avatar
        };
        this.updateChatHeader();
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 检查发送权限
  checkSendPermission: async function(senderId, receiverId) {
    try {
      const response = await fetch(`/messages/check-permission?senderId=${senderId}&receiverId=${receiverId}`, {
        headers: userManager.getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        this.state.canSendMessage = data.canSend;
        this.state.sendPermissionReason = data.reason;
        this.state.relation = data.relation;
        this.state.blockStatus = data.blockStatus;
        
        // 更新UI
        this.updatePermissionUI();
        
        // 更新关系显示
        this.updateRelationDisplay(data.relation, data.blockStatus);
      }
    } catch (error) {
      console.error('检查发送权限失败:', error);
    }
  },

  // 更新权限UI
  updatePermissionUI: function() {
    if (!this.state.canSendMessage) {
      this.dom.permissionWarning.style.display = 'flex';
      this.dom.permissionText.textContent = this.state.sendPermissionReason;
      this.dom.messageInput.disabled = true;
      this.dom.sendBtn.disabled = true;
    } else {
      this.dom.permissionWarning.style.display = 'none';
      this.dom.messageInput.disabled = false;
      this.handleInputChange();
    }
  },

  // 更新关系显示
  updateRelationDisplay: function(relation, blockStatus) {
    if (!relation) return;
    
    // 检查黑名单状态
    if (blockStatus) {
      if (blockStatus.isBlockedBy) {
        this.dom.chatRelation.innerHTML = '<span class="relation-tag blocked">已被对方拉黑</span>';
        return;
      }
      if (blockStatus.isBlocked) {
        this.dom.chatRelation.innerHTML = '<span class="relation-tag blocked">已拉黑对方</span>';
        return;
      }
    }
    
    let relationText = '';
    if (relation.isFollowing && relation.isFollower) {
      relationText = '<span class="relation-tag mutual">互相关注</span>';
    } else if (relation.isFollowing) {
      relationText = '<span class="relation-tag following">已关注</span>';
    } else if (relation.isFollower) {
      relationText = '<span class="relation-tag follower">粉丝</span>';
    } else {
      relationText = '<span class="relation-tag stranger">陌生人</span>';
    }
    
    this.dom.chatRelation.innerHTML = relationText;
  },

  // 加载消息
  loadMessages: async function(userId, otherUserId, before = null) {
    try {
      let url = `/messages?userId=${userId}&otherUserId=${otherUserId}`;
      if (before) {
        url += `&before=${before}`;
      }
      
      const response = await fetch(url, {
        headers: userManager.getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        if (before) {
          // 加载更多，追加到前面
          this.state.messages = [...data.messages, ...this.state.messages];
        } else {
          this.state.messages = data.messages;
        }
        
        // 更新最早消息时间
        if (data.messages.length > 0) {
          this.state.oldestMessageDate = data.messages[0].createdAt;
        }
        
        // 检查是否还有更多消息
        this.state.hasMoreMessages = data.messages.length >= 50;
        
        this.renderMessages();
        
        // 获取用户信息
        if (this.state.messages.length > 0) {
          const msg = this.state.messages.find(m => m.senderId === otherUserId) || 
                      this.state.messages.find(m => m.receiverId === otherUserId);
          if (msg) {
            this.state.currentOtherUser = {
              id: otherUserId,
              username: msg.senderId === otherUserId ? msg.senderUsername : 
                        this.state.messages.find(m => m.senderId === userId)?.receiverUsername || '用户'
            };
            this.updateChatHeader();
          }
        }
        
        // 滚动到底部（首次加载）
        if (!before) {
          this.scrollToBottom();
        }
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      utils.showNotification('加载消息失败', 'error');
    }
  },

  // 加载更多消息
  loadMoreMessages: async function() {
    if (!this.state.hasMoreMessages) return;
    
    const currentUser = this.getCurrentUser();
    const container = this.dom.messagesList;
    const oldScrollHeight = container.scrollHeight;
    
    await this.loadMessages(currentUser.id, this.state.currentOtherUser.id, this.state.oldestMessageDate);
    
    // 保持滚动位置
    const newScrollHeight = container.scrollHeight;
    container.scrollTop = newScrollHeight - oldScrollHeight;
  },

  // 渲染消息
  renderMessages: function() {
    const currentUser = this.getCurrentUser();
    
    this.dom.messagesList.innerHTML = this.state.messages.map(msg => {
      const isMine = msg.senderId === currentUser.id;
      const timeStr = this.formatTime(msg.createdAt);
      
      return `
        <div class="message ${isMine ? 'mine' : 'theirs'}" data-id="${msg.id}">
          ${!isMine ? `
            <div class="message-avatar">
              ${msg.senderAvatar 
                ? `<img src="${msg.senderAvatar}" alt="${msg.senderUsername}">`
                : `<i class="fas fa-user-circle"></i>`
              }
            </div>
          ` : ''}
          <div class="message-content">
            <div class="message-bubble">
              ${this.formatMessageContent(msg.content)}
            </div>
            <div class="message-meta">
              <span class="message-time">${timeStr}</span>
              ${isMine ? `
                <span class="message-status">
                  ${msg.read ? '<i class="fas fa-check-double" title="已读"></i>' : '<i class="fas fa-check" title="已发送"></i>'}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // 显示/隐藏加载更多按钮
    this.dom.loadMoreMessages.style.display = this.state.hasMoreMessages ? 'block' : 'none';
  },

  // 格式化消息内容（支持链接、表情等）
  formatMessageContent: function(content) {
    // HTML转义
    let formatted = this.escapeHtml(content);
    
    // 链接转换
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 换行处理
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  },

  // 更新聊天头部
  updateChatHeader: function() {
    const user = this.state.currentOtherUser;
    if (!user) return;
    
    this.dom.chatUsername.textContent = user.username || '用户';
    this.dom.viewProfileBtn.href = `profile.html?id=${user.id}`;
    
    if (user.avatar) {
      this.dom.chatAvatar.innerHTML = `<img src="${user.avatar}" alt="${user.username}">`;
    }
  },

  // 发送消息
  sendMessage: async function() {
    const currentUser = this.getCurrentUser();
    const content = this.dom.messageInput.value.trim();
    
    if (!content || !this.state.canSendMessage) return;
    
    this.dom.sendBtn.disabled = true;
    this.dom.messageInput.value = '';
    this.dom.messageInput.style.height = 'auto';
    
    try {
      const response = await fetch('/messages', {
        method: 'POST',
        headers: userManager.getAuthHeaders(),
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: this.state.currentOtherUser.id,
          content: content
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 添加到消息列表
        this.state.messages.push(data.message);
        this.renderMessages();
        this.scrollToBottom();
        
        // 重新检查发送权限（可能已变化）
        await this.checkSendPermission(currentUser.id, this.state.currentOtherUser.id);
        
        // 刷新会话列表
        this.loadConversations();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      utils.showNotification(error.message || '发送失败', 'error');
    } finally {
      this.handleInputChange();
    }
  },

  // 处理输入变化
  handleInputChange: function() {
    const content = this.dom.messageInput.value.trim();
    this.dom.sendBtn.disabled = !content || !this.state.canSendMessage;
  },

  // 显示聊天面板
  showChatPanel: function() {
    this.dom.chatEmpty.style.display = 'none';
    this.dom.chatHeader.style.display = 'flex';
    this.dom.messagesContainer.style.display = 'flex';
    this.dom.messageInputContainer.style.display = 'block';
    
    // 移动端隐藏会话列表
    if (window.innerWidth <= 768) {
      this.dom.conversationsPanel.style.display = 'none';
      this.dom.chatPanel.style.display = 'flex';
    }
  },

  // 显示会话列表（移动端）
  showConversationsPanel: function() {
    this.dom.conversationsPanel.style.display = 'flex';
    this.dom.chatPanel.style.display = 'none';
    this.state.currentConversation = null;
    this.state.currentOtherUser = null;
    this.renderConversations();
  },

  // 切换新建会话面板
  toggleNewChatPanel: async function(show = true) {
    this.dom.searchUserContainer.style.display = show ? 'flex' : 'none';
    this.dom.contactableUsers.style.display = show ? 'block' : 'none';
    this.dom.conversationsList.style.display = show ? 'none' : 'block';
    
    if (show) {
      this.dom.searchUserInput.value = '';
      await this.loadContactableUsers();
      this.dom.searchUserInput.focus();
    }
  },

  // 加载可联系的用户
  loadContactableUsers: async function(searchTerm = '') {
    const currentUser = this.getCurrentUser();
    
    try {
      const response = await fetch(`/messages/contactable-users?userId=${currentUser.id}`, {
        headers: userManager.getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        let users = data.users;
        
        // 搜索过滤
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          users = users.filter(u => u.username.toLowerCase().includes(term));
        }
        
        // 排除已有会话的用户
        const conversationUserIds = this.state.conversations.map(c => c.otherUser.id);
        
        this.renderContactableUsers(users, conversationUserIds);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      this.dom.contactableUsers.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>加载失败</p>
        </div>
      `;
    }
  },

  // 渲染可联系用户
  renderContactableUsers: function(users, excludeIds) {
    if (users.length === 0) {
      this.dom.contactableUsers.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-slash"></i>
          <p>暂无可联系的用户</p>
          <p class="hint">关注用户或被用户关注后可以发送私信</p>
        </div>
      `;
      return;
    }
    
    this.dom.contactableUsers.innerHTML = users.map(user => `
      <div class="contactable-user-item" data-id="${user.id}">
        <div class="user-avatar">
          ${user.avatar 
            ? `<img src="${user.avatar}" alt="${user.username}">`
            : `<i class="fas fa-user-circle"></i>`
          }
        </div>
        <div class="user-info">
          <span class="user-name">${this.escapeHtml(user.username)}</span>
          <span class="user-relation">
            ${user.isFollowing && user.isFollower ? '互相关注' : 
              user.isFollowing ? '已关注' : '粉丝'}
          </span>
        </div>
        ${excludeIds.includes(user.id) ? '<span class="has-chat">已有会话</span>' : ''}
      </div>
    `).join('');
    
    // 绑定点击事件
    this.dom.contactableUsers.querySelectorAll('.contactable-user-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.id;
        this.toggleNewChatPanel(false);
        this.openConversationWithUser(userId);
      });
    });
  },

  // 搜索可联系用户
  searchContactableUsers: function(term) {
    this.loadContactableUsers(term);
  },

  // 显示删除确认框
  showDeleteModal: function(conversationId) {
    this.state.deletingConversationId = conversationId;
    this.dom.deleteModal.style.display = 'flex';
  },

  // 隐藏删除确认框
  hideDeleteModal: function() {
    this.dom.deleteModal.style.display = 'none';
    this.state.deletingConversationId = null;
  },

  // 确认删除会话
  confirmDeleteConversation: async function() {
    const currentUser = this.getCurrentUser();
    const conversationId = this.state.deletingConversationId;
    
    if (!conversationId || !currentUser) return;
    
    try {
      const response = await fetch(`/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: userManager.getAuthHeaders(),
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        utils.showNotification('会话已删除', 'success');
        this.loadConversations();
        
        // 如果删除的是当前打开的会话，关闭聊天面板
        if (this.state.currentConversation?.id === conversationId) {
          this.showConversationsPanel();
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      utils.showNotification(error.message || '删除失败', 'error');
    } finally {
      this.hideDeleteModal();
    }
  },

  // 滚动到底部
  scrollToBottom: function() {
    this.dom.messagesList.scrollTop = this.dom.messagesList.scrollHeight;
  },

  // 格式化时间
  formatTime: function(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 1分钟内
    if (diff < 60000) return '刚刚';
    
    // 1小时内
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    
    // 今天
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 一周内
    if (diff < 7 * 24 * 3600000) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 更早
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
           date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  },

  // HTML转义
  escapeHtml: function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
