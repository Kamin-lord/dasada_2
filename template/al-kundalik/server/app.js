import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { tx, hashPw, checkPw } from './db.js';
import { todayIso, dayState, daysLeft, wdIdx, DEFAULT_Q, DOC_TYPES } from '../src/kundalik/data.js';

const ATT = ['Bor', 'Yo‘q'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLS_RE = /^[\p{L}\p{N}][\p{L}\p{N} .-]{0,19}$/u;
const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const TTL = 12 * 3600;
export class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const bad = m => new HttpError(400, m);
const forbid = () => new HttpError(403, 'Bu amal uchun ruxsat yo‘q.');
const nz = a => String(a || '').trim().toLowerCase().replace(/ +/g, ' ');
const digits9 = a => String(a || '').replace(/[^0-9]/g, '').slice(-9);
const all = (db, sql, ...p) => db.prepare(sql).all(...p);
const one = (db, sql, ...p) => db.prepare(sql).get(...p);
const run = (db, sql, ...p) => db.prepare(sql).run(...p);

/* ---------- token ---------- */
export function loadSecret(file) {
  if (process.env.KD_SECRET) return process.env.KD_SECRET;
  if (!file) return randomBytes(32).toString('hex');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  mkdirSync(dirname(file), { recursive: true });
  const s = randomBytes(32).toString('hex'); writeFileSync(file, s, { mode: 0o600 }); return s;
}
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const mac = (s, secret) => createHmac('sha256', secret).update(s).digest('base64url');
export const signToken = (me, secret) => { const p = b64({ r: me.r, id: me.id ?? null, exp: Math.floor(Date.now() / 1000) + TTL }); return p + '.' + mac(p, secret); };
export function verifyToken(t, secret) {
  const [p, m] = String(t || '').split('.');
  if (!p || !m) return null;
  const a = Buffer.from(mac(p, secret)), b = Buffer.from(m);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() / 1000 ? o : null; } catch { return null; }
}

/* ---------- state (rolga mos snapshot) ---------- */
const recRow = r => ({ sid: r.sid, subj: r.subj, date: r.date, att: r.att, act: r.act, beh: r.beh, hw: r.hw, c: r.comment || '' });
const recKey = r => `${r.sid}|${r.subj}|${r.date}`;

export function buildState(db, me) {
  const admin = me.r === 'admin', stu = me.r === 'student';
  const self = stu ? one(db, 'SELECT * FROM students WHERE id=?', +me.id) : null;
  const subjects = all(db, 'SELECT name FROM subjects ORDER BY pos').map(r => r.name);
  const teachers = all(db, 'SELECT id,name,subj,phone,pw_hint FROM teachers ORDER BY CAST(substr(id,2) AS INTEGER),id')
    .map(t => admin ? { id: t.id, name: t.name, subj: t.subj, phone: t.phone, pw: t.pw_hint } : { id: t.id, name: t.name, subj: t.subj });
  const classes = all(db, 'SELECT * FROM classes ORDER BY pos, rowid').filter(c => !stu || c.name === self.cls);
  const leaders = Object.fromEntries(classes.map(c => [c.name, c.leader_id]));
  const logos = Object.fromEntries(classes.filter(c => c.logo).map(c => [c.name, c.logo]));
  const sRows = stu ? all(db, 'SELECT * FROM students WHERE cls=? ORDER BY id', self.cls) : all(db, 'SELECT * FROM students ORDER BY id');
  const students = sRows.map(s => admin ? { id: s.id, name: s.name, cls: s.cls, q: s.q, phone: s.phone, pw: s.pw_hint }
    : (s.id === self?.id ? { id: s.id, name: s.name, cls: s.cls, q: s.q, phone: s.phone } : { id: s.id, name: s.name, cls: s.cls, q: s.q }));
  const sched = {}, assign = {};
  for (const c of classes) { sched[c.name] = Array.from({ length: 5 }, () => Array(7).fill('')); assign[c.name] = {}; }
  for (const r of all(db, 'SELECT * FROM schedule')) if (sched[r.cls]) sched[r.cls][r.day][r.slot] = r.subj;
  for (const r of all(db, 'SELECT * FROM assignments')) if (assign[r.cls]) assign[r.cls][r.subj] = r.teacher_id;
  const recRows = stu ? all(db, 'SELECT r.* FROM records r JOIN students s ON s.id=r.sid WHERE s.cls=?', self.cls) : all(db, 'SELECT * FROM records');
  const recMap = Object.fromEntries(recRows.map(r => [recKey(r), recRow(r)]));
  const hw = Object.fromEntries(all(db, 'SELECT * FROM homework').filter(h => !stu || h.cls === self.cls).map(h => [h.cls + '|' + h.subj, h.text]));
  const fb = admin ? all(db, 'SELECT teacher_id t, text x, date d FROM feedback ORDER BY id DESC') : me.r === 'teacher' ? all(db, 'SELECT teacher_id t, text x, date d FROM feedback WHERE teacher_id=? ORDER BY id DESC', me.id) : [];
  const msgs = admin ? all(db, 'SELECT sid, teacher_id t, text x, date d FROM messages ORDER BY id DESC')
    : me.r === 'teacher' ? all(db, 'SELECT sid, teacher_id t, text x, date d FROM messages WHERE teacher_id=? ORDER BY id DESC', me.id)
    : all(db, 'SELECT sid, teacher_id t, text x, date d FROM messages WHERE sid=? ORDER BY id DESC', self.id);
  const docRows = admin ? all(db, 'SELECT sid, code FROM docs')
    : stu ? all(db, 'SELECT sid, code FROM docs WHERE sid=?', self.id)
    : all(db, 'SELECT d.sid, d.code FROM docs d JOIN students s ON s.id=d.sid JOIN classes c ON c.name=s.cls WHERE c.leader_id=?', me.id);
  const docs = {};
  for (const r of docRows) (docs[r.sid] ||= []).push(r.code);
  const q = one(db, "SELECT value FROM settings WHERE key='quarters'");
  return { subjects, teachers, students, sched, assign, recMap, leaders, fb, msgs, hw, quarters: q ? JSON.parse(q.value) : DEFAULT_Q, classes: classes.map(c => c.name), logos, docs };
}

/* ---------- sync (yozish) ---------- */
const ADMIN_KEYS = ['classes', 'subjects', 'teachers', 'students', 'sched', 'assign', 'leaders', 'hw', 'fbNew', 'recDel', 'quarters'];

function validRec(db, r, key) {
  if (!r || typeof r !== 'object') throw bad('Noto‘g‘ri yozuv.');
  const sid = +r.sid, subj = String(r.subj || ''), date = String(r.date || '');
  if (key && key !== `${sid}|${subj}|${date}`) throw bad('Yozuv kaliti mos kelmadi.');
  if (!DATE_RE.test(date)) throw bad('Sana noto‘g‘ri.');
  if (!ATT.includes(r.att)) throw bad('Davomat qiymati noto‘g‘ri.');
  const int = (v, a, b, n) => { v = Number(v); if (!Number.isInteger(v) || v < a || v > b) throw bad(n + ' ' + a + '–' + b + ' oralig‘ida butun son bo‘lishi kerak.'); return v; };
  const act = int(r.act, 2, 5, 'Faollik'), beh = int(r.beh, 2, 5, 'Tarbiya'), hw = int(r.hw, 0, 100, 'Uyga vazifa foizi');
  const c = String(r.c ?? '').slice(0, 500);
  const st = one(db, 'SELECT cls FROM students WHERE id=?', sid);
  if (!st) throw bad('O‘quvchi topilmadi.');
  if (!one(db, 'SELECT 1 x FROM subjects WHERE name=?', subj)) throw bad('Fan topilmadi.');
  return { sid, subj, date, att: r.att, act, beh, hw, c, cls: st.cls };
}

function adminPart(db, d, audit) {
  if (d.classes) {
    const a = d.classes;
    if (!Array.isArray(a) || !a.length || a.length > 60 || a.some(n => typeof n !== 'string' || !CLS_RE.test(n))) throw bad('Sinf nomi noto‘g‘ri (1–20 belgi: harf, raqam, probel, nuqta, tire).');
    if (new Set(a.map(n => n.toLowerCase())).size !== a.length) throw bad('Sinf nomlari takrorlanmasin.');
    for (const { name: n } of all(db, 'SELECT name FROM classes')) if (!a.includes(n)) {
      if (one(db, 'SELECT 1 x FROM students WHERE cls=?', n)) throw bad(`${n} sinfida o‘quvchilar bor — avval ularni boshqa sinfga o‘tkazing.`);
      for (const t of ['classes', 'schedule', 'assignments', 'homework']) run(db, `DELETE FROM ${t} WHERE ${t === 'classes' ? 'name' : 'cls'}=?`, n);
    }
    a.forEach((n, i) => run(db, 'INSERT INTO classes(name,leader_id,pos) VALUES(?,NULL,?) ON CONFLICT(name) DO UPDATE SET pos=excluded.pos', n, i));
    audit.push('classes');
  }
  const classes = all(db, 'SELECT name FROM classes').map(c => c.name);
  if (d.subjects) {
    const a = d.subjects; if (!Array.isArray(a) || new Set(a).size !== a.length || a.some(s => typeof s !== 'string' || !s.trim() || s.length > 60)) throw bad('Fanlar ro‘yxati noto‘g‘ri.');
    run(db, 'DELETE FROM subjects'); a.forEach((s, i) => run(db, 'INSERT INTO subjects VALUES(?,?)', s, i)); audit.push('subjects');
  }
  const subjects = new Set(all(db, 'SELECT name FROM subjects').map(r => r.name));
  if (d.teachers) {
    if (!Array.isArray(d.teachers)) throw bad('Ustozlar ro‘yxati noto‘g‘ri.');
    const ex = new Map(all(db, 'SELECT id,pw_hint FROM teachers').map(r => [r.id, r.pw_hint]));
    const keep = [];
    for (const t of d.teachers) {
      if (!/^[A-Za-z0-9_-]{1,20}$/.test(t.id || '') || !String(t.name || '').trim()) throw bad('Ustoz ma’lumoti noto‘g‘ri.');
      if (!subjects.has(t.subj)) throw bad('Ustozning fani topilmadi: ' + t.subj);
      const pw = String(t.pw ?? ex.get(t.id) ?? 'ustoz' + t.id.slice(1));
      if (pw.length < 4) throw bad('Parol kamida 4 belgi bo‘lsin.');
      const phone = t.phone ? digits9(t.phone) : null;
      if (!ex.has(t.id) || ex.get(t.id) !== pw) run(db, 'INSERT INTO teachers VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,subj=excluded.subj,phone=excluded.phone,pw_hash=excluded.pw_hash,pw_hint=excluded.pw_hint', t.id, t.name.trim(), t.subj, phone, hashPw(pw), pw);
      else run(db, 'UPDATE teachers SET name=?,subj=?,phone=? WHERE id=?', t.name.trim(), t.subj, phone, t.id);
      keep.push(t.id);
    }
    const gone = [...ex.keys()].filter(id => !keep.includes(id));
    for (const id of gone) { run(db, 'DELETE FROM teachers WHERE id=?', id); run(db, 'DELETE FROM assignments WHERE teacher_id=?', id); run(db, 'UPDATE classes SET leader_id=NULL WHERE leader_id=?', id); }
    audit.push('teachers');
  }
  if (d.students) {
    if (!Array.isArray(d.students)) throw bad('O‘quvchilar ro‘yxati noto‘g‘ri.');
    const ex = new Map(all(db, 'SELECT id,pw_hint FROM students').map(r => [r.id, r.pw_hint]));
    const keep = new Set();
    for (const s of d.students) {
      const id = +s.id, phone = digits9(s.phone);
      if (!Number.isInteger(id) || id < 1 || !String(s.name || '').trim() || !classes.includes(s.cls)) throw bad('O‘quvchi ma’lumoti noto‘g‘ri: ' + (s.name || id));
      if (phone.length !== 9) throw bad('Telefon raqam 9 raqamdan iborat bo‘lsin: ' + s.name);
      const pw = String(s.pw ?? ex.get(id) ?? 'oquvchi' + id);
      if (pw.length < 4) throw bad('Parol kamida 4 belgi bo‘lsin: ' + s.name);
      if (!ex.has(id) || ex.get(id) !== pw) run(db, 'INSERT INTO students VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,cls=excluded.cls,q=excluded.q,phone=excluded.phone,pw_hash=excluded.pw_hash,pw_hint=excluded.pw_hint', id, s.name.trim(), s.cls, +s.q || 0.6, phone, hashPw(pw), pw);
      else run(db, 'UPDATE students SET name=?,cls=?,phone=? WHERE id=?', s.name.trim(), s.cls, phone, id);
      keep.add(id);
    }
    for (const id of ex.keys()) if (!keep.has(id)) { run(db, 'DELETE FROM students WHERE id=?', id); run(db, 'DELETE FROM records WHERE sid=?', id); run(db, 'DELETE FROM messages WHERE sid=?', id); run(db, 'DELETE FROM docs WHERE sid=?', id); }
    audit.push('students');
  }
  const tids = new Set(all(db, 'SELECT id FROM teachers').map(r => r.id));
  if (d.sched) for (const [c, days] of Object.entries(d.sched)) {
    if (!classes.includes(c) || !Array.isArray(days) || days.length !== 5 || days.some(r => !Array.isArray(r) || r.length !== 7)) throw bad('Dars jadvali noto‘g‘ri: ' + c);
    run(db, 'DELETE FROM schedule WHERE cls=?', c);
    days.forEach((row, di) => row.forEach((sub, i) => { if (!subjects.has(sub)) throw bad('Jadvalda noma’lum fan: ' + sub); run(db, 'INSERT INTO schedule VALUES(?,?,?,?)', c, di, i, sub); }));
    audit.push('sched ' + c);
  }
  if (d.assign) for (const [c, m] of Object.entries(d.assign)) {
    if (!classes.includes(c)) throw bad('Sinf topilmadi: ' + c);
    run(db, 'DELETE FROM assignments WHERE cls=?', c);
    for (const [sub, tid] of Object.entries(m)) if (tid) { if (!tids.has(tid) || !subjects.has(sub)) throw bad('Biriktirish noto‘g‘ri.'); run(db, 'INSERT INTO assignments VALUES(?,?,?)', c, sub, tid); }
    audit.push('assign ' + c);
  }
  if (d.leaders) for (const [c, tid] of Object.entries(d.leaders)) {
    if (!classes.includes(c) || (tid && !tids.has(tid))) throw bad('Sinf rahbari noto‘g‘ri.');
    run(db, 'UPDATE classes SET leader_id=? WHERE name=?', tid || null, c); audit.push('leader ' + c);
  }
  if (d.hw) {
    run(db, 'DELETE FROM homework');
    for (const [k, text] of Object.entries(d.hw)) { const [c, sub] = k.split('|'); if (text && classes.includes(c) && subjects.has(sub)) run(db, 'INSERT INTO homework VALUES(?,?,?)', c, sub, String(text).slice(0, 1000)); }
  }
  if (d.quarters) {
    const q = d.quarters;
    const ok = Array.isArray(q) && q.length === 4 && q.every((x, i) => Array.isArray(x) && DATE_RE.test(x[0]) && DATE_RE.test(x[1]) && x[0] <= x[1] && (i === 0 || q[i - 1][1] < x[0]));
    if (!ok) throw bad('Choraklar sanalari noto‘g‘ri: har chorak boshi oxiridan oldin, choraklar ketma-ket bo‘lsin.');
    run(db, "INSERT OR REPLACE INTO settings VALUES('quarters',?)", JSON.stringify(q)); audit.push('quarters');
  }
  for (const f of d.fbNew || []) {
    if (!tids.has(f.t) || !String(f.x || '').trim()) throw bad('Fikr noto‘g‘ri.');
    run(db, 'INSERT INTO feedback(teacher_id,text,date) VALUES(?,?,?)', f.t, String(f.x).slice(0, 1000), String(f.d || '').slice(0, 10)); audit.push('feedback');
  }
  for (const k of d.recDel || []) { const [sid, subj, date] = String(k).split('|'); run(db, 'DELETE FROM records WHERE sid=? AND subj=? AND date=?', +sid, subj, date); }
}

export function applySync(db, me, d) {
  if (me.r !== 'admin' && me.r !== 'teacher') throw forbid();
  d = d && typeof d === 'object' ? d : {};
  if (me.r === 'admin' && (d.logoUp || d.docUp)) throw new HttpError(403, 'Logotip va hujjatlarni faqat sinf rahbari o‘zgartira oladi.');
  if (me.r !== 'admin' && ADMIN_KEYS.some(k => d[k] !== undefined)) throw forbid();
  const audit = [], t = me.r === 'teacher' ? one(db, 'SELECT * FROM teachers WHERE id=?', me.id) : null;
  if (me.r === 'teacher' && !t) throw forbid();
  const owns = (cls, subj) => t && t.subj === subj && one(db, 'SELECT 1 x FROM assignments WHERE cls=? AND subj=? AND teacher_id=?', cls, subj, t.id);
  tx(db, () => {
    if (me.r === 'admin') adminPart(db, d, audit);
    const up = d.recUp || {}, now = new Date().toISOString();
    for (const [key, raw] of Object.entries(up)) {
      const r = validRec(db, raw, key);
      if (me.r === 'teacher') {
        if (!owns(r.cls, r.subj)) throw forbid();
        const st = dayState(r.date, todayIso());
        if (st === 'future') throw new HttpError(403, 'Kelajak sanasiga baho qo‘yib bo‘lmaydi.');
        if (st === 'locked') throw new HttpError(403, `${r.date} sanasidagi baholar qulflangan (7 kundan oshgan). Faqat administrator o‘zgartira oladi.`);
        const di = wdIdx(r.date);
        if (di > 4 || !one(db, 'SELECT 1 x FROM schedule WHERE cls=? AND day=? AND subj=?', r.cls, di, r.subj)) throw new HttpError(403, `${r.date} kuni ${r.cls} sinfida ${r.subj} darsi yo‘q (baholash dars jadvaliga bog‘langan).`);
      }
      run(db, 'INSERT OR REPLACE INTO records VALUES(?,?,?,?,?,?,?,?,?,?)', r.sid, r.subj, r.date, r.att, r.act, r.beh, r.hw, r.c, me.r === 'admin' ? 'admin' : me.id, now);
    }
    if (Object.keys(up).length) audit.push(`records x${Object.keys(up).length}`);
    if (me.r === 'teacher') {
      for (const [k, text] of Object.entries(d.hwUp || {})) {
        const [c, sub] = k.split('|');
        if (!owns(c, sub)) throw forbid();
        if (text) run(db, 'INSERT OR REPLACE INTO homework VALUES(?,?,?)', c, sub, String(text).slice(0, 1000)); else run(db, 'DELETE FROM homework WHERE cls=? AND subj=?', c, sub);
        audit.push('homework ' + k);
      }
      for (const [c, uri] of Object.entries(d.logoUp || {})) {
        if (!one(db, 'SELECT 1 x FROM classes WHERE name=? AND leader_id=?', c, t.id)) throw new HttpError(403, 'Sinf logotipini faqat sinf rahbari o‘zgartira oladi.');
        if (uri && (typeof uri !== 'string' || !LOGO_RE.test(uri))) throw bad('Logo formati noto‘g‘ri (PNG, JPG yoki WEBP).');
        if (uri && uri.length > 150000) throw bad('Logo juda katta (150 KB gacha).');
        run(db, 'UPDATE classes SET logo=? WHERE name=?', uri || null, c); audit.push('logo ' + c);
      }
      for (const [sid, codes] of Object.entries(d.docUp || {})) {
        if (!one(db, 'SELECT 1 x FROM students s JOIN classes c ON c.name=s.cls WHERE s.id=? AND c.leader_id=?', +sid, t.id)) throw new HttpError(403, 'Hujjatlarni faqat sinf rahbari belgilaydi.');
        if (!Array.isArray(codes) || new Set(codes).size !== codes.length || codes.some(x => !DOC_TYPES.some(d2 => d2.code === x))) throw bad('Hujjat turi noto‘g‘ri.');
        run(db, 'DELETE FROM docs WHERE sid=?', +sid);
        for (const x of codes) run(db, 'INSERT INTO docs VALUES(?,?)', +sid, x);
        audit.push('docs ' + sid);
      }
      for (const m of d.msgsNew || []) {
        const st = one(db, 'SELECT cls FROM students WHERE id=?', +m.sid);
        if (!st || !String(m.x || '').trim()) throw bad('Xabar noto‘g‘ri.');
        const ok = one(db, 'SELECT 1 x FROM assignments WHERE cls=? AND teacher_id=? UNION SELECT 1 FROM classes WHERE name=? AND leader_id=?', st.cls, t.id, st.cls, t.id);
        if (!ok) throw forbid();
        run(db, 'INSERT INTO messages(sid,teacher_id,text,date) VALUES(?,?,?,?)', +m.sid, t.id, String(m.x).slice(0, 1000), String(m.d || '').slice(0, 10)); audit.push('message');
      }
    }
    if (audit.length) run(db, 'INSERT INTO audit(at,actor,action,detail) VALUES(?,?,?,?)', now, me.r + ':' + (me.id ?? ''), 'sync', audit.join(', ').slice(0, 500));
  });
}

/* ---------- login ---------- */
export function doLogin(db, b) {
  const pw = String(b.pw || '').trim(), fail = () => new HttpError(401, 'Ism, telefon raqam yoki parol noto‘g‘ri.');
  if (b.role === 'admin') {
    const a = one(db, 'SELECT * FROM admin WHERE id=1');
    if (a && digits9(b.phone) === a.phone && checkPw(pw, a.pw_hash)) return { r: 'admin' };
    throw fail();
  }
  if (b.role === 'teacher') {
    let c = all(db, 'SELECT * FROM teachers').filter(t => nz(t.name) === nz(b.name));
    if (c.length > 1 && !b.subject) throw new HttpError(409, 'Bu ism bilan bir nechta ustoz bor — fanni tanlang.', { needSubject: true, subjects: c.map(t => t.subj) });
    if (c.length > 1) c = c.filter(t => t.subj === b.subject);
    if (c.length === 1 && checkPw(pw, c[0].pw_hash)) return { r: 'teacher', id: c[0].id };
    throw fail();
  }
  if (b.role === 'student') {
    const p = digits9(b.phone);
    const s = all(db, 'SELECT * FROM students WHERE phone=?', p).find(s => nz(s.name) === nz(b.name));
    if (s && checkPw(pw, s.pw_hash)) return { r: 'student', id: String(s.id) };
    throw fail();
  }
  throw bad('Rol noto‘g‘ri.');
}
const exists = (db, me) => me.r === 'admin' || (me.r === 'teacher' && one(db, 'SELECT 1 x FROM teachers WHERE id=?', me.id)) || (me.r === 'student' && one(db, 'SELECT 1 x FROM students WHERE id=?', +me.id));

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

/** Maktab saytining brendi (nomi, logosi): bazadagi settings → muhit o‘zgaruvchisi → standart. */
export function siteInfo(db, fallbackName = process.env.SCHOOL_NAME || 'Al-Xorazmiy maktabi') {
  const g = k => one(db, 'SELECT value FROM settings WHERE key=?', k)?.value || '';
  return { name: g('school_name') || fallbackName, logo: g('school_logo') || null };
}

export function createApp(db, opts = {}) { return createServer(createHandler(db, opts)); }

/** HTTP so‘rov ishlovchisi (server o‘zi ochilmaydi) — DASADA bir nechta maktabni shu orqali bitta jarayonda xizmat qiladi. */
export function createHandler(db, { secret, staticDir, demo = false, onApi, support } = {}) {
  secret ||= loadSecret();
  const fails = new Map();
  const send = (res, code, obj) => { const s = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(s); };
  const body = req => new Promise((ok, no) => {
    let n = 0; const ch = [];
    req.on('data', c => { n += c.length; if (n > 10e6) { no(new HttpError(413, 'Hajm juda katta.')); req.destroy(); } else ch.push(c); });
    req.on('end', () => { try { ok(ch.length ? JSON.parse(Buffer.concat(ch).toString()) : {}); } catch { no(bad('JSON noto‘g‘ri.')); } });
    req.on('error', no);
  });
  const authed = req => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''), me = m && verifyToken(m[1], secret);
    if (!me || !exists(db, me)) throw new HttpError(401, 'Qaytadan kiring.');
    return me;
  };
  const serveStatic = (req, res, path) => {
    if (!staticDir || !existsSync(staticDir)) { res.writeHead(404); return res.end('Not found'); }
    let f = normalize(join(staticDir, path === '/' ? 'index.html' : path));
    if (!f.startsWith(normalize(staticDir))) { res.writeHead(403); return res.end(); }
    if (!existsSync(f) || statSync(f).isDirectory()) f = join(staticDir, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': f.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(readFileSync(f));
  };

  return async (req, res) => {
    const url = new URL(req.url, 'http://x'), path = url.pathname;
    try {
      if (!path.startsWith('/api/')) return serveStatic(req, res, path);
      if (path === '/api/health') return send(res, 200, { ok: true });
      if (path === '/api/site' && req.method === 'GET') return send(res, 200, siteInfo(db));
      if (onApi) onApi(path);
      if (path === '/api/demo' && demo) {
        const t = one(db, 'SELECT * FROM teachers ORDER BY CAST(substr(id,2) AS INTEGER) LIMIT 1'), s = one(db, 'SELECT * FROM students ORDER BY id LIMIT 1'), a = one(db, 'SELECT phone FROM admin');
        return send(res, 200, { admin: { phone: a.phone, pw: 'admin123' }, teacher: { name: t.name, subject: t.subj, pw: t.pw_hint }, student: { name: s.name, phone: s.phone, pw: s.pw_hint } });
      }
      if (path === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || '?', f = fails.get(ip);
        if (f && f.n >= 10 && f.until > Date.now()) throw new HttpError(429, 'Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.');
        let me;
        try { me = doLogin(db, await body(req)); }
        catch (e) { if (e.status === 401) fails.set(ip, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 15 * 60e3 }); throw e; }
        fails.delete(ip);
        return send(res, 200, { token: signToken(me, secret), me, state: buildState(db, me) });
      }
      if (path.startsWith('/api/support/')) {
        // “Yordam”: maktab admini general adminga murojaat yozadi (faqat DASADA ichida ishlaganda ulanadi).
        const me = authed(req);
        if (me.r !== 'admin') throw new HttpError(403, 'Faqat maktab administratori murojaat yoza oladi.');
        const sub = path.slice('/api/support'.length);
        if (!support || !/^\/tickets(\/\d+(\/reply)?)?$/.test(sub)) throw new HttpError(404, 'Yordam xizmati bu saytda ulanmagan.');
        const b = req.method === 'POST' ? await body(req) : {};
        return send(res, 200, support(req.method, sub, b));
      }
      if (path === '/api/state' && req.method === 'GET') { const me = authed(req); return send(res, 200, { me: { r: me.r, ...(me.id != null ? { id: me.id } : {}) }, state: buildState(db, me) }); }
      if (path === '/api/sync' && req.method === 'POST') { const me = authed(req); applySync(db, me, await body(req)); return send(res, 200, { ok: true }); }
      throw new HttpError(404, 'Topilmadi.');
    } catch (e) {
      const known = e instanceof HttpError || (e && e.status && e.status < 500);
      if (!known) console.error(e);
      send(res, e.status || 500, { error: known ? e.message : 'Server xatosi.', ...(e.extra || {}) });
    }
  };
}
