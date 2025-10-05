# 校园论坛系统

一个功能完整的校园论坛系统，专为学生社区设计，支持用户注册、发帖、评论、点赞、图片上传等功能。

## 项目简介

这是一个基于 Node.js + Express 的校园论坛系统，具有以下特点：

- **用户系统**: 支持QQ号注册登录，包含学校、年级、班级信息
- **帖子管理**: 发布、浏览、点赞、评论帖子
- **匿名功能**: 支持匿名发帖和评论
- **图片上传**: 支持多图片上传，自动生成预览
- **管理员功能**: 帖子管理、用户管理、数据统计
- **响应式设计**: 适配各种设备屏幕

## 技术栈

### 后端
- **Node.js**: 运行时环境
- **Express.js**: Web框架
- **bcryptjs**: 密码加密
- **multer**: 文件上传处理
- **uuid**: 唯一标识符生成
- **cors**: 跨域支持

### 前端
- **原生HTML/CSS/JavaScript**: 无框架依赖
- **Font Awesome**: 图标库
- **响应式设计**: 适配移动端

## 项目结构

```
school-forum/
├── server.js              # 主服务器文件
├── package.json           # 项目配置和依赖
├── package-lock.json      # 依赖锁文件
├── README.md              # 项目说明文档
├── data/                  # 数据存储目录
│   ├── users.json         # 用户数据
│   ├── posts.json         # 帖子数据
│   ├── banned_users.json  # 封禁用户数据
│   └── deleted_posts.json # 删除帖子备份
└── public/                # 前端静态文件
    ├── index.html         # 主页面
    ├── login.html         # 登录页面
    ├── admin.html         # 管理员页面
    ├── unauthorized.html  # 无权限页面
    ├── style.css          # 样式文件
    └── js/                # JavaScript文件
        ├── main.js        # 主逻辑
        ├── auth.js        # 认证相关
        ├── user.js        # 用户管理
        ├── posts.js       # 帖子功能
        ├── comments.js    # 评论功能
        ├── stats.js       # 统计功能
        ├── admin.js       # 管理员功能
        └── utils.js       # 工具函数
```

## 功能特性

### 用户功能
- ✅ 用户注册（QQ号、用户名、密码、学校、入学年份、班级）
- ✅ 用户登录（支持自动登录）
- ✅ 匿名发帖和评论
- ✅ 帖子点赞和取消点赞
- ✅ 图片上传和预览
- ✅ 个人资料查看和编辑
- ✅ 密码修改

### 管理员功能
- ✅ 帖子管理（查看、删除）
- ✅ 用户管理（查看、封禁、解封）
- ✅ 数据统计（用户活跃度、帖子统计）
- ✅ 搜索功能（用户、帖子）
- ✅ 封禁记录管理

### 系统特性
- ✅ 响应式设计
- ✅ 数据验证和错误处理
- ✅ 自动年级计算
- ✅ 分页加载
- ✅ 实时统计
- ✅ 文件上传限制

## 安装部署

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

### 步骤1: 下载项目
```bash
# 克隆项目或下载压缩包
# 进入项目目录
cd school-forum
```

### 步骤2: 安装依赖
```bash
# 使用npm
npm install

# 或使用yarn
yarn install
```

### 步骤3: 配置管理员
在 `server.js` 文件的第3行附近，找到管理员配置：
```javascript
const ADMIN_USERS = [
  '1635075096', // 替换为你的QQ号
  // 可以添加更多管理员QQ号或用户ID
];
```
将 `'1635075096'` 替换为你自己的QQ号，或者添加其他管理员用户的QQ号或用户ID。

### 步骤4: 启动服务
```bash
# 开发环境启动
npm start

# 或直接运行
node server.js
```

### 步骤5: 访问系统
服务器启动后，访问以下地址：
- 用户界面: http://localhost:3000
- 管理员界面: http://localhost:3000/admin.html

## 端口配置

默认端口为3000，如需修改端口，可以通过环境变量设置：

```bash
# Linux/macOS
export PORT=8080
npm start

# Windows (PowerShell)
$env:PORT=8080
npm start

# 或者直接修改 server.js 中的 PORT 常量
```

## 数据存储

系统使用 JSON 文件存储数据：
- `data/users.json`: 用户信息
- `data/posts.json`: 帖子数据
- `data/banned_users.json`: 封禁用户记录
- `data/deleted_posts.json`: 删除帖子备份

首次启动时会自动创建这些文件。

## 管理员功能说明

### 管理员权限
- 只有配置在 `ADMIN_USERS` 数组中的用户才能访问管理员功能
- 管理员可以：
  - 查看所有帖子（包括已删除的）
  - 永久删除帖子和评论
  - 封禁和解封用户
  - 查看详细统计数据
  - 管理用户信息

### 管理员界面访问
访问 `http://localhost:3000/admin.html`，使用管理员账号登录即可进入管理员界面。

## API接口

### 用户相关
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `GET /users/:id` - 获取用户信息
- `PUT /users/:id` - 修改用户资料

### 帖子相关
- `GET /posts` - 获取帖子列表（支持分页和搜索）
- `POST /posts` - 发布新帖子
- `GET /posts/:id` - 获取帖子详情
- `POST /posts/:id/like` - 点赞/取消点赞
- `POST /posts/:id/comments` - 添加评论
- `DELETE /posts/:postId/comments/:commentId` - 删除评论

### 统计相关
- `GET /stats` - 获取论坛统计数据

### 管理员相关
- `GET /admin/posts` - 获取所有帖子（管理员）
- `DELETE /admin/posts/:id` - 永久删除帖子
- `GET /admin/users` - 获取所有用户
- `POST /admin/users/:id/ban` - 封禁用户
- `POST /admin/users/:id/unban` - 解封用户
- `GET /admin/stats` - 获取详细统计数据
- `GET /admin/recent-activity` - 获取最近活动

## 安全特性

- 密码使用 bcryptjs 加密存储
- 文件上传类型和大小限制
- 输入数据验证和清理
- 管理员权限验证
- 用户状态检查

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 修改端口号
   export PORT=8080
   npm start
   ```

2. **图片上传失败**
   - 检查 `public/images/` 目录权限
   - 确保磁盘空间充足
   - 检查文件大小限制（最大10MB）

3. **数据文件损坏**
   - 系统会自动尝试修复损坏的JSON文件
   - 备份文件位于 `data/` 目录

4. **管理员权限问题**
   - 确认 `ADMIN_USERS` 配置正确
   - 使用正确的QQ号或用户ID登录

### 日志查看
服务器启动后会显示以下信息：
```
服务器运行中: http://localhost:3000
数据目录: /path/to/data/
图片目录: /path/to/public/images/
```

## 开发说明

### 扩展功能建议
- 添加数据库支持（MySQL/MongoDB）
- 实现实时通知功能
- 添加文件下载功能
- 支持表情包和富文本编辑
- 添加私信系统

### 代码结构
- 前端使用原生JavaScript，便于理解和修改
- 后端采用模块化设计，便于扩展
- 统一错误处理和响应格式

## 许可证

本项目仅供学习和教育用途。