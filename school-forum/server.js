// 管理员账号列表（QQ号或用户ID）
const ADMIN_USERS = [
  '1635075096', // XEK（站长）的QQ号
  // 可以添加更多管理员QQ号或用户ID
];
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const app = express();

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 使用绝对路径存储数据
const DATA_DIR = path.join(__dirname, 'data/');
const IMAGES_DIR = path.join(__dirname, 'public/images/');

// 增强的初始化函数
function initializeDataFile(filePath, defaultValue) {
  const dir = path.dirname(filePath);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
  
  // 确保文件存在
  if (!fs.existsSync(filePath)) {
    console.log(`初始化数据文件: ${filePath}`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      console.log(`成功创建文件: ${filePath}`);
    } catch (error) {
      console.error(`创建文件失败: ${filePath}`, error);
    }
  } else {
    console.log(`使用现有数据文件: ${filePath}`);
  }
}

// 确保目录存在
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const BANNED_USERS_FILE = path.join(DATA_DIR, 'banned_users.json');
const DELETED_POSTS_FILE = path.join(DATA_DIR, 'deleted_posts.json');

// 增强的multer配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG, PNG, GIF, WebP 格式的图片'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20
  }
});

// 初始化所有数据文件
console.log('正在初始化数据文件...');
initializeDataFile(USERS_FILE, []);
initializeDataFile(POSTS_FILE, []);
initializeDataFile(BANNED_USERS_FILE, []);
initializeDataFile(DELETED_POSTS_FILE, []);
console.log('数据文件初始化完成');

// 密码加密函数
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// 密码验证函数
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// 计算当前年级函数
function calculateCurrentGrade(enrollmentYear) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  let yearOffset = currentYear - enrollmentYear;
  
  if (currentMonth < 9) {
    yearOffset -= 1;
  }
  
  switch(yearOffset) {
    case 0: return "高一";
    case 1: return "高二";
    case 2: return "高三";
    default: 
      return yearOffset > 2 ? "已毕业" : "未知年级";
  }
}

// 用户注册 - 增强版
app.post('/register', async (req, res) => {
  try {
    const { qq, username, password, school, enrollmentYear, className } = req.body;
    
    // 增强的输入验证
    if (!qq || !username || !password || !school || !enrollmentYear || !className) {
      return res.status(400).json({ 
        success: false,
        message: '请填写所有必填字段' 
      });
    }
    
    if (qq.length < 5 || qq.length > 15) {
      return res.status(400).json({ 
        success: false,
        message: 'QQ号格式不正确' 
      });
    }
    
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ 
        success: false,
        message: '用户名长度应在2-20个字符之间' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: '密码长度至少6位' 
      });
    }
    
    const users = readData(USERS_FILE);
    
    // 检查QQ是否已注册
    if (users.some(user => user.qq === qq)) {
      return res.status(400).json({ 
        success: false,
        message: '该QQ号已注册' 
      });
    }
    
    // 检查用户名是否已存在
    if (users.some(user => user.username === username)) {
      return res.status(400).json({ 
        success: false,
        message: '用户名已存在' 
      });
    }
    
    // 加密密码
    const hashedPassword = await hashPassword(password);
    
    // 计算当前年级
    const currentGrade = calculateCurrentGrade(enrollmentYear);
    
    const newUser = {
      id: uuidv4(),
      qq,
      username,
      password: hashedPassword,
      school,
      enrollmentYear: parseInt(enrollmentYear),
      className,
      grade: currentGrade,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      postCount: 0,
      commentCount: 0,
      isActive: true
    };
    
    users.push(newUser);
    writeData(USERS_FILE, users);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...safeUser } = newUser;
    
    res.status(201).json({ 
      success: true,
      user: safeUser
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 用户登录 - 增强版
app.post('/login', async (req, res) => {
  try {
    const { qq, password } = req.body;
    
    if (!qq) {
      return res.status(400).json({ 
        success: false,
        message: 'QQ号不能为空' 
      });
    }
    
    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: '密码不能为空' 
      });
    }
    
    const users = readData(USERS_FILE);
    const user = users.find(u => u.qq === qq);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    // 检查用户是否被禁用
    if (user.isActive === false) {
      return res.status(403).json({ 
        success: false,
        message: '账号已被禁用，请联系管理员' 
      });
    }
    
    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: '密码错误' 
      });
    }
    
    // 更新用户最后登录时间和年级
    const currentGrade = calculateCurrentGrade(user.enrollmentYear);
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      users[userIndex].grade = currentGrade;
      writeData(USERS_FILE, users);
    }
    
    user.lastLogin = new Date().toISOString();
    user.grade = currentGrade;
    
    // 返回用户信息（不包含密码）
    const { password: _, ...safeUser } = user;
    
    res.json({ 
      success: true,
      user: safeUser
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取帖子列表 - 增强版（支持分页和搜索）
app.get('/posts', (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const posts = readData(POSTS_FILE);
    
    let filteredPosts = posts;
    
    // 搜索功能
    if (search) {
      filteredPosts = posts.filter(post => 
        post.content.toLowerCase().includes(search.toLowerCase()) ||
        (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      posts: paginatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredPosts.length / limit),
        totalPosts: filteredPosts.length,
        hasNext: endIndex < filteredPosts.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('获取帖子错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 发布新帖子 - 增强版
app.post('/posts', upload.array('images', 20), async (req, res) => {
  try {
    const { userId, username, school, grade, className, content, anonymous } = req.body;
    
    if (!userId || !username || !school || !grade || !className || !content) {
      return res.status(400).json({ 
        success: false,
        message: '请填写所有必填字段' 
      });
    }
    
    if (content.length > 5000) {
      return res.status(400).json({ 
        success: false,
        message: '帖子内容过长，最多5000个字符' 
      });
    }
    
    // 验证用户是否存在且活跃
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    if (user.isActive === false) {
      return res.status(403).json({ 
        success: false,
        message: '账号已被禁用，无法发帖' 
      });
    }
    
    // 处理上传的图片
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        id: uuidv4(),
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `/images/${file.filename}`,
        uploadedAt: new Date().toISOString()
      }));
    }
    
    // 创建新帖子
    const posts = readData(POSTS_FILE);
    const isAnonymous = anonymous === 'true';
    
    const newPost = {
      id: uuidv4(),
      userId,
      username: isAnonymous ? '匿名用户' : username,
      school: isAnonymous ? '' : school,
      grade: isAnonymous ? '' : grade,
      className: isAnonymous ? '' : className,
      content,
      anonymous: isAnonymous,
      images: images,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      comments: [],
      viewCount: 0,
      isDeleted: false
    };
    
    posts.unshift(newPost);
    writeData(POSTS_FILE, posts);
    
    // 更新用户发帖数
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].postCount = (users[userIndex].postCount || 0) + 1;
      writeData(USERS_FILE, users);
    }
    
    res.status(201).json({ 
      success: true,
      post: newPost
    });
  } catch (error) {
    console.error('发布帖子错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取单个帖子详情
app.get('/posts/:id', (req, res) => {
  try {
    const postId = req.params.id;
    const posts = readData(POSTS_FILE);
    const post = posts.find(p => p.id === postId && !p.isDeleted);
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: '帖子不存在' 
      });
    }
    
    // 增加浏览量
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
      writeData(POSTS_FILE, posts);
    }
    
    res.json({ 
      success: true,
      post: {
        ...post,
        viewCount: (post.viewCount || 0) + 1
      }
    });
  } catch (error) {
    console.error('获取帖子详情错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 点赞帖子 - 增强版（防止重复点赞）
app.post('/posts/:id/like', (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: '用户ID不能为空' 
      });
    }
    
    const posts = readData(POSTS_FILE);
    const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);
    
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '帖子不存在' 
      });
    }
    
    const post = posts[postIndex];
    const userIndex = post.likedBy.indexOf(userId);
    
    // 如果用户已经点赞，则取消点赞
    if (userIndex !== -1) {
      post.likes = Math.max(0, post.likes - 1);
      post.likedBy.splice(userIndex, 1);
    } else {
      // 否则添加点赞
      post.likes += 1;
      post.likedBy.push(userId);
    }
    
    writeData(POSTS_FILE, posts);
    
    res.json({ 
      success: true,
      likes: post.likes,
      liked: userIndex === -1
    });
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 添加评论 - 增强版
app.post('/posts/:id/comments', (req, res) => {
  try {
    const postId = req.params.id;
    const { userId, username, content, anonymous } = req.body;
    
    if (!userId || !username || !content) {
      return res.status(400).json({ 
        success: false,
        message: '用户ID、用户名和评论内容不能为空' 
      });
    }
    
    if (content.length > 500) {
      return res.status(400).json({ 
        success: false,
        message: '评论内容过长，最多500个字符' 
      });
    }
    
    const posts = readData(POSTS_FILE);
    const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);
    
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '帖子不存在' 
      });
    }
    
    const post = posts[postIndex];
    const isAnonymous = anonymous === true || anonymous === 'true';
    
    const newComment = {
      id: uuidv4(),
      userId,
      username: isAnonymous ? '匿名同学' : username,
      content,
      anonymous: isAnonymous,
      timestamp: new Date().toISOString()
    };
    
    if (!post.comments) {
      post.comments = [];
    }
    
    post.comments.unshift(newComment);
    writeData(POSTS_FILE, posts);
    
    // 更新用户评论数
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].commentCount = (users[userIndex].commentCount || 0) + 1;
      writeData(USERS_FILE, users);
    }
    
    res.status(201).json({ 
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error('评论错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 删除评论
app.delete('/posts/:postId/comments/:commentId', (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: '用户ID不能为空' 
      });
    }
    
    const posts = readData(POSTS_FILE);
    const postIndex = posts.findIndex(p => p.id === postId && !p.isDeleted);
    
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '帖子不存在' 
      });
    }
    
    const post = posts[postIndex];
    const commentIndex = post.comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '评论不存在' 
      });
    }
    
    const comment = post.comments[commentIndex];
    
    // 检查权限：只有评论作者或帖子作者可以删除评论
    if (comment.userId !== userId && post.userId !== userId) {
      return res.status(403).json({ 
        success: false,
        message: '无权限删除此评论' 
      });
    }
    
    post.comments.splice(commentIndex, 1);
    writeData(POSTS_FILE, posts);
    
    res.json({ 
      success: true,
      message: '评论删除成功'
    });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取统计数据 - 增强版
app.get('/stats', (req, res) => {
  try {
    const users = readData(USERS_FILE);
    const posts = readData(POSTS_FILE);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPosts = posts.filter(post => {
      const postDate = new Date(post.timestamp);
      return postDate >= today && !post.isDeleted;
    });
    
    const activeUsers = users.filter(user => 
      user.lastLogin && new Date(user.lastLogin) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    const stats = {
      totalUsers: users.length,
      totalPosts: posts.filter(p => !p.isDeleted).length,
      todayPosts: todayPosts.length,
      totalComments: posts.reduce((sum, post) => 
        sum + (post.comments ? post.comments.length : 0), 0),
      totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
      activeUsers: activeUsers,
      anonymousPosts: posts.filter(p => p.anonymous && !p.isDeleted).length
    };
    
    res.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('获取统计错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 用户个人资料
app.get('/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const users = readData(USERS_FILE);
    const posts = readData(POSTS_FILE);
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    // 获取用户的帖子
    const userPosts = posts.filter(p => p.userId === userId && !p.isDeleted);
    
    // 计算用户统计数据
    const userStats = {
      postCount: userPosts.length,
      commentCount: user.commentCount || 0,
      totalLikes: userPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
      joinDate: user.createdAt,
      lastLogin: user.lastLogin
    };
    
    const { password, ...safeUser } = user;
    
    res.json({ 
      success: true,
      user: safeUser,
      stats: userStats,
      recentPosts: userPosts.slice(0, 10)
    });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 修改用户资料
app.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword, username } = req.body;
    
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    const user = users[userIndex];
    
    // 验证当前密码（如果要修改密码）
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false,
          message: '请输入当前密码' 
        });
      }
      
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ 
          success: false,
          message: '当前密码错误' 
        });
      }
      
      // 加密新密码
      user.password = await hashPassword(newPassword);
    }
    
    // 更新用户名（如果提供了）
    if (username && username !== user.username) {
      // 检查用户名是否已存在
      const usernameExists = users.some(u => u.username === username && u.id !== userId);
      if (usernameExists) {
        return res.status(400).json({ 
          success: false,
          message: '用户名已存在' 
        });
      }
      user.username = username;
    }
    
    writeData(USERS_FILE, users);
    
    const { password: _, ...safeUser } = user;
    
    res.json({ 
      success: true,
      message: '资料更新成功',
      user: safeUser
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 管理员功能 - 获取帖子列表（增强版，包含已删除帖子）
app.get('/admin/posts', requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const posts = readData(POSTS_FILE);
    
    let filteredPosts = posts;
    
    // 搜索功能（管理员可以看到所有帖子，包括已删除的）
    if (search) {
      filteredPosts = posts.filter(post => 
        post.content.toLowerCase().includes(search.toLowerCase()) ||
        (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      posts: paginatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredPosts.length / limit),
        totalPosts: filteredPosts.length,
        hasNext: endIndex < filteredPosts.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('管理员获取帖子错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 管理员功能 - 永久删除帖子
app.delete('/admin/posts/:id', requireAdmin, (req, res) => {
  try {
    const postId = req.params.id;
    const { adminId, reason } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false,
        message: '管理员ID不能为空' 
      });
    }
    
    // 验证管理员权限
    const users = readData(USERS_FILE);
    const adminUser = users.find(u => u.id === adminId);
    
    if (!adminUser) {
      return res.status(403).json({ 
        success: false,
        message: '无权限执行此操作' 
      });
    }
    
    const posts = readData(POSTS_FILE);
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '帖子不存在' 
      });
    }
    
    const deletedPost = posts[postIndex];
    
    // 永久删除帖子（从数组中移除）
    posts.splice(postIndex, 1);
    writeData(POSTS_FILE, posts);
    
    // 更新用户发帖数
    const userIndex = users.findIndex(u => u.id === deletedPost.userId);
    if (userIndex !== -1) {
      users[userIndex].postCount = Math.max(0, (users[userIndex].postCount || 0) - 1);
      writeData(USERS_FILE, users);
    }
    
    // 记录删除操作到备份文件（增强错误处理）
    try {
      const deletedPosts = readData(DELETED_POSTS_FILE);
      deletedPosts.unshift({
        ...deletedPost,
        deletedBy: adminUser.username,
        deletedAt: new Date().toISOString(),
        reason: reason || '违反论坛规定',
        permanentDelete: true
      });
      writeData(DELETED_POSTS_FILE, deletedPosts);
    } catch (backupError) {
      console.error('备份删除记录失败:', backupError);
      // 不阻止主要操作，只是记录错误
    }
    
    res.json({ 
      success: true,
      message: '帖子已永久删除'
    });
  } catch (error) {
    console.error('删除帖子错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 管理员功能 - 封禁用户
app.post('/admin/users/:id/ban', requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const { adminId, duration, reason } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false,
        message: '管理员ID不能为空' 
      });
    }
    
    // 验证管理员权限
    const users = readData(USERS_FILE);
    const adminUser = users.find(u => u.id === adminId);
    
    if (!adminUser) {
      return res.status(403).json({ 
        success: false,
        message: '无权限执行此操作' 
      });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    const user = users[userIndex];
    
    // 计算封禁结束时间
    const banDuration = parseInt(duration) || 7;
    const banEndTime = new Date();
    
    if (banDuration === 365) {
      // 永久封禁
      banEndTime.setFullYear(banEndTime.getFullYear() + 100);
    } else {
      banEndTime.setDate(banEndTime.getDate() + banDuration);
    }
    
    // 更新用户状态
    user.isActive = false;
    user.banStartTime = new Date().toISOString();
    user.banEndTime = banEndTime.toISOString();
    user.banReason = reason || '违反论坛规定';
    user.bannedBy = adminUser.username;
    
    writeData(USERS_FILE, users);
    
    // 记录封禁信息
    const bannedUsers = readData(BANNED_USERS_FILE) || [];
    bannedUsers.unshift({
      userId: user.id,
      username: user.username,
      qq: user.qq,
      banStartTime: user.banStartTime,
      banEndTime: user.banEndTime,
      banReason: user.banReason,
      bannedBy: user.bannedBy
    });
    writeData(BANNED_USERS_FILE, bannedUsers);
    
    res.json({ 
      success: true,
      message: `用户 ${user.username} 已被封禁 ${banDuration === 365 ? '永久' : banDuration + ' 天'}`,
      banInfo: {
        username: user.username,
        banStartTime: user.banStartTime,
        banEndTime: user.banEndTime,
        banReason: user.banReason,
        bannedBy: user.bannedBy
      }
    });
  } catch (error) {
    console.error('封禁用户错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 管理员功能 - 解封用户
app.post('/admin/users/:id/unban', requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false,
        message: '管理员ID不能为空' 
      });
    }
    
    // 验证管理员权限
    const users = readData(USERS_FILE);
    const adminUser = users.find(u => u.id === adminId);
    
    if (!adminUser) {
      return res.status(403).json({ 
        success: false,
        message: '无权限执行此操作' 
      });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    const user = users[userIndex];
    
    // 解封用户
    user.isActive = true;
    delete user.banStartTime;
    delete user.banEndTime;
    delete user.banReason;
    delete user.bannedBy;
    
    writeData(USERS_FILE, users);
    
    res.json({ 
      success: true,
      message: `用户 ${user.username} 已解封`
    });
  } catch (error) {
    console.error('解封用户错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取所有用户（管理员视图）
app.get('/admin/users', requireAdmin, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    res.json({ 
      success: true,
      users: safeUsers
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取封禁用户列表
app.get('/admin/banned-users', requireAdmin, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    
    const bannedUsers = users
      .filter(user => user.isActive === false)
      .map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
    
    res.json({ 
      success: true,
      bannedUsers
    });
  } catch (error) {
    console.error('获取封禁用户列表错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取详细统计数据（管理员面板）
app.get('/admin/stats', requireAdmin, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    const posts = readData(POSTS_FILE);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // 基础统计
    const totalUsers = users.length;
    const totalPosts = posts.filter(p => !p.isDeleted).length;
    const bannedUsers = users.filter(user => user.isActive === false).length;
    
    // 时间范围统计
    const todayPosts = posts.filter(post => 
      new Date(post.timestamp) >= today && !post.isDeleted
    );
    const weekPosts = posts.filter(post => 
      new Date(post.timestamp) >= weekAgo && !post.isDeleted
    );
    const monthPosts = posts.filter(post => 
      new Date(post.timestamp) >= monthAgo && !post.isDeleted
    );
    
    // 用户活跃度统计
    const activeUsers = users.filter(user => {
      const userPosts = posts.filter(post => 
        post.userId === user.id && !post.isDeleted
      );
      return userPosts.length > 0;
    }).length;
    
    // 年级分布统计
    const gradeDistribution = {};
    users.forEach(user => {
      if (user.grade) {
        gradeDistribution[user.grade] = (gradeDistribution[user.grade] || 0) + 1;
      }
    });
    
    // 学校分布统计
    const schoolDistribution = {};
    users.forEach(user => {
      if (user.school) {
        schoolDistribution[user.school] = (schoolDistribution[user.school] || 0) + 1;
      }
    });
    
    // 帖子类型统计
    const anonymousPosts = posts.filter(post => 
      (post.anonymous === true || post.anonymous === 'true') && !post.isDeleted
    ).length;
    const normalPosts = totalPosts - anonymousPosts;
    
    // 评论和点赞统计
    const totalComments = posts.reduce((sum, post) => 
      sum + (post.comments ? post.comments.length : 0), 0
    );
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    
    // 最活跃用户
    const userActivity = users.map(user => {
      const userPosts = posts.filter(post => 
        post.userId === user.id && !post.isDeleted
      );
      const userComments = posts.reduce((sum, post) => {
        if (post.comments) {
          return sum + post.comments.filter(comment => comment.userId === user.id).length;
        }
        return sum;
      }, 0);
      
      return {
        username: user.username,
        school: user.school,
        grade: user.grade,
        postCount: userPosts.length,
        commentCount: userComments,
        totalActivity: userPosts.length + userComments
      };
    }).sort((a, b) => b.totalActivity - a.totalActivity).slice(0, 10);
    
    const detailedStats = {
      totalUsers,
      totalPosts,
      bannedUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      
      todayPosts: todayPosts.length,
      weekPosts: weekPosts.length,
      monthPosts: monthPosts.length,
      
      totalComments,
      totalLikes,
      averageLikesPerPost: totalPosts > 0 ? (totalLikes / totalPosts).toFixed(2) : 0,
      averageCommentsPerPost: totalPosts > 0 ? (totalComments / totalPosts).toFixed(2) : 0,
      
      anonymousPosts,
      normalPosts,
      anonymousPercentage: totalPosts > 0 ? ((anonymousPosts / totalPosts) * 100).toFixed(2) : 0,
      
      gradeDistribution,
      schoolDistribution,
      
      topActiveUsers: userActivity
    };
    
    res.json({ 
      success: true,
      stats: detailedStats
    });
  } catch (error) {
    console.error('获取详细统计错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 获取最近活动（管理员面板）
app.get('/admin/recent-activity', requireAdmin, (req, res) => {
  try {
    const posts = readData(POSTS_FILE);
    const users = readData(USERS_FILE);
    
    // 获取最近24小时的帖子
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    
    const recentPosts = posts
      .filter(post => new Date(post.timestamp) >= dayAgo && !post.isDeleted)
      .slice(0, 20);
    
    // 获取最近注册的用户
    const recentUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
    
    res.json({ 
      success: true,
      recentPosts,
      recentUsers
    });
  } catch (error) {
    console.error('获取最近活动错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 搜索功能
app.get('/search', (req, res) => {
  try {
    const { q, type = 'posts', page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false,
        message: '搜索关键词不能为空' 
      });
    }
    
    if (type === 'posts') {
      const posts = readData(POSTS_FILE);
      const filteredPosts = posts.filter(post => 
        post.content.toLowerCase().includes(q.toLowerCase()) && !post.isDeleted
      );
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        results: paginatedPosts,
        total: filteredPosts.length,
        type: 'posts'
      });
    } else if (type === 'users') {
      const users = readData(USERS_FILE);
      const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(q.toLowerCase())
      ).map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({
        success: true,
        results: filteredUsers,
        total: filteredUsers.length,
        type: 'users'
      });
    }
  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器内部错误' 
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行中: http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`图片目录: ${IMAGES_DIR}`);
});

// 辅助函数
function initializeDataFile(filePath, defaultValue) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
  if (!fs.existsSync(filePath)) {
    console.log(`初始化数据文件: ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  } else {
    console.log(`使用现有数据文件: ${filePath}`);
  }
}

function readData(filePath) {
  try {
    // 如果文件不存在，先创建它
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在，正在创建: ${filePath}`);
      const dir = path.dirname(filePath);
      
      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 创建文件并写入默认值
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取数据错误: ${filePath}`, error);
    
    // 如果读取失败，返回空数组并尝试修复文件
    try {
      console.log(`尝试修复文件: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    } catch (writeError) {
      console.error(`修复文件失败: ${filePath}`, writeError);
    }
    
    return [];
  }
}

function writeData(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`写入数据错误: ${filePath}`, error);
    
    // 尝试创建目录并重试
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`重试写入成功: ${filePath}`);
    } catch (retryError) {
      console.error(`重试写入失败: ${filePath}`, retryError);
    }
  }
}
// 管理员权限验证中间件
function requireAdmin(req, res, next) {
  try {
    // 从查询参数或请求体中获取 adminId
    let adminId = req.body.adminId;
    
    // 如果是 GET 请求，从查询参数中获取
    if (req.method === 'GET' && !adminId) {
      adminId = req.query.adminId;
    }
    
    console.log('管理员权限验证:', { 
      method: req.method, 
      adminId: adminId,
      path: req.path,
      query: req.query,
      body: req.body
    });
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: '未提供管理员身份验证' 
      });
    }
    
    // 读取用户数据
    const users = readData(USERS_FILE);
    const adminUser = users.find(u => u.id === adminId);
    
    if (!adminUser) {
      return res.status(404).json({ 
        success: false,
        message: '管理员用户不存在' 
      });
    }
    
    // 检查用户是否在管理员列表中
    const isAdmin = ADMIN_USERS.includes(adminUser.qq) || ADMIN_USERS.includes(adminUser.id);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: '无权限访问管理员功能' 
      });
    }
    
    // 检查用户是否活跃
    if (adminUser.isActive === false) {
      return res.status(403).json({ 
        success: false,
        message: '管理员账号已被禁用' 
      });
    }
    
    console.log('管理员权限验证通过:', adminUser.username);
    
    // 权限验证通过
    next();
  } catch (error) {
    console.error('管理员权限验证错误:', error);
    res.status(500).json({ 
      success: false,
      message: '权限验证失败' 
    });
  }
}
