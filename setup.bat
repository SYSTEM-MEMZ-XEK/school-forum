@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title 校园论坛配置向导

:: 检测 CI 环境（非交互模式）
if defined CI set PAUSE_MODE=0 & goto :start
set PAUSE_MODE=1

:start
echo.
echo =======================================================
echo         校园论坛系统 - Windows 配置向导
echo =======================================================
echo.
echo 本脚本仅修改配置，不安装任何依赖或服务
echo.

:: 获取脚本目录
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%" 2>nul || (echo 目录切换失败 & exit /b 1)

:: =======================================================
:: 检测现有配置文件
:: =======================================================
echo [检测] 扫描现有配置文件...
echo.
set EXIST_ENV=0
set EXIST_CONFIG=0

if exist ".env" (
    set EXIST_ENV=1
    echo   [发现] .env 已存在 - 将保留现有值，可选择性更新
) else (
    echo   [新建] .env 将创建
)

if exist "data\config.json" (
    set EXIST_CONFIG=1
    echo   [发现] data\config.json 已存在 - 将保留现有值
) else (
    echo   [新建] data\config.json 将创建
    if not exist "data" mkdir data
)

echo.

:: =======================================================
:: 选择操作模式
:: =======================================================
echo 请选择操作模式：
echo   1) 交互式配置（推荐）- 逐一输入各项配置
echo   2) 快速配置 - 仅添加管理员 QQ 号
echo   3) 查看当前配置
echo   4) 智能更新 SERVER_IP（检测内网IP并更新）
echo   5) 退出
echo.
set /p MODE_CHOICE="请选择 (1-5): "

if "!MODE_CHOICE!"=="5" goto :end
if "!MODE_CHOICE!"=="3" goto :view_config
if "!MODE_CHOICE!"=="4" goto :update_ip

:: =======================================================
:: 查看当前配置
:: =======================================================
:view_config
echo.
echo =======================================================
echo                   当前配置
echo =======================================================
echo.
if exist ".env" (
    echo [.env]
    findstr /V "PASSWORD\|SECRET\|KEY\|PASS" .env
) else (
    echo   .env 不存在
)
echo.
if exist "data\config.json" (
    echo [data\config.json]
    type data\config.json
) else (
    echo   data\config.json 不存在
)
goto :end

:: =======================================================
:: 智能更新 SERVER_IP
:: =======================================================
:update_ip
echo.
echo [智能更新] 正在检测内网IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168"') do set DETECTED_IP=%%a
for %%b in (!DETECTED_IP!) do set DETECTED_IP=%%b
if not defined DETECTED_IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "10\."') do set DETECTED_IP=%%a
    for %%b in (!DETECTED_IP!) do set DETECTED_IP=%%b
)
if defined DETECTED_IP (
    echo   检测到 IP: !DETECTED_IP!
    if exist ".env" (
        call :backup_dotenv
        :: 使用 PowerShell 替换或添加 SERVER_IP
        powershell -Command "$env = Get-Content '.env' -Raw; if ($env -match '(?m)^SERVER_IP=') { $env = $env -replace '(?m)^SERVER_IP=.*', 'SERVER_IP=!DETECTED_IP!' } else { $env += \"`nSERVER_IP=!DETECTED_IP!\" }; $env | Set-Content '.env' -NoNewline"
        echo   已更新 .env 中的 SERVER_IP
    ) else (
        echo SERVER_IP=!DETECTED_IP! > .env
        echo   已创建 .env 并设置 SERVER_IP
    )
) else (
    echo   [警告] 未检测到内网IP，请手动配置
    echo   提示：可编辑 .env 文件添加 SERVER_IP=你的内网IP
)
goto :end

:: =======================================================
:: 备份 .env 文件（带时间戳）
:: =======================================================
:backup_dotenv
set TIMESTAMP=%DATE:/=-%_%TIME::=.%
set TIMESTAMP=%TIMESTAMP: =0%
if exist ".env" copy ".env" ".env.bak.%TIMESTAMP%" >nul 2>&1
goto :eof

:: =======================================================
:: 交互式配置（主流程）
:: =======================================================
if "!MODE_CHOICE!"=="1" goto :interactive_mode
if "!MODE_CHOICE!"=="2" goto :quick_mode
goto :end

:interactive_mode
echo.
echo =======================================================
echo               交互式配置
echo =======================================================

:: --- 管理员 QQ 号 ---
call :collect_admins
if errorlevel 1 set ADMIN_USERS_JSON=[]

:: --- 服务器 IP ---
echo.
echo [服务器 IP]（内网访问地址）
set /p SERVER_IP=" 内网IP (例如 192.168.2.4，留空自动检测): "
if "!SERVER_IP!"=="" call :detect_ip
if defined DETECTED_IP set SERVER_IP=!DETECTED_IP! & echo   自动检测: !SERVER_IP!

:: --- CORS 白名单 ---
echo.
set /p CORS_ORIGIN="CORS 白名单 (多个用逗号分隔，默认 http://localhost:3000): "
if "!CORS_ORIGIN!"=="" set CORS_ORIGIN=http://localhost:3000

:: --- 邮件服务 ---
echo.
echo [邮件服务]（可选，留空跳过）
set /p SMTP_HOST=" SMTP服务器 (例如 smtp.qq.com): "
set SMTP_CONFIG_CHANGED=0
if not "!SMTP_HOST!"=="" (
    set SMTP_CONFIG_CHANGED=1
    set /p SMTP_PORT=" SMTP端口 (默认465): "
    if "!SMTP_PORT!"=="" set SMTP_PORT=465
    :: 端口校验
    echo !SMTP_PORT!| findstr /r "^[0-9]+$" >nul || set SMTP_PORT=465
    set /p SMTP_USER=" 邮箱账号: "
    set /p SMTP_PASS=" 邮箱授权码: "
)
goto :write_config

:quick_mode
echo.
echo =======================================================
echo               快速配置 - 管理员
echo =======================================================
call :collect_admins
echo.
set /p ALSO_SERVER_IP="是否同时更新 SERVER_IP？(y/N): "
if /i "!ALSO_SERVER_IP!"=="y" call :detect_ip & set SERVER_IP=!DETECTED_IP!
set CORS_ORIGIN=
set SMTP_HOST=
goto :write_config

:: 收集管理员 QQ 号子过程
:collect_admins
echo.
echo [管理员 QQ 号]（输入空行结束，QQ号为5-15位数字）
set ADMIN_USERS=
:admin_loop
set /p QQ=" QQ号 (直接回车结束): "
if "!QQ!"=="" goto :admin_done
echo !QQ!| findstr /r "^[0-9][0-9][0-9][0-9][0-9][0-9]*$" >nul
if errorlevel 1 (
    echo   QQ号必须是5位以上数字，请重新输入
    goto admin_loop
)
if "!ADMIN_USERS!"=="" (
    set ADMIN_USERS="!QQ!"
) else (
    set ADMIN_USERS=!ADMIN_USERS!,"!QQ!"
)
goto admin_loop
:admin_done
if defined ADMIN_USERS (
    set ADMIN_USERS_JSON=[!ADMIN_USERS!]
) else (
    set ADMIN_USERS_JSON=[]
    echo   [提示] 未添加任何管理员，后续可手动编辑 data\config.json
)
exit /b 0

:detect_ip
set DETECTED_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168"') do set DETECTED_IP=%%a
for %%b in (!DETECTED_IP!) do set DETECTED_IP=%%b
if not defined DETECTED_IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "10\."') do set DETECTED_IP=%%a
    for %%b in (!DETECTED_IP!) do set DETECTED_IP=%%b
)
exit /b 0

:: =======================================================
:: 写入配置
:: =======================================================
:write_config
echo.
echo [写入] 正在更新配置文件...

:: 备份 .env
call :backup_dotenv

:: 如果 .env 已存在，则使用 PowerShell 更新特定字段；否则新建
if exist ".env" (
    powershell -Command "$env = Get-Content '.env' -Raw; $fields = @{}; if ('!SERVER_IP!' -ne '') { $fields['SERVER_IP'] = '!SERVER_IP!' }; if ('!CORS_ORIGIN!' -ne '') { $fields['CORS_ORIGIN'] = '!CORS_ORIGIN!' }; if ('!SMTP_HOST!' -ne '') { $fields['SMTP_HOST'] = '!SMTP_HOST!'; $fields['SMTP_PORT'] = '!SMTP_PORT!'; $fields['SMTP_USER'] = '!SMTP_USER!'; $fields['SMTP_PASS'] = '!SMTP_PASS!' }; foreach ($key in $fields.Keys) { $regex = '(?m)^' + $key + '=.*'; if ($env -match $regex) { $env = $env -replace $regex, ($key + '=' + $fields[$key]) } else { $env += \"`n\" + $key + '=' + $fields[$key] } }; $env | Set-Content '.env' -NoNewline"
    echo   .env 已更新（备份文件已创建）
) else (
    (
        echo # 校园论坛环境配置
        echo PORT=3000
        echo NODE_ENV=production
        echo.
        echo MONGODB_URI=mongodb://localhost:27017/school-forum
        echo REDIS_HOST=localhost
        echo REDIS_PORT=6379
        echo.
        echo JWT_SECRET=please_run_deploy_script_first
        echo JWT_EXPIRES_IN=7d
        echo JWT_REFRESH_EXPIRES_IN=30d
        echo ADMIN_JWT_SECRET=please_run_deploy_script_first
        echo ADMIN_JWT_EXPIRES_IN=24h
        echo.
        echo CORS_ORIGIN=!CORS_ORIGIN!
        if defined SERVER_IP echo SERVER_IP=!SERVER_IP!
        if defined SMTP_HOST (
            echo SMTP_HOST=!SMTP_HOST!
            echo SMTP_PORT=!SMTP_PORT!
            echo SMTP_USER=!SMTP_USER!
            echo SMTP_PASS=!SMTP_PASS!
        )
    ) > .env
    echo   .env 已创建
)

:: 更新 data\config.json
if exist "data\config.json" (
    if defined ADMIN_USERS_JSON if not "!ADMIN_USERS_JSON!"=="[]" (
        :: 使用 PowerShell 更新 adminUsers
        powershell -Command "$json = Get-Content 'data\config.json' -Raw | ConvertFrom-Json; $json.adminUsers = !ADMIN_USERS_JSON!; $json | ConvertTo-Json -Depth 10 | Set-Content 'data\config.json'"
        echo   data\config.json 已更新 adminUsers
    ) else (
        echo   管理员未修改，跳过 data\config.json
    )
) else (
    if defined ADMIN_USERS_JSON if not "!ADMIN_USERS_JSON!"=="[]" (
        if not exist "data" mkdir data
        (
            echo {
            echo   "adminUsers": !ADMIN_USERS_JSON!,
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
            echo   "schools": []
            echo }
        ) > data\config.json
        echo   data\config.json 已创建
    )
)

echo.
echo =======================================================
echo               配置完成！
echo =======================================================
echo.
echo 配置文件位置：
if exist ".env" echo   .env - 已更新
if exist "data\config.json" echo   data\config.json - 已更新
if exist ".env.bak.*" echo   .env.bak.* - 备份文件（可删除旧备份）
echo.
echo 如需完整配置（JWT密钥等），请运行 deploy.bat 进行初始化部署

:end
if %PAUSE_MODE%==1 pause
exit /b 0