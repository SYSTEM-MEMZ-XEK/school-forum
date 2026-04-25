const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload } = require('../middleware/uploadMiddleware');
const { authenticateUser } = require('../middleware/jwtAuth');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');

// 创建头像存储目录
const AVATAR_DIR = path.join(__dirname, '../../public/images/avatars');
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

// 头像上传的multer配置
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATAR_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG, PNG, GIF, WebP 格式的图片'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 用户注册
router.post('/register', userController.register);

// 发送验证码
router.post('/send-verification-code', userController.sendVerificationCode);

// 发送登录验证码
router.post('/send-login-verification-code', userController.sendLoginVerificationCode);

// 发送密码修改验证码（需要验证当前密码）
router.post('/send-password-change-code', authenticateUser, userController.sendPasswordChangeCode);

// 验证密码修改验证码
router.post('/verify-password-change-code', authenticateUser, userController.verifyPasswordChangeCode);

// 修改密码（验证验证码后）
router.post('/change-password', authenticateUser, userController.changePassword);

// 发送邮箱修改验证码（需要验证当前密码）
router.post('/send-email-change-code', authenticateUser, userController.sendEmailChangeCode);

// 验证邮箱修改并完成修改
router.post('/verify-email-change', authenticateUser, userController.verifyEmailChange);

// 修改QQ号（需要验证密码）
router.post('/change-qq', authenticateUser, userController.changeQQ);

// 用户登录
router.post('/login', userController.login);

// 刷新访问令牌
router.post('/refresh-token', userController.refreshToken);

// 用户登出
router.post('/logout', userController.logout);

// 管理员登出
router.post('/admin/logout', userController.adminLogout);

// 验证用户登录状态
router.post('/auth/verify', userController.verifyAuth);

// 获取用户个人资料
router.get('/users/:id', userController.getUserProfile);

// 用户资料路由别名（兼容 Android）
router.get('/user/profile/:id', userController.getUserProfile);

// 修改用户资料
router.put('/users/:id', authenticateUser, userController.updateUserProfile);

// 更新用户资料路由别名（兼容 Android）
router.post('/user/update-profile', authenticateUser, userController.updateUserProfile);

// 更新用户设置（支持PUT和POST方法）
router.put('/users/:id/settings', authenticateUser, userController.updateUserSettings);
router.post('/users/:id/settings', authenticateUser, userController.updateUserSettings);

// 通知设置
router.get('/user/notification-settings/:userId', userController.getNotificationSettings);
router.post('/user/notification-settings', authenticateUser, userController.updateNotificationSettings);

// 隐私设置
router.post('/user/privacy-settings', authenticateUser, userController.updatePrivacySettings);

// 更新QQ号
router.post('/user/update-qq', authenticateUser, userController.changeQQ);

// 上传用户头像
router.post('/users/:id/avatar', authenticateUser, avatarUpload.single('avatar'), userController.uploadAvatar);

// 删除用户头像
router.delete('/users/:id/avatar', authenticateUser, userController.removeAvatar);

// 发送账户注销验证码
router.post('/send-deletion-code', authenticateUser, userController.sendDeletionCode);

// 注销用户账户
router.post('/delete-account', authenticateUser, userController.deleteAccount);

// 导出用户个人数据
router.get('/user/export-data', authenticateUser, userController.exportData);

// 导入用户数据
router.post('/user/import-data', authenticateUser, userController.importData);

module.exports = router;