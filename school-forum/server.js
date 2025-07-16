const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 使用绝对路径存储数据（根据服务器实际情况修改）
const DATA_DIR = 'data/'; 

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`创建数据目录: ${DATA_DIR}`);
} else {
  console.log(`使用现有数据目录: ${DATA_DIR}`);
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// 初始化数据文件
initializeDataFile(USERS_FILE, []);
initializeDataFile(POSTS_FILE, []);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 计算当前年级
function calculateCurrentGrade(enrollmentYear) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // 计算学年偏移量 (每年9月1日升级)
  let yearOffset = currentYear - enrollmentYear;
  
  // 如果当前月份在9月之前，学年还没升级
  if (currentMonth < 9) {
    yearOffset -= 1;
  }
  
  // 根据偏移量确定年级
  switch(yearOffset) {
    case 0: return "高一";
    case 1: return "高二";
    case 2: return "高三";
    default: 
      return yearOffset > 2 ? "已毕业" : "未知年级";
  }
}
// 用户注册
app.post('/register', (req, res) => {
  const { qq, username, password, school, enrollmentYear, className } = req.body;
  
  // 验证必填字段
  if (!qq || !username || !password || !school || !enrollmentYear || !className) {
    return res.status(400).json({ 
      success: false,
      message: '请填写所有必填字段' 
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
  
  // 计算当前年级
  const currentGrade = calculateCurrentGrade(enrollmentYear);
  
  const newUser = {
    id: uuidv4(),
    qq,
    username,
    password,
    school,
    enrollmentYear: parseInt(enrollmentYear), // 保存入学年份
    className,
    grade: currentGrade, // 保存计算出的年级
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  writeData(USERS_FILE, users);
  
  res.status(201).json({ 
    success: true,
    user: newUser
  });
});

// 用户登录
app.post('/login', (req, res) => {
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
  
  // 验证密码
  if (user.password !== password) {
    return res.status(401).json({ 
      success: false,
      message: '密码错误' 
    });
  }
  
  // 升级年级逻辑
  if (user.enrollmentYear) {
    const currentGrade = calculateCurrentGrade(user.enrollmentYear);
    
    // 更新用户数据中的年级
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].grade = currentGrade;
      writeData(USERS_FILE, users);
    }
    
    // 更新当前用户对象
    user.grade = currentGrade;
  }
  
  // 返回用户信息（不包含密码）
  const { password: _, ...safeUser } = user;
  
  res.json({ 
    success: true,
    user: safeUser
  });
});

// 获取所有帖子
app.get('/posts', (req, res) => {
  const posts = readData(POSTS_FILE);
  res.json(posts);
});

// 发布新帖子
app.post('/posts', (req, res) => {
  const { userId, username, school, grade, className, content, anonymous } = req.body;
  
  // 验证必填字段
  if (!userId || !username || !school || !grade || !className || !content) {
    return res.status(400).json({ 
      success: false,
      message: '请填写所有必填字段' 
    });
  }
  
  // 验证用户是否存在
  const users = readData(USERS_FILE);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: '用户不存在' 
    });
  }
  // 创建新帖子（使用当前年级）
  const posts = readData(POSTS_FILE);
  
  const newPost = {
    id: uuidv4(),
    userId,
    username,
    school,
    grade, // 使用当前年级
    className,
    content,
    anonymous: anonymous || false,
    timestamp: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    comments: []
  };
  
  posts.unshift(newPost);
  writeData(POSTS_FILE, posts);
  
  res.status(201).json({ 
    success: true,
    post: newPost
  });
});

// 点赞帖子
app.post('/posts/:id/like', (req, res) => {
  const postId = req.params.id;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false,
      message: '用户ID不能为空' 
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
  
  const post = posts[postIndex];
  const userIndex = post.likedBy.indexOf(userId);
  
  // 如果用户已经点赞，则取消点赞
  if (userIndex !== -1) {
    post.likes -= 1;
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
});

// 添加评论
app.post('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { userId, username, content, anonymous } = req.body;
  
  if (!userId || !username || !content) {
    return res.status(400).json({ 
      success: false,
      message: '用户ID、用户名和评论内容不能为空' 
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
  
  const post = posts[postIndex];
  
  const newComment = {
    id: uuidv4(),
    userId,
    username, // 确保保存用户名
    content,
    anonymous: anonymous || false,
    timestamp: new Date().toISOString()
  };
  
  if (!post.comments) {
    post.comments = [];
  }
  
  post.comments.unshift(newComment);
  writeData(POSTS_FILE, posts);
  
  res.status(201).json({ 
    success: true,
    comment: newComment
  });
});

// 获取统计数据
app.get('/stats', (req, res) => {
  const users = readData(USERS_FILE);
  const posts = readData(POSTS_FILE);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayPosts = posts.filter(post => {
    const postDate = new Date(post.timestamp);
    return postDate >= today;
  });
  
  const stats = {
    totalUsers: users.length,
    totalPosts: posts.length,
    todayPosts: todayPosts.length,
    totalComments: posts.reduce((sum, post) => sum + (post.comments ? post.comments.length : 0), 0),
    totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0)
  };
  
  res.json({ 
    success: true,
    stats 
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行中: http://localhost:${PORT}`);
});

// 辅助函数
function initializeDataFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    console.log(`初始化数据文件: ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  } else {
    console.log(`使用现有数据文件: ${filePath}`);
  }
}

function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取数据错误: ${filePath}`, error);
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`写入数据错误: ${filePath}`, error);
  }
}