/**
 * 用户等级系统
 * 总共128级，按活跃度升级
 */

// 等级配置
const LEVEL_CONFIG = {
  MAX_LEVEL: 128,
  // 每个等级需要的活跃度（递增公式）
  // 公式：活跃度 = 等级 * (等级 + 1) / 2 * 系数
  // 简化版：活跃度 = 等级 * 等级
};

/**
 * 获取等级需要的活跃度
 * @param {number} level - 等级
 * @returns {number} 需要的活跃度
 */
function getLevelRequirement(level) {
  if (level <= 0) return 0;
  if (level > LEVEL_CONFIG.MAX_LEVEL) return getLevelRequirement(LEVEL_CONFIG.MAX_LEVEL);
  
  // 使用二次函数让早期升级容易，后期升级困难
  // 公式：活跃度 = 等级 * 等级 * 10
  return level * level * 10;
}

/**
 * 根据活跃度计算等级
 * @param {number} activity - 活跃度
 * @returns {number} 等级
 */
function calculateLevel(activity) {
  if (activity <= 0) return 1;
  
  // 反向计算：等级 = sqrt(活跃度 / 10)
  const level = Math.floor(Math.sqrt(activity / 10));
  
  return Math.min(level + 1, LEVEL_CONFIG.MAX_LEVEL);
}

/**
 * 获取当前等级进度
 * @param {number} activity - 当前活跃度
 * @returns {object} { currentLevel, currentLevelActivity, nextLevelActivity, progress }
 */
function getLevelProgress(activity) {
  const currentLevel = calculateLevel(activity);
  
  if (currentLevel >= LEVEL_CONFIG.MAX_LEVEL) {
    return {
      currentLevel,
      currentLevelActivity: activity,
      nextLevelActivity: activity,
      progress: 100,
      isMaxLevel: true
    };
  }
  
  const currentLevelActivity = getLevelRequirement(currentLevel - 1);
  const nextLevelActivity = getLevelRequirement(currentLevel);
  
  const progress = ((activity - currentLevelActivity) / (nextLevelActivity - currentLevelActivity)) * 100;
  
  return {
    currentLevel,
    currentLevelActivity,
    nextLevelActivity,
    progress: Math.min(progress, 100),
    isMaxLevel: false
  };
}

/**
 * 获取等级称号
 * @param {number} level - 等级
 * @returns {string} 等级称号
 */
function getLevelTitle(level) {
  if (level <= 5) return '萌新';
  if (level <= 10) return '初学者';
  if (level <= 20) return '探索者';
  if (level <= 30) return '冒险家';
  if (level <= 40) return '先驱者';
  if (level <= 50) return '精英';
  if (level <= 60) return '专家';
  if (level <= 70) return '大师';
  if (level <= 80) return '宗师';
  if (level <= 90) return '传奇';
  if (level <= 100) return '圣者';
  if (level <= 110) return '至尊';
  if (level <= 120) return '神灵';
  if (level < 128) return '至尊神灵';
  return '无上至尊';
}

/**
 * 获取等级颜色
 * @param {number} level - 等级
 * @returns {string} 等级颜色
 */
function getLevelColor(level) {
  if (level <= 10) return '#999999'; // 灰色 - 新手
  if (level <= 20) return '#ffffff'; // 白色 - 青铜
  if (level <= 30) return '#cd7f32'; // 青铜色
  if (level <= 40) return '#c0c0c0'; // 银色
  if (level <= 50) return '#ffd700'; // 金色
  if (level <= 60) return '#9370db'; // 紫色
  if (level <= 70) return '#ff69b4'; // 粉色
  if (level <= 80) return '#00ced1'; // 青色
  if (level <= 90) return '#ff4500'; // 橙红色
  if (level <= 100) return '#ff1493'; // 深粉色
  if (level <= 110) return '#8a2be2'; // 蓝紫色
  if (level <= 120) return '#00ff00'; // 亮绿色
  if (level < 128) return '#ff0000'; // 红色
  return '#000000'; // 黑色 - 最高级
}

/**
 * 获取等级图标类名（使用Font Awesome）
 * @param {number} level - 等级
 * @returns {string} 图标类名
 */
function getLevelIcon(level) {
  if (level <= 10) return 'fa-seedling';
  if (level <= 20) return 'fa-leaf';
  if (level <= 30) return 'fa-tree';
  if (level <= 40) return 'fa-star';
  if (level <= 50) return 'fa-star-half-alt';
  if (level <= 60) return 'fa-crown';
  if (level <= 70) return 'fa-gem';
  if (level <= 80) return 'fa-diamond';
  if (level <= 90) return 'fa-fire';
  if (level <= 100) return 'fa-bolt';
  if (level <= 110) return 'fa-meteor';
  if (level <= 120) return 'fa-sun';
  if (level < 128) return 'fa-rocket';
  return 'fa-infinity';
}

/**
 * 增加用户活跃度
 * @param {object} user - 用户对象
 * @param {number} amount - 增加的活跃度
 * @returns {object} 更新后的用户对象
 */
function addActivity(user, amount = 1) {
  if (!user) return null;
  
  const newActivity = (user.activity || 0) + amount;
  const newLevel = calculateLevel(newActivity);
  
  const levelChanged = newLevel !== (user.level || 1);
  
  return {
    ...user,
    activity: newActivity,
    level: newLevel,
    levelUp: levelChanged
  };
}

module.exports = {
  LEVEL_CONFIG,
  getLevelRequirement,
  calculateLevel,
  getLevelProgress,
  getLevelTitle,
  getLevelColor,
  getLevelIcon,
  addActivity
};