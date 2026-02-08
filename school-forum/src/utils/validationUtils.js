const { readData } = require('./dataUtils');
const { USERS_FILE } = require('../config/constants');

// 检查QQ是否已注册
function isQQRegistered(qq) {
  const users = readData(USERS_FILE);
  return users.some(user => user.qq === qq);
}

// 检查用户名是否已存在
function isUsernameExists(username) {
  const users = readData(USERS_FILE);
  return users.some(user => user.username === username);
}

// 检查用户是否存在
function userExists(userId) {
  const users = readData(USERS_FILE);
  return users.some(user => user.id === userId);
}

// 检查用户是否活跃
function isUserActive(userId) {
  const users = readData(USERS_FILE);
  const user = users.find(u => u.id === userId);
  return user && user.isActive !== false;
}

// 检查帖子是否存在
function postExists(postId, posts) {
  return posts.some(post => post.id === postId && !post.isDeleted);
}

// 检查评论是否存在
function commentExists(post, commentId) {
  if (!post.comments) return false;
  return post.comments.some(comment => comment.id === commentId);
}

// 检查用户是否有权限删除评论
function canDeleteComment(comment, post, userId) {
  return comment.userId === userId || post.userId === userId;
}

// 验证管理员权限
function validateAdminPermission(adminId) {
  const { ADMIN_USERS } = require('../config/constants');
  const users = readData(USERS_FILE);
  const adminUser = users.find(u => u.id === adminId);
  
  if (!adminUser) {
    return { valid: false, message: '管理员用户不存在' };
  }
  
  const isAdmin = ADMIN_USERS.includes(adminUser.qq) || ADMIN_USERS.includes(adminUser.id);
  
  if (!isAdmin) {
    return { valid: false, message: '无权限访问管理员功能' };
  }
  
  if (adminUser.isActive === false) {
    return { valid: false, message: '管理员账号已被禁用' };
  }
  
  return { valid: true, user: adminUser };
}

// 生成错误响应
function generateErrorResponse(message, statusCode = 400) {
  return {
    success: false,
    message
  };
}

// 生成成功响应
function generateSuccessResponse(data = {}, message = '操作成功') {
  return {
    success: true,
    message,
    ...data
  };
}

module.exports = {
  isQQRegistered,
  isUsernameExists,
  userExists,
  isUserActive,
  postExists,
  commentExists,
  canDeleteComment,
  validateAdminPermission,
  generateErrorResponse,
  generateSuccessResponse
};