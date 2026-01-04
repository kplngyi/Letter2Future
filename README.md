# 给未来的一封信 (Letter to the Future)

一个让你可以写信给未来的自己的Web应用。你可以写下此刻的心情，设定未来的某个时间，系统会自动将信件发送到你的邮箱。

## 功能特性

- 📝 **写信功能**: 支持最多3000字的纯文本输入
- 📧 **邮件发送**: 到达设定时间后自动通过邮件发送
- ⏰ **定时调度**: 精确到分钟级的时间设置
- 🎨 **优雅界面**: 简洁美观的用户界面
- 🔒 **状态管理**: 完整的信件状态跟踪（待发送/已发送/发送失败）

## 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite
- **邮件服务**: Nodemailer
- **定时任务**: node-cron

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置你的SMTP邮件服务器信息：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Letter2Future <your-email@gmail.com>
ENABLE_SCHEDULER=true
```

#### Gmail配置说明

1. 前往 [Google账户设置](https://myaccount.google.com/)
2. 启用两步验证
3. 生成应用专用密码: https://myaccount.google.com/apppasswords
4. 使用应用专用密码作为 `SMTP_PASS`

#### 其他邮件服务商

**QQ邮箱**:
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
```

**163邮箱**:
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
```

**Outlook**:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

## 项目结构

```
Letter2Future/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── letters/       # 信件API路由
│   │   │   └── scheduler/     # 调度器API路由
│   │   └── page.tsx           # 主页
│   ├── components/
│   │   └── LetterForm.tsx     # 信件表单组件
│   └── lib/
│       ├── db.ts              # 数据库操作
│       ├── email.ts           # 邮件发送服务
│       └── scheduler.ts       # 定时任务调度
├── .env.example               # 环境变量示例
├── .env.local                 # 本地环境变量（需自行创建）
└── README.md
```

## 使用说明

1. **写信**: 在文本框中写下你想对未来说的话
2. **填写邮箱**: 输入接收信件的邮箱地址
3. **选择时间**: 选择你希望收到信件的日期和时间
4. **提交**: 点击"封存信件"按钮
5. **等待**: 系统会在指定时间自动发送邮件到你的邮箱

## 注意事项

- 📧 邮件配置必须正确才能发送邮件
- ⏰ 调度器每分钟检查一次待发送的信件
- 🔒 信件提交后无法修改或撤回
- 💾 数据库文件 `letters.db` 存储在项目根目录

## 常见问题

### Q: 邮件发送失败怎么办？

检查以下几点：
- SMTP配置是否正确
- 邮箱服务商是否需要应用专用密码
- 防火墙是否阻止了SMTP端口

### Q: 调度器没有运行？

确保环境变量 `ENABLE_SCHEDULER=true`，或访问 `/api/scheduler` 手动启动

## 开源协议

MIT License
