#!/bin/bash

# Letter2Future 一键部署脚本
# 适用于 Ubuntu 20.04/22.04

set -e

echo "========================================="
echo "  Letter2Future 自动部署脚本"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  echo "sudo bash deploy.sh"
  exit 1
fi

# 步骤 1: 安装 Node.js
echo -e "${GREEN}[1/8] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js 安装成功: $(node -v)${NC}"
else
    echo -e "${YELLOW}✓ Node.js 已安装: $(node -v)${NC}"
fi

# 步骤 2: 安装 PM2
echo -e "${GREEN}[2/8] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装成功${NC}"
else
    echo -e "${YELLOW}✓ PM2 已安装${NC}"
fi

# 步骤 3: 安装 Nginx
echo -e "${GREEN}[3/8] 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx 安装成功${NC}"
else
    echo -e "${YELLOW}✓ Nginx 已安装${NC}"
fi

# 步骤 4: 检查项目文件
echo -e "${GREEN}[4/8] 检查项目文件...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 未找到 package.json，请在项目目录下运行此脚本${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 项目文件检查通过${NC}"

# 步骤 5: 配置环境变量
echo -e "${GREEN}[5/8] 配置环境变量...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}未找到 .env.local，正在创建...${NC}"
    cp .env.example .env.local
    echo ""
    echo -e "${YELLOW}请编辑 .env.local 配置文件：${NC}"
    echo "nano .env.local"
    echo ""
    read -p "配置完成后按回车继续..."
fi
echo -e "${GREEN}✓ 环境变量配置完成${NC}"

# 步骤 6: 安装依赖并构建
echo -e "${GREEN}[6/8] 安装依赖并构建（需要几分钟）...${NC}"
npm install
npm run build
echo -e "${GREEN}✓ 构建完成${NC}"

# 步骤 7: 启动应用
echo -e "${GREEN}[7/8] 启动应用...${NC}"
pm2 stop letter2future 2>/dev/null || true
pm2 delete letter2future 2>/dev/null || true
pm2 start npm --name "letter2future" -- start
pm2 startup
pm2 save
echo -e "${GREEN}✓ 应用启动成功${NC}"

# 步骤 8: 配置 Nginx
echo -e "${GREEN}[8/8] 配置 Nginx...${NC}"
read -p "请输入你的域名或服务器IP: " SERVER_NAME

cat > /etc/nginx/sites-available/letter2future << EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    access_log /var/log/nginx/letter2future.access.log;
    error_log /var/log/nginx/letter2future.error.log;
}
EOF

ln -sf /etc/nginx/sites-available/letter2future /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 配置防火墙
echo -e "${GREEN}配置防火墙...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "========================================="
echo -e "${GREEN}✓ 部署完成！${NC}"
echo "========================================="
echo ""
echo "访问地址: http://${SERVER_NAME}"
echo ""
echo "常用命令："
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs letter2future"
echo "  重启应用: pm2 restart letter2future"
echo ""
echo "下一步："
echo "1. 访问网站测试是否正常"
echo "2. 配置HTTPS证书（可选）："
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d ${SERVER_NAME}"
echo ""
