# 校园论坛系统

一个功能完善的校园社区论坛系统，支持多学校、多班级的用户管理和丰富的内容交互功能。

## 项目简介

本系统是一个面向校园用户的开源论坛平台，提供帖子发布、评论互动、用户关注、消息通知、内容收藏等核心功能。支持 Markdown 语法、LaTeX 数学公式渲染和代码高亮显示。

### 技术栈

| 类别 | 技术 |
|-----|------|
| 后端框架 | Node.js + Express |
| 数据库 | MongoDB |
| 缓存 | Redis（可选） |
| 前端 | 原生 HTML/CSS/JavaScript |
| 内容渲染 | Markdown-it + MathJax + Highlight.js |
| 身份验证 | bcryptjs 密码加密 |

### 主要功能

| 功能模块 | 描述 |
|---------|------|
| 用户系统 | 注册登录、个人资料、头像上传、密码修改 |
| 帖子系统 | 发帖、编辑、删除、搜索、浏览量统计 |
| 互动系统 | 点赞、点踩、评论、回复 |
| 社交功能 | 关注用户、粉丝列表、关注动态 |
| 收藏系统 | 收藏帖子、标签分类、批量管理 |
| 消息通知 | 系统通知、评论提醒、已读标记 |
| 管理后台 | 用户管理、帖子审核、日志查看、举报处理 |
| 内容渲染 | Markdown、LaTeX 公式、代码高亮 |

---

## 目录结构

```
school-forum/
├── server.js                    # 服务入口文件
├── package.json                 # 项目依赖配置
├── package-lock.json            # 依赖锁定文件
├── README.md                    # 项目说明文档
├── 校园论坛部署指南.md           # 详细部署指南
│
├── data/                        # ���据目录
│   └── config.json              # 系统配置文件
│
├── public/                      # 静态资源目录
│   ├── index.html               # 首页
│   ├── login.html               # 登录页
│   ├── admin.html               # 管理后台
│   ├── profile.html             # 个人资料页
│   ├── post-detail.html         # 帖子详情页
│   ├── edit-simple.html         # 发帖/编辑页
│   ├── favorites.html           # 收藏页
│   ├── follow-list.html         # 关注/粉丝列表页
│   ├── following.html           # 关注动态页
│   ├── message.html             # 消息通知页
│   ├── settings.html            # 设置页
│   │
│   ├── css/                     # 样式文件
│   │   ├── style.css            # 主样式
│   │   ├── admin.css            # 管理后台样式
│   │   ├── login.css            # 登录页样式
│   │   ├── profile.css          # 个人资料样式
│   │   ├── post-detail.css      # 帖子详情样式
│   │   ├── edit-simple.css      # 编辑页样式
│   │   ├── favorites.css        # 收藏页样式
│   │   ├── follow-list.css      # 关注列表样式
│   │   ├── following.css        # 关注动态样式
│   │   ├── message.css          # 消息页样式
│   │   ├── settings.css         # 设置页样式
│   │   ├── error-styles.css     # 错误页样式
│   │   └── console-logs-enhanced.css
│   │
│   ├── js/                      # 前端脚本
│   │   ├── main.js              # 主逻辑
│   │   ├── auth.js              # 认证相关
│   │   ├── user.js              # 用户模块
│   │   ├── posts.js             # 帖子模块
│   │   ├── post-detail.js       # 帖子详情
│   │   ├── comments.js          # 评论模块
│   │   ├── edit-simple.js       # 编辑功能
│   │   ├── profile.js           # 个人资料
│   │   ├── favorites.js         # 收藏功能
│   │   ├── follow-list.js       # 关注列表
│   │   ├── following.js         # 关注动态
│   │   ├── message.js           # 消息通知
│   │   ├── settings.js          # 设置功能
│   │   ├── admin.js             # 管理后台
│   │   ├── stats.js             # 统计数据
│   │   └── utils.js             # 工具函数
│   │
│   ├── images/                  # 图片资源
│   │   ├── logo.svg             # 网站Logo
│   │   ├── default-avatar.svg   # 默认头像
│   │   └── avatars/             # 用户头像存储
│   │
│   ├── errors/                  # 错误页面
│   │   ├── 403.html             # 无权限页面
│   │   ├── 404.html             # 未找到页面
│   │   └── 502.html             # 服务错误页面
│   │
│   └── libs/                    # 第三方库
│       ├── markdown-it/         # Markdown 渲染
│       ├── mathjax/             # LaTeX 公式渲染
│       ├── katex/               # KaTeX 公式渲染
│       └── highlight.js/        # 代码高亮
│
├── src/                         # 后端源码
│   ├── config/                  # 配置模块
│   │   └── constants.js         # 常量定义
│   │
│   ├── controllers/             # 控制器
│   │   ├── userController.js    # 用户控制器
│   │   ├── postController.js    # 帖子控制器
│   │   ├── followController.js  # 关注控制器
│   │   ├── favoriteController.js# 收藏控制器
│   │   ├── notificationController.js # 通知控制器
│   │   ├── adminController.js   # 管理控制器
│   │   ├── reportController.js  # 举报控制器
│   │   ├── statsController.js   # 统计控制器
│   │   └── configController.js  # 配置控制器
│   │
│   ├── middleware/              # 中间件
│   │   ├── adminAuth.js         # 管理员认证
│   │   └── uploadMiddleware.js  # 文件上传
│   │
│   ├── models/                  # 数据模型
│   │   ├── index.js             # 数据库连接
│   │   ├── User.js              # 用户模型
│   │   ├── Post.js              # 帖子模型
│   │   ├── Follow.js            # 关注模型
│   │   ├── Favorite.js          # 收藏模型
│   │   ├── FavoriteTag.js       # 收藏标签模型
│   │   ├── Notification.js      # 通知模型
│   │   ├── Report.js            # 举报模型
│   │   ├── BannedUser.js        # 封禁用户模型
│   │   └── DeletedPost.js       # 已删帖子模型
│   │
│   ├── routes/                  # 路由定义
│   │   ├── index.js             # 路由汇总
│   │   ├── userRoutes.js        # 用户路由
│   │   ├── postRoutes.js        # 帖子路由
│   │   ├── followRoutes.js      # 关注路由
│   │   ├── favoriteRoutes.js    # 收藏路由
│   │   ├── notificationRoutes.js# 通知路由
│   │   ├── adminRoutes.js       # 管理路由
│   │   ├── reportRoutes.js      # 举报路由
│   │   ├── statsRoutes.js       # 统计路由
│   │   └── configRoutes.js      # 配置路由
│   │
│   └── utils/                   # 工具函数
│       ├── authUtils.js         # 认证工具
│       ├── configUtils.js       # 配置工具
│       ├── dataUtils.js         # 数据工具
│       ├── emailUtils.js        # 邮件工具
│       ├── logger.js            # 日志工具
│       ├── redisUtils.js        # Redis工具
│       └── validationUtils.js   # 验证工具
│
└── node_modules/                # 依赖包
```

---

## API 接口

完整的 API 接口文档请参考 [API.md](./API.md)，包含：

- 所有接口的详细参数说明
- 请求/响应示例
- 数据模型定义
- 错误码说明

### API 接口文档

### 基础接口

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/health` | 健康检查 |
| GET | `/404` | 404 错误页面 |
| GET | `/403` | 403 错误页面 |
| GET | `/502` | 502 错误页面 |

---

### 用户模块

#### 认证相关

| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/register` | 用户注册 |
| POST | `/login` | 用户登录 |
| POST | `/auth/verify` | 验证登录状态 |
| POST | `/send-verification-code` | 发送注册验证码 |
| POST | `/send-login-verification-code` | 发送登录验证码 |
| POST | `/send-password-change-code` | 发送密码修改验证码 |
| POST | `/verify-password-change-code` | 验证密码修改验证码 |

#### 用户资料

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/users/:id` | 获取用户资料 |
| PUT | `/users/:id` | 修改用户资料 |
| PUT | `/users/:id/settings` | 更新用户设置 |
| POST | `/users/:id/avatar` | 上传头像 |
| DELETE | `/users/:id/avatar` | 删除头像 |

---

### 帖子模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/posts` | 获取帖子列表（支持分页和搜索） |
| POST | `/posts` | 发布新帖子 |
| GET | `/posts/:id` | 获取帖子详情 |
| PUT | `/posts/:id` | 编辑帖子 |
| DELETE | `/posts/:id` | 删除帖子 |
| POST | `/posts/:id/view` | 增加浏览量 |
| POST | `/posts/:id/like` | 点赞帖子 |
| POST | `/posts/:id/dislike` | 点踩帖子 |

#### 评论相关

| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/posts/:id/comments` | 添加评论 |
| POST | `/posts/:id/comments/:commentId/replies` | 回复评论 |
| DELETE | `/posts/:id/comments/:commentId` | 删除评论 |

---

### 关注模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/follow` | 关注用户 |
| DELETE | `/follow` | 取消关注 |
| GET | `/follow/status` | 检查关注状态 |
| GET | `/follow/stats/:userId` | 获取关注/粉丝数 |
| GET | `/follow/new-posts/:userId` | 获取关注用户新帖子数 |
| POST | `/follow/mark-viewed` | 标记已查看关注动态 |
| GET | `/following/:userId` | 获取关注列表 |
| GET | `/followers/:userId` | 获取粉丝列表 |
| GET | `/following/posts/:userId` | 获取关注用户的帖子 |

---

### 收藏模块

#### 收藏操作

| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/favorites/:postId` | 收藏帖子 |
| DELETE | `/favorites/:postId` | 取消收藏 |
| GET | `/favorites/:postId/check` | 检查是否已收藏 |
| PUT | `/favorites/:postId/tag` | 更新收藏标签 |

#### 收藏列表

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/favorites/user/:userId` | 获取用户收藏列表 |
| GET | `/favorites/user/:userId/count` | 获取收藏数量 |

#### 批量操作

| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/favorites/batch/delete` | 批量删除收藏 |
| POST | `/favorites/batch/move` | 批量移动到标签 |

#### 标签管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/favorites/tags/:userId` | 获取用户标签 |
| POST | `/favorites/tags` | 创建标签 |
| PUT | `/favorites/tags/:tagId` | 更新标签 |
| DELETE | `/favorites/tags/:tagId` | 删除标签 |
| PUT | `/favorites/tags/order` | 更新标签排序 |

---

### 通知模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/notifications` | 获取通知列表 |
| POST | `/notifications/:id/read` | 标记单条已读 |
| POST | `/notifications/read-all` | 标记全部已读 |

---

### 举报模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/reports/types` | 获取举报类型 |
| POST | `/reports` | 提交举报 |
| GET | `/reports/user/:userId` | 获取用户举报历史 |

---

### 统计模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/stats` | 获取统计数据 |
| GET | `/search` | 搜索帖子/用户 |

---

### 配置模块

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/schools` | 获取学校列表 |
| GET | `/public` | 获取公开配置 |

---

### 管理后台模块

> 以下接口需要管理员权限

#### 帖子管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/posts` | 获取帖子列表（含已删除） |
| DELETE | `/admin/posts/:id` | 永久删除帖子 |

#### 用户管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/users` | 获取所有用户 |
| GET | `/admin/banned-users` | 获取封禁用户列表 |
| POST | `/admin/users/:id/ban` | 封禁用户 |
| POST | `/admin/users/:id/unban` | 解封用户 |

#### 评论管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/comments` | 获取所有评论 |
| DELETE | `/admin/comments/:id` | 删除评论 |

#### 举报管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/reports` | 获取举报列表 |
| GET | `/admin/reports/stats` | 获取举报统计 |
| POST | `/admin/reports/:reportId/process` | 处理举报 |

#### 统计与日志

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/stats` | 获取详细统计 |
| GET | `/admin/recent-activity` | 获取最近活动 |
| GET | `/admin/logs` | 获取日志 |
| GET | `/admin/logs/dates` | 获取日志日期列表 |
| DELETE | `/admin/logs` | 清空日志 |
| DELETE | `/admin/logs/date` | 删除指定日期日志 |

#### 系统配置

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/config` | 获取配置 |
| PUT | `/admin/config` | 更新配置 |

#### 管理员管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/admin/admins` | 获取管理员列表 |
| POST | `/admin/admins` | 添加管理员 |
| DELETE | `/admin/admins` | 删除管理员 |

---

## 配置说明

项目配置文件位于 `data/config.json`，首次运行时会自动生成默认配置。

### 完整配置示例

```json
{
  "adminUsers": ["1635075096"],
  "mongodb": {
    "uri": "mongodb://localhost:27017/school-forum",
    "username": "",
    "password": "",
    "authSource": "admin"
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": "",
    "db": 0
  },
  "upload": {
    "allowedTypes": [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp"
    ],
    "maxFileSize": 33554432,
    "maxFiles": 32
  },
  "password": {
    "saltRounds": 10
  },
  "pagination": {
    "defaultPage": 1,
    "defaultLimit": 100
  },
  "contentLimits": {
    "post": 10000,
    "comment": 500,
    "username": { "min": 2, "max": 20 },
    "qq": { "min": 5, "max": 15 },
    "password": { "min": 6 }
  },
  "schools": [
    {
      "id": "TCZX",
      "name": "天长中学",
      "classInfo": [
        { "year": 2024, "classCount": 25 }
      ]
    }
  ]
}
```

### 配置项说明

| 配置项 | 类型 | 说明 |
|-------|------|------|
| `adminUsers` | `string[]` | 管理员 QQ 号列表 |
| `mongodb.uri` | `string` | MongoDB 连接字符串 |
| `mongodb.username` | `string` | MongoDB 用户名（可选，用于认证） |
| `mongodb.password` | `string` | MongoDB 密码（可选，用于认证） |
| `mongodb.authSource` | `string` | MongoDB 认证数据库（默认 admin） |
| `redis.host` | `string` | Redis 服务器地址 |
| `redis.port` | `number` | Redis 端口 |
| `redis.password` | `string` | Redis 密码（无密码留空） |
| `redis.db` | `number` | Redis 数据库编号 |
| `upload.allowedTypes` | `string[]` | 允许上传的文件类型 |
| `upload.maxFileSize` | `number` | 单文件最大字节数 |
| `upload.maxFiles` | `number` | 单次最多上传文件数 |
| `password.saltRounds` | `number` | bcrypt 加密轮数 |
| `pagination.defaultPage` | `number` | 默认页码 |
| `pagination.defaultLimit` | `number` | 默认每页数量 |
| `contentLimits.post` | `number` | 帖子最大长度 |
| `contentLimits.comment` | `number` | 评论最大长度 |
| `contentLimits.username` | `object` | 用户名长度范围 |
| `contentLimits.qq` | `object` | QQ号长度范围 |
| `contentLimits.password` | `object` | 密码最小长度 |
| `schools` | `array` | 学校配置列表 |

### 学校配置说明

```json
{
  "id": "TCZX",
  "name": "天长中学",
  "classInfo": [
    { "year": 2024, "classCount": 25 }
  ]
}
```

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 学校唯一标识 |
| `name` | `string` | 学校名称 |
| `classInfo` | `array` | 年级信息 |
| `classInfo[].year` | `number` | 入学年份 |
| `classInfo[].classCount` | `number` | 该年级班级数量 |

---

## 快速开始

### 环境要求

| 软件 | 版本要求 |
|-----|---------|
| Node.js | 18+ |
| MongoDB | 4.4+ |
| Redis | 可选 |

### 安装运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

服务启动后访问 `http://localhost:3000` 即可进入论坛。

### 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| `PORT` | 服务端口 | `3000` |
| `MONGODB_URI` | MongoDB 连接字符串 | 配置文件中的值 |
| `MONGODB_USERNAME` | MongoDB 用户名 | 配置文件中的值 |
| `MONGODB_PASSWORD` | MongoDB 密码 | 配置文件中的值 |
| `MONGODB_AUTHSOURCE` | MongoDB 认证数据库 | `admin` |

---

## 部署说明

详细的服务器部署步骤请参考 [校园论坛部署指南](./DeploymentGuide.md)，包含：

- Ubuntu 服务器配置
- Node.js / MongoDB / Redis 安装（使用清华镜像加速）
- PM2 进程管理
- 防火墙配置
- 常见问题排查

---

## 许可证

MIT License