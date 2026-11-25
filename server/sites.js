// Maktab saytlarini DASADA ichida yuritish: har maktab shablondan (template/al-kundalik) alohida baza bilan ochiladi.
// Bitta jarayon, bitta port — maktab Host sarlavhasi (al-xorazmiy.uz yoki al-xorazmiy.<SITE_BASE_DOMAIN>)
// yoki /s/<slug>/ yo‘li bo‘yicha topiladi. (Railway kabi hostinglarda har maktabga alohida port ochib bo‘lmaydi.)
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { openDb as openSchoolDb } from '../template/al-kundalik/server/db.js';
import { seedBlank, setBranding } from '../template/al-kundalik/server/seed.js';
import { createHandler } from '../template/al-kundalik/server/app.js';
import { schoolRoute } from './app.js';
import { missingDocs } from '../template/al-kundalik/src/kundalik/data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_DIR = process.env.SITE_TEMPLATE || join(ROOT, 'template', 'al-kundalik');
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** “Al-Xorazmiy maktabi” → “al-xorazmiy-maktabi” (lotin harf, raqam, tire). */
export function slugify(name) {
  const s = String(name || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’ʻʼ'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return s || 'maktab';
}
/** Domen: faqat host qismi, kichik harf (https://, yo‘l, port olib tashlanadi). Bo‘sh bo‘lsa ''. */
export function normHost(v) {
  const h = String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  if (!h) return '';
  if (!HOST_RE.test(h) || h.length > 120) return null;
  return h;
}

export class SiteHub {
  constructor(db, { dataDir, baseDomain = process.env.SITE_BASE_DOMAIN || '', templateDir = TEMPLATE_DIR } = {}) {
    this.db = db; this.dataDir = dataDir; this.templateDir = templateDir;
    this.baseDomain = normHost(baseDomain) || '';
    this.tenants = new Map(); this.seen = new Map();
  }
  /** DASADA ning tashqi manzili (sinov yo‘li uchun): PUBLIC_URL yoki so‘rov sarlavhalaridan. */
  origin(req) {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
    const h = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const p = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
    return h ? `${p}://${h}` : '';
  }
  dir(slug) { return join(this.dataDir, 'sites', slug); }
  built() { return existsSync(join(this.templateDir, 'dist', 'index.html')); }

  uniqueSlug(name) {
    const base = slugify(name); let slug = base, n = 2;
    while (this.db.prepare('SELECT 1 x FROM schools WHERE slug=?').get(slug) || existsSync(this.dir(slug))) slug = `${base}-${n++}`;
    return slug;
  }
  /** Maktabga mos tashqi manzillar: o‘z domeni, subdomen (SITE_BASE_DOMAIN bo‘lsa) va sinov yo‘li. */
  urls(s, origin = '') {
    const out = [];
    if (s.host) out.push({ kind: 'domain', url: 'https://' + s.host });
    if (this.baseDomain) out.push({ kind: 'subdomain', url: `https://${s.slug}.${this.baseDomain}` });
    out.push({ kind: 'path', url: `${origin}/s/${s.slug}/` });
    return out;
  }

  secretOf(slug) {
    const f = join(this.dir(slug), '.secret');
    if (existsSync(f)) return readFileSync(f, 'utf8').trim();
    mkdirSync(this.dir(slug), { recursive: true });
    const s = randomBytes(32).toString('hex'); writeFileSync(f, s, { mode: 0o600 }); return s;
  }
  /** Maktab bazasi va ishlovchisini (kerak bo‘lsa yaratib) qaytaradi. */
  open(slug) {
    let t = this.tenants.get(slug);
    if (t) return t;
    const sdb = openSchoolDb(join(this.dir(slug), 'kundalik.db'));
    t = { db: sdb, handler: createHandler(sdb, { secret: this.secretOf(slug), staticDir: join(this.templateDir, 'dist'), demo: false, onApi: () => this.touch(slug), support: (method, sub, b) => this.support(slug, method, sub, b) }) };
    this.tenants.set(slug, t);
    return t;
  }
  /** Maktab saytidagi “Yordam”: murojaat to‘g‘ridan-to‘g‘ri DASADA ning murojaatlariga (general adminga) tushadi. */
  support(slug, method, sub, b) {
    const school = this.db.prepare('SELECT * FROM schools WHERE slug=? AND hosted=1').get(slug);
    if (!school) throw Object.assign(new Error('Maktab topilmadi.'), { status: 404 });
    return schoolRoute(this.db, { method }, '/api/school' + sub, b || {}, school);
  }
  touch(slug) {
    const n = Date.now();
    if (n - (this.seen.get(slug) || 0) < 60e3) return;
    this.seen.set(slug, n);
    try { this.db.prepare('UPDATE schools SET last_seen=? WHERE slug=?').run(new Date(n).toISOString(), slug); } catch { /* ignore */ }
  }

  /** Yangi maktab sayti: bo‘sh baza + admin (parol hashi DASADA dagi bilan bir xil) + nom/logo. */
  provision(slug, { name, logo, adminPhone, adminHash }) {
    const { db } = this.open(slug);
    seedBlank(db, { name, logo, adminPhone, adminHash });
  }
  setBranding(slug, b) { setBranding(this.open(slug).db, b); }
  setAdmin(slug, phone, hash) {
    const { db } = this.open(slug);
    if (phone && hash) db.prepare('INSERT OR REPLACE INTO admin VALUES(1,?,?)').run(String(phone).replace(/\D/g, '').slice(-9), hash);
  }
  stats(slug) {
    const { db } = this.open(slug), c = t => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
    return { students: c('students'), teachers: c('teachers'), classes: c('classes') };
  }
  /** “Foydalanuvchilar” bo‘limi uchun jonli ko‘rinish (parollarsiz). */
  snapshot(slug) {
    const { db } = this.open(slug), all = (q, ...p) => db.prepare(q).all(...p);
    const subjects = all('SELECT name FROM subjects ORDER BY pos').map(r => r.name);
    const tch = all('SELECT id,name,subj,phone FROM teachers ORDER BY CAST(substr(id,2) AS INTEGER),id');
    const cls = all('SELECT name, leader_id FROM classes ORDER BY pos, rowid');
    const tName = Object.fromEntries(tch.map(t => [t.id, t.name]));
    const docs = {}; for (const r of all('SELECT sid, code FROM docs')) (docs[r.sid] ||= []).push(r.code);
    const agg = Object.fromEntries(all("SELECT sid, COUNT(*) n, SUM(att='Bor') p, AVG(CASE WHEN att='Bor' THEN act END) a FROM records GROUP BY sid").map(r => [r.sid, r]));
    const stu = all('SELECT id,name,cls,phone FROM students ORDER BY id');
    const n = {}; for (const s of stu) n[s.cls] = (n[s.cls] || 0) + 1;
    return {
      subjects,
      students: stu.map(s => { const a = agg[s.id]; return { id: s.id, name: s.name, cls: s.cls, phone: s.phone, avg: a && a.a != null ? +a.a.toFixed(1) : null, att: a && a.n ? Math.round(a.p / a.n * 100) : null, miss: missingDocs(docs[s.id] || []) }; }),
      teachers: tch.map(t => ({ id: t.id, name: t.name, subj: t.subj, phone: t.phone || '', leads: cls.filter(c => c.leader_id === t.id).map(c => c.name) })),
      classes: cls.map(c => ({ name: c.name, leader: tName[c.leader_id] || '', n: n[c.name] || 0 }))
    };
  }
  /** O‘chirilganda baza o‘chib ketmaydi — _deleted-... papkasiga olib qo‘yiladi. */
  retire(slug) {
    const t = this.tenants.get(slug);
    if (t) { try { t.db.close(); } catch { /* ignore */ } this.tenants.delete(slug); }
    if (existsSync(this.dir(slug))) renameSync(this.dir(slug), join(this.dataDir, 'sites', `_deleted-${slug}-${Date.now()}`));
  }

  /** So‘rov qaysi maktabga tegishli: Host (domen / subdomen) yoki /s/<slug>/ yo‘li. */
  resolve(req) {
    const h = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
    const q = 'SELECT id,name,slug,host,status FROM schools WHERE hosted=1 AND ';
    let row = h && this.db.prepare(q + 'host=?').get(h);
    if (!row && h && this.baseDomain && h.endsWith('.' + this.baseDomain)) {
      const sub = h.slice(0, -(this.baseDomain.length + 1));
      if (/^[a-z0-9-]+$/.test(sub)) row = this.db.prepare(q + 'slug=?').get(sub);
    }
    if (row) return { school: row, mode: 'host' };
    const m = /^\/s\/([a-z0-9-]+)(\/.*)?$/.exec(String(req.url).split('?')[0]);
    if (m) { row = this.db.prepare(q + 'slug=?').get(m[1]); if (row) return { school: row, mode: 'path', rest: m[2] || '' }; }
    return null;
  }
  serve(site, req, res) {
    const { school, mode } = site, page = (code, msg) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${school.name}</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h2>${school.name.replace(/</g, '&lt;')}</h2><p>${msg}</p></div>`); };
    if (school.status !== 'faol') return page(403, 'Bu maktab sayti vaqtincha o‘chirilgan. DASADA bilan bog‘laning.');
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    if (mode === 'path') {
      if (!site.rest) { res.writeHead(302, { location: `/s/${school.slug}/${qs}` }); return res.end(); }
      req.url = site.rest + qs;
    }
    if (!req.url.startsWith('/api/') && !this.built()) return page(503, 'Sayt shabloni hali build qilinmagan. Serverda <code>npm run build</code> ni ishga tushiring.');
    return this.open(school.slug).handler(req, res);
  }
}
