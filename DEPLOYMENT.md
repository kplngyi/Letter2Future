# Letter2Future 服务器部署指南

## 📋 部署前准备

### 1. 环境要求
- Node.js 18+ 
- npm 或 yarn
- 持久化存储（用于 SQLite 数据库）
- SMTP 邮件服务器账号

### 2. 准备 SMTP 邮箱
推荐使用 Gmail（需要开启应用专用密码）或其他 SMTP 服务：
- Gmail: smtp.gmail.com:587
- QQ邮箱: smtp.qq.com:587
- 163邮箱: smtp.163.com:465

---

## 🚀 部署方式

### 方式 1: Vercel 部署（推荐，但需注意限制）

#### ⚠️ 重要限制
Vercel 的 Serverless 环境有以下限制：
1. **无法运行 node-cron 调度器**（Serverless 函数执行完即销毁）
2. **SQLite 数据库无法持久化**（每次部署会重置）

#### 解决方案
1. **调度器**：使用外部 Cron 服务调用 API
2. **数据库**：迁移到 PostgreSQL/MySQL 或使用 Vercel Postgres

#### 快速部署步骤
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 配置环境变量（在 Vercel Dashboard）
# 设置 SMTP_* 和 NEXT_PUBLIC_BASE_URL
```

#### 配置外部 Cron（推荐 GitHub Actions）
创建 `.github/workflows/scheduled-send.yml`:
```yaml
name: Send Pending Letters

on:
  schedule:
    - cron: '*/5 * * * *'  # 每5分钟运行一次

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger send endpoint
        run: |
          curl -X POST https://your-app.vercel.app/api/send-pending \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

### 方式 2: 自建服务器/VPS 部署（完整功能）

#### 适用场景
- 需要内置调度器自动发送邮件
- 使用 SQLite 数据库
- 完全掌控部署环境

#### 服务器选择
- 阿里云 ECS
- 腾讯云 CVM
- AWS EC2
- DigitalOcean Droplet
- Vultr
- 任何支持 Node.js 的 VPS

---

## 🔧 自建服务器详细步骤

### 步骤 1: 准备服务器

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 PM2（进程管理器）
npm install -g pm2

# 安装 Git
apt install -y git
```

### 步骤 2: 克隆项目

```bash
# 创建应用目录
mkdir -p /var/www
cd /var/www

# 克隆代码（或上传代码包）
git clone https://github.com/kplngyi/Letter2Future.git
cd Letter2Future

# 或使用 scp 上传
# 本地执行：scp -r /path/to/Letter2Future root@server-ip:/var/www/
```

### 步骤 3: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

配置示例：
```bash
# SMTP 配置（Gmail示例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Letter2Future <your-email@gmail.com>

# 启用调度器
ENABLE_SCHEDULER=true

# 公网访问地址（重要！）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 步骤 4: 安装依赖并构建

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 步骤 5: 使用 PM2 启动应用

```bash
# 启动应用
pm2 start npm --name "letter2future" -- start

# 查看日志
pm2 logs letter2future

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 6: 配置 Nginx 反向代理

```bash
# 安装 Nginx
apt install -y nginx

# 创建站点配置
nano /etc/nginx/sites-available/letter2future
```

Nginx 配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
}
```

启用配置：
```bash
# 创建软链接
ln -s /etc/nginx/sites-available/letter2future /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 步骤 7: 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

---

## 🔍 验证部署

### 1. 检查应用是否运行
```bash
pm2 status
pm2 logs letter2future
```

### 2. 检查端口监听
```bash
netstat -tlnp | grep 3000
# 应该看到 Node.js 进程监听 3000 端口
```

### 3. 测试 Web 访问
```bash
# 本地测试
curl http://localhost:3000

# 外网测试
curl https://your-domain.com
```

### 4. 检查调度器
```bash
# 查看日志中是否有调度器运行信息
pm2 logs letter2future --lines 100
# 应该每分钟看到 "Checking for pending letters..."
```

### 5. 测试邮件发送
```bash
# 使用提供的测试脚本
cd /var/www/Letter2Future
node test-email.js
```

---

## 📊 数据库管理

### SQLite 数据库位置
```bash
/var/www/Letter2Future/letters.db
```

### 备份数据库
```bash
# 手动备份
cp /var/www/Letter2Future/letters.db /backup/letters-$(date +%Y%m%d).db

# 设置定期备份（crontab）
crontab -e
# 添加：0 2 * * * cp /var/www/Letter2Future/letters.db /backup/letters-$(date +\%Y\%m\%d).db
```

### 查看数据
```bash
# 安装 SQLite 客户端
apt install -y sqlite3

# 查看数据库
sqlite3 /var/www/Letter2Future/letters.db

# 查询所有信件
sqlite> SELECT id, recipient_email, status, scheduled_time FROM letters;
sqlite> .exit
```

---

## 🛠️ 常见问题

### Q1: 调度器不工作？
```bash
# 检查环境变量
pm2 env 0  # 0 是进程 ID

# 确保 ENABLE_SCHEDULER=true
# 重启应用
pm2 restart letter2future
```

### Q2: 邮件发送失败？
```bash
# 检查 SMTP 配置
cat .env.local

# 测试 SMTP 连接
node test-email.js

# 查看错误日志
pm2 logs letter2future --err
```

### Q3: 域名无法访问？
```bash
# 检查防火墙
ufw status
ufw allow 80
ufw allow 443

# 检查 Nginx
systemctl status nginx
nginx -t

# 检查 DNS 解析
nslookup your-domain.com
```

### Q4: 应用崩溃？
```bash
# 查看错误日志
pm2 logs letter2future --err --lines 100

# 重启应用
pm2 restart letter2future

# 如果频繁崩溃，启用自动重启
pm2 start npm --name "letter2future" -- start --max-restarts 10
```

---

## 🔄 更新应用

```bash
# 进入项目目录
cd /var/www/Letter2Future

# 拉取最新代码
git pull

# 重新安装依赖（如果有更新）
npm install

# 重新构建
npm run build

# 重启应用
pm2 restart letter2future

# 查看日志确认
pm2 logs letter2future
```

---

## 📈 性能优化

### 1. 配置 PM2 集群模式
```bash
# 使用所有 CPU 核心
pm2 start npm --name "letter2future" -i max -- start
```

### 2. 配置 Nginx 缓存
```nginx
# 在 Nginx 配置中添加
location /_next/static {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, max-age=3600";
}
```

### 3. 日志轮转
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔒 安全建议

1. **使用防火墙**
```bash
ufw enable
ufw allow ssh
ufw allow http
ufw allow https
```

2. **禁用 root SSH 登录**
```bash
# 编辑 SSH 配置
nano /etc/ssh/sshd_config
# 设置：PermitRootLogin no
systemctl restart sshd
```

3. **定期更新系统**
```bash
apt update && apt upgrade -y
```

4. **保护环境变量**
```bash
chmod 600 .env.local
```

---

## 📞 监控和告警

### 安装监控工具
```bash
# PM2 Plus（免费版）
pm2 link <secret> <public>
```

### 配置健康检查
创建 `health-check.sh`:
```bash
#!/bin/bash
curl -f http://localhost:3000 || pm2 restart letter2future
```

添加到 crontab:
```bash
crontab -e
# */5 * * * * /var/www/Letter2Future/health-check.sh
```

---

## 🎯 部署检查清单

- [ ] Node.js 18+ 已安装
- [ ] 项目代码已部署
- [ ] `.env.local` 已正确配置
- [ ] `npm install && npm run build` 成功
- [ ] PM2 启动应用成功
- [ ] 调度器正常运行（日志中可见）
- [ ] Nginx 反向代理配置正确
- [ ] HTTPS 证书已配置（可选）
- [ ] 防火墙规则已设置
- [ ] 数据库备份策略已设置
- [ ] 邮件发送测试通过
- [ ] 域名解析正确
- [ ] Web 界面可正常访问

---

## 📚 相关文档

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)

---

## ❓ 获取帮助

如遇到问题：
1. 检查 PM2 日志：`pm2 logs letter2future`
2. 检查 Nginx 日志：`tail -f /var/log/nginx/error.log`
3. 查看系统日志：`journalctl -xe`
4. 提交 GitHub Issue 或查看项目文档
