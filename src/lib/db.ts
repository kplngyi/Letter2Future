import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
// import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  db = await open({
    filename: ('letters.db'),
    driver: sqlite3.Database,
  });

  await ensureLettersTable(db);

  return db;
}

async function ensureLettersTable(database: Database) {
  const existing = await database.get<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='letters'"
  );

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      scheduled_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      sent_at DATETIME,
      error_message TEXT,
      CHECK (length(content) <= 12000)
    )
  `;

  if (!existing?.sql) {
    await database.exec(createTableSql);
  } else if (existing.sql.includes('length(content) <= 3000') || !existing.sql.includes('is_encrypted')) {
    // 迁移：放宽 content 长度或添加 is_encrypted 列
    await database.exec('BEGIN');
    await database.exec(createTableSql.replace('IF NOT EXISTS ', '').replace('letters', 'letters_new'));
    await database.exec(`
      INSERT INTO letters_new (id, content, recipient_email, scheduled_time, status, is_encrypted, created_at, sent_at, error_message)
      SELECT id, content, recipient_email, scheduled_time, status, 0, created_at, sent_at, error_message FROM letters;
    `);
    await database.exec('DROP TABLE letters');
    await database.exec('ALTER TABLE letters_new RENAME TO letters');
    await database.exec('COMMIT');
  }

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_status_scheduled 
    ON letters(status, scheduled_time)
  `);
}

export interface Letter {
  id?: number;
  content: string;
  recipient_email: string;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed';
  is_encrypted: boolean;
  created_at?: string;
  sent_at?: string | null;
  error_message?: string | null;
}

export async function createLetter(letter: Omit<Letter, 'id' | 'created_at' | 'sent_at' | 'error_message'>) {
  const database = await getDb();
  const result = await database.run(
    'INSERT INTO letters (content, recipient_email, scheduled_time, status, is_encrypted, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [letter.content, letter.recipient_email, letter.scheduled_time, letter.status, letter.is_encrypted ? 1 : 0, new Date().toISOString()]
  );
  return result.lastID;
}

export async function getPendingLetters() {
  const database = await getDb();
  const now = new Date().toISOString();
  return database.all<Letter[]>(
    'SELECT * FROM letters WHERE status = ? AND scheduled_time <= ?',
    ['pending', now]
  );
}

export async function updateLetterStatus(
  id: number,
  status: 'sent' | 'failed',
  errorMessage?: string
) {
  const database = await getDb();
  const sentAt = status === 'sent' ? new Date().toISOString() : null;
  
  await database.run(
    'UPDATE letters SET status = ?, sent_at = ?, error_message = ? WHERE id = ?',
    [status, sentAt, errorMessage || null, id]
  );
}
