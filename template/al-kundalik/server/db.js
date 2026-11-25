import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subjects(name TEXT PRIMARY KEY, pos INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS teachers(id TEXT PRIMARY KEY, name TEXT NOT NULL, subj TEXT NOT NULL, phone TEXT, pw_hash TEXT NOT NULL, pw_hint TEXT);
CREATE TABLE IF NOT EXISTS classes(name TEXT PRIMARY KEY, leader_id TEXT, pos INTEGER DEFAULT 0, logo TEXT);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY, name TEXT NOT NULL, cls TEXT NOT NULL, q REAL DEFAULT 0.6, phone TEXT NOT NULL, pw_hash TEXT NOT NULL, pw_hint TEXT);
CREATE INDEX IF NOT EXISTS ix_students_cls ON students(cls);
CREATE TABLE IF NOT EXISTS schedule(cls TEXT, day INTEGER, slot INTEGER, subj TEXT, PRIMARY KEY(cls,day,slot));
CREATE TABLE IF NOT EXISTS assignments(cls TEXT, subj TEXT, teacher_id TEXT, PRIMARY KEY(cls,subj));
CREATE TABLE IF NOT EXISTS records(sid INTEGER, subj TEXT, date TEXT, att TEXT NOT NULL, act INTEGER, beh INTEGER, hw INTEGER, comment TEXT DEFAULT '', actor TEXT, at TEXT, PRIMARY KEY(sid,subj,date));
CREATE INDEX IF NOT EXISTS ix_records_sid ON records(sid);
CREATE TABLE IF NOT EXISTS homework(cls TEXT, subj TEXT, text TEXT NOT NULL, PRIMARY KEY(cls,subj));
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id TEXT, text TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, sid INTEGER, teacher_id TEXT, text TEXT, date TEXT);
CREATE INDEX IF NOT EXISTS ix_messages_sid ON messages(sid);
CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1), phone TEXT NOT NULL, pw_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS docs(sid INTEGER, code TEXT, PRIMARY KEY(sid,code));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, actor TEXT, action TEXT, detail TEXT);
`;

export function openDb(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(SCHEMA);
  // eski bazalar uchun: yangi ustunlarni qo‘shish
  const cols = db.prepare('PRAGMA table_info(classes)').all().map(c => c.name);
  if (!cols.includes('pos')) db.exec('ALTER TABLE classes ADD COLUMN pos INTEGER DEFAULT 0');
  if (!cols.includes('logo')) db.exec('ALTER TABLE classes ADD COLUMN logo TEXT');
  return db;
}

/** BEGIN/COMMIT; xato bo‘lsa ROLLBACK. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** scrypt hash: s1$N$salt$hash  (N saqlanadi, shuning uchun keyin oshirish mumkin) */
export function hashPw(pw, N = 16384) {
  const salt = randomBytes(16);
  const h = scryptSync(String(pw), salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `s1$${N}$${salt.toString('hex')}$${h.toString('hex')}`;
}
export function checkPw(pw, stored) {
  try {
    const [, N, s, h] = String(stored).split('$');
    const x = scryptSync(String(pw), Buffer.from(s, 'hex'), 32, { N: +N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(x, Buffer.from(h, 'hex'));
  } catch { return false; }
}
