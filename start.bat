@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title School Forum Server

:: 检测是否为 CI 环境（自动化构建时不暂停）
if defined CI (
    set PAUSE_MODE=0
) else (
    set PAUSE_MODE=1
)

echo.
echo =======================================================
echo               School Forum Server
echo =======================================================
echo.

cd /d "%~dp0"

:: ========== Step 1: Check Node.js ==========
echo [Step 1/5] Checking Node.js...

where node >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js not found. Please install from:
    echo   https://nodejs.org/
    echo.
    if %PAUSE_MODE%==1 pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js version: !NODE_VERSION!

:: 提取主版本号
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION:v=!") do set NODE_MAJOR=%%a
if !NODE_MAJOR! LSS 18 (
    echo   [WARNING] Node.js version is too old (^<!NODE_MAJOR!^<18). Recommended: 18+.
    echo   Some features may not work properly.
)

:: ========== Step 2: Install dependencies ==========
echo.
echo [Step 2/5] Checking dependencies...

if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo   [ERROR] Failed to install dependencies
        if %PAUSE_MODE%==1 pause
        exit /b 1
    )
    echo   Dependencies installed
) else (
    echo   Dependencies already installed, skipping
)

:: ========== Step 3: Check MongoDB ==========
echo.
echo [Step 3/5] Checking MongoDB...

set MONGODB_READY=0
where mongod >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] MongoDB not found in PATH
    echo   Make sure MongoDB is running or using cloud database.
) else (
    for /f "tokens=3" %%v in ('mongod --version ^| findstr "db version"') do set MONGO_VERSION=%%v
    echo   MongoDB version: !MONGO_VERSION!
    
    :: 等待 MongoDB 端口 27017 就绪
    echo   Waiting for MongoDB to be ready (max 30s)...
    for /l %%i in (1,1,30) do (
        timeout /t 1 /nobreak >nul
        netstat -an 2>nul | findstr ":27017.*LISTENING" >nul
        if not errorlevel 1 (
            set MONGODB_READY=1
            echo   MongoDB is ready
            goto :mongo_ready
        )
    )
)
:mongo_ready
if %MONGODB_READY%==0 (
    echo   [WARNING] MongoDB may not be running on default port 27017.
    echo   If using Atlas or custom URI, please ignore.
)

:: ========== Step 4: Check Redis ==========
echo.
echo [Step 4/5] Checking Redis...

set REDIS_READY=0
if exist "Redis\redis-server.exe" (
    echo   Found embedded Redis
    tasklist /fi "imagename eq redis-server.exe" 2>nul | find /i "redis-server.exe" >nul
    if errorlevel 1 (
        set /p START_REDIS="   Start embedded Redis? (y/N): "
        if /i "!START_REDIS!"=="y" (
            echo   Starting embedded Redis...
            start "Redis Server" "Redis\start.bat"
            echo   Waiting for Redis to be ready (max 10s)...
            for /l %%i in (1,1,10) do (
                timeout /t 1 /nobreak >nul
                netstat -an 2>nul | findstr ":6379.*LISTENING" >nul
                if not errorlevel 1 (
                    set REDIS_READY=1
                    echo   Redis is ready
                    goto :redis_ready
                )
            )
            if !REDIS_READY!==0 (
                echo   [WARNING] Redis did not become ready in time, cache may be disabled.
            )
        ) else (
            echo   Skipping Redis, cache will not be used
        )
    ) else (
        echo   Redis is running
        set REDIS_READY=1
    )
) else (
    where redis-server >nul 2>&1
    if errorlevel 1 (
        echo   [SKIP] Redis not found, cache disabled
    ) else (
        echo   Found system Redis
        for /l %%i in (1,1,10) do (
            timeout /t 1 /nobreak >nul
            netstat -an 2>nul | findstr ":6379.*LISTENING" >nul
            if not errorlevel 1 (
                set REDIS_READY=1
                echo   System Redis is ready
                goto :redis_ready
            )
        )
        if !REDIS_READY!==0 (
            echo   [WARNING] System Redis not listening on port 6379.
        )
    )
)
:redis_ready

:: ========== Step 5: Start server ==========
echo.
echo =======================================================
echo               Starting server...
echo =======================================================
echo.
echo Access: http://localhost:3000
echo Press Ctrl+C to stop
echo.

:: 加载 .env 中的环境变量（如果项目使用 dotenv 则不需要显式加载，但为了保险可提前设置）
:: 如果 .env 文件存在，可在此读取并设置（可选）
if exist ".env" (
    for /f "usebackq tokens=*" %%a in (".env") do set %%a 2>nul
)

node server.js
set EXIT_CODE=%errorlevel%

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] Server failed to start (exit code: %EXIT_CODE%)
    echo Please check:
    echo   1. MongoDB is running (port 27017) and credentials are correct
    echo   2. Redis is running if used
    echo   3. .env config is valid
    echo   4. Port 3000 is not occupied
    echo.
    if %PAUSE_MODE%==1 pause
    exit /b %EXIT_CODE%
)

:: 正常退出（不会执行到这里，因为 node 会一直运行）
endlocal