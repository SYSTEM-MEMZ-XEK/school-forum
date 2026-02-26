const { v4: uuidv4 } = require('uuid');
const {
  hashPassword,
  comparePassword,
  calculateCurrentGrade,
  validateUserInput
} = require('../utils/authUtils');
const {
  getUsers,
  createUser,
  updateUser,
  getUserById
} = require('../utils/dataUtils');
const {
  isQQRegistered,
  isUsernameExists,
  userExists,
  isUserActive,
  generateErrorResponse,
  generateSuccessResponse
} = require('../utils/validationUtils');
const { sendVerificationEmail, verifyCode } = require('../utils/emailUtils');
const logger = require('../utils/logger');

const userController = {
  // 发送验证码
  async sendVerificationCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      // 发送验证码邮件
      await sendVerificationEmail(email);

      res.json(generateSuccessResponse({}, '验证码已发送到您的邮箱'));
    } catch (error) {
      logger.logError('发送验证码失败', { error: error.message, email: req.body.email });
      res.status(500).json(generateErrorResponse(error.message || '发送验证码失败', 500));
    }
  },

  // 发送登录验证码
  async sendLoginVerificationCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      // 发送验证码邮件（登录场景）
      await sendVerificationEmail(email, 'login');

      res.json(generateSuccessResponse({}, '验证码已发送到您的邮箱'));
    } catch (error) {
      logger.logError('发送登录验证码失败', { error: error.message, email: req.body.email });
      res.status(500).json(generateErrorResponse(error.message || '发送验证码失败', 500));
    }
  },

  // 发送密码修改验证码（需要验证当前密码）
  async sendPasswordChangeCode(req, res) {
    try {
      const { userId, currentPassword } = req.body;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      if (!currentPassword) {
        return res.status(400).json(generateErrorResponse('请输入当前密码'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证当前密码
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('密码修改验证码发送失败：密码错误', { userId, ip: req.ip });
        return res.status(401).json(generateErrorResponse('当前密码错误'));
      }

      // 发送验证码到用户邮箱（密码修改场景）
      await sendVerificationEmail(user.email, 'password');

      logger.logUserAction('发送密码修改验证码', userId, user.username, { ip: req.ip });

      res.json(generateSuccessResponse({ email: user.email }, '验证码已发送到您的邮箱'));
    } catch (error) {
      logger.logError('发送密码修改验证码失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse(error.message || '发送验证码失败', 500));
    }
  },

  // 验证密码修改验证码
  async verifyPasswordChangeCode(req, res) {
    try {
      const { userId, verificationCode } = req.body;

      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }

      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('验证码不能为空'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证验证码
      const codeVerification = await verifyCode(user.email, verificationCode);
      if (!codeVerification.valid) {
        logger.logSecurityEvent('密码修改验证码验证失败', { userId, ip: req.ip });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      logger.logUserAction('密码修改验证码验证成功', userId, user.username, { ip: req.ip });

      res.json(generateSuccessResponse({}, '验证码验证成功'));
    } catch (error) {
      logger.logError('验证密码修改验证码失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户注册
  async register(req, res) {
    try {
      const { qq, username, password, email, verificationCode, school, enrollmentYear, className } = req.body;

      // 验证输入
      const validationErrors = validateUserInput(req.body);
      if (validationErrors.length > 0) {
        logger.logWarn('用户注册失败：验证错误', { qq, username, errors: validationErrors });
        return res.status(400).json(generateErrorResponse(validationErrors[0]));
      }

      // 验证邮箱
      if (!email) {
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      // 验证验证码
      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('验证码不能为空'));
      }

      // 验证验证码是否正确（使用原始邮箱验证）
      const codeVerification = await verifyCode(email, verificationCode);
      if (!codeVerification.valid) {
        logger.logWarn('用户注册失败：验证码验证失败', { email, code: verificationCode });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      // 检查QQ是否已注册
      if (await isQQRegistered(qq)) {
        logger.logWarn('用户注册失败：QQ已注册', { qq });
        return res.status(400).json(generateErrorResponse('该QQ号已注册'));
      }

      // 检查用户名是否已存在
      if (await isUsernameExists(username)) {
        logger.logWarn('用户注册失败：用户名已存在', { username });
        return res.status(400).json(generateErrorResponse('用户名已存在'));
      }

      // 检查邮箱是否已被注册（不区分大小写）
      const { isEmailRegistered } = require('../utils/dataUtils');
      if (await isEmailRegistered(email)) {
        logger.logWarn('用户注册失败：邮箱已注册', { email });
        return res.status(400).json(generateErrorResponse('该邮箱已注册'));
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      // 计算当前年级
      const currentGrade = calculateCurrentGrade(enrollmentYear);

      const newUser = {
        id: uuidv4(),
        qq,
        username,
        email: email.toLowerCase(), // 统一转为小写存储
        password: hashedPassword,
        school,
        enrollmentYear: parseInt(enrollmentYear),
        className,
        grade: currentGrade,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        postCount: 0,
        commentCount: 0,
        isActive: true,
        settings: {
          theme: 'light',
        }
      };
      
      await createUser(newUser);

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
      const { email, qq, password, verificationCode } = req.body;

      // 验证邮箱
      if (!email) {
        logger.logWarn('登录失败：邮箱为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      if (!qq) {
        logger.logWarn('登录失败：QQ号为空', { ip: req.ip });
        return res.status(400).json(generateErrorResponse('QQ号不能为空'));
      }

      if (!password) {
        logger.logWarn('登录失败：密码为空', { qq, ip: req.ip });
        return res.status(400).json(generateErrorResponse('密码不能为空'));
      }

      // 验证验证码
      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('验证码不能为空'));
      }

      // 验证验证码是否正确（使用原始邮箱验证）
      const codeVerification = await verifyCode(email, verificationCode);
      if (!codeVerification.valid) {
        logger.logSecurityEvent('登录失败：验证码验证失败', { email, ip: req.ip });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      const users = await getUsers();
      const user = users.find(u => u.qq === qq);

      if (!user) {
        logger.logSecurityEvent('登录失败：用户不存在', { qq, ip: req.ip });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证邮箱是否匹配（不区分大小写）
      if (user.email.toLowerCase() !== email.toLowerCase()) {
        logger.logSecurityEvent('登录失败：邮箱与QQ不匹配', { qq, email, ip: req.ip });
        return res.status(400).json(generateErrorResponse('邮箱与QQ号不匹配'));
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
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();
      const isAdmin = adminUsers.includes(user.qq) || adminUsers.includes(user.id);

      // 更新用户最后登录时间和年级
      const currentGrade = calculateCurrentGrade(user.enrollmentYear);
      await updateUser(user.id, {
        lastLogin: new Date().toISOString(),
        grade: currentGrade
      });

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
  async getUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const { getPostsByUserId } = require('../utils/dataUtils');
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 获取用户的帖子
      const activePosts = await getPostsByUserId(userId, false);
      
      // 计算用户统计数据
      const userStats = {
        postCount: activePosts.length,
        commentCount: user.commentCount || 0,
        totalLikes: activePosts.reduce((sum, post) => sum + (post.likes || 0), 0),
        totalViews: activePosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
        joinDate: user.createdAt,
        lastLogin: user.lastLogin
      };
      
      const { password, ...safeUser } = user;
      
      res.json(generateSuccessResponse({
        user: safeUser,
        stats: userStats,
        recentPosts: activePosts.slice(0, 10)
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
      
      const users = await getUsers();
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const updateData = {};
      
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
        updateData.password = await hashPassword(newPassword);
      }
      
      // 更新用户名（如果提供了）
      if (username && username !== user.username) {
        // 检查用户名是否已存在
        const usernameExists = users.some(u => u.username === username && u.id !== userId);
        if (usernameExists) {
          return res.status(400).json(generateErrorResponse('用户名已存在'));
        }
        updateData.username = username;
      }
      
      // 更新设置（如果提供了）
      if (settings && typeof settings === 'object') {
        // 确保用户有settings对象
        const currentSettings = user.settings || {};
        
        // 合并设置（浅合并）
        updateData.settings = { ...currentSettings, ...settings };
      }
      
      const updatedUser = await updateUser(userId, updateData);
      
      const { password: _, ...safeUser } = updatedUser;
      
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
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 确保用户有settings对象
      const currentSettings = user.settings || {};
      
      // 合并设置（浅合并）
      const updateData = { settings: { ...currentSettings, ...settings } };
      
      const updatedUser = await updateUser(userId, updateData);
      
      const { password: _, ...safeUser } = updatedUser;
      
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
      
      // 验证文件大小（10MB限制）
      const maxSize = 10 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json(generateErrorResponse('图片大小不能超过 10MB'));
      }
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 更新用户头像路径
      const avatar = `/images/avatars/${req.file.filename}`;
      const updatedUser = await updateUser(userId, { avatar });
      
      const { password: _, ...safeUser } = updatedUser;
      
      res.json(generateSuccessResponse({ 
        user: safeUser, 
        avatarUrl: avatar 
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
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 删除头像（设置为null，使用默认头像）
      const updatedUser = await updateUser(userId, { avatar: null });
      
      const { password: _, ...safeUser } = updatedUser;
      
      res.json(generateSuccessResponse({ 
        user: safeUser 
      }, '头像已移除'));
    } catch (error) {
      logger.logError('删除头像失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 验证用户登录状态
  async verifyAuth(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 检查是否是管理员
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();
      const isAdmin = adminUsers.includes(user.qq) || adminUsers.includes(user.id);
      
      // 检查用户是否被禁用
      const isBanned = user.isActive === false;
      
      // 返回最新的用户信息
      const { password: _, ...safeUser } = user;
      
      res.json(generateSuccessResponse({ 
        user: safeUser,
        isAdmin: isAdmin,
        isBanned: isBanned,
        valid: true
      }, '用户验证通过'));
    } catch (error) {
      logger.logError('验证用户状态失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

module.exports = userController;
