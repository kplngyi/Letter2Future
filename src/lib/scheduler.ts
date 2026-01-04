import cron from 'node-cron';
import { getPendingLetters, updateLetterStatus } from './db';
import { sendEmail } from './email';

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) {
    console.log('Scheduler already running');
    return;
  }

  // 每分钟检查一次是否有需要发送的信件
  const task = cron.schedule('* * * * *', async () => {
    console.log('Checking for pending letters...');
    
    try {
      const letters = await getPendingLetters();
      
      if (letters.length === 0) {
        console.log('No pending letters to send');
        return;
      }

      console.log(`Found ${letters.length} letter(s) to send`);

      for (const letter of letters) {
        try {
          let textBody = letter.content;
          let htmlBody: string | undefined;

          if (letter.is_encrypted) {
            try {
              const parsed = JSON.parse(letter.content);
              if (parsed?.encrypted?.ciphertext) {
              const { ciphertext, iv, salt, iterations } = parsed.encrypted;
              const decryptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/decrypt?c=${encodeURIComponent(ciphertext)}&i=${encodeURIComponent(iv)}&s=${encodeURIComponent(salt)}&iter=${iterations || 100000}`;
              
              textBody = `📬 来自过去的一封信

这是一封加密信件，需要您的密钥才能解密。

点击下方链接，输入您保存的密钥即可查看信件内容：
${decryptUrl}

或手动访问解密页面：${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/decrypt
并填入以下信息：

密文: ${ciphertext}
IV: ${iv}
Salt: ${salt}
迭代次数: ${iterations || 100000}

⚠️ 请使用您写信时设置的密钥解密，密钥不会被保存或传输。
如果解密失败，请确认：
- 密钥无误且无多余空格
- IV/Salt/迭代次数与邮件一致（默认 100000）
- 复制粘贴时未缺失字符
`;

              htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="font-size: 28px; color: #8b5cf6; margin: 0;">📬 来自过去的一封信</h1>
                </div>
                
                <div style="background: linear-gradient(135deg, #f5f3ff 0%, #fce7f3 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="font-size: 16px; margin: 0 0 16px 0;">这是一封<strong>加密信件</strong>，需要您的密钥才能解密。</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${decryptUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">🔓 点击解密信件</a>
                  </div>
                </div>

                <div style="background: #f9fafb; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">使用说明：</h3>
                  <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280;">
                    <li style="margin-bottom: 8px;">点击上方按钮打开解密页面</li>
                    <li style="margin-bottom: 8px;">输入您写信时设置的密钥</li>
                    <li style="margin-bottom: 8px;">点击"解密信件"按钮查看内容</li>
                  </ol>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffd700; padding: 12px; border-radius: 6px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #856404;">⚠️ <strong>重要提示：</strong>所有解密操作在您的浏览器本地完成，密钥不会被上传或保存。如果忘记密钥，信件将无法解密。</p>
                  <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 12px; color: #856404;">
                    <li>解密失败时，请确认密钥无误且无多余空格</li>
                    <li>确保 IV / Salt / 迭代次数与邮件一致（默认 100000）</li>
                    <li>若复制粘贴，请检查是否缺失字符</li>
                  </ul>
                </div>

                <details style="font-size: 13px; color: #6b7280; margin-top: 24px;">
                  <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px;">技术信息（可选）</summary>
                  <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: 'Courier New', monospace; margin-top: 8px;">
                    <div><strong>算法:</strong> AES-GCM</div>
                    <div><strong>密钥派生:</strong> PBKDF2 (${iterations || 100000} iterations)</div>
                    <div style="margin-top: 8px; word-break: break-all;"><strong>IV:</strong> ${iv}</div>
                    <div style="margin-top: 8px; word-break: break-all;"><strong>Salt:</strong> ${salt}</div>
                  </div>
                </details>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0;">这封信由 Letter2Future 平台安全加密并准时送达</p>
              </div>`;
              }
            } catch (err) {
              console.error('Failed to parse encrypted letter:', err);
              textBody = '加密信件解析失败，请联系支持团队。';
            }
          } else {
            // 明文信件，直接使用 content
            textBody = letter.content;
          }

          await sendEmail({
            to: letter.recipient_email,
            subject: '来自过去的一封信 - Letter to the Future',
            text: textBody,
            html: htmlBody,
          });

          await updateLetterStatus(letter.id!, 'sent');
          console.log(`Letter ${letter.id} sent successfully`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await updateLetterStatus(letter.id!, 'failed', errorMessage);
          console.error(`Failed to send letter ${letter.id}:`, errorMessage);
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });

  task.start();
  schedulerStarted = true;
  console.log('Letter scheduler started - checking every minute');
}

export function stopScheduler() {
  schedulerStarted = false;
  console.log('Scheduler stopped');
}
