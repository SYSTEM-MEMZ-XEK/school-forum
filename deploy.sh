#!/bin/bash

# =======================================================
# 校园论坛系统 
# 支持 Ubuntu 20.04/22.04, Debian 11+, CentOS 7/8/9, Rocky Linux
# =======================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}--- $1 ---${NC}\n"; }

print_banner() {
    echo -e "${CYAN}"
    echo "========================================================"
    echo "            校园论坛系统 - 一键部署脚本"
    echo "              自动化安装环境 · 交互式配置"
    echo "========================================================"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${MAGENTA}========================================================${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}========================================================${NC}"
}

is_interactive() { [[ -t 0 ]] && [[ -t 1 ]]; }

ask_yes_no() {
    local prompt="$1" default="$2"
    if is_interactive; then
        echo -en "${CYAN}[?] $prompt ${NC}"
        read answer
        case "$answer" in [Yy]) return 0;; [Nn]) return 1;; *) [[ "$default" == "Y" ]] && return 0 || return 1;; esac
    else
        [[ "$default" == "Y" ]] && return 0 || return 1
    fi
}

ask_option() {
    local prompt="$1" default="$2"
    if is_interactive; then
        echo -en "${CYAN}[?] $prompt ${NC}"
        read answer
        echo "${answer:-$default}"
    else
        echo "$default"
    fi
}

# 校验正整数
validate_positive_int() {
    local value="$1"
    [[ "$value" =~ ^[1-9][0-9]*$ ]]
}

# 校验4位年份
validate_year() {
    local value="$1"
    [[ "$value" =~ ^[0-9]{4}$ ]] && [ "$value" -ge 2000 ] && [ "$value" -le 2100 ]
}

# 校验QQ号（5-15位数字）
validate_qq() {
    local value="$1"
    [[ "$value" =~ ^[0-9]{5,15}$ ]]
}

# Root 或 sudo 检查
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
        VERSION_MAJOR=$(echo "$VERSION" | cut -d. -f1)
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    log_info "检测到操作系统: ${BOLD}$OS $VERSION${NC}"
    case $OS in
        ubuntu|debian)            PKG_MANAGER="apt" ;;
        centos|rhel|rocky|alma)   PKG_MANAGER="yum" ;;
        fedora)                   PKG_MANAGER="dnf" ;;
        *) log_warn "未完全支持: $OS，将尝试 apt 模式"; PKG_MANAGER="apt" ;;
    esac
}

# CPU AVX2 检测
check_avx2() {
    log_info "检查 CPU 指令集（AVX2）..."
    if grep -q avx2 /proc/cpuinfo; then
        log_success "CPU 支持 AVX2，可安装 MongoDB 5.0+"
        return 0
    else
        log_warn "CPU 不支持 AVX2，将安装 MongoDB 4.4（兼容版本）"
        return 1
    fi
}

# 镜像连通性测试
test_mirror() {
    local mirror_host="$1"
    log_info "测试镜像源连通性: $mirror_host ..."
    if curl -s --connect-timeout 5 "http://$mirror_host" >/dev/null 2>&1; then
        log_success "镜像源可达"
        return 0
    else
        log_warn "镜像源不可达，将使用官方源"
        return 1
    fi
}

# 智能切换镜像
smart_switch_mirror() {
    log_info "配置软件源为清华镜像（加速下载）..."
    local mirror_domain="mirrors.tuna.tsinghua.edu.cn"
    $SUDO cp /etc/apt/sources.list /etc/apt/sources.list.bak.$(date +%s) 2>/dev/null || true
    case $OS in
        ubuntu|debian)
            if test_mirror "$mirror_domain"; then
                case $OS in
                    ubuntu)
                        $SUDO sed -i 's|archive.ubuntu.com|'"$mirror_domain"'|g' /etc/apt/sources.list
                        $SUDO sed -i 's|security.ubuntu.com|'"$mirror_domain"'|g' /etc/apt/sources.list
                        ;;
                    debian)
                        $SUDO sed -i 's|deb.debian.org|'"$mirror_domain"'|g' /etc/apt/sources.list
                        $SUDO sed -i 's|security.debian.org|'"$mirror_domain"'|g' /etc/apt/sources.list
                        ;;
                esac
                if $SUDO apt update -qq; then
                    log_success "镜像源配置成功"
                    return 0
                else
                    log_warn "apt update 失败，恢复官方源"
                    $SUDO mv /etc/apt/sources.list.bak.* /etc/apt/sources.list 2>/dev/null || true
                    $SUDO apt update -qq
                    return 1
                fi
            fi
            ;;
        centos|rhel|rocky|alma)
            $SUDO sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-*.repo
            $SUDO sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=https://mirrors.aliyun.com|g' /etc/yum.repos.d/CentOS-*.repo
            $SUDO yum makecache
            ;;
    esac
}

# 安装基础工具
install_tools() {
    log_step "安装基础工具"
    case $PKG_MANAGER in
        apt)
            if ! $SUDO apt update -qq; then
                log_error "apt update 失败，请检查网络或手动修复软件源"
                exit 1
            fi
            $SUDO apt install -y curl git unzip lsb-release gnupg jq
            ;;
        yum|dnf)
            $SUDO $PKG_MANAGER install -y curl git unzip jq
            if ! command -v lsb_release &> /dev/null; then
                $SUDO $PKG_MANAGER install -y redhat-lsb-core || true
            fi
            ;;
    esac
    log_success "基础工具安装完成"
}

# 安装 Node.js
install_nodejs() {
    log_step "检查并安装 Node.js"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        log_info "Node.js 已安装: ${BOLD}$NODE_VERSION${NC}"
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_MAJOR -lt 18 ]]; then
            log_warn "Node.js 版本过低，正在升级到 20 LTS..."
            install_nodejs_from_source
        fi
    else
        log_info "未安装 Node.js，正在安装..."
        install_nodejs_from_source
    fi
}

install_nodejs_from_source() {
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
    log_info "安装 Node.js 20 LTS（这可能需要几分钟）..."
    export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release
    nvm install 20
    nvm alias default 20
    npm config set registry https://registry.npmmirror.com
    log_success "Node.js 安装完成: $(node -v)"
}

# 安装 MongoDB
install_mongodb() {
    log_step "检查并安装 MongoDB"
    if command -v mongod &> /dev/null; then
        log_info "MongoDB 已安装"
        return
    fi
    echo "  1) 安装 MongoDB Community Server (本地)"
    echo "  2) 使用 MongoDB Atlas (云数据库)"
    echo "  3) 跳过"
    choice=$(ask_option "请选择 [1-3]: " "1")
    case $choice in
        1)
            if check_avx2; then
                MONGODB_VERSION="7.0"
            else
                MONGODB_VERSION="4.4"
            fi
            install_mongodb_local "$MONGODB_VERSION"
            ;;
        2) log_info "请访问 https://www.mongodb.com/atlas/database 创建免费集群";;
        3) log_info "跳过 MongoDB 安装";;
    esac
}

install_mongodb_local() {
    local version="$1"
    log_info "安装 MongoDB $version ..."
    case $OS in
        ubuntu)
            curl -fsSL "https://www.mongodb.org/static/pgp/server-${version}.asc" | $SUDO gpg -o "/usr/share/keyrings/mongodb-server-${version}.gpg" --dearmor
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${version}.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/${version} multiverse" | $SUDO tee "/etc/apt/sources.list.d/mongodb-org-${version}.list"
            $SUDO apt update -qq
            $SUDO apt install -y mongodb-org
            ;;
        debian)
            curl -fsSL "https://www.mongodb.org/static/pgp/server-${version}.asc" | $SUDO gpg -o "/usr/share/keyrings/mongodb-server-${version}.gpg" --dearmor
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${version}.gpg ] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/${version} multiverse" | $SUDO tee "/etc/apt/sources.list.d/mongodb-org-${version}.list"
            $SUDO apt update -qq
            $SUDO apt install -y mongodb-org
            ;;
        centos|rhel|rocky|alma)
            cat <<EOF | $SUDO tee "/etc/yum.repos.d/mongodb-org-${version}.repo"
[mongodb-org-${version}]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/${version}/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-${version}.asc
EOF
            $SUDO yum install -y mongodb-org
            ;;
    esac
    $SUDO systemctl start mongod
    $SUDO systemctl enable mongod
    log_info "等待 MongoDB 启动..."
    for i in {1..30}; do
        if $SUDO systemctl is-active --quiet mongod && nc -z localhost 27017 2>/dev/null; then
            log_success "MongoDB 已就绪"
            return
        fi
        sleep 2
    done
    log_warn "MongoDB 启动超时，请手动检查"
}

# 安装 Redis
install_redis() {
    log_step "检查并安装 Redis"
    if command -v redis-server &> /dev/null; then
        log_info "Redis 已安装"
        return
    fi
    if ask_yes_no "是否安装 Redis？(用于缓存，可选) [y/N]: " "N"; then
        case $PKG_MANAGER in
            apt) $SUDO apt install -y redis-server ;;
            yum|dnf) $SUDO $PKG_MANAGER install -y redis ;;
        esac
        $SUDO systemctl start redis
        $SUDO systemctl enable redis
        log_success "Redis 安装完成"
    fi
}

# 生成随机密钥
generate_secret() {
    openssl rand -base64 48 | tr -d '\n'
}

# 全局变量记录缺失配置
MISSING_CONFIGS=()
add_missing() { MISSING_CONFIGS+=("$1"); }

# 交互式配置项目
configure_project() {
    log_step "配置项目环境"
    
    if [[ ! -f "server.js" ]] || [[ ! -f "package.json" ]]; then
        log_error "当前目录未找到 server.js 或 package.json，请确保在项目根目录下执行"
        exit 1
    fi

    log_info "安装项目依赖..."
    npm install
    mkdir -p data

    # 询问是否覆盖已有配置
    local overwrite_env=false
    local overwrite_config=false
    if [[ -f ".env" ]]; then
        if ask_yes_no "检测到已有 .env 文件，是否覆盖重新配置？ [y/N]: " "N"; then
            overwrite_env=true
        fi
    else
        overwrite_env=true
    fi

    if [[ -f "data/config.json" ]]; then
        if ask_yes_no "检测到已有 data/config.json，是否覆盖重新配置？ [y/N]: " "N"; then
            overwrite_config=true
        fi
    else
        overwrite_config=true
    fi

    # --- 收集 .env 配置 ---
    local port="3000"
    local node_env="production"
    local mongodb_uri="mongodb://localhost:27017/school-forum"
    local mongodb_username=""
    local mongodb_password=""
    local mongodb_authsource="admin"
    local redis_host="localhost"
    local redis_port=6379
    local redis_password=""
    local jwt_secret=""
    local admin_jwt_secret=""
    local smtp_host=""
    local smtp_port=""
    local smtp_secure="true"
    local smtp_user=""
    local smtp_pass=""
    local cors_origin="http://localhost:3000"

    if [[ "$overwrite_env" == "true" ]] && is_interactive; then
        print_section "基础配置"
        while true; do
            read -p "服务端口 (默认: 3000): " port
            port=${port:-3000}
            if validate_positive_int "$port"; then
                break
            else
                log_warn "端口必须是正整数，请重新输入"
            fi
        done
        read -p "运行环境 (development/production, 默认: production): " node_env
        node_env=${node_env:-production}

        print_section "MongoDB 配置"
        read -p "MongoDB 连接字符串 (默认: mongodb://localhost:27017/school-forum): " input_uri
        mongodb_uri=${input_uri:-$mongodb_uri}
        read -p "MongoDB 用户名 (若无需认证请留空): " mongodb_username
        if [[ -n "$mongodb_username" ]]; then
            read -sp "MongoDB 密码: " mongodb_password
            echo
            read -p "认证数据库 (默认: admin): " mongodb_authsource
            mongodb_authsource=${mongodb_authsource:-admin}
        fi

        print_section "Redis 配置"
        read -p "Redis 主机 (默认: localhost): " input_host
        redis_host=${input_host:-$redis_host}
        while true; do
            read -p "Redis 端口 (默认: 6379): " input_port
            redis_port=${input_port:-6379}
            if validate_positive_int "$redis_port"; then
                break
            else
                log_warn "端口必须是正整数"
            fi
        done
        read -sp "Redis 密码 (若无请留空): " redis_password
        echo

        print_section "JWT 安全配置"
        jwt_secret=$(generate_secret)
        admin_jwt_secret=$(generate_secret)
        read -p "是否手动指定 JWT_SECRET？(强烈建议使用自动生成) [y/N]: " manual_jwt
        if [[ "$manual_jwt" =~ ^[Yy]$ ]]; then
            read -p "请输入 JWT_SECRET (至少32字符): " jwt_secret
            read -p "请输入 ADMIN_JWT_SECRET: " admin_jwt_secret
        fi

        print_section "邮件服务配置（可选）"
        read -p "SMTP 服务器 (例如 smtp.163.com): " smtp_host
        if [[ -n "$smtp_host" ]]; then
            while true; do
                read -p "SMTP 端口 (465/587, 默认: 465): " smtp_port
                smtp_port=${smtp_port:-465}
                if validate_positive_int "$smtp_port"; then
                    break
                else
                    log_warn "端口必须是数字"
                fi
            done
            read -p "是否使用 SSL/TLS? (true/false, 默认 true): " smtp_secure
            smtp_secure=${smtp_secure:-true}
            read -p "邮箱账号: " smtp_user
            read -sp "邮箱授权码/密码: " smtp_pass
            echo
        else
            add_missing "邮件服务 (SMTP) 未配置，如需发送邮件请编辑 .env 中的 SMTP_* 配置"
        fi

        print_section "CORS 白名单"
        read -p "CORS 白名单 (多个用逗号分隔, 默认 http://localhost:3000): " cors_origin
        cors_origin=${cors_origin:-"http://localhost:3000"}

        print_section "服务器 IP"
        read -p "服务器内网IP (例如192.168.2.4, 留空自动检测): " server_ip
        if [[ -z "$server_ip" ]]; then
            server_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
            [[ -n "$server_ip" ]] && log_info "自动检测到服务器 IP: $server_ip"
        fi
    elif [[ "$overwrite_env" == "true" ]] && ! is_interactive; then
        jwt_secret=$(generate_secret)
        admin_jwt_secret=$(generate_secret)
    fi

    # 写入 .env
    if [[ "$overwrite_env" == "true" ]]; then
        log_info "生成 .env 配置文件..."
        cat > .env <<EOF
# ===========================================
# 校园论坛运行配置（由部署脚本自动生成）
# ===========================================

PORT=$port
NODE_ENV=$node_env

MONGODB_URI=$mongodb_uri
MONGODB_USERNAME=$mongodb_username
MONGODB_PASSWORD=$mongodb_password
MONGODB_AUTHSOURCE=$mongodb_authsource
MONGODB_TLS=false
MONGODB_SERVER_SELECTION_TIMEOUT=10000
MONGODB_CONNECT_TIMEOUT=10000
MONGODB_SOCKET_TIMEOUT=30000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

REDIS_HOST=$redis_host
REDIS_PORT=$redis_port
REDIS_PASSWORD=$redis_password
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000

JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

ADMIN_JWT_SECRET=$admin_jwt_secret
ADMIN_JWT_EXPIRES_IN=24h

SMTP_HOST=$smtp_host
SMTP_PORT=$smtp_port
SMTP_SECURE=$smtp_secure
SMTP_USER=$smtp_user
SMTP_PASS=$smtp_pass

CORS_ORIGIN=$cors_origin
SERVER_IP=${server_ip:-}

MAX_REQUEST_SIZE=10
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_TIME=1800000

PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=false

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EOF
        log_success ".env 已生成"
    else
        log_info "保留现有 .env 文件"
    fi

    # --- 收集 data/config.json 配置 ---
    local admin_users_json="[]"
    local schools_json="[]"

    if [[ "$overwrite_config" == "true" ]] && is_interactive; then
        print_section "管理员配置"
        echo "请输入管理员 QQ 号（每行一个，输入空行结束）："
        local admin_users=()
        while true; do
            read -p "QQ号: " qq
            if [[ -z "$qq" ]]; then
                break
            elif validate_qq "$qq"; then
                admin_users+=("$qq")
            else
                log_warn "无效 QQ 号，请重新输入 (5-15位数字)"
            fi
        done
        if [[ ${#admin_users[@]} -eq 0 ]]; then
            add_missing "管理员 QQ 号未配置，请编辑 data/config.json 中的 adminUsers 数组"
        else
            admin_users_json=$(printf '%s\n' "${admin_users[@]}" | jq -R . | jq -s .)
        fi

        print_section "学校配置"
        local schools=()
        while true; do
            read -p "是否添加/编辑学校信息？ [y/N]: " add_school
            if [[ ! "$add_school" =~ ^[Yy]$ ]]; then
                break
            fi
            read -p "学校 ID (例如 TCZX): " school_id
            read -p "学校名称 (例如 天长中学): " school_name
            local class_info=()
            echo "现在为该学校添加年级班级信息 (例如: 2020年级有18个班)"
            while true; do
                read -p "添加年级班级？ [y/N]: " add_class
                if [[ ! "$add_class" =~ ^[Yy]$ ]]; then
                    break
                fi
                local year=""
                while true; do
                    read -p "年份 (例如 2020): " year
                    if validate_year "$year"; then
                        break
                    else
                        log_warn "年份必须是4位数字 (2000-2100)"
                    fi
                done
                local class_count=""
                while true; do
                    read -p "班级数量: " class_count
                    if validate_positive_int "$class_count"; then
                        break
                    else
                        log_warn "班级数量必须是正整数"
                    fi
                done
                class_info+=("{\"year\": $year, \"classCount\": $class_count}")
            done
            local class_json="[]"
            if [[ ${#class_info[@]} -gt 0 ]]; then
                class_json=$(IFS=,; echo "[${class_info[*]}]")
            fi
            schools+=("{\"id\": \"$school_id\", \"name\": \"$school_name\", \"classInfo\": $class_json}")
        done
        if [[ ${#schools[@]} -eq 0 ]]; then
            add_missing "未配置学校信息，如需支持学校班级选择，请编辑 data/config.json 中的 schools 数组"
        else
            schools_json=$(IFS=,; echo "[${schools[*]}]")
        fi
    elif [[ "$overwrite_config" == "true" ]] && ! is_interactive; then
        admin_users_json="[]"
        schools_json="[]"
        add_missing "非交互模式未配置管理员和学校信息，请手动编辑 data/config.json"
    fi

    # 写入 data/config.json
    if [[ "$overwrite_config" == "true" ]]; then
        log_info "生成 data/config.json 配置文件..."
        cat > data/config.json <<EOF
{
  "adminUsers": $admin_users_json,
  "mongodb": {
    "uri": "$mongodb_uri",
    "username": "$mongodb_username",
    "password": "$mongodb_password",
    "authSource": "$mongodb_authsource"
  },
  "redis": {
    "host": "$redis_host",
    "port": $redis_port,
    "password": "$redis_password",
    "db": 0
  },
  "upload": {
    "allowedTypes": ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
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
  "schools": $schools_json
}
EOF
        log_success "data/config.json 已生成"
        # 验证 JSON 合法性
        if command -v jq &> /dev/null; then
            if ! jq empty data/config.json 2>/dev/null; then
                log_error "生成的 JSON 无效，请检查输入（尤其是班级数量应为数字）"
                log_warn "将保留当前文件，请手动修正"
            fi
        fi
        if [[ "$admin_users_json" == "[]" ]]; then
            log_warn "未配置管理员，请稍后手动编辑 data/config.json 添加 adminUsers"
        fi
    else
        log_info "保留现有 data/config.json 文件"
    fi

    if [[ -f ".env" ]]; then
        chmod 600 .env 2>/dev/null || true
    fi
    if [[ -f "data/config.json" ]]; then
        chmod 600 data/config.json 2>/dev/null || true
    fi
}

# 安装 PM2
install_pm2() {
    log_step "安装 PM2 (进程管理器)"
    
    if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
        source "$HOME/.nvm/nvm.sh"
    fi

    local npm_prefix="$HOME/.npm-global"
    mkdir -p "$npm_prefix"
    export NPM_CONFIG_PREFIX="$npm_prefix"
    npm config set prefix "$npm_prefix" --global 2>/dev/null || true

    export PATH="$npm_prefix/bin:$PATH"
    if ! grep -q "$npm_prefix/bin" "$HOME/.bashrc" 2>/dev/null; then
        echo "export PATH=\"$npm_prefix/bin:\$PATH\"" >> "$HOME/.bashrc"
    fi

    if command -v pm2 &> /dev/null; then
        log_info "PM2 已安装: $(which pm2)"
        return
    fi

    log_info "正在安装 PM2（这可能需要几分钟）..."
    if npm install -g pm2; then
        log_success "PM2 安装完成"
    else
        log_error "PM2 安装失败，请手动执行以下命令："
        echo "  export NPM_CONFIG_PREFIX=\"\$HOME/.npm-global\""
        echo "  export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
        echo "  npm install -g pm2"
        echo "然后重新运行: pm2 start server.js --name school-forum"
        return 1
    fi

    if command -v pm2 &> /dev/null; then
        log_success "pm2 命令可用: $(which pm2)"
    else
        log_warn "pm2 命令暂时不可用，请执行 'source ~/.bashrc' 或重新登录"
    fi
}

# 启动服务
start_service() {
    if ask_yes_no "是否现在启动论坛服务？ [Y/n]: " "Y"; then
        if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
            source "$HOME/.nvm/nvm.sh"
        fi
        export PATH="$HOME/.npm-global/bin:$PATH"

        if command -v pm2 &> /dev/null; then
            if pm2 start server.js --name school-forum; then
                log_success "服务已启动 (PM2)"
                pm2 save
                pm2 startup &> /dev/null || true
            else
                log_error "PM2 启动失败，请手动运行 'npm start' 检查错误"
            fi
        else
            log_warn "pm2 命令未找到，尝试使用 npm start 前台运行"
            log_warn "按 Ctrl+C 停止服务，建议稍后重新登录再试 PM2"
            npm start
        fi
    fi
}

# 完成提示
show_complete() {
    echo ""
    echo -e "${GREEN}========================================================${NC}"
    echo -e "${GREEN}                      部署完成！${NC}"
    echo -e "${GREEN}========================================================${NC}"
    echo ""
    
    if [[ ${#MISSING_CONFIGS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}[WARN] 以下配置项尚未填写，请手动配置后再使用论坛：${NC}"
        for item in "${MISSING_CONFIGS[@]}"; do
            echo "  - $item"
        done
        echo ""
        echo -e "${YELLOW}配置文件位置：${NC}"
        echo "  环境变量: $(pwd)/.env"
        echo "  业务配置: $(pwd)/data/config.json"
        echo ""
    else
        echo -e "${GREEN}[SUCCESS] 所有必需配置已填写完整，论坛可立即使用。${NC}"
        echo ""
    fi
    
    echo -e "${CYAN}后续步骤：${NC}"
    echo "  1. 如需邮件功能，确认 SMTP 配置正确"
    echo "  2. 检查 .env 和 data/config.json 中其他可选配置"
    echo ""
    echo -e "${CYAN}常用命令：${NC}"
    echo "  pm2 start server.js --name school-forum   # 启动"
    echo "  pm2 logs school-forum                     # 查看日志"
    echo "  pm2 restart school-forum                  # 重启"
    echo "  pm2 stop school-forum                     # 停止"
    echo ""
    echo -e "${BOLD}访问论坛: ${GREEN}http://localhost:$(grep ^PORT .env 2>/dev/null | cut -d= -f2 || echo 3000)${NC}"
    echo ""
}

# 主函数
main() {
    print_banner
    check_root
    detect_os

    if ask_yes_no "是否配置清华镜像加速下载？(推荐) [Y/n]: " "Y"; then
        smart_switch_mirror
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

main "$@"