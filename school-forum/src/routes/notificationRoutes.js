const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 获取用户通知
router.get('/notifications', notificationController.getUserNotifications);

// 标记通知为已读
router.post('/notifications/:id/read', notificationController.markAsRead);

// 标记所有通知为已读
router.post('/notifications/read-all', notificationController.markAllAsRead);

module.exports = router;