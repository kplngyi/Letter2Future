import { getPendingLetters } from '../src/lib/db';

async function main() {
  const letters = await getPendingLetters();
  console.log('pending count:', letters.length);
  for (const l of letters) {
    console.log({ id: l.id, status: l.status, is_encrypted: l.is_encrypted, scheduled_time: l.scheduled_time, created_at: l.created_at });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
