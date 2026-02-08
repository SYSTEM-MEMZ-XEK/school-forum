/**
 * 用户等级系统前端工具
 */

// 等级配置
const LEVEL_CONFIG = {
  MAX_LEVEL: 128
};

/**
 * 获取等级需要的活跃度
 * @param {number} level - 等级
 * @returns {number} 需要的活跃度
 */
function getLevelRequirement(level) {
  if (level <= 0) return 0;
  if (level > LEVEL_CONFIG.MAX_LEVEL) return getLevelRequirement(LEVEL_CONFIG.MAX_LEVEL);
  return level * level * 10;
}

/**
 * 根据活跃度计算等级
 * @param {number} activity - 活跃度
 * @returns {number} 等级
 */
function calculateLevel(activity) {
  if (activity <= 0) return 1;
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
 * 生成等级徽章HTML
 * @param {number} level - 等级
 * @param {boolean} showTitle - 是否显示称号
 * @returns {string} HTML字符串
 */
function renderLevelBadge(level, showTitle = false) {
  const color = getLevelColor(level);
  const icon = getLevelIcon(level);
  const title = getLevelTitle(level);
  
  return `
    <div class="level-badge" style="background-color: ${color}; color: ${level <= 10 ? '#000' : '#fff'};">
      <i class="fas ${icon}"></i>
      <span class="level-number">Lv.${level}</span>
      ${showTitle ? `<span class="level-title">${title}</span>` : ''}
    </div>
  `;
}

/**
 * 生成等级进度条HTML
 * @param {number} activity - 当前活跃度
 * @returns {string} HTML字符串
 */
function renderLevelProgressBar(activity) {
  const progress = getLevelProgress(activity);
  
  if (progress.isMaxLevel) {
    return `
      <div class="level-progress">
        <div class="level-progress-info">
          <span class="level-current">Lv.${progress.currentLevel} ${getLevelTitle(progress.currentLevel)}</span>
          <span class="level-max">已满级</span>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: 100%;"></div>
        </div>
        <div class="level-progress-text">
          <span>${activity} 活跃度</span>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="level-progress">
      <div class="level-progress-info">
        <span class="level-current">Lv.${progress.currentLevel} ${getLevelTitle(progress.currentLevel)}</span>
        <span class="level-next">下一级: Lv.${progress.currentLevel + 1}</span>
      </div>
      <div class="level-progress-bar">
        <div class="level-progress-fill" style="width: ${progress.progress}%;"></div>
      </div>
      <div class="level-progress-text">
        <span>${activity} / ${progress.nextLevelActivity} 活跃度</span>
        <span>${progress.progress.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

/**
 * 转义HTML字符
 * @param {string} str - 要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 导出到全局对象（如果需要）
window.levelSystem = {
  calculateLevel,
  getLevelProgress,
  getLevelTitle,
  getLevelColor,
  getLevelIcon,
  renderLevelBadge,
  renderLevelProgressBar,
  escapeHtml
};