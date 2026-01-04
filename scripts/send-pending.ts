import { getPendingLetters, updateLetterStatus } from '../src/lib/db';
import { sendEmail } from '../src/lib/email';

async function run() {
  console.log('Checking pending letters...');
  const letters = await getPendingLetters();
  console.log(`Found ${letters.length} pending letter(s).`);

  for (const letter of letters) {
    try {
      let textBody = letter.content;
      let htmlBody: string | undefined;

      if (letter.is_encrypted) {
        const parsed = JSON.parse(letter.content);
        const { ciphertext, iv, salt, iterations } = parsed.encrypted;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const decryptUrl = `${baseUrl}/decrypt?c=${encodeURIComponent(ciphertext)}&i=${encodeURIComponent(iv)}&s=${encodeURIComponent(salt)}&iter=${iterations || 100000}`;
        textBody = `加密信件，需要您的密钥解密。链接：${decryptUrl}`;
        htmlBody = `<p>加密信件，需要您的密钥解密。</p><p><a href="${decryptUrl}">点击解密</a></p>`;
      }

      await sendEmail({
        to: letter.recipient_email,
        subject: '来自过去的一封信 - 手动发送测试',
        text: textBody,
        html: htmlBody,
      });

      await updateLetterStatus(letter.id!, 'sent');
      console.log(`Sent letter ${letter.id}`);
    } catch (err) {
      console.error(`Failed letter ${letter.id}:`, err);
      await updateLetterStatus(letter.id!, 'failed', err instanceof Error ? err.message : String(err));
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
