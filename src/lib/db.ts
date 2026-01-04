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

  // 创建信件表
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
    )
  `);

  // 创建索引以优化查询
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_status_scheduled 
    ON letters(status, scheduled_time)
  `);

  return db;
}

export interface Letter {
  id?: number;
  content: string;
  recipient_email: string;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed';
  created_at?: string;
  sent_at?: string | null;
  error_message?: string | null;
}

export async function createLetter(letter: Omit<Letter, 'id' | 'created_at' | 'sent_at' | 'error_message'>) {
  const database = await getDb();
  const result = await database.run(
    'INSERT INTO letters (content, recipient_email, scheduled_time, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [letter.content, letter.recipient_email, letter.scheduled_time, letter.status, new Date().toISOString()]
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
