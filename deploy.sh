#!/bin/bash

# =======================================================
# 校园论坛系统 - Linux 一键部署脚本
# 支持 Ubuntu 20.04/22.04, Debian 11+, CentOS 8+
# =======================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否为 root 或有 sudo 权限
check_root() {
    if [[ $EUID -ne 0 ]]; then
        if ! command -v sudo &> /dev/null; then
            log_error "需要 root 权限或 sudo 命令"
            exit 1
        fi
        SUDO="sudo"
    else
        SUDO=""
    fi
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    log_info "检测到操作系统: $OS $VERSION"

    case $OS in
        ubuntu|debian)
            PKG_MANAGER="apt"
            ;;
        centos|rhel|rocky|alma)
            PKG_MANAGER="yum"
            ;;
        fedora)
            PKG_MANAGER="dnf"
            ;;
        *)
            log_warn "未完全支持的操作系统: $OS"
            PKG_MANAGER="apt"
            ;;
    esac
}

# 替换软件源为清华镜像
switch_mirror() {
    log_info "配置软件源为清华镜像（加速下载）..."

    case $OS in
        ubuntu|debian)
            # 备份原 sources.list
            $SUDO cp /etc/apt/sources.list /etc/apt/sources.list.bak 2>/dev/null || true

            # 替换为清华源
            case $OS in
                ubuntu)
                    $SUDO sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
                    $SUDO sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
                    ;;
                debian)
                    $SUDO sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
                    $SUDO sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
                    ;;
            esac

            $SUDO apt update -qq
            ;;
        centos|rhel|rocky|alma)
            # CentOS 切换到阿里云镜像
            $SUDO sed -e 's|^mirrorlist=|#mirrorlist=|g' \
                     -e 's|^#baseurl=http://mirror.centos.org|baseurl=https://mirrors.aliyun.com|g' \
                     -i /etc/yum.repos.d/CentOS-*.repo
            $SUDO yum makecache
            ;;
    esac

    log_success "软件源配置完成"
}

# 安装基础工具
install_tools() {
    log_info "安装基础工具..."

    case $PKG_MANAGER in
        apt)
            $SUDO apt install -y curl git unzip
            ;;
        yum|dnf)
            $SUDO $PKG_MANAGER install -y curl git unzip
            ;;
    esac

    log_success "基础工具安装完成"
}

# 安装 Node.js
install_nodejs() {
    log_info "检查 Node.js..."

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        log_info "Node.js 已安装: $NODE_VERSION"

        # 检查版本
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_MAJOR -lt 18 ]]; then
            log_warn "Node.js 版本过低 ($NODE_VERSION)，建议升级到 18+"
            log_info "正在安装新版本 Node.js..."
            install_nodejs_from_source
        fi
    else
        log_info "未安装 Node.js，正在安装..."
        install_nodejs_from_source
    fi
}

# 从清华镜像安装 Node.js
install_nodejs_from_source() {
    # 安装 nvm
    log_info "安装 nvm (Node Version Manager)..."

    export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release

    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # 使用清华镜像安装 Node.js 20 LTS（稳定版）
    log_info "安装 Node.js 20 LTS..."
    export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release
    nvm install 20
    nvm alias default 20

    # 配置 npm 镜像
    npm config set registry https://registry.npmmirror.com

    log_success "Node.js 安装完成: $(node -v)"
}

# 安装 MongoDB
install_mongodb() {
    log_info "检查 MongoDB..."

    if command -v mongod &> /dev/null; then
        log_info "MongoDB 已安装"
        return
    fi

    log_info "MongoDB 未安装，是否安装？"
    echo "  1) 安装 MongoDB Community Server (本地)"
    echo "  2) 使用 MongoDB Atlas (云数据库) - 推荐"
    echo "  3) 跳过（已有 MongoDB 服务）"
    read -p "请选择 [1-3]: " MONGODB_CHOICE

    case $MONGODB_CHOICE in
        1)
            install_mongodb_local
            ;;
        2)
            log_info "请访问 https://www.mongodb.com/atlas/database 创建免费集群"
            log_info "创建后，将连接字符串填入 .env 文件的 MONGODB_URI"
            ;;
        3)
            log_info "跳过 MongoDB 安装"
            ;;
    esac
}

# 本地安装 MongoDB
install_mongodb_local() {
    log_info "安装 MongoDB Community Server..."

    case $OS in
        ubuntu)
            # 导入 MongoDB GPG 密钥
            curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | $SUDO gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

            # 添加 MongoDB 源
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | $SUDO tee /etc/apt/sources.list.d/mongodb-org-7.0.list

            $SUDO apt update -qq
            $SUDO apt install -y mongodb-org

            # 启动 MongoDB
            $SUDO systemctl start mongod
            $SUDO systemctl enable mongod
            ;;
        debian)
            curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | $SUDO gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/7.0 multiverse" | $SUDO tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            $SUDO apt update -qq
            $SUDO apt install -y mongodb-org
            $SUDO systemctl start mongod
            $SUDO systemctl enable mongod
            ;;
        centos|rhel|rocky|alma)
            cat <<EOF | $SUDO tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
            $SUDO yum install -y mongodb-org
            $SUDO systemctl start mongod
            $SUDO systemctl enable mongod
            ;;
    esac

    log_success "MongoDB 安装完成"
}

# 安装 Redis（可选）
install_redis() {
    log_info "检查 Redis..."

    if command -v redis-server &> /dev/null; then
        log_info "Redis 已安装"
        return
    fi

    log_info "是否安装 Redis？(用于缓存，可选)"
    read -p "安装 Redis? [y/N]: " INSTALL_REDIS

    if [[ "$INSTALL_REDIS" =~ ^[Yy]$ ]]; then
        case $PKG_MANAGER in
            apt)
                $SUDO apt install -y redis-server
                ;;
            yum|dnf)
                $SUDO $PKG_MANAGER install -y redis
                ;;
        esac

        $SUDO systemctl start redis
        $SUDO systemctl enable redis
        log_success "Redis 安装完成"
    fi
}

# 配置项目
configure_project() {
    log_info "配置项目..."

    # 安装 npm 依赖
    log_info "安装项目依赖..."
    npm install

    # 创建数据目录
    mkdir -p data

    # .env 配置文件处理
    if [ -f ".env" ]; then
        log_info "[跳过] 检测到已有 .env 配置文件，保留现有配置"
    else
        log_info "创建 .env 配置文件..."
        cat > .env <<EOF
# 校园论坛环境配置文件
# ================================

# 服务端口
PORT=3000
NODE_ENV=production

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/school-forum

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=change-this-to-a-random-string
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 管理员 JWT 密钥
ADMIN_JWT_SECRET=change-this-admin-secret
ADMIN_JWT_EXPIRES_IN=24h

# SMTP 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# CORS 配置
CORS_ORIGIN=localhost
EOF
        log_warn ".env 配置文件已创建，请编辑填入正确的配置信息！"
    fi

    # data/config.json 配置文件处理
    if [ -f "data/config.json" ]; then
        log_info "[跳过] 检测到已有 data/config.json，保留现有配置"
    else
        log_info "创建 data/config.json 配置文件..."
        cat > data/config.json <<EOF
{
  "adminUsers": [],
  "mongodb": {
    "uri": "mongodb://localhost:27017/school-forum"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "upload": {
    "allowedTypes": ["image/jpeg", "image/png", "image/gif", "image/webp"],
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
  "schools": []
}
EOF
        log_warn "data/config.json 已创建，请添加管理员 QQ 号到 adminUsers 数组中！"
    fi
}

# 安装 PM2
install_pm2() {
    log_info "安装 PM2 (进程管理器)..."

    if command -v pm2 &> /dev/null; then
        log_info "PM2 已安装"
    else
        npm install -g pm2
        log_success "PM2 安装完成"
    fi
}

# 启动服务
start_service() {
    log_info "是否现在启动服务？"
    read -p "启动论坛服务? [Y/n]: " START_SERVICE

    if [[ ! "$START_SERVICE" =~ ^[Nn]$ ]]; then
        # 使用 PM2 启动
        pm2 start server.js --name school-forum || npm start
        log_success "服务已启动"

        # 保存 PM2 进程列表
        pm2 save

        # 设置开机自启
        pm2 startup &> /dev/null || true
    fi
}

# 显示完成信息
show_complete() {
    echo ""
    echo "======================================================="
    echo "                  部署完成！"
    echo "======================================================="
    echo ""
    echo "已完成:"
    echo "  ✓ 环境检测"
    echo "  ✓ 依赖安装"
    echo "  ✓ 配置文件处理"
    echo ""
    echo "后续步骤:"
    echo "  1. 如需修改配置，请编辑 .env 和 data/config.json"
    echo "  2. 确保 MongoDB 服务正在运行"
    echo ""
    echo "常用命令:"
    echo "  启动服务: npm start 或 pm2 start server.js"
    echo "  查看日志: pm2 logs school-forum"
    echo "  重启服务: pm2 restart school-forum"
    echo "  停止服务: pm2 stop school-forum"
    echo ""
    echo "访问论坛: http://localhost:3000"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "======================================================"
    echo "       校园论坛系统 - Linux 一键部署脚本"
    echo "======================================================"
    echo ""

    check_root
    detect_os

    # 询问是否切换镜像
    echo ""
    read -p "是否配置清华镜像加速下载？(推荐) [Y/n]: " USE_MIRROR
    if [[ ! "$USE_MIRROR" =~ ^[Nn]$ ]]; then
        switch_mirror
    fi

    install_tools
    install_nodejs
    install_mongodb
    install_redis
    configure_project
    install_pm2
    start_service
    show_complete
}

# 执行主函数
main "$@"
