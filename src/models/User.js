const mongoose = require('mongoose');
const { Schema } = mongoose;

// 可见性枚举
const visibilityOptions = ['public', 'followers', 'self'];

// 通知偏好设置
const NotificationPreferencesSchema = new Schema({
  // 帖子点赞通知
  like: {
    type: Boolean,
    default: true
  },
  // 帖子评论通知
  comment: {
    type: Boolean,
    default: true
  },
  // 评论回复通知
  commentReply: {
    type: Boolean,
    default: true
  },
  // 评论点赞通知
  commentLike: {
    type: Boolean,
    default: true
  },
  // 关注通知
  follow: {
    type: Boolean,
    default: true
  },
  // 系统通知（不可关闭）
  system: {
    type: Boolean,
    default: true,
    immutable: true
  }
}, { _id: false });

// 个人信息可见性设置
const ProfileVisibilitySchema = new Schema({
  // 性别可见性
  gender: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  },
  // 生日可见性
  birthday: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  },
  // 学校/班级可见性
  school: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  },
  // 签名可见性
  signature: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  },
  // 加入时间可见性
  joinDate: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  },
  // 最后登录可见性
  lastLogin: {
    type: String,
    enum: visibilityOptions,
    default: 'public'
  }
}, { _id: false });

const UserSettingsSchema = new Schema({
  theme: {
    type: String,
    default: 'light',
    enum: ['light', 'dark', 'auto']
  },
  signature: {
    type: String,
    default: ''
  },
  // 通知偏好设置
  notifications: {
    type: NotificationPreferencesSchema,
    default: () => ({})
  },
  privacy: {
    hideBlockedPosts: {
      type: Boolean,
      default: false
    },
    hideBlockedComments: {
      type: Boolean,
      default: false
    },
    // 帖子时间范围展示设置
    postDisplayRange: {
      type: String,
      enum: ['all', '3days', '7days', '1month', '6months', '1year'],
      default: 'all'
    },
    // 个人信息可见性设置
    profileVisibility: {
      type: ProfileVisibilitySchema,
      default: () => ({})
    }
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
  birthday: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    default: ''
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