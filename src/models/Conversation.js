const mongoose = require('mongoose');
const { Schema } = mongoose;

const ConversationSchema = new Schema({
  // 会话ID（两个用户ID排序后用下划线连接）
  id: {
    type: String,
    required: true,
    unique: true
  },
  // 参与者ID列表（始终为两人）
  participants: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 2;
      },
      message: '会话必须有两个参与者'
    }
  },
  // 最后一条消息
  lastMessage: {
    content: String,
    senderId: String,
    createdAt: Date
  },
  // 会话创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 最后更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // 用户A是否可以发起消息（非互关情况下）
  // 当用户A发消息后，此字段设为A的ID，B回复后设为null（表示可以互发）
  canInitiateFrom: {
    type: String,
    default: null
  },
  // 最后一条消息是否被双方都读取
  lastMessageRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: false,
  collection: 'conversations'
});

// 创建索引
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

// 静态方法：获取或创建会话
ConversationSchema.statics.getOrCreateConversation = async function(userId1, userId2) {
  const conversationId = [userId1, userId2].sort().join('_');
  
  let conversation = await this.findOne({ id: conversationId });
  
  if (!conversation) {
    conversation = await this.create({
      id: conversationId,
      participants: [userId1, userId2].sort()
    });
  }
  
  return conversation;
};

// 静态方法：获取用户的会话列表
ConversationSchema.statics.getUserConversations = async function(userId) {
  return this.find({
    participants: userId
  })
    .sort({ updatedAt: -1 })
    .lean();
};

// 静态方法：更新会话最后一条消息
ConversationSchema.statics.updateLastMessage = async function(conversationId, message) {
  return this.findOneAndUpdate(
    { id: conversationId },
    {
      lastMessage: {
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt
      },
      updatedAt: new Date(),
      lastMessageRead: false
    },
    { new: true }
  );
};

module.exports = mongoose.model('Conversation', ConversationSchema);
