const { v4: uuidv4 } = require('uuid');
const {
  hashPassword,
  comparePassword,
  calculateCurrentGrade,
  validateUserInput
} = require('../utils/authUtils');
const {
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
const { userCache, notificationCache } = require('../utils/redisUtils');
const logger = require('../utils/logger');
const User = require('../models/User');

// 公共邮箱验证正则
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userController = {
  // 发送验证码
  async sendVerificationCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      // 验证邮箱格式
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
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { currentPassword } = req.body;

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
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { verificationCode } = req.body;

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

  // 修改密码（验证验证码后）
  async changePassword(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { currentPassword, newPassword, verificationCode } = req.body;

      if (!currentPassword) {
        return res.status(400).json(generateErrorResponse('请输入当前密码'));
      }

      if (!newPassword) {
        return res.status(400).json(generateErrorResponse('请输入新密码'));
      }

      if (newPassword.length < 6) {
        return res.status(400).json(generateErrorResponse('密码至少6个字符'));
      }

      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('请输入验证码'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证当前密码
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('密码修改失败：密码错误', { userId, ip: req.ip });
        return res.status(401).json(generateErrorResponse('当前密码错误'));
      }

      // 验证验证码
      const codeVerification = await verifyCode(user.email, verificationCode);
      if (!codeVerification.valid) {
        logger.logSecurityEvent('密码修改失败：验证码错误', { userId, ip: req.ip });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await updateUser(userId, { password: hashedPassword });

      logger.logUserAction('密码修改成功', userId, user.username, { ip: req.ip });

      res.json(generateSuccessResponse({}, '密码修改成功'));
    } catch (error) {
      logger.logError('修改密码失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户注册
  async register(req, res) {
    try {
      const { qq, username, password, email, verificationCode, school, enrollmentYear, className, birthday, gender } = req.body;

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
        birthday: birthday || null,
        gender: gender || '',
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

      // 生成登录 Token
      const { generateAccessToken, generateRefreshToken } = require('../middleware/jwtAuth');
      const accessToken = generateAccessToken(newUser.id);
      const refreshToken = generateRefreshToken(newUser.id);

      // 返回用户信息（不包含密码）和 Token
      const { password: _, ...safeUser } = newUser;

      res.status(201).json(generateSuccessResponse({ 
        user: safeUser,
        accessToken,
        refreshToken
      }, '注册成功'));
    } catch (error) {
      logger.logError('注册失败', { error: error.message, body: req.body });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户登录（安全增强版）
  async login(req, res) {
    try {
      const { email, qq, password, verificationCode } = req.body;

      // 获取客户端 IP
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       req.headers['x-real-ip'] || 
                       req.connection?.remoteAddress || 
                       req.socket?.remoteAddress ||
                       req.ip;

      // 导入 JWT 认证工具
      const { 
        generateAccessToken, 
        generateRefreshToken, 
        generateAdminToken,
        recordLoginAttempt, 
        checkLoginLocked 
      } = require('../middleware/jwtAuth');

      // 验证邮箱
      if (!email) {
        logger.logWarn('登录失败：邮箱为空', { ip: clientIp });
        return res.status(400).json(generateErrorResponse('邮箱不能为空'));
      }

      if (!emailRegex.test(email)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      if (!qq) {
        logger.logWarn('登录失败：QQ号为空', { ip: clientIp });
        return res.status(400).json(generateErrorResponse('QQ号不能为空'));
      }

      if (!password) {
        logger.logWarn('登录失败：密码为空', { qq, ip: clientIp });
        return res.status(400).json(generateErrorResponse('密码不能为空'));
      }

      // 验证验证码
      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('验证码不能为空'));
      }

      // 检查登录是否被锁定
      const lockStatus = await checkLoginLocked(qq);
      if (lockStatus.locked) {
        const remainingMinutes = Math.ceil(lockStatus.lockTimeRemaining / 60000);
        logger.logSecurityEvent('登录被拒绝：账户锁定', { qq, ip: clientIp, remainingMinutes });
        return res.status(429).json(generateErrorResponse(
          `账户已锁定，请 ${remainingMinutes} 分钟后再试`
        ));
      }

      // 验证验证码是否正确
      const codeVerification = await verifyCode(email, verificationCode);
      if (!codeVerification.valid) {
        logger.logSecurityEvent('登录失败：验证码验证失败', { email, ip: clientIp });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      // 直接查询用户（避免全量查询）
      const user = await User.findOne({ qq });

      if (!user) {
        // 记录登录失败
        await recordLoginAttempt(qq, false, clientIp);
        logger.logSecurityEvent('登录失败：用户不存在', { qq, ip: clientIp });
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证邮箱是否匹配
      if (user.email.toLowerCase() !== email.toLowerCase()) {
        await recordLoginAttempt(qq, false, clientIp);
        logger.logSecurityEvent('登录失败：邮箱与QQ不匹配', { qq, email, ip: clientIp });
        return res.status(400).json(generateErrorResponse('邮箱与QQ号不匹配'));
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // 记录登录失败
        const attemptResult = await recordLoginAttempt(qq, false, clientIp);
        
        logger.logSecurityEvent('登录失败：密码错误', {
          userId: user.id,
          username: user.username,
          qq: user.qq,
          ip: clientIp,
          attempts: attemptResult.attempts,
          remaining: attemptResult.remaining
        });

        const message = attemptResult.remaining 
          ? `密码错误，还剩 ${attemptResult.remaining} 次尝试机会`
          : '密码错误';
        
        return res.status(401).json(generateErrorResponse(message));
      }

      // 登录成功，清除失败记录
      await recordLoginAttempt(qq, true, clientIp);

      // 检查是否是管理员
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();
      const isAdmin = adminUsers.includes(user.qq) || adminUsers.includes(user.id);

      // 生成 JWT Token
      const accessToken = generateAccessToken(user.id, {
        username: user.username,
        qq: user.qq
      });
      const refreshToken = generateRefreshToken(user.id);

      // 管理员额外生成管理员 Token
      let adminToken = null;
      if (isAdmin) {
        adminToken = generateAdminToken(user.id, {
          username: user.username,
          qq: user.qq
        });
      }

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
        ip: clientIp
      });

      // 记录安全事件
      logger.logSecurityEvent('login_success', {
        userId: user.id,
        username: user.username,
        qq: user.qq,
        isAdmin: isAdmin,
        ip: clientIp
      });

      // 返回用户信息（不包含密码和MongoDB特有字段）
      // 注意：必须先 toObject() 将 Mongoose 文档转为普通对象，否则展开运算符无法枚举 Schema 字段
      const { password: _, _id, __v, ...safeUser } = user.toObject();

      // 缓存用户信息到Redis
      await userCache.set(user.id, safeUser);

      // 构建响应数据
      const responseData = {
        user: safeUser,
        isAdmin: isAdmin,
        // JWT Token
        token: accessToken,
        refreshToken: refreshToken
      };

      // 管理员返回额外 Token
      if (isAdmin) {
        responseData.adminToken = adminToken;
      }

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
      const viewerId = req.query.viewerId; // 当前查看者的用户ID
      const { getPostsByUserId } = require('../utils/dataUtils');
      const Follow = require('../models/Follow');
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 判断查看者与用户的关系
      const isSelf = viewerId === userId;
      let isFollower = false;
      
      if (viewerId && !isSelf) {
        // 检查是否是粉丝
        const followStatus = await Follow.findOne({ follower: viewerId, following: userId });
        isFollower = !!followStatus;
      }
      
      // 获取用户的帖子
      const activePosts = await getPostsByUserId(userId, false);
      
      // 根据用户的帖子时间范围设置过滤帖子
      const postDisplayRange = user.settings?.privacy?.postDisplayRange || 'all';
      const filteredPostsByTime = filterPostsByTimeRange(activePosts, postDisplayRange, isSelf);
      
      // 根据帖子可见性过滤帖子
      const filteredPosts = filterPostsByVisibility(filteredPostsByTime, userId, viewerId, isFollower);
      
      // 根据隐私设置过滤用户信息
      const safeUser = filterUserInfoByPrivacy(user, isSelf, isFollower);
      
      // 计算用户统计数据
      const userStats = {
        postCount: filteredPosts.length,
        commentCount: user.commentCount || 0,
        totalLikes: filteredPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
        totalViews: filteredPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
        joinDate: user.createdAt,
        lastLogin: user.lastLogin
      };
      
      res.json(generateSuccessResponse({
        user: safeUser,
        stats: userStats,
        recentPosts: filteredPosts.slice(0, 10),
        isSelf,
        isFollower
      }));
    } catch (error) {
      logger.logError('获取用户资料失败', { error: error.message, userId: req.params.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 修改用户资料
  async updateUserProfile(req, res) {
    try {
      const userId = req.params.id || req.body.userId || (req.user && req.user.id);
      const { currentPassword, newPassword, username, settings, school, enrollmentYear, className, birthday, gender, signature } = req.body;
      
      const user = await getUserById(userId);
      
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
        // 检查用户名是否已存在（直接查询，避免全量加载）
        const existingUser = await User.findOne({ username, id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json(generateErrorResponse('用户名已存在'));
        }
        updateData.username = username;
      }
      
      // 更新学校（如果提供了）
      if (school && school !== user.school) {
        updateData.school = school;
      }
      
      // 更新入学年份（如果提供了）
      if (enrollmentYear && enrollmentYear !== user.enrollmentYear) {
        updateData.enrollmentYear = parseInt(enrollmentYear);
        // 重新计算年级
        const currentGrade = calculateCurrentGrade(enrollmentYear);
        updateData.grade = currentGrade;
      }
      
      // 更新班级（如果提供了）
      if (className && className !== user.className) {
        updateData.className = className;
      }
      
      // 更新出生日期（如果提供了）
      if (birthday !== undefined) {
        updateData.birthday = birthday || null;
      }
      
      // 更新性别（如果提供了）
      if (gender !== undefined) {
        const validGenders = ['male', 'female', 'other', 'secret', ''];
        if (gender && !validGenders.includes(gender)) {
          return res.status(400).json(generateErrorResponse('无效的性别值'));
        }
        // "secret" 在客户端表示保密，映射为空字符串（不在资料页显示）
        updateData.gender = (gender === 'secret') ? '' : (gender || '');
      }
      
      // 更新个性签名（如果提供了）
      if (signature !== undefined) {
        const currentSettings = user.settings || {};
        updateData.settings = { ...currentSettings, ...updateData.settings, signature: signature || '' };
      }
      
      // 更新设置（如果提供了）
      if (settings && typeof settings === 'object') {
        // 确保用户有settings对象
        const currentSettings = user.settings || {};
        
        // 合并设置（浅合并），保留已有的 signature 更新
        updateData.settings = { ...currentSettings, ...updateData.settings, ...settings };
      }
      
      const updatedUser = await updateUser(userId, updateData);
      
      // 清除用户缓存
      await userCache.delete(userId);
      
      const { password: _, ...safeUser } = updatedUser;
      
      res.json(generateSuccessResponse({ user: safeUser }, '资料更新成功'));
    } catch (error) {
      logger.logError('更新用户资料失败', { error: error.message, userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 更新用户设置
  async updateUserSettings(req, res) {
    try {
      const userId = req.params.id;
      // 支持两种格式：直接发送设置对象，或发送 { settings: {...} }
      const settings = req.body.settings || req.body;
      
      if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
        return res.status(400).json(generateErrorResponse('设置数据无效'));
      }
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      // 确保用户有settings对象
      const currentSettings = user.settings || {};
      
      // 深度合并设置
      const mergedSettings = { ...currentSettings };
      
      // 处理隐私设置的深度合并
      if (settings.privacy) {
        mergedSettings.privacy = {
          ...currentSettings.privacy,
          ...settings.privacy
        };
        
        // 处理 profileVisibility 的深度合并
        if (settings.privacy.profileVisibility) {
          mergedSettings.privacy.profileVisibility = {
            ...(currentSettings.privacy?.profileVisibility || {}),
            ...settings.privacy.profileVisibility
          };
        }
      }
      
      // 合并其他设置
      Object.keys(settings).forEach(key => {
        if (key !== 'privacy') {
          mergedSettings[key] = settings[key];
        }
      });
      
      const updateData = { settings: mergedSettings };
      
      const updatedUser = await updateUser(userId, updateData);
      
      // 清除用户缓存
      await userCache.delete(userId);
      
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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'];
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
      
      // 清除用户缓存
      await userCache.delete(userId);
      
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
      
      // 清除用户缓存
      await userCache.delete(userId);
      
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
      // userId 来自已认证的 JWT（verifyAuth 路由应配置 authenticateUser 中间件）
      // 若 req.user 已由中间件注入，直接使用；否则尝试从 body 兼容旧客户端
      const userId = req.user?.id || req.body.userId;
      
      if (!userId) {
        return res.status(400).json(generateErrorResponse('用户ID不能为空'));
      }
      
      // 优先从Redis缓存获取用户信息
      let user = await userCache.get(userId);
      
      if (!user) {
        // 缓存未命中，从数据库获取
        user = await getUserById(userId);
        
        if (!user) {
          return res.status(404).json(generateErrorResponse('用户不存在'));
        }
        
        // 缓存用户信息
        const { password: _, _id, __v, ...safeUser } = user;
        await userCache.set(userId, safeUser);
        user = safeUser;
      }
      
      // 检查是否是管理员
      const { getAdminUsers } = require('../config/constants');
      const adminUsers = getAdminUsers();
      const isAdmin = adminUsers.includes(user.qq) || adminUsers.includes(user.id);
      
      // 检查用户是否被禁用
      const isBanned = user.isActive === false;
      
      res.json(generateSuccessResponse({ 
        user: user,
        isAdmin: isAdmin,
      isBanned: isBanned,
      valid: true
    }, '用户验证通过'));
    } catch (error) {
      logger.logError('验证用户状态失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 发送邮箱修改验证码（需要验证当前密码）
  async sendEmailChangeCode(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { currentPassword, newEmail } = req.body;

      if (!currentPassword) {
        return res.status(400).json(generateErrorResponse('请输入当前密码'));
      }

      if (!newEmail) {
        return res.status(400).json(generateErrorResponse('请输入新邮箱'));
      }

      // 验证邮箱格式
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json(generateErrorResponse('请输入有效的邮箱地址'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证当前密码
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('邮箱修改验证码发送失败：密码错误', { userId, ip: req.ip });
        return res.status(401).json(generateErrorResponse('当前密码错误'));
      }

      // 检查新邮箱是否已被注册
      const { isEmailRegistered } = require('../utils/dataUtils');
      if (await isEmailRegistered(newEmail)) {
        return res.status(400).json(generateErrorResponse('该邮箱已被其他用户使用'));
      }

      // 发送验证码到新邮箱
      await sendVerificationEmail(newEmail, 'emailChange');

      logger.logUserAction('发送邮箱修改验证码', userId, user.username, { newEmail, ip: req.ip });

      res.json(generateSuccessResponse({}, '验证码已发送到新邮箱'));
    } catch (error) {
      logger.logError('发送邮箱修改验证码失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse(error.message || '发送验证码失败', 500));
    }
  },

  // 验证邮箱修改并完成修改
  async verifyEmailChange(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { verificationCode, newEmail } = req.body;

      if (!verificationCode) {
        return res.status(400).json(generateErrorResponse('验证码不能为空'));
      }

      if (!newEmail) {
        return res.status(400).json(generateErrorResponse('新邮箱不能为空'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证验证码
      const codeVerification = await verifyCode(newEmail, verificationCode);
      if (!codeVerification.valid) {
        logger.logSecurityEvent('邮箱修改验证码验证失败', { userId, newEmail, ip: req.ip });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      // 再次检查邮箱是否已被注册
      const { isEmailRegistered } = require('../utils/dataUtils');
      if (await isEmailRegistered(newEmail)) {
        return res.status(400).json(generateErrorResponse('该邮箱已被其他用户使用'));
      }

      // 更新邮箱
      const updatedUser = await updateUser(userId, { email: newEmail.toLowerCase() });

      logger.logUserAction('邮箱修改成功', userId, user.username, { 
        oldEmail: user.email, 
        newEmail: newEmail.toLowerCase(), 
        ip: req.ip 
      });

      const { password: _, ...safeUser } = updatedUser;

      res.json(generateSuccessResponse({ user: safeUser }, '邮箱修改成功'));
    } catch (error) {
      logger.logError('验证邮箱修改失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 修改QQ号
  async changeQQ(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { newQQ, qq } = req.body;
      const qqNumber = newQQ || qq;

      if (!qqNumber) {
        return res.status(400).json(generateErrorResponse('请输入新QQ号'));
      }

      // 验证QQ号格式
      const qqRegex = /^[1-9]\d{4,14}$/;
      if (!qqRegex.test(qqNumber)) {
        return res.status(400).json(generateErrorResponse('请输入有效的QQ号（5-15位数字）'));
      }

      // 获取用户信息
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 检查新QQ号是否已被其他用户使用
      if (await isQQRegistered(qqNumber) && user.qq !== qqNumber) {
        return res.status(400).json(generateErrorResponse('该QQ号已被其他用户使用'));
      }

      // 更新QQ号
      await updateUser(userId, { qq: qqNumber });

      // 重新获取更新后的用户信息
      const updatedUser = await getUserById(userId);

      logger.logUserAction('QQ号修改成功', userId, user.username, { 
        oldQQ: user.qq, 
        newQQ: qqNumber, 
        ip: req.ip 
      });

      const { password: _, ...safeUser } = updatedUser;

      res.json(generateSuccessResponse({ user: safeUser }, 'QQ号修改成功'));
    } catch (error) {
      logger.logError('修改QQ号失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 刷新访问令牌
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json(generateErrorResponse('刷新令牌不能为空'));
      }

      const { verifyToken, generateAccessToken, invalidateToken } = require('../middleware/jwtAuth');

      // 验证刷新令牌
      const result = verifyToken(refreshToken);

      if (!result.valid || result.decoded.type !== 'refresh') {
        return res.status(401).json(generateErrorResponse('无效的刷新令牌'));
      }

      // 获取用户信息
      const user = await getUserById(result.decoded.userId);
      if (!user) {
        return res.status(401).json(generateErrorResponse('用户不存在'));
      }

      // 生成新的访问令牌
      const newAccessToken = generateAccessToken(user.id, {
        username: user.username,
        qq: user.qq
      });

      res.json(generateSuccessResponse({
        token: newAccessToken
      }, '令牌刷新成功'));
    } catch (error) {
      logger.logError('刷新令牌失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 用户登出
  async logout(req, res) {
    try {
      const { token } = req.body;

      if (token) {
        const { invalidateToken } = require('../middleware/jwtAuth');
        await invalidateToken(token);
      }

      logger.logSecurityEvent('logout', {
        ip: req.ip,
        userId: req.user?.id
      });

      res.json(generateSuccessResponse({}, '登出成功'));
    } catch (error) {
      logger.logError('登出失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 管理员登出
  async adminLogout(req, res) {
    try {
      const { token } = req.body;

      if (token) {
        const { invalidateToken } = require('../middleware/jwtAuth');
        await invalidateToken(token, true);
      }

      logger.logSecurityEvent('admin_logout', {
        ip: req.ip,
        adminId: req.admin?.id
      });

      res.json(generateSuccessResponse({}, '管理员登出成功'));
    } catch (error) {
      logger.logError('管理员登出失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 发送账户注销验证码
  async sendDeletionCode(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json(generateErrorResponse('密码不能为空'));
      }

      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('账户注销验证码发送失败：密码错误', { userId, ip: req.ip });
        return res.status(401).json(generateErrorResponse('密码错误'));
      }

      // 发送验证码邮件
      await sendVerificationEmail(user.email, 'deletion');

      logger.logUserAction('发送账户注销验证码', userId, user.username, {
        ip: req.ip
      });

      res.json(generateSuccessResponse({ 
        maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') 
      }, '验证码已发送到您的邮箱'));
    } catch (error) {
      logger.logError('发送账户注销验证码失败', { error: error.message });
      res.status(500).json(generateErrorResponse(error.message || '发送验证码失败', 500));
    }
  },

  // 注销用户账户
  async deleteAccount(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人账户
      const userId = req.user.id;
      const { password, verificationCode, keepData } = req.body;

      if (!password || !verificationCode) {
        return res.status(400).json(generateErrorResponse('缺少必要参数'));
      }

      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        logger.logSecurityEvent('账户注销失败：密码错误', { userId, ip: req.ip });
        return res.status(401).json(generateErrorResponse('密码错误'));
      }

      // 验证验证码
      const codeVerification = await verifyCode(user.email, verificationCode, 'deletion');
      if (!codeVerification.valid) {
        logger.logSecurityEvent('账户注销失败：验证码错误', { userId, ip: req.ip });
        return res.status(400).json(generateErrorResponse(codeVerification.message));
      }

      const keepPosts = keepData === true || keepData === 'true';
      const Post = require('../models/Post');
      const Follow = require('../models/Follow');
      const Favorite = require('../models/Favorite');
      const Notification = require('../models/Notification');
      const Blacklist = require('../models/Blacklist');
      const Message = require('../models/Message');
      const Conversation = require('../models/Conversation');
      const User = require('../models/User');

      // 如果不保留数据，删除用户相关数据
      if (!keepPosts) {
        // 删除用户的所有帖子
        await Post.deleteMany({ userId });
        
        // 删除用户的所有收藏
        await Favorite.deleteMany({ userId });
        
        // 删除用户的黑名单
        await Blacklist.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] });
      } else {
        // 保留数据但匿名化帖子
        await Post.updateMany(
          { userId },
          { 
            $set: { 
              userId: 'deleted_' + userId,
              username: '已注销用户',
              userAvatar: null
            } 
          }
        );
      }
      
      // 删除关注关系
      await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
      
      // 删除通知
      await Notification.deleteMany({ $or: [{ recipientId: userId }, { senderId: userId }] });
      
      // 删除消息和会话
      await Message.deleteMany({ $or: [{ senderId: userId }, { recipientId: userId }] });
      await Conversation.deleteMany({ participants: userId });
      
      // 删除用户头像文件
      if (user.avatar) {
        const fs = require('fs');
        const path = require('path');
        const avatarPath = path.join(__dirname, '../../public', user.avatar);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }
      
      // 删除用户账户
      await User.deleteOne({ id: userId });
      
      // 清除缓存
      await userCache.delete(userId);
      
      logger.logUserAction('账户注销成功', userId, user.username, {
        ip: req.ip,
        keepData: keepPosts
      });
      
      res.json(generateSuccessResponse({}, '账户已注销'));
    } catch (error) {
      logger.logError('注销账户失败', { error: error.message, userId: req.body.userId });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 获取通知设置
  async getNotificationSettings(req, res) {
    try {
      const { userId } = req.params;
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      const settings = user.settings?.notifications || {
        like: true,
        comment: true,
        commentReply: true,
        commentLike: true,
        follow: true,
        system: true
      };
      
      res.json(generateSuccessResponse({ settings }));
    } catch (error) {
      logger.logError('获取通知设置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 更新通知设置
  async updateNotificationSettings(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人设置
      const userId = req.user.id;
      const { type, enabled } = req.body;
      
      if (!type) {
        return res.status(400).json(generateErrorResponse('缺少必要参数'));
      }
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      if (!user.settings) {
        user.settings = {};
      }
      if (!user.settings.notifications) {
        user.settings.notifications = {
          like: true,
          comment: true,
          commentReply: true,
          commentLike: true,
          follow: true,
          system: true
        };
      }
      
      user.settings.notifications[type] = enabled === 'true' || enabled === true;
      await updateUser(userId, { 'settings.notifications': user.settings.notifications });
      
      res.json(generateSuccessResponse({}, '设置已更新'));
    } catch (error) {
      logger.logError('更新通知设置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 更新隐私设置
  async updatePrivacySettings(req, res) {
    try {
      // userId 来自已认证的 JWT，防止操作他人设置
      const userId = req.user.id;
      const { field, value } = req.body;
      
      if (!field || !value) {
        return res.status(400).json(generateErrorResponse('缺少必要参数'));
      }
      
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }
      
      if (!user.privacySettings) {
        user.privacySettings = {
          gender: 'public',
          birthday: 'public',
          school: 'public',
          signature: 'public',
          joinDate: 'public',
          lastLogin: 'public'
        };
      }
      
      user.privacySettings[field] = value;
      await updateUser(userId, { privacySettings: user.privacySettings });
      
      res.json(generateSuccessResponse({}, '设置已更新'));
    } catch (error) {
      logger.logError('更新隐私设置失败', { error: error.message });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 导出用户个人数据
  async exportData(req, res) {
    try {
      const userId = req.user.id;

      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      // 获取请求中指定的导出范围（默认导出全部）
      const { include = 'all' } = req.query;
      const includeAll = include === 'all';
      const includes = include.split(',').map(s => s.trim());
      const want = (key) => includeAll || includes.includes(key);

      const exportResult = {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        userId: user.id
      };

      // 基本资料
      if (want('profile')) {
        exportResult.profile = {
          username: user.username,
          email: user.email,
          qq: user.qq,
          gender: user.gender,
          birthday: user.birthday,
          school: user.school,
          enrollmentYear: user.enrollmentYear,
          className: user.className,
          grade: user.grade,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          signature: user.settings?.signature || ''
        };
      }

      // 帖子
      if (want('posts')) {
        const Post = require('../models/Post');
        const posts = await Post.find({ userId: user.id }).sort({ timestamp: -1 }).lean();
        exportResult.posts = posts.map(p => ({
          id: p.id,
          title: p.title,
          content: p.content,
          category: p.categoryId || null,
          timestamp: p.timestamp,
          likes: p.likes?.length || 0,
          views: p.views || 0,
          visibility: p.visibility || 'public',
          tags: p.tags || [],
          images: (p.images || []).map(img => img.url)
        }));
      }

      // 收藏
      if (want('favorites')) {
        const Favorite = require('../models/Favorite');
        const favorites = await Favorite.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
        exportResult.favorites = favorites.map(f => ({
          postId: f.postId,
          tagId: f.tagId || null,
          createdAt: f.createdAt
        }));
      }

      // 关注 / 粉丝
      if (want('follows')) {
        const Follow = require('../models/Follow');
        const following = await Follow.find({ followerId: user.id }).lean();
        const followers = await Follow.find({ followingId: user.id }).lean();
        exportResult.follows = {
          followingCount: following.length,
          followingIds: following.map(f => f.followingId),
          followerCount: followers.length,
          followerIds: followers.map(f => f.followerId)
        };
      }

      // 私信会话列表
      if (want('messages')) {
        const Conversation = require('../models/Conversation');
        const conversations = await Conversation.find({
          participants: user.id
        }).sort({ lastMessageAt: -1 }).lean();
        exportResult.conversations = conversations.map(c => ({
          id: c.id,
          participants: c.participants,
          lastMessageAt: c.lastMessageAt,
          messageCount: c.messageCount || 0
        }));
      }

      // 通知记录
      if (want('notifications')) {
        const Notification = require('../models/Notification');
        const notifications = await Notification.find({ recipientId: user.id })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean();
        exportResult.notifications = notifications.map(n => ({
          type: n.type,
          senderId: n.senderId,
          content: n.content,
          isRead: n.isRead,
          createdAt: n.createdAt
        }));
      }

      // 设置
      if (want('settings')) {
        const { password: _p, _id, __v, ...safeUser } = user.toObject ? user.toObject() : { ...user };
        exportResult.settings = safeUser.settings || {};
      }

      logger.logUserAction('用户导出个人数据', userId, user.username, {
        include,
        ip: req.ip
      });

      // 以 attachment JSON 文件流形式返回
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="my-data-${user.id}-${Date.now()}.json"`
      );
      return res.json(exportResult);
    } catch (error) {
      logger.logError('导出用户数据失败', { error: error.message, userId: req.user?.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  },

  // 导入用户数据（从 JSON 文件）
  async importData(req, res) {
    try {
      const userId = req.user.id;
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json(generateErrorResponse('用户不存在'));
      }

      let data;
      try {
        data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (_) {
        return res.status(400).json(generateErrorResponse('无效的 JSON 格式'));
      }

      // 校验格式版本
      if (!data.exportVersion || !data.userId) {
        return res.status(400).json(
          generateErrorResponse('文件格式无效：这不是有效的校园论坛数据导出文件')
        );
      }

      const { include = 'all' } = req.query;
      const includeAll = include === 'all';
      const includes = include.split(',').map(s => s.trim());
      const want = (key) => includeAll || includes.includes(key);

      const result = {
        postsImported: 0,
        postsSkipped: 0,
        favoritesImported: 0,
        favoritesSkipped: 0,
        followsImported: 0,
        followsSkipped: 0,
        settingsApplied: false,
        skippedTypes: []
      };

      // 帖子导入：建立 oldPostId → newPostId 映射
      const postIdMap = {}; // oldPostId → newPostId
      if (want('posts') && Array.isArray(data.posts) && data.posts.length > 0) {
        const Post = require('../models/Post');
        for (const p of data.posts) {
          try {
            const newId = require('uuid').v4();
            const now = Date.now();
            const newPost = new Post({
              id: newId,
              userId: userId,
              title: p.title || '无标题',
              content: p.content || '',
              categoryId: p.category || null,
              timestamp: p.timestamp || now,
              updatedAt: now,
              likes: [],
              views: 0,
              visibility: p.visibility || 'public',
              tags: Array.isArray(p.tags) ? p.tags : [],
              images: Array.isArray(p.images)
                ? p.images.map(url => ({ url, type: 'image' }))
                : [],
              isEdited: false
            });
            await newPost.save();
            postIdMap[p.id] = newId;
            result.postsImported++;
          } catch (err) {
            logger.logError('导入帖子失败', { error: err.message, oldPostId: p.id });
            result.postsSkipped++;
          }
        }
      } else if (!want('posts')) {
        result.skippedTypes.push('posts');
      }

      // 收藏导入
      if (want('favorites') && Array.isArray(data.favorites) && data.favorites.length > 0) {
        const Favorite = require('../models/Favorite');
        for (const f of data.favorites) {
          // 如果该帖子也导入了，用新 ID；否则跳过
          const mappedPostId = postIdMap[f.postId];
          if (!mappedPostId) {
            result.favoritesSkipped++;
            continue;
          }
          try {
            const existing = await Favorite.findOne({ userId, postId: mappedPostId });
            if (existing) {
              result.favoritesSkipped++;
              continue;
            }
            const fav = new Favorite({
              userId,
              postId: mappedPostId,
              tagId: f.tagId || null,
              createdAt: f.createdAt || new Date()
            });
            await fav.save();
            result.favoritesImported++;
          } catch (err) {
            if (err.code !== 11000) {
              logger.logError('导入收藏失败', { error: err.message });
            }
            result.favoritesSkipped++;
          }
        }
      } else if (!want('favorites')) {
        result.skippedTypes.push('favorites');
      }

      // 关注/粉丝导入：重建关注关系（followingId 为目标用户，只要目标用户存在即可）
      if (want('follows') && data.follows) {
        const Follow = require('../models/Follow');
        // 重建"我关注的用户"列表
        const followingIds = Array.isArray(data.follows.followingIds)
          ? data.follows.followingIds
          : [];
        for (const targetUserId of followingIds) {
          if (targetUserId === userId) continue; // 不能关注自己
          try {
            const existing = await Follow.findOne({ followerId: userId, followingId: targetUserId });
            if (existing) continue;
            const targetUser = await getUserById(targetUserId);
            if (!targetUser) {
              result.followsSkipped++;
              continue;
            }
            const follow = new Follow({
              followerId: userId,
              followingId: targetUserId,
              createdAt: new Date()
            });
            await follow.save();
            result.followsImported++;
          } catch (err) {
            if (err.code !== 11000) {
              logger.logError('导入关注关系失败', { error: err.message });
            }
            result.followsSkipped++;
          }
        }
        // 粉丝（其他用户关注我）：不需要导入，粉丝是被动的
      } else if (!want('follows')) {
        result.skippedTypes.push('follows');
      }

      // 账号设置导入（除密码外）
      if (want('settings') && data.settings) {
        try {
          const allowedSettings = ['theme', 'notifications', 'privacy', 'signature'];
          const currentSettings = user.settings || {};
          for (const key of allowedSettings) {
            if (data.settings[key] !== undefined) {
              currentSettings[key] = data.settings[key];
            }
          }
          await updateUser(userId, { settings: currentSettings });
          result.settingsApplied = true;
        } catch (err) {
          logger.logError('导入设置失败', { error: err.message });
        }
      } else if (!want('settings')) {
        result.skippedTypes.push('settings');
      }

      // profile / messages / notifications 不可导入，跳过
      const nonImportable = ['profile', 'messages', 'notifications'];
      for (const t of nonImportable) {
        if (!result.skippedTypes.includes(t)) result.skippedTypes.push(t);
      }

      logger.logUserAction('用户导入个人数据', userId, user.username, {
        includedTypes: include,
        result,
        ip: req.ip
      });

      res.json(generateSuccessResponse({ data: result }, '数据导入完成'));
    } catch (error) {
      logger.logError('导入用户数据失败', { error: error.message, userId: req.user?.id });
      res.status(500).json(generateErrorResponse('服务器内部错误', 500));
    }
  }
};

// 辅助函数：根据时间范围过滤帖子
function filterPostsByTimeRange(posts, range, isSelf) {
  // 如果是自己查看，显示所有帖子
  if (isSelf) {
    return posts;
  }
  
  const now = new Date();
  let cutoffDate;
  
  switch (range) {
    case '3days':
      cutoffDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7days':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1month':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '6months':
      cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      return posts;
  }
  
  return posts.filter(post => new Date(post.timestamp) >= cutoffDate);
}

// 辅助函数：根据帖子可见性过滤帖子
function filterPostsByVisibility(posts, authorId, viewerId, isFollower) {
  return posts.filter(post => {
    const visibility = post.visibility || 'public';
    
    // 公开帖子：所有人可见
    if (visibility === 'public') {
      return true;
    }
    
    // 仅自己可见：只有作者可见
    if (visibility === 'self') {
      return viewerId === authorId;
    }
    
    // 仅粉丝可见：粉丝和作者可见
    if (visibility === 'followers') {
      return viewerId === authorId || isFollower;
    }
    
    return true;
  });
}

// 辅助函数：根据隐私设置过滤用户信息
function filterUserInfoByPrivacy(user, isSelf, isFollower) {
  const { password, ...safeUser } = user;
  
  // 如果是自己，显示所有信息
  if (isSelf) {
    return safeUser;
  }
  
  const profileVisibility = user.settings?.privacy?.profileVisibility || {};
  
  // 检查某个字段是否可见
  const isFieldVisible = (field) => {
    const visibility = profileVisibility[field] || 'public';
    if (visibility === 'public') return true;
    if (visibility === 'followers') return isFollower;
    if (visibility === 'self') return false;
    return true;
  };
  
  // 过滤个人信息
  const filteredUser = { ...safeUser };
  
  if (!isFieldVisible('gender')) {
    filteredUser.gender = '';
  }
  
  if (!isFieldVisible('birthday')) {
    filteredUser.birthday = null;
  }
  
  if (!isFieldVisible('school')) {
    filteredUser.school = '';
    filteredUser.grade = '';
    filteredUser.className = '';
  }
  
  if (!isFieldVisible('signature')) {
    if (filteredUser.settings) {
      filteredUser.settings = { ...filteredUser.settings, signature: '' };
    } else {
      filteredUser.settings = { signature: '' };
    }
  }
  
  if (!isFieldVisible('joinDate')) {
    filteredUser.createdAt = null;
  }
  
  if (!isFieldVisible('lastLogin')) {
    filteredUser.lastLogin = null;
  }
  
  return filteredUser;
}

module.exports = userController;
