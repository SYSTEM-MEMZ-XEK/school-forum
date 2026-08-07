/**
 * QQ 互联 OAuth2.0 快捷登录工具
 *
 * 流程（Authorization Code）：
 *   1. getAuthorizeUrl(state) → 前端跳转 QQ 授权页
 *   2. 用户授权 → QQ 回调 redirect_uri 携带 code + state
 *   3. getAccessToken(code) 换取 access_token
 *   4. getOpenId(accessToken) 获取 openid（用户唯一标识）
 *   5. getUserInfo(accessToken, openid) 获取昵称/头像
 *
 * 配置（.env）：
 *   QQ_APP_ID        - QQ 互联应用 AppID
 *   QQ_APP_SECRET    - QQ 互联应用 AppSecret
 *   QQ_REDIRECT_URI  - 授权回调地址（需与 QQ 互联后台配置一致，如
 *                      https://your.domain/api/auth/qq/callback）
 */

const logger = require('./logger');

const QQ_AUTHORIZE_URL = 'https://graph.qq.com/oauth2.0/authorize';
const QQ_TOKEN_URL = 'https://graph.qq.com/oauth2.0/token';
const QQ_OPENID_URL = 'https://graph.qq.com/oauth2.0/me';
const QQ_USERINFO_URL = 'https://graph.qq.com/user/get_user_info';

/**
 * 获取 QQ 互联配置
 */
function getConfig() {
  return {
    appId: process.env.QQ_APP_ID || '',
    appSecret: process.env.QQ_APP_SECRET || '',
    redirectUri: process.env.QQ_REDIRECT_URI || ''
  };
}

/**
 * 是否已配置 QQ 互联
 */
function isConfigured() {
  const { appId, appSecret, redirectUri } = getConfig();
  return !!(appId && appSecret && redirectUri);
}

/**
 * 生成 QQ 授权页面 URL
 * @param {string} state - 防 CSRF 随机串（服务端校验用）
 * @param {string} scope - 授权范围，默认 get_user_info
 */
function getAuthorizeUrl(state, scope = 'get_user_info') {
  const { appId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope
  });
  return `${QQ_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * 用授权码换取 access_token
 * @param {string} code - 授权回调携带的 code（一次性）
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
 */
async function getAccessToken(code) {
  const { appId, appSecret, redirectUri } = getConfig();
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: appId,
    client_secret: appSecret,
    code,
    redirect_uri: redirectUri
  });

  const resp = await fetch(`${QQ_TOKEN_URL}?${params.toString()}`, { method: 'GET' });
  const text = await resp.text();

  // QQ 返回 application/x-www-form-urlencoded：access_token=xxx&expires_in=7776000&refresh_token=yyy
  if (!text.includes('access_token=')) {
    logger.logError('QQ换取access_token失败', { body: text.slice(0, 200) });
    throw new Error('QQ授权码无效或已过期');
  }

  const parsed = Object.fromEntries(new URLSearchParams(text));
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token || '',
    expiresIn: parseInt(parsed.expires_in, 10) || 0
  };
}

/**
 * 获取用户 openid（QQ 用户唯一标识）
 * 注意：QQ 的 /oauth2.0/me 接口返回 JSONP 格式：callback( {"client_id":"...","openid":"..."} );
 * @param {string} accessToken
 * @returns {Promise<string>} openid
 */
async function getOpenId(accessToken) {
  const params = new URLSearchParams({ access_token: accessToken });
  const resp = await fetch(`${QQ_OPENID_URL}?${params.toString()}`, { method: 'GET' });
  const text = await resp.text();

  // 提取 callback( {...} ) 中的 JSON
  const match = text.match(/callback\(\s*(\{[\s\S]*?\})\s*\)/);
  if (!match) {
    logger.logError('QQ获取openid失败', { body: text.slice(0, 200) });
    throw new Error('QQ授权校验失败');
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    logger.logError('QQ openid 解析失败', { body: text.slice(0, 200) });
    throw new Error('QQ授权响应解析失败');
  }

  if (!data.openid) {
    logger.logError('QQ openid 为空', { data });
    throw new Error('QQ授权校验失败');
  }

  return data.openid;
}

/**
 * 获取 QQ 用户信息（昵称/头像等）
 * @param {string} accessToken
 * @param {string} openid
 * @returns {Promise<{openid: string, nickname: string, avatar: string}>}
 */
async function getUserInfo(accessToken, openid) {
  const { appId } = getConfig();
  const params = new URLSearchParams({
    access_token: accessToken,
    oauth_consumer_key: appId,
    openid
  });

  const resp = await fetch(`${QQ_USERINFO_URL}?${params.toString()}`, { method: 'GET' });
  const data = await resp.json().catch(() => null);

  if (!data || data.ret !== 0) {
    logger.logError('QQ获取用户信息失败', { data: data ? { ret: data.ret, msg: data.msg } : '非JSON' });
    throw new Error('QQ用户信息获取失败');
  }

  return {
    openid,
    nickname: data.nickname || '',
    avatar: data.figureurl_qq_2 || data.figureurl_qq_1 || data.figureurl_2 || data.figureurl_1 || '',
    gender: data.gender === '男' ? 'male' : data.gender === '女' ? 'female' : ''
  };
}

/**
 * 一次完成 code → token → openid → 用户信息
 * @param {string} code
 * @returns {Promise<{openid: string, nickname: string, avatar: string, gender: string}>}
 */
async function getQqProfile(code) {
  const { accessToken } = await getAccessToken(code);
  const openid = await getOpenId(accessToken);
  const profile = await getUserInfo(accessToken, openid);
  return profile;
}

module.exports = {
  getConfig,
  isConfigured,
  getAuthorizeUrl,
  getAccessToken,
  getOpenId,
  getUserInfo,
  getQqProfile
};
