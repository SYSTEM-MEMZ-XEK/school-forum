const mongoose = require('mongoose');
const { Schema } = mongoose;

const BannedUserSchema = new Schema({
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
  username: {
    type: String,
    required: true
  },
  qq: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  bannedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  bannedBy: {
    type: String,
    required: true
  },
  bannedByName: {
    type: String,
    default: ''
  },
  banDuration: {
    type: Number,
    default: 0 // 0 表示永久封禁
  },
  unbanAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: false,
  collection: 'banned_users'
});

// 创建索引
BannedUserSchema.index({ userId: 1, isActive: 1 });
BannedUserSchema.index({ bannedAt: -1 });

// 静态方法：检查用户是否被封禁
BannedUserSchema.statics.isUserBanned = async function(userId) {
  const ban = await this.findOne({ userId, isActive: true });
  if (!ban) return false;
  
  // 如果有解封时间，检查是否已过期
  if (ban.unbanAt && new Date() > ban.unbanAt) {
    // 自动解封
    ban.isActive = false;
    await ban.save();
    return false;
  }
  
  return true;
};

// 静态方法：获取活跃封禁
BannedUserSchema.statics.findActiveBans = function() {
  return this.find({ isActive: true }).sort({ bannedAt: -1 });
};

module.exports = mongoose.model('BannedUser', BannedUserSchema);
