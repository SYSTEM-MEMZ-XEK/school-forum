const mongoose = require('mongoose');
const { Schema } = mongoose;

const FollowSchema = new Schema({
  // 关注者ID
  followerId: {
    type: String,
    required: true,
    index: true
  },
  // 被关注者ID
  followingId: {
    type: String,
    required: true,
    index: true
  },
  // 关注时间
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'follows'
});

// 创建复合唯一索引，防止重复关注
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// 静态方法：检查是否已关注
FollowSchema.statics.isFollowing = async function(followerId, followingId) {
  const follow = await this.findOne({ followerId, followingId });
  return !!follow;
};

// 静态方法：获取用户的关注数
FollowSchema.statics.getFollowingCount = async function(userId) {
  return this.countDocuments({ followerId: userId });
};

// 静态方法：获取用户的粉丝数
FollowSchema.statics.getFollowerCount = async function(userId) {
  return this.countDocuments({ followingId: userId });
};

// 静态方法：获取用户关注的人的ID列表
FollowSchema.statics.getFollowingIds = async function(userId) {
  const follows = await this.find({ followerId: userId }).select('followingId');
  return follows.map(f => f.followingId);
};

// 静态方法：获取用户关注的人列表（带用户信息）
FollowSchema.statics.getFollowingList = async function(userId, limit = 20, skip = 0) {
  const follows = await this.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return follows.map(f => ({
    followingId: f.followingId,
    followedAt: f.createdAt
  }));
};

// 静态方法：获取用户的粉丝列表
FollowSchema.statics.getFollowerList = async function(userId, limit = 20, skip = 0) {
  const follows = await this.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return follows.map(f => ({
    followerId: f.followerId,
    followedAt: f.createdAt
  }));
};

module.exports = mongoose.model('Follow', FollowSchema);
