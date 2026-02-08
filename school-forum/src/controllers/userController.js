const { v4: uuidv4 } = require('uuid');
const {
  hashPassword,
  comparePassword,
  calculateCurrentGrade,
  validateUserInput
} = require('../utils/authUtils');
const {
  readData,
  writeData
} = require('../utils/dataUtils');
const {
  isQQRegistered,
  isUsernameExists,
  userExists,
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { USERS_FILE, POSTS_FILE } = require('../config/constants');
const logger = require('../utils/logger');
const { addActivity } = require('../utils/levelSystem');

const userController = {
  // 用户注册
  async register(req, res) {
    try {
      const { qq, username, password, school, enrollmentYear, className } = req.body;

      // 验证输入
      const validationErrors = validateUserInput(req.body);
      if (validationErrors.length > 0) {
        logger.logWarn('用户注册失败：验证错误', { qq, username, errors: validationErrors });
        return res.status(400).json(generateErrorResponse(validationErrors[0]));
      }

      // 检查QQ是否已注册
      if (isQQRegistered(qq)) {
        logger.logWarn('用户注册失败：QQ已注册', { qq });
        return res.status(400).json(generateErrorResponse('该QQ号已注册'));
      }

      // 检查用户名是否已存在
      if (isUsernameExists(username)) {
        logger.logWarn('用户注册失败：用户名已存在', { username });
        return res.status(400).json(generateErrorResponse('用户名已存在'));
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      // 计算当前年级
      const currentGrade = calculateCurrentGrade(enrollmentYear);

      const users = readData(USERS_FILE);

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
        activity: 0, // 活跃度
        level: 1, // 等级
        isActive: true,
        settings: {
          theme: 'light',
          // 其他设置字段可以在这里添加
        }
      };
      
      users.push(newUser);
      writeData(USERS_FILE, users);

      // 记录用户注册日志
      logger.logUserAction('用户注册', newUser.id, newUser.username, {
        qq: newUser.qq,
        school: newUser.school,
        grade: newUser.grade,
        className: newUser.className
      });

      // 返回用户信息（不包含密码）
      const { password: _, ...safeUser } = newUser;

      res.status(201).json(generateSuccessResponse({ user: safeUser }, '注册成功'));
    } catch (error) {
      logger.logError('注册失败', { error: error.message, body: req.body });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户登录
  async login(req, res) {
    try {
      const { qq, password } = req.body;

      if (!qq) {
        logger.logWarn('登录失败：QQ号为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('QQ号不能为空'));
      }

      if (!password) {
        logger.logWarn('登录失败：密码为空', { qq, ip: req.ip });
        return res.status(400).json(generateErrorResponse('密码不能为空'));
      }

      const users = readData(USERS_FILE);
      const user = users.find(u => u.qq === qq);

      if (!user) {
        logger.logSecurityEvent('登录失败：用户不存在', { qq, ip: req.ip });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('登录失败：密码错误', {
          userId: user.id,
          username: user.username,
          qq: user.qq,
          ip: req.ip
        });
        return res.status(401).json(generateErrorResponse('密码错误'));
      }

      // 检查是否是管理员
      const { ADMIN_USERS } = require('../config/constants');
      const isAdmin = ADMIN_USERS.includes(user.qq) || ADMIN_USERS.includes(user.id);

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

      // 记录用户登录日志
      logger.logUserAction('用户登录', user.id, user.username, {
        isAdmin: isAdmin,
        ip: req.ip
      });

      // 返回用户信息（不包含密码）
      const { password: _, ...safeUser } = user;

      // 添加管理员标记
      const responseData = {
        user: safeUser,
        isAdmin: isAdmin
      };

      res.json(generateSuccessResponse(responseData, isAdmin ? '管理员登录成功' : '登录成功'));
    } catch (error) {
      logger.logError('登录失败', { error: error.message, qq: req.body.qq });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取用户个人资料
  getUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const users = readData(USERS_FILE);
      const posts = readData(POSTS_FILE);
      
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
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
      
      // 确保返回活跃度和等级信息
      const responseUser = {
        ...safeUser,
        activity: user.activity || 0,
        level: user.level || 1
      };
      
      res.json(generateSuccessResponse({
        user: responseUser,
        stats: userStats,
        recentPosts: userPosts.slice(0, 10)
      }));
    } catch (error) {
      logger.logError('获取用户资料失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 修改用户资料
  async updateUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const { currentPassword, newPassword, username, settings } = req.body;
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 验证当前密码（如果要修改密码）
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json(generateErrorResponse('请输入当前密码'));
        }
        
        const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(401).json(generateErrorResponse('当前密码错误'));
        }
        
        // 加密新密码
        user.password = await hashPassword(newPassword);
      }
      
      // 更新用户名（如果提供了）
      if (username && username !== user.username) {
        // 检查用户名是否已存在
        const usernameExists = users.some(u => u.username === username && u.id !== userId);
        if (usernameExists) {
          return res.status(400).json(generateErrorResponse('用户名已存在'));
        }
        user.username = username;
      }
      
      // 更新设置（如果提供了）
      if (settings && typeof settings === 'object') {
        // 确保用户有settings对象
        if (!user.settings) {
          user.settings = {};
        }
        
        // 合并设置（浅合并）
        Object.assign(user.settings, settings);
      }
      
      writeData(USERS_FILE, users);
      
      const { password: _, ...safeUser } = user;
      
      res.json(generateSuccessResponse({ user: safeUser }, '资料更新成功'));
    } catch (error) {
      logger.logError('更新用户资料失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 更新用户设置
  async updateUserSettings(req, res) {
    try {
      const userId = req.params.id;
      const settings = req.body.settings;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json(generateErrorResponse('设置数据无效'));
      }
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 确保用户有settings对象
      if (!user.settings) {
        user.settings = {};
      }
      
      // 合并设置（浅合并）
      Object.assign(user.settings, settings);
      
      writeData(USERS_FILE, users);
      
      const { password: _, ...safeUser } = user;
      
      res.json(generateSuccessResponse({ user: safeUser }, '设置更新成功'));
    } catch (error) {
      logger.logError('更新用户设置失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 上传用户头像
  async uploadAvatar(req, res) {
    try {
      const userId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json(generateErrorResponse('请选择要上传的头像图片'));
      }
      
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json(generateErrorResponse('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
      }
      
      // 验证文件大小（2MB限制）
      const maxSize = 2 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json(generateErrorResponse('图片大小不能超过 2MB'));
      }
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 更新用户头像路径
      user.avatar = `/images/avatars/${req.file.filename}`;
      
      writeData(USERS_FILE, users);
      
      const { password: _, ...safeUser } = user;
      
      res.json(generateSuccessResponse({ 
        user: safeUser, 
        avatarUrl: user.avatar 
      }, '头像上传成功'));
    } catch (error) {
      logger.logError('上传头像失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 删除用户头像
  async removeAvatar(req, res) {
    try {
      const userId = req.params.id;
      
      const users = readData(USERS_FILE);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const user = users[userIndex];
      
      // 删除头像（设置为null，使用默认头像）
      user.avatar = null;
      
      writeData(USERS_FILE, users);
      
      const { password: _, ...safeUser } = user;
      
      res.json(generateSuccessResponse({ 
        user: safeUser 
      }, '头像已移除'));
    } catch (error) {
      logger.logError('删除头像失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = userController;