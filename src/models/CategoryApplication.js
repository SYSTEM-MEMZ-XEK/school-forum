const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 栏目申请模型
 * 用户申请新增栏目，管理员审核
 */
const CategoryApplicationSchema = new Schema({
  // 唯一ID
  id: {
    type: String,
    required: true,
    unique: true
  },

  // 申请的栏目名称
  categoryName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },

  // 申请理由/描述
  description: {
    type: String,
    default: '',
    maxlength: 500
  },

  // 申请人ID
  applicantId: {
    type: String,
    required: true,
    index: true
  },

  // 申请人用户名
  applicantUsername: {
    type: String,
    required: true
  },

  // 申请状态: pending(待审核), approved(已通过), rejected(已拒绝)
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // 审核人ID
  reviewedBy: {
    type: String,
    default: null
  },

  // 审核人用户名
  reviewedByUsername: {
    type: String,
    default: null
  },

  // 审核时间
  reviewedAt: {
    type: Date,
    default: null
  },

  // 审核备注（拒绝原因/通过说明）
  reviewNote: {
    type: String,
    default: ''
  },

  // 申请时间
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'category_applications'
});

// 静态方法：获取用户的申请记录
CategoryApplicationSchema.statics.findByApplicant = function(applicantId) {
  return this.find({ applicantId }).sort({ createdAt: -1 });
};

// 静态方法：获取待审核申请（按申请时间正序）
CategoryApplicationSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

const CategoryApplication = mongoose.model('CategoryApplication', CategoryApplicationSchema);

module.exports = CategoryApplication;
