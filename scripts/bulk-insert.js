// Bulk insert letters to stress-test the SQLite database.
// Usage: ENABLE_SCHEDULER=false node scripts/bulk-insert.js 100000
require('dotenv').config({ path: '.env.local' });
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function main() {
  const total = parseInt(process.argv[2] || '100000', 10);
  if (!Number.isFinite(total) || total <= 0) {
    console.error('Please provide a positive integer, e.g., node scripts/bulk-insert.js 100000');
    process.exit(1);
  }

  const dbPath = process.env.DB_PATH || 'letters.db';
  const now = Date.now();

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Ensure table exists (same schema as app)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      scheduled_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL,
      sent_at DATETIME,
      error_message TEXT,
      CHECK (length(content) <= 3000)
    );
    CREATE INDEX IF NOT EXISTS idx_status_scheduled ON letters(status, scheduled_time);
  `);

  console.log(`Target inserts: ${total}`);
  const start = Date.now();

  await db.exec('BEGIN TRANSACTION');
  const stmt = await db.prepare(
    'INSERT INTO letters (content, recipient_email, scheduled_time, status, created_at) VALUES (?, ?, ?, ?, ?)' 
  );

  for (let i = 0; i < total; i++) {
    const createdAt = new Date(now + i).toISOString();
    const scheduled = new Date(now + i * 60000).toISOString(); // spread times to avoid same-timestamp bottleneck
    const content = `Load test letter #${i + 1} at ${createdAt}\nLorem ipsum dolor sit amet.`;
    const recipient = process.env.SMTP_USER || 'loadtest@example.com';

    await stmt.run(content, recipient, scheduled, 'pending', createdAt);

    if ((i + 1) % 5000 === 0) {
      console.log(`Inserted ${(i + 1).toLocaleString()} / ${total.toLocaleString()}`);
    }
  }

  await stmt.finalize();
  await db.exec('COMMIT');
  await db.close();

  const duration = (Date.now() - start) / 1000;
  console.log(`\n✅ Finished inserting ${total.toLocaleString()} records in ${duration.toFixed(2)}s`);
  console.log(`DB: ${dbPath}`);
  console.log('Tip: keep ENABLE_SCHEDULER=false during the load to avoid accidental sends.');
}

main().catch((err) => {
  console.error('Bulk insert failed:', err);
  process.exit(1);
});
