const bcrypt = require('bcryptjs');
const { getPasswordConfig, getContentLimits } = require('../config/constants');

// 密码加密函数 - 使用最新配置
const hashPassword = async (password) => {
  const passwordConfig = getPasswordConfig();
  const saltRounds = passwordConfig.saltRounds;
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

// 验证用户输入 - 使用最新配置
function validateUserInput(userData) {
  const { qq, username, password, school, enrollmentYear, className } = userData;
  const contentLimits = getContentLimits();
  
  const errors = [];
  
  if (!qq || !username || !password || !school || !enrollmentYear || !className) {
    errors.push('请填写所有必填字段');
  }
  
  if (qq && (qq.length < contentLimits.qq.min || qq.length > contentLimits.qq.max)) {
    errors.push(`QQ号长度应在${contentLimits.qq.min}-${contentLimits.qq.max}个字符之间`);
  }
  
  if (username && (username.length < contentLimits.username.min || username.length > contentLimits.username.max)) {
    errors.push(`用户名长度应在${contentLimits.username.min}-${contentLimits.username.max}个字符之间`);
  }
  
  if (password && password.length < contentLimits.password.min) {
    errors.push(`密码长度至少${contentLimits.password.min}位`);
  }
  
  return errors;
}

// 验证帖子内容 - 使用最新配置
function validatePostContent(content) {
  const contentLimits = getContentLimits();
  
  // 如果内容存在且不为空，验证长度
  if (content && content.length > 0) {
    if (content.length > contentLimits.post) {
      return [`帖子内容过长，最多${contentLimits.post}个字符`];
    }
  }
  
  return [];
}

// 验证评论内容 - 使用最新配置
function validateCommentContent(content) {
  const contentLimits = getContentLimits();
  
  if (!content) {
    return ['评论内容不能为空'];
  }
  
  if (content.length > contentLimits.comment) {
    return [`评论内容过长，最多${contentLimits.comment}个字符`];
  }
  
  return [];
}

module.exports = {
  hashPassword,
  comparePassword,
  calculateCurrentGrade,
  validateUserInput,
  validatePostContent,
  validateCommentContent
};