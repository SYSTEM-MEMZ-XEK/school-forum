# 校园论坛 (School Forum)

一个功能完整的校园论坛系统，支持用户注册登录、帖子发布、评论互动、等级系统、管理员管理等功能。

## 功能特性

### 用户功能
- 用户注册与登录（支持 QQ 号作为账号）
- 个人资料管理（头像、昵称、简介等）
- 用户等级系统（基于发帖和评论数量）
- 消息通知系统
- 密码修改
- 账号设置

### 帖子功能
- 帖子发布与编辑（支持 Markdown 和 LaTeX 数学公式）
- 代码高亮显示（支持多种编程语言）
- 图片上传（支持 JPEG、PNG、GIF、WebP 格式）
- 帖子评论
- 帖子搜索
- 帖子浏览统计

### 管理员功能
- 用户管理（查看、封禁、解封用户）
- 帖子管理（查看、删除、恢复帖子）
- 已删除帖子管理
- 封禁用户管理
- 系统统计（用户数、帖子数、评论数等）
- 配置管理（管理员账号、上传配置等）

### 其他功能
- 自定义错误页面（403、404、502）
- 请求日志记录
- 文件上传大小限制
- 内容长度限制

## 技术栈

### 后端
- Node.js
- Express.js
- bcryptjs（密码加密）
- multer（文件上传）
- uuid（唯一标识符生成）

### 前端
- HTML5
- CSS3
- JavaScript（原生）
- Bootstrap（UI 框架）

### 功能库
- markdown-it（Markdown 解析）
- highlight.js（代码高亮）
- KaTeX（LaTeX 数学公式渲染）
- MathJax（数学公式渲染）

## 项目结构

```
school-forum/
├── data/                          # 数据文件目录
│   ├── users.json                # 用户数据
│   ├── posts.json                # 帖子数据
│   ├── notifications.json        # 通知数据
│   ├── deleted_posts.json        # 已删除帖子
│   ├── banned_users.json         # 封禁用户
│   ├── config.json               # 系统配置
│   └── server-*.log              # 服务器日志
├── public/                        # 静态资源
│   ├── *.html                    # 前端页面
│   ├── css/                      # 样式文件
│   ├── js/                       # JavaScript 文件
│   ├── libs/                     # 第三方库
│   │   ├── highlight.js/        # 代码高亮库
│   │   ├── katex/               # 数学公式库
│   │   ├── markdown-it/         # Markdown 解析库
│   │   └── mathjax/             # 数学公式渲染库
│   ├── images/                   # 图片资源
│   │   ├── avatars/             # 用户头像
│   │   └── default-avatar.svg   # 默认头像
│   └── errors/                   # 错误页面
│       ├── 403.html
│       ├── 404.html
│       └── 502.html
├── src/                           # 源代码
│   ├── config/                   # 配置
│   │   └── constants.js         # 常量配置
│   ├── controllers/              # 控制器
│   │   ├── adminController.js   # 管理员控制器
│   │   ├── configController.js  # 配置控制器
│   │   ├── notificationController.js # 通知控制器
│   │   ├── postController.js    # 帖子控制器
│   │   ├── statsController.js   # 统计控制器
│   │   └── userController.js    # 用户控制器
│   ├── middleware/               # 中间件
│   │   ├── adminAuth.js         # 管理员认证
│   │   └── uploadMiddleware.js  # 文件上传
│   ├── routes/                   # 路由
│   │   ├── adminRoutes.js       # 管理员路由
│   │   ├── configRoutes.js      # 配置路由
│   │   ├── notificationRoutes.js # 通知路由
│   │   ├── postRoutes.js        # 帖子路由
│   │   ├── statsRoutes.js       # 统计路由
│   │   ├── userRoutes.js        # 用户路由
│   │   └── index.js             # 路由入口
│   └── utils/                    # 工具函数
│       ├── authUtils.js         # 认证工具
│       ├── configUtils.js       # 配置工具
│       ├── dataUtils.js         # 数据工具
│       ├── levelSystem.js       # 等级系统
│       ├── logger.js            # 日志工具
│       └── validationUtils.js   # 验证工具
├── package.json                  # 项目配置
├── package-lock.json             # 依赖锁定
└── server.js                     # 服务器入口
```

## 安装与运行

### 环境要求
- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 安装步骤

1. 克隆或下载项目

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

4. 访问论坛
```
http://localhost:3000
```

## 配置说明

系统配置位于 `data/config.json` 文件中，包含以下配置项：

### 管理员配置
```json
"adminUsers": ["1145141919810"]
```
设置管理员 QQ 号列表

### 文件上传配置
```json
"upload": {
  "allowedTypes": ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  "maxFileSize": 33554432,
  "maxFiles": 32
}
```
- `allowedTypes`: 允许的文件类型
- `maxFileSize`: 最大文件大小（字节）
- `maxFiles`: 最大文件数量

### 密码配置
```json
"password": {
  "saltRounds": 10
}
```
密码加密的 salt rounds

### 分页配置
```json
"pagination": {
  "defaultPage": 1,
  "defaultLimit": 999999
}
```
默认分页参数

### 内容长度限制
```json
"contentLimits": {
  "post": 10000,
  "comment": 500,
  "username": {
    "min": 2,
    "max": 20
  },
  "qq": {
    "min": 5,
    "max": 15
  },
  "password": {
    "min": 6
  }
}
```
各种内容长度的限制

## API 路由

### 用户路由
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `POST /api/users/change-password` - 修改密码
- `GET /api/users/:id` - 获取指定用户信息

### 帖子路由
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 创建帖子
- `GET /api/posts/:id` - 获取帖子详情
- `PUT /api/posts/:id` - 更新帖子
- `DELETE /api/posts/:id` - 删除帖子
- `POST /api/posts/:id/comments` - 添加评论

### 管理员路由
- `GET /api/admin/users` - 获取所有用户
- `POST /api/admin/users/:id/ban` - 封禁用户
- `POST /api/admin/users/:id/unban` - 解封用户
- `GET /api/admin/posts` - 获取所有帖子
- `DELETE /api/admin/posts/:id` - 删除帖子
- `GET /api/admin/deleted-posts` - 获取已删除帖子
- `POST /api/admin/deleted-posts/:id/restore` - 恢复帖子
- `GET /api/admin/banned-users` - 获取封禁用户列表

### 统计路由
- `GET /api/stats` - 获取系统统计信息

### 通知路由
- `GET /api/notifications` - 获取通知列表
- `PUT /api/notifications/:id/read` - 标记通知为已读

### 配置路由
- `GET /api/config` - 获取系统配置
- `PUT /api/config` - 更新系统配置

## 数据存储

系统使用 JSON 文件存储数据，数据文件位于 `data/` 目录：

- `users.json` - 用户数据
- `posts.json` - 帖子数据
- `notifications.json` - 通知数据
- `deleted_posts.json` - 已删除帖子
- `banned_users.json` - 封禁用户
- `config.json` - 系统配置

## 安全特性

- 密码使用 bcryptjs 加密存储
- 管理员操作需要身份验证
- 文件上传类型和大小限制
- 内容长度限制
- 请求日志记录
- 错误处理中间件

## 浏览器支持

- Chrome（推荐）
- Firefox
- Safari
- Edge

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件

---

**注意**: 本系统仅供学习和交流使用，请勿用于非法用途。