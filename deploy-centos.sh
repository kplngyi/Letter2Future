#!/bin/bash

# Letter2Future CentOS 部署脚本
# 适用于 CentOS 7/8/9, Rocky Linux, AlmaLinux

set -e

echo "========================================="
echo "  Letter2Future CentOS 自动部署脚本"
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
  echo "sudo bash deploy-centos.sh"
  exit 1
fi

# 检测 CentOS 版本
if [ -f /etc/redhat-release ]; then
    CENTOS_VERSION=$(rpm -q --queryformat '%{VERSION}' centos-release 2>/dev/null || echo "8")
    echo -e "${GREEN}检测到 CentOS/RHEL 系统${NC}"
else
    echo -e "${RED}此脚本仅支持 CentOS/RHEL 系统${NC}"
    exit 1
fi

# 步骤 1: 更新系统
echo -e "${GREEN}[1/9] 更新系统包...${NC}"
if [ "$CENTOS_VERSION" -ge 8 ]; then
    dnf update -y
    dnf install -y epel-release
else
    yum update -y
    yum install -y epel-release
fi
echo -e "${GREEN}✓ 系统更新完成${NC}"

# 步骤 2: 安装 Node.js
echo -e "${GREEN}[2/9] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    if [ "$CENTOS_VERSION" -ge 8 ]; then
        dnf install -y nodejs
    else
        yum install -y nodejs
    fi
    echo -e "${GREEN}✓ Node.js 安装成功: $(node -v)${NC}"
else
    echo -e "${YELLOW}✓ Node.js 已安装: $(node -v)${NC}"
fi

# 步骤 3: 安装 PM2
echo -e "${GREEN}[3/9] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装成功${NC}"
else
    echo -e "${YELLOW}✓ PM2 已安装${NC}"
fi

# 步骤 4: 安装 Nginx
echo -e "${GREEN}[4/9] 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    if [ "$CENTOS_VERSION" -ge 8 ]; then
        dnf install -y nginx
    else
        yum install -y nginx
    fi
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx 安装成功${NC}"
else
    echo -e "${YELLOW}✓ Nginx 已安装${NC}"
fi

# 步骤 5: 安装 Git
echo -e "${GREEN}[5/9] 安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    if [ "$CENTOS_VERSION" -ge 8 ]; then
        dnf install -y git
    else
        yum install -y git
    fi
    echo -e "${GREEN}✓ Git 安装成功${NC}"
else
    echo -e "${YELLOW}✓ Git 已安装${NC}"
fi

# 步骤 6: 检查项目文件
echo -e "${GREEN}[6/9] 检查项目文件...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 未找到 package.json，请在项目目录下运行此脚本${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 项目文件检查通过${NC}"

# 步骤 7: 配置环境变量
echo -e "${GREEN}[7/9] 配置环境变量...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}未找到 .env.local，正在创建...${NC}"
    cp .env.example .env.local
    echo ""
    echo -e "${YELLOW}请编辑 .env.local 配置文件：${NC}"
    echo "vi .env.local"
    echo ""
    read -p "配置完成后按回车继续..."
fi
echo -e "${GREEN}✓ 环境变量配置完成${NC}"

# 步骤 8: 安装依赖并构建
echo -e "${GREEN}[8/9] 安装依赖并构建（需要几分钟）...${NC}"
npm install
npm run build
echo -e "${GREEN}✓ 构建完成${NC}"

# 步骤 9: 启动应用
echo -e "${GREEN}[9/9] 启动应用...${NC}"
pm2 stop letter2future 2>/dev/null || true
pm2 delete letter2future 2>/dev/null || true
pm2 start npm --name "letter2future" -- start
pm2 startup
pm2 save
echo -e "${GREEN}✓ 应用启动成功${NC}"

# 步骤 10: 配置 Nginx
echo -e "${GREEN}配置 Nginx...${NC}"
read -p "请输入你的域名或服务器IP: " SERVER_NAME

cat > /etc/nginx/conf.d/letter2future.conf << EOF
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

# 测试 Nginx 配置
nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 配置 SELinux（CentOS 特有）
echo -e "${GREEN}配置 SELinux...${NC}"
if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P httpd_can_network_connect 1
    echo -e "${GREEN}✓ SELinux 配置完成${NC}"
else
    echo -e "${YELLOW}✓ SELinux 未启用或已禁用${NC}"
fi

# 配置防火墙
echo -e "${GREEN}配置防火墙...${NC}"
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --reload
    echo -e "${GREEN}✓ 防火墙配置完成${NC}"
else
    echo -e "${YELLOW}✓ firewalld 未运行${NC}"
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
echo "  重启Nginx: systemctl restart nginx"
echo ""
echo "下一步："
echo "1. 访问网站测试是否正常"
echo "2. 配置HTTPS证书（可选）："
if [ "$CENTOS_VERSION" -ge 8 ]; then
    echo "   dnf install -y certbot python3-certbot-nginx"
else
    echo "   yum install -y certbot python3-certbot-nginx"
fi
echo "   certbot --nginx -d ${SERVER_NAME}"
echo ""
echo "CentOS 特别提示："
echo "- SELinux 已配置允许网络连接"
echo "- 防火墙已开放 80/443 端口"
echo "- 日志位置: /var/log/nginx/"
echo ""
