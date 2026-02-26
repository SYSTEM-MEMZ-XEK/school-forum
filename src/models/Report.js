const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReportSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  reporterId: {
    type: String,
    required: true,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['post', 'comment', 'user']
  },
  targetId: {
    type: String,
    required: true
  },
  targetUserId: {
    type: String,
    default: null
  },
  targetUsername: {
    type: String,
    default: null
  },
  targetContent: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  reasonText: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  postId: {
    type: String,
    default: null
  },
  commentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processed'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: String,
    default: null
  },
  result: {
    type: String,
    enum: ['violation_confirmed', 'no_violation', null],
    default: null
  },
  banDuration: {
    type: Number,
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: false,
  collection: 'reports'
});

// 复合索引
ReportSchema.index({ status: 1, createdAt: -1 });

// 静态方法：获取待处理的举报
ReportSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Report', ReportSchema);