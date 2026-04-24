const express = require('express');
const router = express.Router();
const path = require('path');

// 导入所有路由模块
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const postRoutes = require('./postRoutes');
const statsRoutes = require('./statsRoutes');
const notificationRoutes = require('./notificationRoutes');
const configRoutes = require('./configRoutes');
const reportRoutes = require('./reportRoutes');
const favoriteRoutes = require('./favoriteRoutes');
const followRoutes = require('./followRoutes');
const messageRoutes = require('./messageRoutes');
const blacklistRoutes = require('./blacklistRoutes');
const runModeRoutes = require('./runModeRoutes');
const announcementRoutes = require('./announcementRoutes');
const categoryRoutes = require('./categoryRoutes');

// 使用路由
router.use(userRoutes);
router.use(adminRoutes);
router.use(postRoutes);
router.use(statsRoutes);
router.use(notificationRoutes);
router.use(configRoutes);
router.use(reportRoutes);
router.use(favoriteRoutes);
router.use(followRoutes);
router.use(messageRoutes);
router.use(blacklistRoutes);
router.use(runModeRoutes);
router.use(announcementRoutes);
router.use(categoryRoutes);

// 健康检查路由
router.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 错误页面路由
router.get('/404', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/errors/404.html'));
});

router.get('/502', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/errors/502.html'));
});

router.get('/403', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/errors/403.html'));
});

router.get('/maintenance', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/errors/maintenance.html'));
});

// 保持向后兼容
router.get('/unauthorized', (req, res) => {
  res.redirect('/403');
});

// 测试路由
router.get('/test/502', (req, res) => {
  res.status(502).sendFile(path.join(__dirname, '../../public/errors/502.html'));
});

router.get('/test/403', (req, res) => {
  res.status(403).sendFile(path.join(__dirname, '../../public/errors/403.html'));
});

// 404 处理 - 返回HTML错误页面或JSON
router.use('*', (req, res) => {
  // 检查是否是API请求（非GET请求或明确请求JSON）
  const isApiRequest = req.method !== 'GET' || 
                       req.xhr || 
                       req.headers.accept?.includes('application/json') ||
                       req.originalUrl.startsWith('/api/');
  
  if (isApiRequest) {
    res.status(404).json({
      success: false,
      message: '路由不存在'
    });
  } else {
    // 对于页面请求，返回404页面
    res.status(404).sendFile(path.join(__dirname, '../../public/errors/404.html'));
  }
});

module.exports = router;