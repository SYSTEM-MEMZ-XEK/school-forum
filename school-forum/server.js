const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// 导入配置
const {
  DATA_DIR,
  IMAGES_DIR,
  PORT
} = require('./src/config/constants');

// 导入工具函数
const { initializeAllDataFiles, initializeDirectories } = require('./src/utils/dataUtils');
const logger = require('./src/utils/logger');

// 导入路由
const routes = require('./src/routes');

const app = express();

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();

  // 记录请求信息
  logger.logInfo('收到请求', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'logError' : 'logInfo';

    logger[logLevel]('请求完成', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// 提供 node_modules 中的库文件
app.use('/libs/mathjax', express.static(path.join(__dirname, 'public/libs/mathjax')));
app.use('/libs/katex', express.static(path.join(__dirname, 'node_modules/katex/dist')));
app.use('/libs/highlight.js', express.static(path.join(__dirname, 'node_modules/highlight.js/lib')));
app.use('/libs/highlight.js/styles', express.static(path.join(__dirname, 'node_modules/highlight.js/styles')));
app.use('/libs/markdown-it', express.static(path.join(__dirname, 'node_modules/markdown-it/dist')));

// 初始化目录和数据文件
logger.logSystemEvent('正在初始化目录和数据文件...');
initializeDirectories();
initializeAllDataFiles();

// 初始化配置文件
const { initConfig } = require('./src/utils/configUtils');
initConfig();
logger.logSystemEvent('配置文件初始化完成');
logger.logSystemEvent('目录和数据文件初始化完成');

// 使用路由
app.use('/', routes);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.logError('服务器错误', { error: err.message, stack: err.stack });
  
  // Multer 文件上传错误处理
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超过限制'
      });
    }
  }
  
  // 文件不存在错误处理（ENOENT）
  if (err.code === 'ENOENT') {
    console.warn(`文件不存在: ${err.path}`);
    
    // 根据请求类型返回不同的响应
    if (req.accepts('html')) {
      return res.status(404).sendFile(path.join(__dirname, 'public/errors/404.html'));
    } else {
      return res.status(404).json({
        success: false,
        message: '请求的资源不存在'
      });
    }
  }
  
  // 其他错误
  const statusCode = err.status || 500;
  
  // 根据错误类型返回不同的响应
  if (req.accepts('html')) {
    // 如果是HTML请求，返回对应的错误页面
    switch (statusCode) {
      case 403:
        return res.status(403).sendFile(path.join(__dirname, 'public/errors/403.html'));
      case 404:
        return res.status(404).sendFile(path.join(__dirname, 'public/errors/404.html'));
      case 502:
        return res.status(502).sendFile(path.join(__dirname, 'public/errors/502.html'));
      default:
        // 对于其他错误，返回JSON响应
        return res.status(statusCode).json({
          success: false,
          message: statusCode === 500 ? '服务器内部错误' : err.message || '请求失败'
        });
    }
  } else {
    // 对于API请求，返回JSON响应
    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? '服务器内部错误' : err.message || '请求失败'
    });
  }
});



// 启动服务器
app.listen(PORT, () => {
  logger.logSuccess('服务器启动成功', {
    port: PORT,
    dataDir: DATA_DIR,
    imagesDir: IMAGES_DIR
  });
  console.log(`服务器运行中: http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`图片目录: ${IMAGES_DIR}`);
  console.log('服务器已启动，等待连接...');
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.logError('未捕获的异常', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.logError('未处理的 Promise 拒绝', { reason: reason, promise: promise });
});

module.exports = app;