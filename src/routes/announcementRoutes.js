const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { requireAdmin } = require('../middleware/adminAuth');

// ============ 公开接口（用户端） ============

// 获取有效公告列表
router.get('/announcements/active', announcementController.getActiveAnnouncements);

// 获取单个公告详情
router.get('/announcements/:id', announcementController.getAnnouncementById);

// ============ 管理员接口 ============

// 获取所有公告
router.get('/admin/announcements', requireAdmin, announcementController.getAllAnnouncements);

// 创建公告
router.post('/admin/announcements', requireAdmin, announcementController.createAnnouncement);

// 更新公告
router.put('/admin/announcements/:id', requireAdmin, announcementController.updateAnnouncement);

// 删除公告
router.delete('/admin/announcements/:id', requireAdmin, announcementController.deleteAnnouncement);

// 切换公告启用状态
router.patch('/admin/announcements/:id/toggle-status', requireAdmin, announcementController.toggleAnnouncementStatus);

// 切换公告置顶状态
router.patch('/admin/announcements/:id/toggle-pinned', requireAdmin, announcementController.toggleAnnouncementPinned);

// 批量更新公告状态
router.patch('/admin/announcements/batch-status', requireAdmin, announcementController.batchUpdateStatus);

module.exports = router;
