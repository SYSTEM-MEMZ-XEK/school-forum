const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  // 消息ID
  id: {
    type: String,
    required: true,
    unique: true
  },
  // 会话ID
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  // 发送者ID
  senderId: {
    type: String,
    required: true,
    index: true
  },
  // 接收者ID
  receiverId: {
    type: String,
    required: true,
    index: true
  },
  // 消息内容
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // 消息类型
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  // 图片URL（如果是图片消息）
  imageUrl: {
    type: String,
    default: null
  },
  // 是否已读
  read: {
    type: Boolean,
    default: false
  },
  // 已读时间
  readAt: {
    type: Date,
    default: null
  },
  // 消息时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 是否被删除（软删除）
  deletedBy: {
    type: [String], // 存储删除此消息的用户ID
    default: []
  }
}, {
  timestamps: false,
  collection: 'messages'
});

// 创建索引
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1 });

// 静态方法：获取两个用户之间的消息
MessageSchema.statics.getMessagesBetweenUsers = async function(userId1, userId2, limit = 50, skip = 0) {
  const conversationId = this.getConversationId(userId1, userId2);
  return this.find({
    conversationId,
    deletedBy: { $ne: userId1 } // 排除被该用户删除的消息
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 静态方法：生成会话ID
MessageSchema.statics.getConversationId = function(userId1, userId2) {
  // 确保会话ID一致（小的ID在前）
  return [userId1, userId2].sort().join('_');
};

// 静态方法：获取用户的未读消息数
MessageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    receiverId: userId,
    read: false,
    deletedBy: { $ne: userId }
  });
};

// 静态方法：获取与特定用户的未读消息数
MessageSchema.statics.getUnreadCountFromUser = async function(receiverId, senderId) {
  return this.countDocuments({
    receiverId,
    senderId,
    read: false,
    deletedBy: { $ne: receiverId }
  });
};

// 静态方法：标记消息为已读
MessageSchema.statics.markAsRead = async function(conversationId, receiverId) {
  return this.updateMany(
    {
      conversationId,
      receiverId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

module.exports = mongoose.model('Message', MessageSchema);
