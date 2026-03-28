const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSettingsSchema = new Schema({
  theme: {
    type: String,
    default: 'light',
    enum: ['light', 'dark']
  },
  signature: {
    type: String,
    default: ''
  }
}, { _id: false });

const UserSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  qq: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  school: {
    type: String,
    required: true
  },
  enrollmentYear: {
    type: Number,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastViewedFollowingAt: {
    type: Date,
    default: null
  },
  postCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    type: UserSettingsSchema,
    default: () => ({})
  }
}, {
  timestamps: false,
  collection: 'users'
});

// 转换为 JSON 时排除密码
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user._id;
  delete user.__v;
  return user;
};

// 静态方法：根据 QQ 查找用户
UserSchema.statics.findByQQ = function(qq) {
  return this.findOne({ qq });
};

// 静态方法：根据用户名查找用户
UserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

// 静态方法：根据 ID 查找用户
UserSchema.statics.findById = function(id) {
  return this.findOne({ id });
};

module.exports = mongoose.model('User', UserSchema);