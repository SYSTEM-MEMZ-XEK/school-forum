const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload } = require('../middleware/uploadMiddleware');
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG, PNG, GIF, WebP 格式的图片'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取用户个人资料
router.get('/users/:id', userController.getUserProfile);

// 修改用户资料
router.put('/users/:id', userController.updateUserProfile);

// 更新用户设置
router.put('/users/:id/settings', userController.updateUserSettings);

// 上传用户头像
router.post('/users/:id/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);

// 删除用户头像
router.delete('/users/:id/avatar', userController.removeAvatar);

module.exports = router;