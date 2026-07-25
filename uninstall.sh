#!/bin/bash

# =======================================================
# 校园论坛系统 - 卸载脚本
# 与 deploy.sh 配套，用于卸载所安装的依赖 / 删除项目文件
#
# 支持三种模式：
#   1) 完全卸载        —— 卸依赖 + 删项目文件（含可选删数据卷）
#   2) 仅删项目文件    —— 保留已安装的依赖（PM2/Docker/Node 等）
#   3) 仅卸依赖        —— 保留项目文件（源码、配置都留着）
#   4) 自定义          —— 逐项询问，精确控制
#
# 安全设计：
#   - 删项目目录前，自动备份 .env 与 data/config.json 到时间戳目录
#   - 删除 MongoDB 数据卷（论坛所有帖子/用户数据）需红色警告 + 二次确认
#   - Node.js 默认不卸载（多为全局共享，误删会影响其它项目）
#   - 系统通用工具（curl/git/jq 等）一律不卸
# =======================================================

set -u  # 卸载过程要容错，故不用 set -e

# ---------- 可配置项 ----------
PROJECT_DIR="${PROJECT_DIR:-$HOME/project/school-forum}"
APP_NAME="school-forum"                 # PM2 应用名
MONGO_CONTAINER="mongodb44"             # 直接 docker run 时的容器名（回退用）
NPM_GLOBAL_DIR="$HOME/.npm-global"      # deploy.sh 里 PM2 的全局安装前缀

# ---------- 颜色 ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}--- $1 ---${NC}\n"; }

is_interactive() { [[ -t 0 ]] && [[ -t 1 ]]; }

# 通用 y/n 询问（默认值 Y 或 N）
ask_yes_no() {
    local prompt="$1" default="$2" answer
    if is_interactive; then
        echo -en "${CYAN}[?] $prompt ${NC}"
        read answer
        case "$answer" in
            [Yy]) return 0 ;;
            [Nn]) return 1 ;;
            *) [[ "$default" == "Y" ]] && return 0 || return 1 ;;
        esac
    else
        [[ "$default" == "Y" ]] && return 0 || return 1
    fi
}

# 高危操作：必须完整输入 yes 才继续
confirm_danger() {
    local prompt="$1" answer
    echo -en "${RED}${BOLD}$prompt${NC} "
    if is_interactive; then
        read answer
        [[ "$answer" == "yes" ]]
    else
        return 1   # 非交互默认拒绝高危操作
    fi
}

# sudo 探测
if [[ $EUID -ne 0 ]]; then
    if command -v sudo &> /dev/null; then SUDO="sudo"; else SUDO=""; fi
else
    SUDO=""
fi

# 找到 pm2 命令（当前 shell 可能没把 ~/.npm-global/bin 加进 PATH）
find_pm2() {
    if command -v pm2 &> /dev/null; then
        echo "pm2"
    elif [[ -x "$NPM_GLOBAL_DIR/bin/pm2" ]]; then
        echo "$NPM_GLOBAL_DIR/bin/pm2"
    else
        echo ""
    fi
}

# 找到 docker compose 命令
compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# ======================================================
# 步骤函数
# ======================================================

# 1) 停止并从 PM2 移除论坛应用
stop_pm2_app() {
    log_step "停止 PM2 中的论坛应用"
    local PM2; PM2="$(find_pm2)"
    if [[ -z "$PM2" ]]; then
        log_info "未找到 pm2 命令，跳过（应用可能未用 PM2 托管）"
        return
    fi
    if "$PM2" list 2>/dev/null | grep -q "$APP_NAME"; then
        "$PM2" stop "$APP_NAME"   >/dev/null 2>&1 || true
        "$PM2" delete "$APP_NAME" >/dev/null 2>&1 || true
        "$PM2" save --force        >/dev/null 2>&1 || true
        log_success "已从 PM2 停止并移除应用 '$APP_NAME'"
    else
        log_info "PM2 中没有名为 '$APP_NAME' 的应用，跳过"
    fi
}

# 2) 停止 MongoDB(Docker)，可选删除数据卷
stop_mongo_docker() {
    local remove_volume="$1"   # true=连数据卷一起删
    log_step "停止 MongoDB (Docker)"

    if ! command -v docker &> /dev/null; then
        log_info "未安装 Docker，跳过"
        return
    fi
    if ! docker info >/dev/null 2>&1; then
        log_info "Docker 守护进程未运行，尝试启动以便清理..."
        $SUDO service docker start >/dev/null 2>&1 || $SUDO systemctl start docker >/dev/null 2>&1 || true
        sleep 2
    fi

    local CMP; CMP="$(compose_cmd)"
    local down_ok=false
    if [[ -n "$CMP" && -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        if [[ "$remove_volume" == "true" ]]; then
            log_warn "将执行 'docker compose down -v'（连同数据卷一并删除）"
            ( cd "$PROJECT_DIR" && $CMP down -v ) && down_ok=true
        else
            ( cd "$PROJECT_DIR" && $CMP down ) && down_ok=true
        fi
    fi

    # 回退：compose 不可用或项目目录已删时，直接按容器名清理
    if [[ "$down_ok" != "true" ]]; then
        if docker ps -a --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
            docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true
            log_info "已删除容器 $MONGO_CONTAINER"
        fi
        if [[ "$remove_volume" == "true" ]]; then
            # 兼容两种卷名：带 compose 前缀的 与 裸名
            for v in $(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -i "mongodb44-data"); do
                docker volume rm "$v" >/dev/null 2>&1 && log_info "已删除数据卷 $v" || true
            done
        fi
    fi

    if [[ "$remove_volume" == "true" ]]; then
        log_success "MongoDB 容器与数据卷已删除"
    else
        log_success "MongoDB 容器已停止（数据卷已保留）"
    fi
}

# 3) 卸载全局 PM2
uninstall_pm2_global() {
    log_step "卸载全局 PM2"
    local PM2; PM2="$(find_pm2)"
    if [[ -n "$PM2" ]]; then
        "$PM2" kill >/dev/null 2>&1 || true   # 杀掉 PM2 守护进程
    fi
    if command -v npm &> /dev/null; then
        NPM_CONFIG_PREFIX="$NPM_GLOBAL_DIR" npm uninstall -g pm2 >/dev/null 2>&1 || true
    fi
    # 清理 deploy.sh 建立的全局前缀目录（仅当里面只有 npm 全局包）
    if [[ -d "$NPM_GLOBAL_DIR" ]]; then
        if ask_yes_no "是否删除全局 npm 目录 $NPM_GLOBAL_DIR？(PM2 就装在这里) [y/N]: " "N"; then
            rm -rf "$NPM_GLOBAL_DIR" && log_success "已删除 $NPM_GLOBAL_DIR"
        else
            log_info "保留 $NPM_GLOBAL_DIR"
        fi
    fi
    log_success "PM2 卸载完成"
}

# 4) 卸载 Redis（仅当通过 apt 安装过）
uninstall_redis() {
    log_step "卸载 Redis"
    if dpkg -l 2>/dev/null | grep -qE '^ii\s+redis-server'; then
        if command -v systemctl &> /dev/null && systemctl --no-pager status >/dev/null 2>&1; then
            $SUDO systemctl stop redis >/dev/null 2>&1 || true
            $SUDO systemctl disable redis >/dev/null 2>&1 || true
        else
            $SUDO service redis-server stop >/dev/null 2>&1 || $SUDO service redis stop >/dev/null 2>&1 || true
        fi
        $SUDO apt remove -y redis-server >/dev/null 2>&1 || true
        $SUDO apt autoremove -y >/dev/null 2>&1 || true
        log_success "Redis 已卸载"
    else
        log_info "未通过 apt 安装 Redis，跳过"
    fi
}

# 5) 卸载 Node.js（默认不做，高危，全局共享）
uninstall_node() {
    log_step "卸载 Node.js（高风险）"
    log_warn "Node.js 通常是多个项目共享的全局环境，卸载会影响其它项目！"
    if [[ -d "$HOME/.nvm" ]]; then
        if ask_yes_no "检测到 nvm，是否删除 ~/.nvm（含所有 nvm 安装的 node）？ [y/N]: " "N"; then
            rm -rf "$HOME/.nvm" && log_success "已删除 ~/.nvm"
            log_info "请手动清理 ~/.bashrc 中的 NVM 相关行"
        fi
    fi
    local node_path; node_path="$(command -v node 2>/dev/null || true)"
    if [[ "$node_path" == /usr/local/* ]]; then
        log_warn "检测到手动安装的 Node：$node_path（$(node -v 2>/dev/null)）"
        if confirm_danger "确认删除该 Node 吗？会影响所有依赖它的项目。输入 yes 继续："; then
            $SUDO rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx 2>/dev/null || true
            $SUDO rm -rf /opt/node-* 2>/dev/null || true
            log_success "已删除手动安装的 Node（软链与 /opt/node-*）"
        else
            log_info "已取消，保留 Node"
        fi
    else
        log_info "未发现可安全卸载的 Node，跳过（如为 apt 安装可手动 apt remove nodejs）"
    fi
}

# 6) 备份配置并删除项目目录
remove_project_dir() {
    log_step "删除项目文件"
    if [[ ! -d "$PROJECT_DIR" ]]; then
        log_info "项目目录不存在：$PROJECT_DIR，跳过"
        return
    fi

    # 自动备份关键配置
    local backup_dir="$HOME/school-forum-backup-$(date +%Y%m%d-%H%M%S)"
    local backed=false
    for rel in ".env" "data/config.json"; do
        if [[ -f "$PROJECT_DIR/$rel" ]]; then
            mkdir -p "$backup_dir/$(dirname "$rel")"
            cp -p "$PROJECT_DIR/$rel" "$backup_dir/$rel" && backed=true
        fi
    done
    if [[ "$backed" == "true" ]]; then
        log_success "已备份 .env / data/config.json 到：$backup_dir"
    else
        log_info "未发现可备份的配置文件"
    fi

    echo -e "${RED}${BOLD}⚠️  即将删除整个项目目录：$PROJECT_DIR${NC}"
    if confirm_danger "此操作不可恢复（配置已备份）。输入 yes 确认删除："; then
        rm -rf "$PROJECT_DIR" && log_success "已删除项目目录 $PROJECT_DIR"
    else
        log_info "已取消，保留项目目录"
    fi
}

# 7) 清理 deploy.sh 往 shell 启动文件里追加的行
cleanup_shell_hooks() {
    log_step "清理 shell 启动文件中的相关行"
    local changed=false
    for rc in "$HOME/.bashrc" "$HOME/.profile"; do
        [[ -f "$rc" ]] || continue
        if grep -qE 'npm-global/bin|service docker start' "$rc" 2>/dev/null; then
            cp -p "$rc" "$rc.bak.$(date +%s)"
            # 删除 npm-global PATH 行 与 docker 自启行（保守：仅删明确匹配的行）
            sed -i '/npm-global\/bin/d' "$rc"
            sed -i '/# npm global bin (pm2 etc.)/d' "$rc"
            sed -i '/service docker start/d' "$rc"
            changed=true
            log_info "已清理 $rc（原文件备份为 $rc.bak.*）"
        fi
    done
    [[ "$changed" == "true" ]] && log_success "shell 启动文件清理完成" || log_info "无需清理"
}

# ======================================================
# 主流程
# ======================================================
print_banner() {
    echo -e "${CYAN}"
    echo "========================================================"
    echo "            校园论坛系统 - 卸载脚本"
    echo "========================================================"
    echo -e "${NC}"
}

main() {
    print_banner

    echo "请选择卸载模式："
    echo "  1) 完全卸载      —— 卸载依赖 + 删除项目文件"
    echo "  2) 仅删项目文件  —— 保留已安装的依赖（PM2/Docker/Node）"
    echo "  3) 仅卸载依赖    —— 保留项目文件（源码/配置都留着）"
    echo "  4) 自定义        —— 逐项询问"
    echo "  0) 退出"
    echo -en "${CYAN}[?] 请输入 [0-4]: ${NC}"
    read mode

    case "$mode" in
        1)  # 完全卸载
            log_warn "模式：完全卸载（依赖 + 项目文件）"
            stop_pm2_app
            local del_vol=false
            echo -e "${RED}${BOLD}⚠️  数据卷含论坛全部帖子/用户数据，删除后无法恢复！${NC}"
            if ask_yes_no "是否一并删除 MongoDB 数据卷？ [y/N]: " "N"; then del_vol=true; fi
            stop_mongo_docker "$del_vol"
            uninstall_pm2_global
            uninstall_redis
            remove_project_dir
            cleanup_shell_hooks
            log_info "Node.js 默认保留。如需卸载，请单独运行『自定义』模式。"
            ;;
        2)  # 仅删项目文件
            log_warn "模式：仅删除项目文件，保留依赖"
            stop_pm2_app
            local del_vol=false
            if ask_yes_no "项目要删了，是否也删除 MongoDB 数据卷（帖子数据）？ [y/N]: " "N"; then del_vol=true; fi
            stop_mongo_docker "$del_vol"
            remove_project_dir
            log_success "依赖（PM2/Docker/Node）已保留。"
            ;;
        3)  # 仅卸依赖
            log_warn "模式：仅卸载依赖，保留项目文件"
            stop_pm2_app
            local del_vol=false
            echo -e "${RED}${BOLD}⚠️  数据卷含论坛全部数据！${NC}"
            if ask_yes_no "是否删除 MongoDB 数据卷？ [y/N]: " "N"; then del_vol=true; fi
            stop_mongo_docker "$del_vol"
            uninstall_pm2_global
            uninstall_redis
            cleanup_shell_hooks
            log_info "Node.js 默认保留。项目文件已保留在 $PROJECT_DIR"
            ;;
        4)  # 自定义
            log_warn "模式：自定义（逐项询问）"
            ask_yes_no "停止并从 PM2 移除论坛应用？ [Y/n]: " "Y" && stop_pm2_app
            if ask_yes_no "停止 MongoDB(Docker)？ [Y/n]: " "Y"; then
                local del_vol=false
                echo -e "${RED}${BOLD}⚠️  数据卷含论坛全部数据！${NC}"
                ask_yes_no "同时删除数据卷？ [y/N]: " "N" && del_vol=true
                stop_mongo_docker "$del_vol"
            fi
            ask_yes_no "卸载全局 PM2？ [y/N]: " "N" && uninstall_pm2_global
            ask_yes_no "卸载 Redis（若装过）？ [y/N]: " "N" && uninstall_redis
            ask_yes_no "卸载 Node.js（高风险，影响其它项目）？ [y/N]: " "N" && uninstall_node
            ask_yes_no "删除项目文件（会先备份配置）？ [y/N]: " "N" && remove_project_dir
            ask_yes_no "清理 shell 启动文件中追加的行？ [y/N]: " "N" && cleanup_shell_hooks
            ;;
        0)  log_info "已退出，未做任何更改"; exit 0 ;;
        *)  log_error "无效选择：$mode"; exit 1 ;;
    esac

    echo ""
    echo -e "${GREEN}========================================================${NC}"
    echo -e "${GREEN}                    卸载流程结束${NC}"
    echo -e "${GREEN}========================================================${NC}"
    echo -e "提示：如删除了项目，配置备份在 ${BOLD}\$HOME/school-forum-backup-*${NC}"
    echo -e "      系统通用工具（curl/git/jq 等）与 Node.js 默认未卸载。"
}

main "$@"
