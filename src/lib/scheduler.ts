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
          await sendEmail({
            to: letter.recipient_email,
            subject: '来自过去的一封信 - Letter to the Future',
            text: letter.content,
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
