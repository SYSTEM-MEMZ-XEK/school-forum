const { validateAdminPermission } = require('../utils/validationUtils');

// 管理员权限验证中间件
function requireAdmin(req, res, next) {
  try {
    // 从查询参数或请求体中获取 adminId
    let adminId = req.body.adminId;
    
    // 如果是 GET 请求，从查询参数中获取
    if (req.method === 'GET' && !adminId) {
      adminId = req.query.adminId;
    }
    
    console.log('管理员权限验证:', { 
      method: req.method, 
      adminId: adminId,
      path: req.path,
      query: req.query,
      body: req.body
    });
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: '未提供管理员身份验证' 
      });
    }
    
    // 验证管理员权限
    const validationResult = validateAdminPermission(adminId);
    
    if (!validationResult.valid) {
      return res.status(403).json({ 
        success: false,
        message: validationResult.message 
      });
    }
    
    console.log('管理员权限验证通过:', validationResult.user.username);
    
    // 权限验证通过
    next();
  } catch (error) {
    console.error('管理员权限验证错误:', error);
    res.status(500).json({ 
      success: false,
      message: '权限验证失败' 
    });
  }
}

module.exports = {
  requireAdmin
};