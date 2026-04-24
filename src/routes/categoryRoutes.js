const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateUser } = require('../middleware/jwtAuth');
const { requireAdmin } = require('../middleware/adminAuth');

// ============ 公开接口（用户端） ============

// 获取所有已启用栏目
router.get('/categories', categoryController.getCategories);

// 获取单个栏目
router.get('/categories/:id', categoryController.getCategoryById);

// 获取某栏目的帖子（支持分页）
router.get('/categories/:id/posts', categoryController.getCategoryPosts);

// ============ 用户申请（需登录） ============

// 申请新建栏目
router.post('/category-applications', authenticateUser, categoryController.createApplication);

// ============ 管理员接口 ============

// 获取所有栏目（含禁用的）
router.get('/admin/categories', requireAdmin, categoryController.getAllCategories);

// 创建栏目
router.post('/admin/categories', requireAdmin, categoryController.createCategory);

// 更新栏目
router.put('/admin/categories/:id', requireAdmin, categoryController.updateCategory);

// 删除栏目
router.delete('/admin/categories/:id', requireAdmin, categoryController.deleteCategory);

// 切换栏目启用状态
router.patch('/admin/categories/:id/toggle-status', requireAdmin, categoryController.toggleCategoryStatus);

// 获取所有申请（含已处理的）
router.get('/admin/category-applications', requireAdmin, categoryController.getAllApplications);

// 批准栏目申请（同时创建栏目）
router.post('/admin/category-applications/:id/approve', requireAdmin, categoryController.approveApplication);

// 拒绝栏目申请
router.post('/admin/category-applications/:id/reject', requireAdmin, categoryController.rejectApplication);

module.exports = router;
