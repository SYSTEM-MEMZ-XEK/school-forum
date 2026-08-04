const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateUser } = require('../middleware/jwtAuth');

// 获取用户通知
router.get('/notifications', authenticateUser, notificationController.getUserNotifications);

// 标记通知为已读（POST/PUT 兼容：前端 message.js 使用 PUT）
router.post('/notifications/:id/read', authenticateUser, notificationController.markAsRead);
router.put('/notifications/:id/read', authenticateUser, notificationController.markAsRead);

// 标记所有通知为已读（POST/PUT 兼容）
router.post('/notifications/read-all', authenticateUser, notificationController.markAllAsRead);
router.put('/notifications/read-all', authenticateUser, notificationController.markAllAsRead);

module.exports = router;
