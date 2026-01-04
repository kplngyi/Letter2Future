import nodemailer from 'nodemailer';

// 配置邮件发送器
// 注意：生产环境需要配置实际的SMTP服务器
export async function createEmailTransporter() {
  // 使用环境变量配置SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions) {
  const transporter = await createEmailTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || `<div style="font-family: sans-serif; padding: 20px;">
      <h2>来自过去的一封信</h2>
      <div style="white-space: pre-wrap; line-height: 1.6;">${options.text}</div>
      <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">这封信是您在过去写给自己的，现在时间到了。</p>
    </div>`,
  };

  return transporter.sendMail(mailOptions);
}
