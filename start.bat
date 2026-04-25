@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title School Forum Server

echo.
echo =======================================================
echo               School Forum Server
echo =======================================================
echo.

cd /d "%~dp0"

REM Step 1: Check Node.js
echo [Step 1/4] Checking Node.js...

where node >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js not found. Please install from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js version: !NODE_VERSION!

REM Step 2: Install dependencies
echo.
echo [Step 2/4] Checking dependencies...

if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo   [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo   Dependencies installed
) else (
    echo   Dependencies already installed, skipping
)

REM Step 3: Check MongoDB
echo.
echo [Step 3/4] Checking MongoDB...

where mongod >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] MongoDB not found in PATH
    echo   Make sure MongoDB is running or using cloud database
) else (
    for /f "delims=" %%v in ('mongod --version ^| findstr "db version"') do set MONGO_VERSION=%%v
    echo   MongoDB: !MONGO_VERSION!
)

REM Step 4: Check Redis
echo.
echo [Step 4/4] Checking Redis...

if exist "Redis\redis-server.exe" (
    echo   Found embedded Redis
    tasklist /fi "imagename eq redis-server.exe" 2>nul | find /i "redis-server.exe" >nul
    if errorlevel 1 (
        echo   Redis not running. Start it?
        set /p START_REDIS="Enter y to start, other to skip: "
        if /i "!START_REDIS!"=="y" (
            echo   Starting Redis...
            start "Redis Server" "Redis\start.bat"
            timeout /t 2 /nobreak >nul
        ) else (
            echo   Skipping Redis, cache will not be used
        )
    ) else (
        echo   Redis is running
    )
) else (
    where redis-server >nul 2>&1
    if errorlevel 1 (
        echo   [SKIP] Redis not found, cache disabled
    ) else (
        echo   Found system Redis
    )
)

REM Start server
echo.
echo =======================================================
echo               Starting server...
echo =======================================================
echo.
echo Access: http://localhost:3000
echo Press Ctrl+C to stop
echo.
echo.

node server.js

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start
    echo Please check:
    echo   1. MongoDB is running
    echo   2. .env config is correct
    echo   3. Port 3000 is available
    echo.
)

pause
