/**
 * HTML 净化工具
 * 移除 XSS 向量（script 标签、事件处理器、javascript: 链接等）
 * 用于在存储用户内容前做安全过滤
 */

/**
 * 净化用户生成内容，移除危险的 HTML
 * @param {string} content - 原始内容（可能是 Markdown 或 HTML）
 * @returns {string} - 净化后的安全内容
 */
function sanitizeHtml(content) {
  if (!content || typeof content !== 'string') return '';

  let sanitized = content;

  // 1. 移除 <script> 标签及其内容
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<script\b[^>]*\/?>/gi, '');

  // 2. 移除 <iframe>、<object>、<embed> 标签
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/(iframe|object|embed)>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '');

  // 3. 移除事件处理器（on*=）
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // 4. 移除 javascript: 和 data:text/html 协议
  sanitized = sanitized.replace(/(href|src|action|formaction)\s*=\s*["']\s*javascript:/gi, '$1="about:blank"');
  sanitized = sanitized.replace(/(href|src|action|formaction)\s*=\s*["']\s*data:text\/html/gi, '$1="about:blank"');

  // 5. 移除 <style> 标签内的 @import / expression()
  sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  // 6. 移除 <?xml / <!ENTITY 等 XML 注入
  sanitized = sanitized.replace(/<\?xml/gi, '');
  sanitized = sanitized.replace(/<!ENTITY/gi, '');

  // 7. 移除 vbscript: 协议
  sanitized = sanitized.replace(/vbscript:/gi, '');

  return sanitized;
}

module.exports = { sanitizeHtml };
