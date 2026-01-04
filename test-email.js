// 测试邮件发送器
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('📧 测试邮件发送器...\n');
  
  // 显示配置信息
  console.log('SMTP配置:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- Secure:', process.env.SMTP_SECURE);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'undefined');
  console.log('');

  try {
    // 创建传输器
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('✓ 传输器创建成功');
    console.log('🔍 验证SMTP连接...');

    // 验证连接
    await transporter.verify();
    console.log('✓ SMTP连接验证成功!\n');

    // 发送测试邮件
    console.log('📨 发送测试邮件...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // 发送给自己
      subject: '测试邮件 - Letter2Future',
      text: '这是一封测试邮件，用于验证邮件发送功能是否正常。',
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>✅ 邮件发送器测试成功</h2>
        <p>如果你收到这封邮件，说明邮件发送功能已正常工作。</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Letter2Future - 给未来的一封信</p>
      </div>`,
    });

    console.log('✓ 测试邮件发送成功!');
    console.log('- Message ID:', info.messageId);
    console.log('- Response:', info.response);
    console.log('\n📬 请检查邮箱:', process.env.SMTP_USER);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n可能的原因:');
      console.error('1. SMTP用户名或密码错误');
      console.error('2. Gmail需要使用应用专用密码（而非账户密码）');
      console.error('3. 访问 https://myaccount.google.com/apppasswords 生成应用密码');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n可能的原因:');
      console.error('1. 网络连接问题');
      console.error('2. SMTP服务器地址或端口错误');
      console.error('3. 防火墙阻止了SMTP端口');
    }
    
    process.exit(1);
  }
}

testEmail();
