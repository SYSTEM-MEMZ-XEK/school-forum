#!/bin/bash

# =======================================================
# 校园论坛系统 - Linux 启动脚本
# =======================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "               校园论坛服务启动脚本"
echo "========================================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
log_success "Node.js 版本: $NODE_VERSION"

# 安装依赖（如需要）
if [ ! -d "node_modules" ]; then
    log_info "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        log_error "依赖安装失败"
        exit 1
    fi
    log_success "依赖安装完成"
fi

# 检查 MongoDB
if ! command -v mongod &> /dev/null; then
    log_warn "未在系统中找到 MongoDB"
    log_info "请确保 MongoDB 服务正在运行，或使用云数据库"
    echo ""
fi

# 检查 Redis
if ! command -v redis-server &> /dev/null; then
    log_warn "未在系统中找到 Redis，将不使用缓存"
else
    # 检查 Redis 是否运行
    if ! pgrep -x "redis-server" > /dev/null; then
        log_info "Redis 未运行，是否启动？"
        read -p "启动 Redis? [Y/n]: " START_REDIS
        if [[ ! "$START_REDIS" =~ ^[Nn]$ ]]; then
            redis-server --daemonize yes
            log_success "Redis 已启动"
        fi
    else
        log_success "Redis 正在运行"
    fi
fi

echo ""
log_info "正在启动服务..."
echo "========================================================"
echo ""

# 启动服务
node server.js