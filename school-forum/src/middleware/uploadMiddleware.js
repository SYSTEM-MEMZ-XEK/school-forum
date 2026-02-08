const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { IMAGES_DIR, UPLOAD_CONFIG } = require('../config/constants');

// multer 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (UPLOAD_CONFIG.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG, PNG, GIF, WebP 格式的图片'), false);
  }
};

// 创建 multer 实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: UPLOAD_CONFIG.maxFiles
  }
});

// 处理上传的文件信息
function processUploadedFiles(files) {
  if (!files || files.length === 0) {
    return [];
  }
  
  return files.map(file => ({
    id: uuidv4(),
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    url: `/images/${file.filename}`,
    uploadedAt: new Date().toISOString()
  }));
}

module.exports = {
  upload,
  processUploadedFiles
};