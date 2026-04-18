const mongoose = require('mongoose');
const { Schema } = mongoose;

const BlacklistSchema = new Schema({
  // 拉黑者ID
  blockerId: {
    type: String,
    required: true,
    index: true
  },
  // 被拉黑者ID
  blockedId: {
    type: String,
    required: true,
    index: true
  },
  // 拉黑时间
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'blacklists'
});

// 创建复合唯一索引，防止重复拉黑
BlacklistSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// 静态方法：检查是否已拉黑
BlacklistSchema.statics.isBlocked = async function(blockerId, blockedId) {
  const block = await this.findOne({ blockerId, blockedId });
  return !!block;
};

// 静态方法：检查两个用户之间是否有拉黑关系（任意一方拉黑另一方）
BlacklistSchema.statics.hasBlockRelation = async function(userId1, userId2) {
  const block = await this.findOne({
    $or: [
      { blockerId: userId1, blockedId: userId2 },
      { blockerId: userId2, blockedId: userId1 }
    ]
  });
  return !!block;
};

// 静态方法：获取用户拉黑的人的ID列表
BlacklistSchema.statics.getBlockedIds = async function(userId) {
  const blocks = await this.find({ blockerId: userId }).select('blockedId');
  return blocks.map(b => b.blockedId);
};

// 静态方法：获取用户被谁拉黑的ID列表
BlacklistSchema.statics.getBlockerIds = async function(userId) {
  const blocks = await this.find({ blockedId: userId }).select('blockerId');
  return blocks.map(b => b.blockerId);
};

// 静态方法：获取用户拉黑的人列表
BlacklistSchema.statics.getBlockedList = async function(userId, limit = 20, skip = 0) {
  const blocks = await this.find({ blockerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return blocks.map(b => ({
    blockedId: b.blockedId,
    blockedAt: b.createdAt
  }));
};

// 静态方法：获取拉黑数量
BlacklistSchema.statics.getBlockedCount = async function(userId) {
  return this.countDocuments({ blockerId: userId });
};

module.exports = mongoose.model('Blacklist', BlacklistSchema);
