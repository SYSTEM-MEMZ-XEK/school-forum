# 校园论坛系统服务器部署指南

本文档指导您将校园论坛系统部署到 Ubuntu 服务器上，并使用清华大学开源软件镜像源加速软件下载。请确保您已在本地完成论坛的配置（如 `config.json` 等），并将配置好的项目文件上传到服务器。

---

## 1. 前提条件
- 一台运行 Ubuntu 20.04 或更高版本的服务器（本文以 Ubuntu 20.04/22.04 为例）。
- 拥有服务器的 SSH 访问权限（用户名和密码或密钥）。
- 本地已配置好的论坛项目压缩包（如 `forum.zip` 或 `forum.tar.gz`），其中已包含正确的配置文件（如数据库连接、邮箱 SMTP 等）。
- 基本熟悉 Linux 命令行操作。

---

## 2. 连接服务器
使用 **MobaXterm**（或其他 SSH 客户端）连接到您的服务器：
- 打开 MobaXterm，点击“Session” -> “SSH”。
- 输入服务器 IP 地址和用户名（例如 `ubuntu` 或 `root`），点击“OK”。
- 输入密码或使用密钥登录。

---

## 3. 配置系统软件源为清华源（可选但推荐）
为了加快软件包下载速度，可将 Ubuntu 的 apt 源更换为清华大学镜像源。

### 3.1 备份原 sources.list
```bash
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak
```

### 3.2 替换为清华源
根据您的 Ubuntu 版本，执行以下命令自动替换（以 20.04 和 22.04 为例）：
```bash
# 如果是 Ubuntu 20.04 (focal)
sudo sed -i 's/archive.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
sudo sed -i 's/security.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list

# 如果是 Ubuntu 22.04 (jammy)，同样适用以上命令（因为域名结构相同）
```
或者直接使用清华源提供的脚本（需联网）：
```bash
# 自动检测版本并替换
curl -s https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/ | sudo bash
```

### 3.3 更新软件包列表
```bash
sudo apt update
sudo apt upgrade -y   # 可选，升级所有软件包
```

---

## 4. 安装基础工具
```bash
sudo apt install -y curl git unzip tar
```

---

## 5. 安装 Node.js 24（使用清华镜像）

### 5.1 安装 nvm（Node Version Manager）
```bash
# 使用清华镜像加速下载 nvm 安装脚本
export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/
curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
```
> 注：如果直接使用官方 nvm 安装脚本（raw.githubusercontent.com）可能较慢，这里使用了 Gitee 上的镜像。

安装完成后，重新加载环境变量：
```bash
source ~/.bashrc
```

### 5.2 使用 nvm 安装 Node.js 24
```bash
# 设置 Node.js 下载镜像为清华源（加速二进制下载）
export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/
nvm install 24
nvm alias default 24
```

### 5.3 验证安装
```bash
node -v   # 应输出 v24.14.0 或类似
npm -v    # 应输出 11.9.0 或类似
```

### 5.4 配置 npm 使用国内镜像（可选但推荐）
```bash
npm config set registry https://registry.npmmirror.com
```
> 说明：使用淘宝 NPM 镜像（已迁移至 npmmirror），国内访问速度快。

---

## 6. 安装 MongoDB（使用清华镜像）

### 6.1 导入 MongoDB 公钥
```bash
sudo apt install -y gnupg
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu/pool/main/m/mongodb-org/ | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server.gpg
```
> 注：清华镜像站也提供了 MongoDB 的公钥，但直接使用官方公钥亦可，此处为统一镜像，可改用从清华下载公钥。为简化，可直接使用官方公钥（官方公钥下载也很快）：
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
```

### 6.2 添加 MongoDB 清华源
```bash
. /etc/os-release
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

### 6.3 更新并安装 MongoDB
```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 6.4 启动 MongoDB 并设置开机自启
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 6.5 检查 MongoDB 运行状态
```bash
sudo systemctl status mongod
```

### 6.6 备用方案：若 CPU 不支持 AVX2 指令集（安装 MongoDB 4.4.30）
某些旧款 CPU 不支持 AVX2，MongoDB 6.0 无法运行。此时请安装 4.4.30 版本：

1. 添加 4.4 清华源：
   ```bash
   . /etc/os-release
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-4.4.gpg ] https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
   ```
   （需要先导入 4.4 公钥，可从官方或清华获取）
2. 更新并安装指定版本：
   ```bash
   sudo apt update
   sudo apt install -y mongodb-org=4.4.30 mongodb-org-server=4.4.30 mongodb-org-shell=4.4.30 mongodb-org-mongos=4.4.30 mongodb-org-tools=4.4.30
   ```
3. 启动并设置开机自启。

---

## 7. 安装 Redis（可选）
如果您的论坛系统使用 Redis 存储会话或验证码，建议安装。
```bash
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```
验证 Redis 运行：
```bash
sudo systemctl status redis-server
```

---

## 8. 上传项目代码
1. 在 MobaXterm 左侧的文件浏览器中，导航到您希望存放项目的目录（例如 `/home/你的用户名/`）。  
   **注意**：将“你的用户名”替换为实际的服务器用户名，或直接使用 `cd ~` 进入家目录。

2. 从本地 Windows 文件夹中直接拖拽项目压缩包（如 `forum.zip`）到该目录。

3. 解压文件：
   ```bash
   # 如果是 zip 包
   unzip forum.zip -d forum   # 将内容解压到 forum 文件夹
   # 如果是 tar.gz 包
   tar -xzf forum.tar.gz
   ```
   解压后进入项目目录：
   ```bash
   cd forum   # 根据实际解压出的文件夹名调整
   ```

---

## 9. 安装 Node.js 依赖
在项目目录下执行：
```bash
npm install
```
由于已配置 npm 国内镜像，依赖下载速度会明显提升。

---

## 10. 测试运行
在项目目录下启动论坛应用（请根据实际入口文件调整，常见为 `server.js` 或 `app.js`）：
```bash
node server.js
# 或
npm start
```
如果控制台输出类似 `Server running on port 3000` 的信息，说明运行成功。  
此时可以暂时关闭终端（按 `Ctrl+C` 停止），进入下一步持久化运行。

---

## 11. 使用 PM2 持久化运行
PM2 可以让 Node.js 应用在后台运行，并在服务器重启后自动启动。

### 11.1 安装 PM2
```bash
sudo npm install -g pm2
```

### 11.2 启动应用
请确认项目的入口文件名（如 `server.js`、`app.js`、`index.js`）。以下以 `server.js` 为例：
```bash
pm2 start server.js --name forum
```
- `--name forum` 指定进程名为 `forum`，便于管理。

### 11.3 保存当前进程列表
```bash
pm2 save
```

### 11.4 设置开机自启
```bash
pm2 startup
```
执行后，终端会输出一行带有 `sudo env` 的命令，**请复制并执行该命令**。例如：
```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u 你的用户名 --hp /home/你的用户名
```
执行完成后，PM2 将在系统启动时自动恢复进程。

### 11.5 常用 PM2 命令
- 查看运行状态：`pm2 status`
- 查看日志：`pm2 logs forum`
- 重启应用：`pm2 restart forum`
- 停止应用：`pm2 stop forum`

---

## 12. 防火墙放行应用端口
假设您的论坛运行在 3000 端口，执行：
```bash
sudo ufw allow 3000/tcp
```
如果启用了 UFW 防火墙，还需确保 SSH 端口（22）已放行，以免断开连接：
```bash
sudo ufw allow 22/tcp
sudo ufw enable   # 如果 UFW 未启用
```

---

## 13. 访问论坛
在浏览器中输入 `http://你的服务器IP:3000`，即可看到论坛首页。

---

## 14. 常见问题排查

### 14.1 MongoDB 连接失败
- 检查 MongoDB 是否运行：`sudo systemctl status mongod`
- 确认项目配置文件（如 `config.json`）中的数据库连接字符串是否正确，例如：
  ```json
  "mongodb": "mongodb://localhost:27017/forum"
  ```
- 检查 MongoDB 端口（默认 27017）是否被占用或防火墙阻止。

### 14.2 邮件发送失败
- 确认 QQ 邮箱已开启 SMTP 服务并生成授权码，已在配置文件中正确填写。
- 如果使用 163 邮箱，需修改 `MAIL_HOST` 为 `smtp.163.com`，端口 465 并设置 `secure: true`。
- 检查服务器能否访问外网（如 `ping smtp.qq.com`）。

### 14.3 Redis 连接失败
- 检查 Redis 运行状态：`sudo systemctl status redis-server`
- 查看 `redisUtils.js` 或配置文件中 Redis 连接参数（默认无密码，主机 127.0.0.1:6379）。

### 14.4 图片上传失败
- 确保 `public/images` 目录存在且有写权限：
  ```bash
  mkdir -p public/images
  chmod 755 public/images
  ```
- 检查 `config.json` 中的上传限制（如文件大小、允许类型）是否合理。

### 14.5 管理员后台无法访问（权限问题）
- 确认您的 QQ 号或用户 ID 已添加到项目配置文件中的 `adminUsers` 数组。
- 重启应用使配置生效：`pm2 restart forum`

### 14.6 PM2 启动后无法访问
- 检查应用是否监听正确的端口：`pm2 logs forum` 查看错误日志。
- 确认防火墙已放行该端口。
- 检查是否使用了 `0.0.0.0` 作为监听地址（有些框架默认只监听 `127.0.0.1`，需修改为 `0.0.0.0` 才能对外访问）。

---

按照以上步骤，您应该能够顺利将校园论坛系统部署到服务器上，并且所有软件包均从清华大学镜像源加速下载。如果遇到其他问题，请根据错误提示结合常见问题部分进行排查，或咨询项目维护者。