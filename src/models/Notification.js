const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['like', 'comment', 'comment_reply', 'system', 'follow'],
    index: true
  },
  // 点赞相关
  postId: {
    type: String,
    default: null
  },
  fromUserId: {
    type: String,
    default: null
  },
  fromUsername: {
    type: String,
    default: null
  },
  // 评论相关
  commentId: {
    type: String,
    default: null
  },
  content: {
    type: String,
    default: null
  },
  // 系统通知相关
  systemType: {
    type: String,
    default: null
  },
  isApproved: {
    type: Boolean,
    default: null
  },
  isViolation: {
    type: Boolean,
    default: null
  },
  reason: {
    type: String,
    default: null
  },
  targetUsername: {
    type: String,
    default: null
  },
  targetType: {
    type: String,
    default: null
  },
  banDays: {
    type: Number,
    default: null
  },
  note: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: null
  },
  // 通用字段
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: false,
  collection: 'notifications'
});

// 创建索引
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ timestamp: -1 });

// 静态方法：获取用户未读通知
NotificationSchema.statics.findUnreadByUserId = function(userId) {
  return this.find({ userId, read: false }).sort({ timestamp: -1 });
};

// 静态方法：获取用户所有通知
NotificationSchema.statics.findByUserId = function(userId, limit = 50) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit);
};

module.exports = mongoose.model('Notification', NotificationSchema);
