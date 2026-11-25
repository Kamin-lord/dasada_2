// Baza bo‘sh bo‘lsa, frontend generatoridan demo ma’lumot bilan to‘ldiradi.
import { tx, hashPw } from './db.js';
import * as D from '../src/kundalik/data.js';
import { rf } from '../src/kundalik/data.js';

export function seedIfEmpty(db, { adminPhone, adminPw, fastHash = true } = {}) {
  const N = fastHash ? 1024 : 16384; // demo parollar uchun tez hash
  if (db.prepare('SELECT COUNT(*) c FROM teachers').get().c > 0) return false;
  const students = D.mkS();
  const sched = D.genSched(D.INITIAL_SUBJ);
  const assign = D.genAssign(D.INITIAL_SUBJ, D.INITIAL_T);
  const recs = D.seed(students, sched);
  tx(db, () => {
    D.INITIAL_SUBJ.forEach((s, i) => db.prepare('INSERT INTO subjects VALUES(?,?)').run(s, i));
    for (const t of D.INITIAL_T) {
      const pw = D.tPw(t.id);
      db.prepare('INSERT INTO teachers VALUES(?,?,?,?,?,?)').run(t.id, t.name, t.subj, D.tPhone(t.id), hashPw(pw, N), pw);
    }
    D.CL.forEach((c, i) => db.prepare('INSERT INTO classes(name,leader_id,pos) VALUES(?,?,?)').run(c, D.INITIAL_T[i % D.INITIAL_T.length].id, i));
    for (const s of students) db.prepare('INSERT INTO students VALUES(?,?,?,?,?,?,?)').run(s.id, s.name, s.cls, s.q, s.phone, hashPw(s.pw, N), s.pw);
    for (const [c, days] of Object.entries(sched)) days.forEach((row, d) => row.forEach((sub, i) => db.prepare('INSERT INTO schedule VALUES(?,?,?,?)').run(c, d, i, sub)));
    for (const [c, m] of Object.entries(assign)) for (const [sub, tid] of Object.entries(m)) db.prepare('INSERT INTO assignments VALUES(?,?,?)').run(c, sub, tid);
    for (const r of Object.values(recs)) db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?)').run(r.sid, r.subj, r.date, r.att, r.act, r.beh, r.hw, r.c || '', 'seed', new Date().toISOString());
    const r = rf(11); // demo: ko‘pchilikda hujjat to‘liq, ba’zilarida yetishmaydi
    for (const s of students) for (const d of D.DOC_TYPES) if (r() < (d.need ? 0.9 : 0.15)) db.prepare('INSERT INTO docs VALUES(?,?)').run(s.id, d.code);
    db.prepare('INSERT INTO homework VALUES(?,?,?)').run('5-A', 'Matematika', 'Darslikdan 24-mashq, 1–6-misollar');
    db.prepare('INSERT INTO homework VALUES(?,?,?)').run('6-A', 'Fizika', 'Nyuton qonunlari bo‘yicha 5 ta savol');
    db.prepare('INSERT OR REPLACE INTO admin VALUES(1,?,?)').run(adminPhone || D.ADM[0], hashPw(adminPw || D.ADM[1], N));
  });
  return true;
}

/** Yangi (bo‘sh) maktab: demo ma’lumotsiz. Faqat admin, standart fanlar va bitta boshlang‘ich sinf. DASADA yangi maktab qo‘shganda shuni chaqiradi. */
export function seedBlank(db, { name, logo, adminPhone, adminPw, adminHash, classes = ['1-A'] } = {}) {
  if (!adminPhone || !(adminPw || adminHash)) throw new Error('Admin telefoni va paroli kerak.');
  const phone = String(adminPhone).replace(/\D/g, '').slice(-9);
  tx(db, () => {
    if (!db.prepare('SELECT 1 x FROM subjects LIMIT 1').get()) D.INITIAL_SUBJ.forEach((s, i) => db.prepare('INSERT INTO subjects VALUES(?,?)').run(s, i));
    if (!db.prepare('SELECT 1 x FROM classes LIMIT 1').get()) classes.forEach((c, i) => db.prepare('INSERT INTO classes(name,leader_id,pos) VALUES(?,NULL,?)').run(c, i));
    db.prepare('INSERT OR REPLACE INTO admin VALUES(1,?,?)').run(phone, adminHash || hashPw(adminPw));
  });
  setBranding(db, { name, logo });
}

export function setBranding(db, { name, logo } = {}) {
  const put = (k, v) => v ? db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(k, String(v)) : db.prepare('DELETE FROM settings WHERE key=?').run(k);
  if (name !== undefined) put('school_name', name);
  if (logo !== undefined) put('school_logo', logo);
}

export function setAdmin(db, { phone, pw, hash }) {
  const p = String(phone || '').replace(/\D/g, '').slice(-9);
  if (pw || hash) db.prepare('INSERT OR REPLACE INTO admin VALUES(1,?,?)').run(p, hash || hashPw(pw));
  else db.prepare('UPDATE admin SET phone=? WHERE id=1').run(p);
}
