校园论坛 - 开源校园交流平台

校园论坛是一个专为中学生设计的开源交流平台，旨在为同学、老师和校友提供一个安全、便捷的校园信息分享和社交平台。通过简洁的界面和实用的功能，帮助校园社区成员更好地连接和交流。

✨ 功能特点

• 用户系统

  • QQ号注册/登录

  • 个人信息管理

  • 年级自动计算（基于入学年份）

• 内容分享

  • 发布校园动态和问题

  • 匿名发帖功能

  • 点赞和评论互动

• 校园社区

  • 按学校和班级分类

  • 同学互认功能

  • 校园活动公告

• 数据统计

  • 实时用户和内容统计

  • 每日发帖量监控

  • 热门内容分析

• 管理功能

  • 内容审核机制

  • 用户管理

  • 数据备份与恢复

🚀 技术栈

后端

• Node.js (v18+)

• Express.js - Web框架

• UUID - 唯一ID生成

• 文件存储 - JSON文件存储数据

前端

• HTML5/CSS3 - 响应式设计

• JavaScript (ES6+) - 交互逻辑

• Font Awesome - 图标库

• CSS变量 - 主题管理

🛠 安装指南

前提条件

• Node.js v18+

• npm v8+

• 基本终端操作知识

安装步骤

1. 克隆仓库
git clone https://github.com/yourusername/school-forum.git
cd school-forum


2. 安装依赖
npm install


3. 配置数据存储
# 创建数据存储目录（使用绝对路径）
mkdir -p /var/data/school-forum


4. 配置环境
cp .env.example .env

编辑 .env 文件：
PORT=3000
DATA_DIR=/var/data/school-forum


5. 启动应用
npm start


6. 访问应用
打开浏览器访问：

http://localhost:3000


⚙️ 配置选项

环境变量

变量名 默认值 描述

PORT 3000 应用监听端口

DATA_DIR /var/data/school-forum 数据存储目录

学校配置

编辑 backend/server.js 文件中的学校列表：
// 在注册路由中更新学校选项
const schools = [
  "天长中学",
  "天长市炳辉中学",
  "天长市第二中学",
  // 添加更多学校...
];




🤝 贡献指南

我们欢迎并感谢所有形式的贡献！请遵循以下步骤：

1. Fork 本项目仓库
2. 创建新的分支 (git checkout -b feature/your-feature)
3. 提交你的修改 (git commit -am 'Add some feature')
4. 推送到分支 (git push origin feature/your-feature)
5. 创建 Pull Request

校园论坛 - 连接校园，共享知识，创造价值！
