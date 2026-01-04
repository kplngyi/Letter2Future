# Letter2Future CentOS/RHEL 部署指南

## 🎯 适用系统
- CentOS 7 / 8 / 9
- Rocky Linux 8 / 9
- AlmaLinux 8 / 9
- Red Hat Enterprise Linux (RHEL) 7 / 8 / 9

---

## 🚀 快速部署

### 方式一：一键自动部署（推荐）

```bash
# 1. SSH 连接到 CentOS 服务器
ssh root@你的服务器IP

# 2. 安装 Git
yum install -y git
# 或 CentOS 8+
dnf install -y git

# 3. 克隆项目
cd /var/www
git clone https://github.com/kplngyi/Letter2Future.git
cd Letter2Future

# 4. 运行 CentOS 专用部署脚本
bash deploy-centos.sh

# 脚本会自动：
# - 安装 Node.js 18
# - 安装 PM2
# - 安装 Nginx
# - 配置 SELinux
# - 配置 firewalld
# - 启动应用
```

---

## 🔧 CentOS 特殊配置

### 1. SELinux 配置（重要！）

CentOS 默认启用 SELinux，需要配置允许 Nginx 连接到 Node.js：

```bash
# 查看 SELinux 状态
getenforce

# 允许 HTTP 网络连接
setsebool -P httpd_can_network_connect 1

# 如果需要完全禁用 SELinux（不推荐）
# sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
# reboot
```

### 2. 防火墙配置（firewalld）

CentOS 使用 firewalld 而不是 ufw：

```bash
# 启动防火墙
systemctl start firewalld
systemctl enable firewalld

# 开放端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp

# 重载配置
firewall-cmd --reload

# 查看已开放的端口
firewall-cmd --list-all
```

### 3. Nginx 配置位置

CentOS 的 Nginx 配置结构不同：

```bash
# 配置文件位置
/etc/nginx/nginx.conf              # 主配置
/etc/nginx/conf.d/*.conf          # 站点配置（推荐）

# 日志位置
/var/log/nginx/access.log
/var/log/nginx/error.log

# 重启服务
systemctl restart nginx
systemctl enable nginx
```

---

## 📋 手动部署步骤（CentOS）

### 步骤 1: 更新系统

```bash
# CentOS 7
yum update -y
yum install -y epel-release

# CentOS 8+
dnf update -y
dnf install -y epel-release
```

### 步骤 2: 安装 Node.js 18

```bash
# 添加 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# CentOS 7
yum install -y nodejs

# CentOS 8+
dnf install -y nodejs

# 验证安装
node -v   # 应显示 v18.x.x
npm -v
```

### 步骤 3: 安装 PM2

```bash
npm install -g pm2

# 验证安装
pm2 -v
```

### 步骤 4: 安装 Nginx

```bash
# CentOS 7
yum install -y nginx

# CentOS 8+
dnf install -y nginx

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 验证
systemctl status nginx
```

### 步骤 5: 克隆项目

```bash
# 安装 Git
yum install -y git   # CentOS 7
# 或
dnf install -y git   # CentOS 8+

# 创建目录
mkdir -p /var/www
cd /var/www

# 克隆项目
git clone https://github.com/kplngyi/Letter2Future.git
cd Letter2Future
```

### 步骤 6: 配置环境变量

```bash
cp .env.example .env.local
vi .env.local
```

配置内容：
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的邮箱@gmail.com
SMTP_PASS=你的应用专用密码
SMTP_FROM=Letter2Future <你的邮箱@gmail.com>

ENABLE_SCHEDULER=true
NEXT_PUBLIC_BASE_URL=http://你的服务器IP
```

### 步骤 7: 安装依赖并构建

```bash
cd /var/www/Letter2Future
npm install
npm run build
```

### 步骤 8: 启动应用

```bash
pm2 start npm --name "letter2future" -- start
pm2 startup
pm2 save
```

### 步骤 9: 配置 Nginx

创建配置文件：
```bash
vi /etc/nginx/conf.d/letter2future.conf
```

配置内容：
```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /var/log/nginx/letter2future.access.log;
    error_log /var/log/nginx/letter2future.error.log;
}
```

测试并重启：
```bash
nginx -t
systemctl restart nginx
```

### 步骤 10: 配置 SELinux

```bash
# 允许 Nginx 连接到应用
setsebool -P httpd_can_network_connect 1

# 验证
getsebool httpd_can_network_connect
```

### 步骤 11: 配置防火墙

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

---

## ✅ 验证部署

```bash
# 1. 检查应用
pm2 status
pm2 logs letter2future

# 2. 检查 Nginx
systemctl status nginx
curl http://localhost

# 3. 检查防火墙
firewall-cmd --list-all

# 4. 检查 SELinux
getenforce
getsebool httpd_can_network_connect

# 5. 测试邮件
cd /var/www/Letter2Future
node test-email.js
```

浏览器访问：`http://你的服务器IP`

---

## 🔒 配置 HTTPS（CentOS）

### 安装 Certbot

```bash
# CentOS 7
yum install -y certbot python2-certbot-nginx

# CentOS 8+
dnf install -y certbot python3-certbot-nginx
```

### 获取证书

```bash
certbot --nginx -d 你的域名

# 测试自动续期
certbot renew --dry-run
```

---

## 🐛 CentOS 常见问题

### 问题1：SELinux 阻止连接

**症状：** Nginx 502 Bad Gateway

**解决：**
```bash
# 查看 SELinux 日志
ausearch -m avc -ts recent

# 允许连接
setsebool -P httpd_can_network_connect 1

# 或临时禁用 SELinux 测试
setenforce 0
# 如果可以访问，说明是 SELinux 问题
```

### 问题2：防火墙阻止访问

**症状：** 外网无法访问

**解决：**
```bash
# 检查防火墙状态
systemctl status firewalld

# 开放端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# 或临时关闭测试
systemctl stop firewalld
# 如果可以访问，说明是防火墙问题
```

### 问题3：端口冲突

**症状：** Nginx 或 Node.js 启动失败

**解决：**
```bash
# 查看端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 80

# 杀死占用进程
kill -9 PID
```

### 问题4：云服务商安全组

**症状：** 配置都正确但外网仍无法访问

**解决：**
在云服务商控制台（阿里云、腾讯云等）的安全组中开放：
- 22 端口（SSH）
- 80 端口（HTTP）
- 443 端口（HTTPS）

---

## 🔧 CentOS 专用管理命令

### 系统服务管理
```bash
# 查看服务状态
systemctl status nginx
systemctl status firewalld

# 重启服务
systemctl restart nginx
systemctl restart firewalld

# 开机自启
systemctl enable nginx
systemctl enable firewalld

# 查看日志
journalctl -u nginx -f
```

### 包管理
```bash
# CentOS 7
yum search package-name
yum install package-name
yum remove package-name
yum list installed

# CentOS 8+
dnf search package-name
dnf install package-name
dnf remove package-name
dnf list installed
```

### 防火墙管理
```bash
# 查看所有规则
firewall-cmd --list-all

# 添加端口
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload

# 删除端口
firewall-cmd --permanent --remove-port=8080/tcp
firewall-cmd --reload

# 查看活动区域
firewall-cmd --get-active-zones
```

---

## 📊 性能优化（CentOS）

### 1. 调整系统限制

```bash
# 编辑系统限制
vi /etc/security/limits.conf

# 添加
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536

# 重新登录生效
```

### 2. 优化 Nginx

```bash
vi /etc/nginx/nginx.conf

# 调整 worker_processes
worker_processes auto;
worker_connections 1024;
```

### 3. PM2 集群模式

```bash
pm2 delete letter2future
pm2 start npm --name "letter2future" -i 2 -- start
```

---

## 📈 监控和日志

### 查看系统资源
```bash
# CPU 和内存
top
htop  # 需要先安装: yum install htop

# 磁盘使用
df -h

# 内存详情
free -h
```

### 应用日志
```bash
# PM2 日志
pm2 logs letter2future
pm2 logs letter2future --lines 100

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -xe
journalctl -u nginx -f
```

---

## 🔄 更新应用

```bash
cd /var/www/Letter2Future
git pull
npm install
npm run build
pm2 restart letter2future
```

---

## 📞 获取帮助

**CentOS 相关资源：**
- [CentOS 官方文档](https://docs.centos.org/)
- [Rocky Linux 文档](https://docs.rockylinux.org/)
- [AlmaLinux 文档](https://wiki.almalinux.org/)

**常用命令对照表：**

| Ubuntu | CentOS 7 | CentOS 8+ |
|--------|----------|-----------|
| apt | yum | dnf |
| ufw | firewalld | firewalld |
| service | systemctl | systemctl |

---

## ✅ CentOS 部署检查清单

- [ ] 系统已更新
- [ ] Node.js 18 已安装
- [ ] PM2 已安装
- [ ] Nginx 已安装并运行
- [ ] 项目代码已部署
- [ ] `.env.local` 已配置
- [ ] 应用已构建 (`npm run build`)
- [ ] PM2 已启动应用
- [ ] Nginx 配置正确
- [ ] SELinux 已配置
- [ ] firewalld 已开放端口
- [ ] 云服务商安全组已开放端口
- [ ] 外网可访问网站
- [ ] 邮件发送测试通过
- [ ] PM2 开机自启已配置

---

需要帮助？运行以下命令检查：
```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/kplngyi/Letter2Future/main/check-centos.sh)"
```
