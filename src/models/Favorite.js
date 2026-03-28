const mongoose = require('mongoose');
const { Schema } = mongoose;

const FavoriteSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true,
    index: true
  },
  tagId: {
    type: String,
    default: null,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'favorites'
});

// 复合索引，确保同一用户不能重复收藏同一帖子
FavoriteSchema.index({ userId: 1, postId: 1 }, { unique: true });

// 静态方法：添加收藏
FavoriteSchema.statics.addFavorite = async function(userId, postId, tagId = null) {
  try {
    const favorite = new this({ userId, postId, tagId });
    await favorite.save();
    return { success: true, favorite };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, message: '已经收藏过该帖子' };
    }
    throw error;
  }
};

// 静态方法：取消收藏
FavoriteSchema.statics.removeFavorite = async function(userId, postId) {
  const result = await this.deleteOne({ userId, postId });
  return result.deletedCount > 0;
};

// 静态方法：检查是否已收藏
FavoriteSchema.statics.isFavorited = async function(userId, postId) {
  const favorite = await this.findOne({ userId, postId });
  return !!favorite;
};

// 静态方法：获取用户收藏列表
FavoriteSchema.statics.getUserFavorites = async function(userId, tagId = null) {
  const query = { userId };
  if (tagId) {
    query.tagId = tagId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// 静态方法：更新收藏标签
FavoriteSchema.statics.updateFavoriteTag = async function(userId, postId, tagId) {
  const result = await this.findOneAndUpdate(
    { userId, postId },
    { tagId },
    { new: true }
  );
  return result;
};

// 静态方法：获取帖子的收藏数
FavoriteSchema.statics.getFavoriteCount = async function(postId) {
  return this.countDocuments({ postId });
};

// 静态方法：按标签批量移动收藏
FavoriteSchema.statics.moveFavoritesToTag = async function(userId, postIds, tagId) {
  const result = await this.updateMany(
    { userId, postId: { $in: postIds } },
    { tagId }
  );
  return result.modifiedCount;
};

// 静态方法：清除标签下的所有收藏的标签引用
FavoriteSchema.statics.clearTagFromFavorites = async function(userId, tagId) {
  const result = await this.updateMany(
    { userId, tagId },
    { tagId: null }
  );
  return result.modifiedCount;
};

// 静态方法：批量删除收藏
FavoriteSchema.statics.batchRemoveFavorites = async function(userId, postIds) {
  const result = await this.deleteMany({
    userId,
    postId: { $in: postIds }
  });
  return { deletedCount: result.deletedCount };
};

// 静态方法：批量移动收藏到标签
FavoriteSchema.statics.batchMoveToTag = async function(userId, postIds, tagId) {
  const result = await this.updateMany(
    { userId, postId: { $in: postIds } },
    { tagId }
  );
  return { modifiedCount: result.modifiedCount };
};

module.exports = mongoose.model('Favorite', FavoriteSchema);
