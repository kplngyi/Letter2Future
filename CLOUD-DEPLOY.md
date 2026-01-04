# Letter2Future 云服务器部署实战指南

## 🎯 适用场景
使用阿里云ECS、腾讯云CVM、AWS EC2等云服务器，完整功能包括：
- ✅ 自动调度器每分钟检查待发送邮件
- ✅ SQLite 数据库持久化存储
- ✅ 完全掌控服务器环境

---

## 📋 准备工作

### 1. 购买云服务器
推荐配置：
- **CPU**: 1核（够用）
- **内存**: 1GB-2GB
- **带宽**: 1M（够用）
- **系统**: Ubuntu 20.04 或 22.04
- **费用**: 约￥100/年

### 2. 准备域名（可选）
- 在云服务商购买域名
- 配置 A 记录指向服务器 IP
- 示例：letter.yourdomain.com → 123.45.67.89

### 3. 准备 SMTP 邮箱
- Gmail：需开启"应用专用密码"
- QQ邮箱：需开启SMTP服务并获取授权码
- 163邮箱：同QQ邮箱

---

## 🚀 部署步骤

### 第一步：连接服务器

**Windows 用户：**
```bash
# 使用 PowerShell 或下载 PuTTY
ssh root@你的服务器IP
```

**Mac/Linux 用户：**
```bash
ssh root@你的服务器IP
# 输入密码
```

### 第二步：安装基础环境

```bash
# 更新系统包
apt update && apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证安装
node -v   # 应显示 v18.x.x
npm -v    # 应显示 9.x.x

# 安装 PM2 进程管理器
npm install -g pm2

# 安装 Git
apt install -y git

# 安装 Nginx（用于反向代理）
apt install -y nginx
```

### 第三步：上传代码

**方式 A：使用 Git（推荐）**
```bash
# 创建应用目录
mkdir -p /var/www
cd /var/www

# 克隆你的仓库
git clone https://github.com/kplngyi/Letter2Future.git
cd Letter2Future
```

**方式 B：使用 scp 上传（本地执行）**
```bash
# 在本地项目目录执行
cd /Users/hpyi/Hobby/Letter2Future

# 压缩代码
tar -czf letter2future.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=letters.db \
  .

# 上传到服务器
scp letter2future.tar.gz root@你的服务器IP:/var/www/

# 回到服务器解压
cd /var/www
tar -xzf letter2future.tar.gz
mv letter2future Letter2Future
cd Letter2Future
```

### 第四步：配置环境变量

```bash
# 复制环境变量模板
cd /var/www/Letter2Future
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

**重要配置：**
```bash
# === SMTP 邮件配置（以Gmail为例）===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的邮箱@gmail.com
SMTP_PASS=你的应用专用密码
SMTP_FROM=Letter2Future <你的邮箱@gmail.com>

# === 调度器配置 ===
ENABLE_SCHEDULER=true

# === 域名配置（重要！）===
# 如果有域名：
NEXT_PUBLIC_BASE_URL=https://letter.yourdomain.com
# 如果没有域名，使用 IP：
NEXT_PUBLIC_BASE_URL=http://你的服务器IP
```

保存退出（Ctrl+O，Enter，Ctrl+X）

### 第五步：安装依赖并构建

```bash
cd /var/www/Letter2Future

# 安装依赖（需要几分钟）
npm install

# 构建生产版本
npm run build

# 检查构建是否成功
ls -la .next/
```

### 第六步：启动应用

```bash
# 使用 PM2 启动
pm2 start npm --name "letter2future" -- start

# 查看运行状态
pm2 status
# 应该显示 "online" 状态

# 查看日志
pm2 logs letter2future
# 应该看到 "Scheduler started!" 和 "Ready on http://localhost:3000"

# 设置开机自启
pm2 startup
pm2 save
```

### 第七步：配置 Nginx 反向代理

```bash
# 创建 Nginx 配置文件
nano /etc/nginx/sites-available/letter2future
```

**粘贴以下配置：**
```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    # 限制请求体大小（防止大文件上传）
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 传递真实 IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 缓存静态资源
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    # 日志
    access_log /var/log/nginx/letter2future.access.log;
    error_log /var/log/nginx/letter2future.error.log;
}
```

保存并启用配置：
```bash
# 启用站点
ln -s /etc/nginx/sites-available/letter2future /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx
```

### 第八步：配置防火墙

```bash
# 安装并启用防火墙
ufw enable

# 允许 SSH（重要！防止被锁死）
ufw allow ssh
ufw allow 22

# 允许 HTTP 和 HTTPS
ufw allow 80
ufw allow 443

# 查看状态
ufw status
```

### 第九步：配置 HTTPS（强烈推荐）

**如果有域名，配置免费 SSL 证书：**
```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书（会自动修改 Nginx 配置）
certbot --nginx -d 你的域名

# 测试自动续期
certbot renew --dry-run
```

---

## ✅ 验证部署

### 1. 检查应用状态
```bash
pm2 status
# 应该显示 "online" 状态

pm2 logs letter2future --lines 50
# 应该看到：
# - "Scheduler started!"
# - "Ready on http://localhost:3000"
# - "Checking for pending letters..." (每分钟一次)
```

### 2. 测试本地访问
```bash
curl http://localhost:3000
# 应该返回 HTML 内容
```

### 3. 测试外网访问
在浏览器打开：
- `http://你的服务器IP` 或
- `https://你的域名`

应该能看到写信页面！

### 4. 测试邮件发送
```bash
cd /var/www/Letter2Future
node test-email.js
```

如果收到测试邮件，说明 SMTP 配置正确！

---

## 📊 日常管理命令

### 查看应用状态
```bash
pm2 status                    # 查看所有应用
pm2 logs letter2future        # 实时查看日志
pm2 logs letter2future --lines 100  # 查看最近100行
pm2 monit                     # 实时监控
```

### 重启应用
```bash
pm2 restart letter2future     # 重启应用
pm2 reload letter2future      # 平滑重启（零停机）
pm2 stop letter2future        # 停止应用
pm2 start letter2future       # 启动应用
```

### 查看数据库
```bash
# 安装 SQLite 工具
apt install -y sqlite3

# 进入数据库
sqlite3 /var/www/Letter2Future/letters.db

# 查询信件
sqlite> SELECT id, recipient_email, status, scheduled_time FROM letters;
sqlite> .exit
```

### 查看 Nginx 状态
```bash
systemctl status nginx         # 查看状态
systemctl restart nginx        # 重启
nginx -t                       # 测试配置文件
tail -f /var/log/nginx/error.log  # 查看错误日志
```

---

## 🔄 代码更新流程

```bash
# 1. 进入项目目录
cd /var/www/Letter2Future

# 2. 拉取最新代码
git pull
# 或重新上传并解压

# 3. 安装新依赖（如果有）
npm install

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart letter2future

# 6. 查看日志确认
pm2 logs letter2future --lines 50
```

---

## 💾 数据库备份

### 手动备份
```bash
# 创建备份目录
mkdir -p /backup

# 备份数据库
cp /var/www/Letter2Future/letters.db /backup/letters-$(date +%Y%m%d-%H%M%S).db

# 查看备份
ls -lh /backup/
```

### 自动备份（每天凌晨2点）
```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 2 * * * cp /var/www/Letter2Future/letters.db /backup/letters-$(date +\%Y\%m\%d).db

# 保存退出

# 查看定时任务
crontab -l
```

### 恢复备份
```bash
# 停止应用
pm2 stop letter2future

# 恢复数据库
cp /backup/letters-20260105.db /var/www/Letter2Future/letters.db

# 重启应用
pm2 restart letter2future
```

---

## 🐛 常见问题排查

### ❌ 问题1：网页无法访问

**检查清单：**
```bash
# 1. 检查应用是否运行
pm2 status
pm2 logs letter2future --err

# 2. 检查端口监听
netstat -tlnp | grep 3000

# 3. 检查 Nginx
systemctl status nginx
nginx -t
curl http://localhost

# 4. 检查防火墙
ufw status
ufw allow 80
ufw allow 443

# 5. 检查云服务商安全组
# 在云服务商控制台开放 80 和 443 端口
```

### ❌ 问题2：邮件发送失败

**检查清单：**
```bash
# 1. 查看错误日志
pm2 logs letter2future --err --lines 100

# 2. 检查 SMTP 配置
cat /var/www/Letter2Future/.env.local

# 3. 测试邮件发送
cd /var/www/Letter2Future
node test-email.js

# 4. 常见错误：
# - "Invalid login" → 检查用户名密码
# - "Connection refused" → 检查 SMTP 服务器和端口
# - "Timeout" → 检查网络连接
```

**Gmail 配置提示：**
1. 开启两步验证
2. 生成应用专用密码（16位）
3. 使用应用专用密码而非账号密码

### ❌ 问题3：调度器不工作

**检查清单：**
```bash
# 1. 查看日志中是否有调度信息
pm2 logs letter2future | grep "Checking for pending"

# 2. 检查环境变量
cat /var/www/Letter2Future/.env.local | grep ENABLE_SCHEDULER
# 应该是 ENABLE_SCHEDULER=true

# 3. 重启应用
pm2 restart letter2future

# 4. 查看 instrumentation.ts
cat /var/www/Letter2Future/instrumentation.ts
```

### ❌ 问题4：应用频繁崩溃

**查看崩溃日志：**
```bash
pm2 logs letter2future --err --lines 200
```

**常见原因：**
1. **内存不足**：升级服务器配置或优化代码
2. **数据库锁定**：检查是否有并发写入问题
3. **端口占用**：`lsof -i :3000` 检查端口

**临时解决：**
```bash
# 配置自动重启
pm2 delete letter2future
pm2 start npm --name "letter2future" --max-restarts 10 -- start
```

### ❌ 问题5：HTTPS 配置失败

**检查清单：**
```bash
# 1. 确认域名解析正确
nslookup 你的域名

# 2. 确认 80 端口可访问
curl http://你的域名

# 3. 重新申请证书
certbot --nginx -d 你的域名 --force-renewal

# 4. 查看 Certbot 日志
tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 📈 性能优化（可选）

### 1. 启用 PM2 集群模式
```bash
pm2 delete letter2future
pm2 start npm --name "letter2future" -i 2 -- start
# -i 2 表示启动2个实例
```

### 2. 配置日志轮转
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 配置 Nginx 缓存
在 Nginx 配置中添加：
```nginx
# 缓存配置
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location /_next/static {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    proxy_pass http://localhost:3000;
}
```

---

## 🔒 安全加固（重要）

### 1. 修改 SSH 端口
```bash
nano /etc/ssh/sshd_config
# 修改：Port 22 → Port 2222
systemctl restart sshd

# 更新防火墙
ufw allow 2222
```

### 2. 禁用 root 登录
```bash
# 先创建普通用户
adduser deploy
usermod -aG sudo deploy

# 禁用 root SSH
nano /etc/ssh/sshd_config
# 设置：PermitRootLogin no
systemctl restart sshd
```

### 3. 安装 Fail2Ban（防暴力破解）
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. 保护配置文件
```bash
chmod 600 /var/www/Letter2Future/.env.local
chown root:root /var/www/Letter2Future/.env.local
```

---

## 📞 监控告警（可选）

### 使用 PM2 Plus（免费版）
```bash
# 注册账号：https://app.pm2.io/
# 获取 secret 和 public key

pm2 link <secret> <public>
```

### 简单健康检查脚本
```bash
# 创建健康检查脚本
cat > /var/www/Letter2Future/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "App is down, restarting..."
    pm2 restart letter2future
fi
EOF

chmod +x /var/www/Letter2Future/health-check.sh

# 添加到 crontab（每5分钟检查）
crontab -e
# 添加：*/5 * * * * /var/www/Letter2Future/health-check.sh
```

---

## ✅ 部署完成检查清单

- [ ] 服务器基础环境安装完成（Node.js, PM2, Nginx）
- [ ] 代码已上传到 `/var/www/Letter2Future`
- [ ] `.env.local` 配置正确（SMTP + 域名）
- [ ] `npm install && npm run build` 成功
- [ ] PM2 启动成功，状态为 "online"
- [ ] 调度器日志每分钟显示检查信息
- [ ] Nginx 配置正确，测试通过
- [ ] 防火墙规则已设置（22, 80, 443）
- [ ] 域名解析正确（如有）
- [ ] HTTPS 证书配置成功（如有）
- [ ] 外网可以访问网站
- [ ] 测试邮件发送成功
- [ ] 数据库备份计划已设置
- [ ] PM2 开机自启已配置

---

## 🎉 部署成功！

现在你可以：
1. 访问你的网站写信
2. 调度器会自动在设定时间发送邮件
3. 收件人通过邮件链接解密查看

**记得保存好：**
- 服务器 IP 和 SSH 密码
- SMTP 邮箱账号密码
- 域名管理账号
- `.env.local` 配置备份

需要帮助？查看日志：
```bash
pm2 logs letter2future
```
