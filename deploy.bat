@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title 校园论坛部署向导

:: 检测是否为 CI 环境
if defined CI set PAUSE_MODE=0 & goto :check_admin
set PAUSE_MODE=1

:check_admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [提示] 建议以管理员身份运行以获得最佳体验
    echo.
)

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

:: 显示横幅
echo.
echo =======================================================
echo         校园论坛系统 - Windows 一键部署向导
echo =======================================================
echo.
echo 本脚本将引导您完成论坛的完整配置与部署
echo.

:: 询问是否配置 npm 镜像
set /p USE_MIRROR="是否配置 npm 淘宝镜像加速？(Y/n): "
if /i not "!USE_MIRROR!"=="n" (
    echo 正在配置 npm 镜像...
    call npm config set registry https://registry.npmmirror.com
    echo npm 镜像已设置为淘宝镜像
)

:: =======================================================
:: 步骤1: 检查 Node.js
:: =======================================================
echo.
echo [1/6] 检查 Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo   [错误] 未找到 Node.js，请先安装 Node.js 20 LTS
    echo   下载地址: https://nodejs.org/
    if %PAUSE_MODE%==1 pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js 版本: !NODE_VERSION!
:: 提取主版本号
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION:v=!") do set NODE_MAJOR=%%a
if !NODE_MAJOR! LSS 18 (
    echo   [警告] Node.js 版本低于 18，建议升级
)

:: =======================================================
:: 步骤2: 安装项目依赖
:: =======================================================
echo.
echo [2/6] 安装项目依赖...
if exist "node_modules" (
    set /p REINSTALL="检测到已有依赖，是否重新安装？(y/N): "
    if /i "!REINSTALL!"=="y" (
        echo 正在重新安装依赖...
        call npm install
    ) else (
        echo 跳过依赖安装
    )
) else (
    echo 正在安装依赖（首次安装可能需要几分钟）...
    call npm install
)
if errorlevel 1 (
    echo [错误] 依赖安装失败
    if %PAUSE_MODE%==1 pause
    exit /b 1
)
echo 依赖安装完成

:: =======================================================
:: 步骤3: MongoDB 配置
:: =======================================================
echo.
echo [3/6] MongoDB 配置...
where mongod >nul 2>&1
if errorlevel 1 (
    echo 未检测到本地 MongoDB，请选择：
    echo   1) 跳过（稍后手动配置）
    echo   2) 使用 MongoDB Atlas 云数据库
    echo   3) 安装 MongoDB Community Server
    set /p MONGODB_OPTION="请选择 (1/2/3): "
    if "!MONGODB_OPTION!"=="2" (
        echo 提示：请在部署后修改 .env 中的 MONGODB_URI
    ) else if "!MONGODB_OPTION!"=="3" (
        echo 请在浏览器中访问 https://www.mongodb.com/try/download/community 下载安装
    )
) else (
    echo 已检测到 MongoDB 安装
)

:: =======================================================
:: 步骤4: 交互式配置收集（增加数字校验）
:: =======================================================
echo.
echo [4/6] 交互式配置（可直接回车使用默认值）

:: 端口校验
:input_port
set /p PORT="服务端口 (默认3000): "
if "!PORT!"=="" set PORT=3000
echo !PORT!| findstr /r "^[1-9][0-9]*$" >nul
if errorlevel 1 (
    echo 端口必须是正整数，请重新输入
    goto input_port
)

set /p NODE_ENV="运行环境 (development/production, 默认production): "
if "!NODE_ENV!"=="" set NODE_ENV=production

:: MongoDB 连接
set /p MONGODB_URI="MongoDB 连接字符串 (默认: mongodb://localhost:27017/school-forum): "
if "!MONGODB_URI!"=="" set MONGODB_URI=mongodb://localhost:27017/school-forum
set /p MONGODB_USERNAME="MongoDB 用户名 (若无认证留空): "
set MONGODB_PASSWORD=
if not "!MONGODB_USERNAME!"=="" (
    set /p MONGODB_PASSWORD="MongoDB 密码: "
    set /p MONGODB_AUTHSOURCE="认证数据库 (默认admin): "
    if "!MONGODB_AUTHSOURCE!"=="" set MONGODB_AUTHSOURCE=admin
)

:: Redis 配置
set /p REDIS_HOST="Redis 主机 (默认localhost): "
if "!REDIS_HOST!"=="" set REDIS_HOST=localhost
:input_redis_port
set /p REDIS_PORT="Redis 端口 (默认6379): "
if "!REDIS_PORT!"=="" set REDIS_PORT=6379
echo !REDIS_PORT!| findstr /r "^[1-9][0-9]*$" >nul
if errorlevel 1 (
    echo 端口必须是正整数
    goto input_redis_port
)
set /p REDIS_PASSWORD="Redis 密码 (若无留空): "

:: 自动生成 JWT 密钥
for /f %%i in ('powershell -Command "[Convert]::ToBase64String([Guid]::NewGuid().ToByteArray()) + [Convert]::ToBase64String([Guid]::NewGuid().ToByteArray())"') do set JWT_SECRET=%%i
set ADMIN_JWT_SECRET=!JWT_SECRET!
set /p MANUAL_JWT="是否手动指定 JWT_SECRET？(y/N): "
if /i "!MANUAL_JWT!"=="y" (
    set /p JWT_SECRET="请输入 JWT_SECRET (至少32字符): "
    set /p ADMIN_JWT_SECRET="请输入 ADMIN_JWT_SECRET: "
)

:: 邮件配置
set SMTP_HOST=
set SMTP_PORT=
set SMTP_SECURE=true
set SMTP_USER=
set SMTP_PASS=
echo.
echo 邮件服务配置（可选，留空跳过）
set /p SMTP_HOST="SMTP 服务器 (例如 smtp.163.com): "
if not "!SMTP_HOST!"=="" (
    :input_smtp_port
    set /p SMTP_PORT="SMTP 端口 (默认465): "
    if "!SMTP_PORT!"=="" set SMTP_PORT=465
    echo !SMTP_PORT!| findstr /r "^[1-9][0-9]*$" >nul
    if errorlevel 1 (
        echo 端口必须是数字
        goto input_smtp_port
    )
    set /p SMTP_SECURE="是否 SSL/TLS？(true/false, 默认true): "
    if "!SMTP_SECURE!"=="" set SMTP_SECURE=true
    set /p SMTP_USER="邮箱账号: "
    set /p SMTP_PASS="邮箱授权码/密码: "
)

:: CORS
set /p CORS_ORIGIN="CORS 白名单 (多个用逗号分隔, 默认 http://localhost:3000): "
if "!CORS_ORIGIN!"=="" set CORS_ORIGIN=http://localhost:3000
set /p SERVER_IP="服务器内网IP(例如192.168.2.4,留空自动检测): "
if "!SERVER_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168"') do set SERVER_IP=%%a
    for %%b in (!SERVER_IP!) do set SERVER_IP=%%b
)

:: 管理员 QQ 号（多个）
echo.
echo 管理员配置（输入空行结束）
set ADMIN_USERS=
:admin_loop
set /p QQ="管理员 QQ 号: "
if "!QQ!"=="" goto :admin_done
:: QQ 号校验
echo !QQ!| findstr /r "^[0-9][0-9][0-9][0-9][0-9][0-9]*$" >nul
if errorlevel 1 (
    echo QQ号必须是5-15位数字
    goto admin_loop
)
set ADMIN_USERS=!ADMIN_USERS! "!QQ!"
goto admin_loop
:admin_done
set ADMIN_JSON=[]
if not "!ADMIN_USERS!"=="" (
    for /f "delims=" %%a in ('powershell -Command "'!ADMIN_USERS!' -split ' ' | ConvertTo-Json -Compress"') do set ADMIN_JSON=%%a
) else (
    echo [警告] 未添加任何管理员，请后续编辑 data\config.json
)

:: 学校信息（带数字校验）
echo.
echo 学校配置（按需添加）
set SCHOOLS_ARRAY=
:school_loop
set /p ADD_SCHOOL="是否添加学校信息？(y/N): "
if /i not "!ADD_SCHOOL!"=="y" goto :school_done
set /p SCHOOL_ID="学校 ID (例如 TCZX): "
set /p SCHOOL_NAME="学校名称 (例如 天长中学): "
set CLASS_INFO=
:class_loop
set /p ADD_CLASS="添加年级班级？(y/N): "
if /i not "!ADD_CLASS!"=="y" goto :class_done
:input_year
set /p YEAR="年份 (例如 2020): "
echo !YEAR!| findstr /r "^[0-9][0-9][0-9][0-9]$" >nul
if errorlevel 1 (
    echo 年份必须是4位数字
    goto input_year
)
:input_classcount
set /p CLASS_COUNT="班级数量: "
echo !CLASS_COUNT!| findstr /r "^[1-9][0-9]*$" >nul
if errorlevel 1 (
    echo 班级数量必须是正整数
    goto input_classcount
)
if "!CLASS_INFO!"=="" (
    set CLASS_INFO={"year":!YEAR!,"classCount":!CLASS_COUNT!}
) else (
    set CLASS_INFO=!CLASS_INFO!,{"year":!YEAR!,"classCount":!CLASS_COUNT!}
)
goto class_loop
:class_done
set CLASS_JSON=[!CLASS_INFO!]
if "!SCHOOLS_ARRAY!"=="" (
    set SCHOOLS_ARRAY={"id":"!SCHOOL_ID!","name":"!SCHOOL_NAME!","classInfo":!CLASS_JSON!}
) else (
    set SCHOOLS_ARRAY=!SCHOOLS_ARRAY!,{"id":"!SCHOOL_ID!","name":"!SCHOOL_NAME!","classInfo":!CLASS_JSON!}
)
goto school_loop
:school_done
set SCHOOLS_JSON=[]
if not "!SCHOOLS_ARRAY!"=="" set SCHOOLS_JSON=[!SCHOOLS_ARRAY!]

:: =======================================================
:: 步骤5: 生成配置文件
:: =======================================================
echo.
echo [5/6] 生成配置文件...
if not exist "data" mkdir data

:: 生成 .env
echo 生成 .env ...
(
echo # 校园论坛环境配置（由部署脚本自动生成）
echo.
echo PORT=!PORT!
echo NODE_ENV=!NODE_ENV!
echo.
echo MONGODB_URI=!MONGODB_URI!
echo MONGODB_USERNAME=!MONGODB_USERNAME!
echo MONGODB_PASSWORD=!MONGODB_PASSWORD!
echo MONGODB_AUTHSOURCE=!MONGODB_AUTHSOURCE!
echo MONGODB_TLS=false
echo MONGODB_SERVER_SELECTION_TIMEOUT=10000
echo MONGODB_CONNECT_TIMEOUT=10000
echo MONGODB_SOCKET_TIMEOUT=30000
echo MONGODB_MAX_POOL_SIZE=10
echo MONGODB_MIN_POOL_SIZE=2
echo.
echo REDIS_HOST=!REDIS_HOST!
echo REDIS_PORT=!REDIS_PORT!
echo REDIS_PASSWORD=!REDIS_PASSWORD!
echo REDIS_CONNECT_TIMEOUT=5000
echo REDIS_COMMAND_TIMEOUT=3000
echo.
echo JWT_SECRET=!JWT_SECRET!
echo JWT_EXPIRES_IN=7d
echo JWT_REFRESH_EXPIRES_IN=30d
echo.
echo ADMIN_JWT_SECRET=!ADMIN_JWT_SECRET!
echo ADMIN_JWT_EXPIRES_IN=24h
echo.
echo SMTP_HOST=!SMTP_HOST!
echo SMTP_PORT=!SMTP_PORT!
echo SMTP_SECURE=!SMTP_SECURE!
echo SMTP_USER=!SMTP_USER!
echo SMTP_PASS=!SMTP_PASS!
echo.
echo CORS_ORIGIN=!CORS_ORIGIN!
if not "!SERVER_IP!"=="" echo SERVER_IP=!SERVER_IP!
echo.
echo MAX_REQUEST_SIZE=10
echo LOGIN_MAX_ATTEMPTS=5
echo LOGIN_LOCK_TIME=1800000
echo.
echo PASSWORD_MIN_LENGTH=8
echo PASSWORD_REQUIRE_UPPERCASE=true
echo PASSWORD_REQUIRE_LOWERCASE=true
echo PASSWORD_REQUIRE_NUMBER=true
echo PASSWORD_REQUIRE_SPECIAL=false
echo.
echo RATE_LIMIT_WINDOW_MS=60000
echo RATE_LIMIT_MAX_REQUESTS=100
) > .env
echo   .env 已生成

:: 生成 data\config.json
echo 生成 data\config.json ...
(
echo {
echo   "adminUsers": !ADMIN_JSON!,
echo   "mongodb": {
echo     "uri": "!MONGODB_URI!",
echo     "username": "!MONGODB_USERNAME!",
echo     "password": "!MONGODB_PASSWORD!",
echo     "authSource": "!MONGODB_AUTHSOURCE!"
echo   },
echo   "redis": {
echo     "host": "!REDIS_HOST!",
echo     "port": !REDIS_PORT!,
echo     "password": "!REDIS_PASSWORD!",
echo     "db": 0
echo   },
echo   "upload": {
echo     "allowedTypes": ["image/jpeg","image/jpg","image/png","image/gif","image/webp"],
echo     "maxFileSize": 33554432,
echo     "maxFiles": 32
echo   },
echo   "password": { "saltRounds": 10 },
echo   "pagination": { "defaultPage": 1, "defaultLimit": 100 },
echo   "contentLimits": {
echo     "post": 10000,
echo     "comment": 500,
echo     "username": { "min": 2, "max": 20 },
echo     "qq": { "min": 5, "max": 15 },
echo     "password": { "min": 6 }
echo   },
echo   "schools": !SCHOOLS_JSON!
echo }
) > data\config.json
echo   data\config.json 已生成

:: 隐藏敏感文件
attrib +h .env >nul 2>&1
attrib +h data\config.json >nul 2>&1

:: =======================================================
:: 步骤6: 可选安装 PM2
:: =======================================================
echo.
echo [6/6] 进程管理器配置...
set /p INSTALL_PM2="是否安装 PM2（进程守护，推荐）？(y/N): "
if /i "!INSTALL_PM2!"=="y" (
    echo 正在安装 PM2...
    call npm install -g pm2
    if errorlevel 1 (
        echo [警告] PM2 安装失败，可能是权限不足。请以管理员身份重新运行本脚本或手动安装。
    ) else (
        echo PM2 安装成功
        set /p START_PM2="是否使用 PM2 启动论坛？(y/N): "
        if /i "!START_PM2!"=="y" (
            echo 正在使用 PM2 启动服务...
            call pm2 start server.js --name school-forum
            call pm2 save
            echo 服务已启动，可使用 pm2 monit 查看状态
            goto :end
        )
    )
)

:: 提示手动启动
echo.
echo =======================================================
echo                  部署完成！
echo =======================================================
echo.
echo 已生成配置文件：
echo   .env
echo   data\config.json
echo.
:: 缺失配置检查
set MISSING=
if "!ADMIN_JSON!"=="[]" set MISSING=!MISSING! 管理员
if "!SMTP_HOST!"=="" set MISSING=!MISSING! 邮件服务
if "!SCHOOLS_JSON!"=="[]" set MISSING=!MISSING! 学校信息
if not "!MISSING!"=="" (
    echo [提示] 以下配置尚未填写，请手动编辑：
    echo   !MISSING!
    echo.
)
echo 启动命令：
echo   直接启动: npm start
echo   PM2启动: 先安装: npm install -g pm2，然后 pm2 start server.js --name school-forum
echo.
echo 按任意键退出...
if %PAUSE_MODE%==1 pause >nul
exit /b 0

:end
echo.
echo 部署完成，论坛已启动。
if %PAUSE_MODE%==1 pause >nul
exit /b 0