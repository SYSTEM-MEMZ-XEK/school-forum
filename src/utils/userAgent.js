/**
 * User-Agent 轻量解析（无第三方依赖）
 * 用于 IP 访问统计中识别访问来源：浏览器（含名称/系统/移动端）或安卓客户端
 */

/**
 * 解析 User-Agent
 * @param {string} ua - User-Agent 字符串（可能为 undefined/null）
 * @returns {object} { source, browser, os, device, raw }
 *   - source: '安卓客户端' | '浏览器' | '未知'
 *   - browser: 浏览器名称（Chrome/Edge/Firefox/Safari/微信/App 等）
 *   - os: 操作系统（Windows/Android/iOS/macOS/Linux/未知）
 *   - device: 展示用描述（如 '桌面·Chrome·Windows'）
 */
function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { source: '未知', browser: '-', os: '-', device: '未知', raw: '' };
  }

  const raw = ua;
  const lower = ua.toLowerCase();

  // 安卓客户端：ApiClient 使用 OkHttp，UA 必然包含 okhttp
  if (lower.includes('okhttp')) {
    let os = 'Android';
    if (lower.includes('android')) {
      const match = ua.match(/Android\s*([\d.]+)/i);
      if (match) os = `Android ${match[1]}`;
    }
    return { source: '安卓客户端', browser: 'App', os, device: `安卓客户端 (${os})`, raw };
  }

  // 浏览器识别
  let browser = '浏览器';
  if (lower.includes('micromessenger')) {
    browser = '微信浏览器';
  } else if (lower.includes('edg/') || lower.includes('edge/')) {
    browser = 'Edge';
  } else if (lower.includes('chrome') && !lower.includes('edg')) {
    browser = 'Chrome';
  } else if (lower.includes('firefox')) {
    browser = 'Firefox';
  } else if (lower.includes('safari') && !lower.includes('chrome')) {
    browser = 'Safari';
  } else if (lower.includes('opera') || lower.includes('opr/')) {
    browser = 'Opera';
  } else if (lower.includes('quark')) {
    browser = '夸克浏览器';
  } else if (lower.includes('ucbrowser')) {
    browser = 'UC浏览器';
  } else if (lower.includes('baiduboxapp')) {
    browser = '百度浏览器';
  } else if (lower.includes('360se')) {
    browser = '360浏览器';
  }

  // 操作系统识别
  let os = '未知';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('android')) {
    os = 'Android';
    const match = ua.match(/Android\s*([\d.]+)/i);
    if (match) os = `Android ${match[1]}`;
  } else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) {
    os = 'iOS';
    if (lower.includes('iphone')) os = 'iPhone';
    else if (lower.includes('ipad')) os = 'iPad';
  } else if (lower.includes('mac os')) {
    os = 'macOS';
  } else if (lower.includes('linux')) {
    os = 'Linux';
  }

  // 移动端判断
  const isMobile = lower.includes('mobile') || lower.includes('iphone') || lower.includes('android');
  const device = isMobile ? `移动端·${browser}·${os}` : `桌面·${browser}·${os}`;

  return { source: '浏览器', browser, os, device, raw };
}

module.exports = { parseUserAgent };
