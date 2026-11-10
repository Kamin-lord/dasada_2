import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS general(id INTEGER PRIMARY KEY CHECK(id=1), login TEXT NOT NULL, pw_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS staff(
  id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, pw_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager', perms TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, tv INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, last_login TEXT);
CREATE TABLE IF NOT EXISTS schools(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, region TEXT DEFAULT '', address TEXT DEFAULT '',
  admin_name TEXT DEFAULT '', phone TEXT DEFAULT '', url TEXT DEFAULT '', note TEXT DEFAULT '',
  key_hash TEXT NOT NULL UNIQUE, key_hint TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'faol',
  students INTEGER, teachers INTEGER, classes INTEGER, version TEXT, last_seen TEXT, created_at TEXT NOT NULL,
  logo TEXT, snapshot TEXT, snap_at TEXT, snap_demo INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS school_admins(
  id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_sa_school ON school_admins(school_id);
CREATE TABLE IF NOT EXISTS tickets(
  id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'yangi', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, g_unread INTEGER DEFAULT 1, s_unread INTEGER DEFAULT 0,
  assignee INTEGER);
CREATE INDEX IF NOT EXISTS ix_tickets_school ON tickets(school_id);
CREATE TABLE IF NOT EXISTS ticket_msgs(id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, side TEXT NOT NULL, text TEXT NOT NULL, at TEXT NOT NULL, who TEXT);
CREATE INDEX IF NOT EXISTS ix_msgs_ticket ON ticket_msgs(ticket_id);
CREATE TABLE IF NOT EXISTS ticket_notes(id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, staff_id INTEGER, who TEXT, text TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat(id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, who TEXT, text TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, creator INTEGER, assignee INTEGER, status TEXT DEFAULT 'yangi', review INTEGER DEFAULT 1, priority TEXT DEFAULT 'oddiy', due TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS task_log(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, staff_id INTEGER, who TEXT, kind TEXT, text TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS groups_(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, descr TEXT, color TEXT, icon TEXT, logo TEXT, created_by INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, descr TEXT, color TEXT, icon TEXT, archived INTEGER DEFAULT 0, created_by INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS project_members(project_id INTEGER, staff_id INTEGER, prole TEXT DEFAULT 'member', PRIMARY KEY(project_id, staff_id));
CREATE TABLE IF NOT EXISTS todos(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, text TEXT, done INTEGER DEFAULT 0, assignee INTEGER, created_by INTEGER, done_by TEXT, created_at TEXT, done_at TEXT);
CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, title TEXT, body TEXT, pinned INTEGER DEFAULT 0, author_id INTEGER, author TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS proj_log(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, who TEXT, text TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS dm(id INTEGER PRIMARY KEY AUTOINCREMENT, a INTEGER, b INTEGER, sender INTEGER, text TEXT, at TEXT, seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, actor TEXT, action TEXT, detail TEXT);
`;

function addCols(db, table, cols) {
  const have = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  for (const [n, def] of cols) if (!have.includes(n)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${n} ${def}`);
}

export function openDb(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(SCHEMA);
  // 1-versiya bazalar uchun
  addCols(db, 'schools', [['logo', 'TEXT'], ['snapshot', 'TEXT'], ['snap_at', 'TEXT'], ['snap_demo', 'INTEGER DEFAULT 0']]);
  addCols(db, 'staff', [['logo', 'TEXT']]);
  addCols(db, 'projects', [['logo', 'TEXT'], ['group_id', 'INTEGER']]);
  addCols(db, 'tasks', [['project_id', 'INTEGER']]);
  addCols(db, 'chat', [['project_id', 'INTEGER'], ['room', 'TEXT']]);
  /* v17: lavozim xonalari — eski umumiy chat xabarlari General adminlar xonasiga o‘tadi */
  db.exec("UPDATE chat SET room='owner' WHERE project_id IS NULL AND room IS NULL");
  addCols(db, 'tickets', [['assignee', 'INTEGER']]);
  addCols(db, 'ticket_msgs', [['who', 'TEXT']]);
  /* v16f: "Qo‘llab-quvvatlash" va "Kuzatuvchi" lavozimlari olib tashlandi: test hisoblar o‘chiriladi, qolganlar Menejerga o‘tadi */
  db.exec("DELETE FROM project_members WHERE staff_id IN (SELECT id FROM staff WHERE role IN ('support','mehmon') AND (login GLOB 'support[1-5]' OR login GLOB 'mehmon[1-5]'))");
  db.exec("DELETE FROM staff WHERE role IN ('support','mehmon') AND (login GLOB 'support[1-5]' OR login GLOB 'mehmon[1-5]')");
  db.exec("UPDATE staff SET role='manager' WHERE role IN ('support','mehmon')");
  const g = db.prepare('SELECT * FROM general WHERE id=1').get();
  if (g && !db.prepare('SELECT 1 x FROM staff').get())
    db.prepare("INSERT INTO staff(login,name,pw_hash,role,perms,created_at) VALUES(?,?,?,'owner','[]',?)").run(g.login, 'General admin', g.pw_hash, new Date().toISOString());
  return db;
}
export function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
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
/** Maktab API kaliti: tasodifiy (yuqori entropiya), bazada faqat SHA-256 hash saqlanadi. */
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // o‘xshash belgilarsiz (0/O, 1/I)
export const newKey = () => {
  const b = randomBytes(20); let s = '';
  for (const x of b) s += ALPHA[x & 31];           // 20 belgi × 5 bit = 100 bit
  return 'DSD-' + s.match(/.{4}/g).join('-');       // DSD-XXXX-XXXX-XXXX-XXXX-XXXX
};
/** Kalit katta-kichik harf, tire va probelga sezgir emas (qo‘lda yozganda xato kamayadi). */
export const keyHash = k => createHash('sha256').update(String(k).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
