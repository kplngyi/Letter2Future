#!/bin/bash

# Letter2Future 一键部署脚本
# 适用于 Ubuntu 20.04/22.04 和 CentOS 7/8/9

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
SERVER_NAME=""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  echo "sudo bash deploy.sh"
  exit 1
fi

# 检测系统类型
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}无法检测系统类型${NC}"
    exit 1
fi

# 定义包管理器变量
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update"
    PKG_INSTALL="apt install -y"
elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
    PKG_MANAGER="yum"
    PKG_UPDATE="yum update -y"
    PKG_INSTALL="yum install -y"
else
    echo -e "${RED}不支持的系统类型: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}检测到系统: $OS，包管理器: $PKG_MANAGER${NC}"

# 步骤 1: 安装 Node.js
echo -e "${GREEN}[1/9] 安装 Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        $PKG_INSTALL nodejs
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PKG_INSTALL nodejs
    fi
    echo -e "${GREEN}✓ Node.js 安装成功: $(node -v)${NC}"
else
    echo -e "${YELLOW}✓ Node.js 已安装: $(node -v)${NC}"
fi

# 步骤 2: 安装 PM2
echo -e "${GREEN}[2/9] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装成功${NC}"
else
    echo -e "${YELLOW}✓ PM2 已安装${NC}"
fi

# 步骤 3: 安装 Nginx
echo -e "${GREEN}[3/9] 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    $PKG_INSTALL nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx 安装成功${NC}"
else
    echo -e "${YELLOW}✓ Nginx 已安装${NC}"
fi

# 步骤 4: 检查项目文件
echo -e "${GREEN}[4/9] 检查项目文件...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 未找到 package.json，请在项目目录下运行此脚本${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 项目文件检查通过${NC}"

# 步骤 5: 配置环境变量
echo -e "${GREEN}[5/9] 配置环境变量...${NC}"
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
echo -e "${GREEN}[6/9] 安装依赖并构建（需要几分钟）...${NC}"
npm install
npm run build -- --webpack
echo -e "${GREEN}✓ 构建完成${NC}"

# 步骤 7: 启动应用
echo -e "${GREEN}[7/9] 启动应用...${NC}"
pm2 stop letter2future 2>/dev/null || true
pm2 delete letter2future 2>/dev/null || true
pm2 start npm --name "letter2future" -- start
pm2 startup
pm2 save
echo -e "${GREEN}✓ 应用启动成功${NC}"

# 步骤 8: 配置 Nginx
echo -e "${GREEN}[8/9] 配置 Nginx...${NC}"
read -r -p "请输入你的域名或服务器IP: " SERVER_NAME

# 创建 Nginx 配置文件（支持 Ubuntu 和 CentOS）
if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
    NGINX_CONF_DIR="/etc/nginx/conf.d"
    cat > $NGINX_CONF_DIR/letter2future.conf << EOF
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
else
    NGINX_CONF_DIR="/etc/nginx/sites-available"
    cat > $NGINX_CONF_DIR/letter2future << EOF
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
fi

nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 步骤 9: 配置 HTTPS
echo -e "${GREEN}[9/9] 配置 HTTPS...${NC}"

echo "====== 为 $SERVER_NAME 申请 HTTPS 证书 ======"

# 安装 certbot
echo "安装 certbot..."
if ! command -v certbot &> /dev/null; then
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        $PKG_INSTALL certbot python3-certbot-nginx
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        $PKG_INSTALL certbot python3-certbot-nginx
    fi
    echo -e "${GREEN}✓ Certbot 安装成功${NC}"
else
    echo -e "${YELLOW}✓ Certbot 已安装${NC}"
fi

# 测试 nginx 配置
echo "测试 nginx 配置..."
nginx -t

# 申请证书
echo "开始申请证书..."
certbot --nginx -d $SERVER_NAME

# 6. 重载 nginx
echo "重载 nginx..."
systemctl reload nginx

# 7. 测试续期（仅测试当前域名，避免影响已有证书）
echo "测试自动续期..."
certbot renew --dry-run --cert-name "$SERVER_NAME"

echo "====== 完成！====="
echo "访问：https://$SERVER_NAME"

# 配置防火墙（根据系统选择 ufw 或 firewalld）
echo -e "${GREEN}配置防火墙...${NC}"
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable
elif command -v firewall-cmd >/dev/null 2>&1; then
    systemctl enable firewalld --now
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
else
    echo -e "${YELLOW}未检测到 ufw/firewalld，请手动放行 22/80/443 端口${NC}"
fi
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