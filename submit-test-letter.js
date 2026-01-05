require('dotenv').config({ path: '.env.local' });
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function submitTestLetter() {
  // 创建一个 2 分钟后到期的信件
  const scheduledTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString(); // 自动生成创建时间

  const db = await open({
    filename: './letters.db',
    driver: sqlite3.Database
  });

  const result = await db.run(
    `INSERT INTO letters 
     (content, recipient_email, scheduled_time, status, is_encrypted, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      '这是一封测试信件，用于验证邮件发送功能。如果你收到这封邮件，说明系统运行正常！',
      process.env.SMTP_USER,
      scheduledTime,
      'pending',   // 状态
      0,           // 是否加密
      createdAt    // 创建时间
    ]
  );

  console.log('✓ 测试信件已创建');
  console.log('- Letter ID:', result.lastID);
  console.log('- 发送时间:', new Date(scheduledTime).toLocaleString('zh-CN'));
  console.log('- 接收邮箱:', process.env.SMTP_USER);
  console.log('\n⏰ 请等待2分钟，然后检查邮箱');
  console.log('📋 查看调度器日志: 运行 npm run dev 的终端');

  await db.close();
}

// 执行函数
submitTestLetter().catch(console.error);