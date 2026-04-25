@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

::: =======================================================
::: 校园论坛系统 - Windows 一键部署脚本
::: =======================================================

title 校园论坛部署脚本

echo.
echo =======================================================
echo            校园论坛系统 - Windows 部署向导
echo =======================================================
echo.

::: 检查管理员权限（某些操作需要）
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [提示] 建议以管理员身份运行以获得最佳体验
    echo.
)

::: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

::: =======================================================
::: 步骤1: 检查 Node.js
::: =======================================================
echo [步骤 1/5] 检查 Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo   [错误] 未找到 Node.js，请先安装
    echo   下载地址: https://nodejs.org/
    echo   推荐安装 Node.js 20 LTS 或更高版本
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js 版本: !NODE_VERSION!

::: 检查 Node.js 版本（需要 18+）
set "NODE_MAJOR=!NODE_VERSION:~1,2!"
if !NODE_MAJOR! LSS 18 (
    echo   [警告] Node.js 版本过低，建议升级到 18 或更高版本
)

::: =======================================================
::: 步骤2: 检查 MongoDB
::: =======================================================
echo.
echo [步骤 2/5] 检查 MongoDB...

::: 检查 MongoDB 是否安装
where mongod >nul 2>&1
if errorlevel 1 (
    echo   [警告] 未在 PATH 中找到 MongoDB
    echo   选项:
    echo     1. 安装 MongoDB Community Server
    echo     2. 使用 MongoDB Atlas 云数据库
    echo     3. 跳过（稍后配置）
    echo.
    set /p MONGODB_CHOICE="请选择 (1/2/3): "
    if "!MONGODB_CHOICE!"=="2" (
        echo   请在部署后修改 .env 文件中的 MONGODB_URI
    )
) else (
    for /f "delims=" %%v in ('mongod --version ^| findstr "db version"') do set MONGO_VERSION=%%v
    echo   MongoDB: !MONGO_VERSION!
)

::: =======================================================
::: 步骤3: 安装依赖
::: =======================================================
echo.
echo [步骤 3/5] 安装项目依赖...
cd /d "%SCRIPT_DIR%"

if exist "node_modules" (
    echo   检测到已有依赖，是否重新安装？
    echo   (输入 y 重新安装，其他跳过)
    set /p REINSTALL="请选择: "
    if /i "!REINSTALL!"=="y" (
        echo   正在重新安装依赖...
        call npm install
    ) else (
        echo   跳过依赖安装
    )
) else (
    echo   正在安装依赖（首次安装可能需要几分钟）...
    call npm install
)

if errorlevel 1 (
    echo   [错误] 依赖安装失败
    pause
    exit /b 1
)
echo   依赖安装完成

::: =======================================================
::: 步骤4: 配置文件处理
::: =======================================================
echo.
echo [步骤 4/5] 处理配置文件...

::: 创建数据目录
set "DATA_DIR=%SCRIPT_DIR%\data"
if not exist "!DATA_DIR!" mkdir "!DATA_DIR!"
echo   数据目录: !DATA_DIR!

::: .env 配置文件处理
if exist ".env" (
    echo   [跳过] 检测到已有 .env 配置文件，保留现有配置
) else (
    echo   创建 .env 配置文件...
    (
    echo # 校园论坛环境配置文件
    echo # ================================
    echo.
    echo # 服务端口
    echo PORT=3000
    echo NODE_ENV=production
    echo.
    echo # MongoDB 配置
    echo MONGODB_URI=mongodb://localhost:27017/school-forum
    echo.
    echo # Redis 配置
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo.
    echo # JWT 密钥（请修改为随机字符串）
    echo JWT_SECRET=change-this-to-a-random-string
    echo JWT_EXPIRES_IN=7d
    echo JWT_REFRESH_EXPIRES_IN=30d
    echo.
    echo # 管理员 JWT 密钥
    echo ADMIN_JWT_SECRET=change-this-admin-secret
    echo ADMIN_JWT_EXPIRES_IN=24h
    echo.
    echo # SMTP 邮件配置
    echo SMTP_HOST=smtp.example.com
    echo SMTP_PORT=465
    echo SMTP_SECURE=true
    echo SMTP_USER=your-email@example.com
    echo SMTP_PASS=your-password
    echo.
    echo # CORS 配置
    echo CORS_ORIGIN=localhost
    ) > .env
    echo   [创建] .env 配置文件已创建，请编辑填入正确配置
)

::: data/config.json 配置文件处理
if exist "!DATA_DIR!\config.json" (
    echo   [跳过] 检测到已有 data\config.json，保留现有配置
) else (
    echo   创建 data\config.json 配置文件...
    (
    echo {
    echo   "adminUsers": [],
    echo   "mongodb": {
    echo     "uri": "mongodb://localhost:27017/school-forum"
    echo   },
    echo   "redis": {
    echo     "host": "localhost",
    echo     "port": 6379
    echo   },
    echo   "upload": {
    echo     "allowedTypes": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    echo     "maxFileSize": 33554432,
    echo     "maxFiles": 32
    echo   },
    echo   "password": {
    echo     "saltRounds": 10
    echo   },
    echo   "pagination": {
    echo     "defaultPage": 1,
    echo     "defaultLimit": 100
    echo   },
    echo   "contentLimits": {
    echo     "post": 10000,
    echo     "comment": 500,
    echo     "username": { "min": 2, "max": 20 },
    echo     "qq": { "min": 5, "max": 15 },
    echo     "password": { "min": 6 }
    echo   },
    echo   "schools": []
    echo }
    ) > "!DATA_DIR!\config.json"
    echo   [创建] data\config.json 已创建
    echo   [重要] 请添加管理员 QQ 号到 adminUsers 数组中！
)

::: =======================================================
::: 步骤5: 启动服务
::: =======================================================
echo.
echo [步骤 5/5] 准备启动服务...
echo.
echo =======================================================
echo                  部署完成！
echo =======================================================
echo.
echo 已完成:
echo   ✓ Node.js 环境检查
echo   ✓ MongoDB 环境检查
echo   ✓ 项目依赖安装
echo   ✓ 配置文件处理
echo.
echo 下一步:
echo   1. 如需修改配置，请编辑 .env 和 data\config.json
echo   2. 确保 MongoDB 服务已启动
echo   3. 运行 npm start 或 start.bat 启动论坛
echo.
echo 是否现在启动论坛？
echo.
set /p START_NOW="输入 y 启动，其他退出: "

if /i "!START_NOW!"=="y" (
    echo.
    echo 正在启动服务...
    echo.
    call npm start
) else (
    echo.
    echo 部署完成，祝使用愉快！
    echo.
)

pause
