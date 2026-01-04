# 快速开始指南

## 第一步：配置邮件服务

1. 复制环境变量模板：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入你的邮箱信息：

### 使用 Gmail（推荐）

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的邮箱@gmail.com
SMTP_PASS=应用专用密码
ENABLE_SCHEDULER=true
```

**获取Gmail应用专用密码：**
1. 访问 https://myaccount.google.com/
2. 点击"安全性" → "两步验证"（如未启用，请先启用）
3. 访问 https://myaccount.google.com/apppasswords
4. 创建新的应用专用密码
5. 复制生成的密码到 `SMTP_PASS`
<!-- prhq xnar jdpb juaw -->
### 使用其他邮箱

**QQ邮箱：**
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=授权码（不是QQ密码）
```
获取授权码：QQ邮箱设置 → 账户 → POP3/IMAP/SMTP服务 → 生成授权码

**163邮箱：**
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的邮箱@163.com
SMTP_PASS=授权码
```

## 第二步：启动应用

```bash
npm run dev
```

打开浏览器访问：http://localhost:3000

## 第三步：测试功能

1. **写一封测试信：**
   - 在文本框输入任意内容
   - 填写接收邮箱
   - 选择2-3分钟后的时间
   - 点击"封存信件"

2. **查看调度器日志：**
   - 在终端查看每分钟的检查日志
   - 看到类似这样的输出：
   ```
   Checking for pending letters...
   Found 1 letter(s) to send
   Letter 1 sent successfully
   ```

3. **检查邮箱：**
   - 等待设定的时间到达
   - 查收邮箱（包括垃圾邮件文件夹）

## 常见问题排查

### 邮件发送失败？

1. **检查SMTP配置是否正确**
   ```bash
   # 查看环境变量
   cat .env.local
   ```

2. **测试SMTP连接**
   - 确认邮箱服务商的SMTP设置
   - 确认使用了正确的授权码/应用专用密码
   - 检查防火墙是否阻止了SMTP端口

3. **查看错误日志**
   - 终端会显示详细错误信息
   - 查看数据库中的错误记录

### 调度器没运行？

确保 `.env.local` 中设置了：
```env
ENABLE_SCHEDULER=true
```

或手动启动调度器：
```bash
curl -X POST http://localhost:3000/api/scheduler
```

### 数据库在哪里？

SQLite数据库文件 `letters.db` 会自动创建在项目根目录。

查看数据库内容：
```bash
sqlite3 letters.db "SELECT * FROM letters;"
```

## 生产部署

### 部署到Vercel

1. 推送代码到GitHub
2. 在Vercel导入项目
3. 配置环境变量（和 `.env.local` 相同）
4. 部署

**注意：** Vercel的serverless函数有执行时间限制，长期运行的cron任务可能需要使用外部服务（如Vercel Cron Jobs或其他调度服务）。

### 使用外部Cron服务

如果部署平台不支持长时间运行的进程，可以使用外部cron服务定期调用调度API：

```bash
# 每分钟调用一次
curl -X POST https://your-domain.com/api/scheduler
```

推荐服务：
- Vercel Cron Jobs
- EasyCron
- cron-job.org

## 下一步

- 自定义邮件模板 (编辑 `src/lib/email.ts`)
- 修改界面样式 (编辑 `src/components/LetterForm.tsx`)
- 添加更多功能（如信件列表、状态查询等）
- 升级到PostgreSQL等生产级数据库

祝你使用愉快！💌
