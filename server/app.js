import { createServer } from 'node:http';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { tx, hashPw, checkPw, newKey, keyHash } from './db.js';

export const CATEGORIES = ['texnik', 'hisob', 'malumot', 'taklif', 'boshqa'];
export const PRIORITIES = ['past', 'oddiy', 'yuqori', 'shoshilinch'];
export const STATUSES = ['yangi', 'jarayonda', 'hal', 'yopiq'];
export const PERMS = ['schools', 'tickets', 'users', 'admins', 'news'];   // menejerga beriladigan bo‘limlar
const SCHOOL_STATUS = ['faol', 'bloklangan'];
const SA_ROLES = ['admin', 'menejer'];
const TTL = 12 * 3600;
const ONLINE_MIN = 25;
const MIN_PW = 6;

export class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const bad = m => new HttpError(400, m);
const all = (db, sql, ...p) => db.prepare(sql).all(...p);
const one = (db, sql, ...p) => db.prepare(sql).get(...p);
const run = (db, sql, ...p) => db.prepare(sql).run(...p);
const now = () => new Date().toISOString();
const str = (v, max, name, req = true) => {
  const s = String(v ?? '').trim();
  if (req && !s) throw bad(name + ' bo‘sh bo‘lmasin.');
  if (s.length > max) throw bad(`${name} juda uzun (${max} belgigacha).`);
  return s;
};
const pick = (v, list, name) => { if (!list.includes(v)) throw bad(name + ' noto‘g‘ri.'); return v; };
const cnt = v => (v == null || v === '' ? null : Math.max(0, Math.min(1e6, Math.floor(+v) || 0)));
const digits9 = v => String(v ?? '').replace(/\D/g, '').slice(-9);
const phoneOf = v => { const d = digits9(v); if (d.length !== 9) throw bad('Telefon raqam 9 raqamdan iborat bo‘lsin (masalan 90 123 45 67).'); return d; };
const PWA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genPw = () => Array.from({ length: 10 }, () => PWA[randomInt(PWA.length)]).join('');
const pwOf = (v, name = 'Parol') => { const p = String(v ?? ''); if (p.length < MIN_PW) throw bad(`${name} kamida ${MIN_PW} belgidan iborat bo‘lsin.`); if (p.length > 100) throw bad(name + ' juda uzun.'); return p; };

/* ---------- token ---------- */
export function loadSecret(file) {
  if (process.env.DSD_SECRET) return process.env.DSD_SECRET;
  if (!file) return randomBytes(32).toString('hex');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  mkdirSync(dirname(file), { recursive: true });
  const s = randomBytes(32).toString('hex'); writeFileSync(file, s, { mode: 0o600 }); return s;
}
const mac = (s, secret) => createHmac('sha256', secret).update(s).digest('base64url');
const signToken = (st, secret) => { const p = Buffer.from(JSON.stringify({ s: st.id, v: st.tv, exp: Math.floor(Date.now() / 1000) + TTL })).toString('base64url'); return p + '.' + mac(p, secret); };
function staffFromToken(db, t, secret) {
  const [p, m] = String(t || '').split('.');
  if (!p || !m) return null;
  const a = Buffer.from(mac(p, secret)), b = Buffer.from(m);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!(d.exp > Date.now() / 1000)) return null;
    const st = one(db, 'SELECT * FROM staff WHERE id=?', d.s);
    return st && st.active && st.tv === d.v ? st : null;
  } catch { return null; }
}
const ROLES = {
  owner: { label: 'General admin', perms: [] },
  tex: { label: 'Tex admin', perms: ['schools', 'users', 'admins'] },
  kurator: { label: 'Kurator admin', perms: ['schools', 'tickets', 'users', 'news'] },
  dasturchi: { label: 'Dasturchi', perms: ['users'] },
  dizayner: { label: 'Dizayner', perms: ['news'] },
  tester: { label: 'Tester (QA)', perms: ['tickets', 'users'] },
  moliya: { label: 'Moliyachi', perms: ['schools'] },
  manager: { label: 'Menejer', perms: ['schools', 'tickets'] },
};
const PROLES = ['lead', 'member', 'viewer'], COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#0ea5e9', '#f97316'];
const plog = (db, pid, st, text) => pid && run(db, 'INSERT INTO proj_log(project_id,who,text,at) VALUES(?,?,?,?)', pid, st.name, String(text).slice(0, 300), now());
const memOf = (db, pid, st) => st.role === 'owner' ? { prole: 'lead' } : one(db, 'SELECT prole FROM project_members WHERE project_id=? AND staff_id=?', pid, st.id);
const projGet = (db, id, st) => { const p = one(db, 'SELECT * FROM projects WHERE id=?', +id); if (!p) throw new HttpError(404, 'Bo‘lim topilmadi.'); const mem = memOf(db, p.id, st); if (!mem) throw new HttpError(403, 'Siz bu bo‘lim a’zosi emassiz.'); return { p, mem, lead: mem.prole === 'lead', write: mem.prole !== 'viewer' }; };
const permsOf = st => (st.role === 'owner' ? [...PERMS] : JSON.parse(st.perms || '[]').filter(p => PERMS.includes(p)));
const ROLES_OUT = Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, { label: v.label, perms: v.perms }]));
const projOut = (db, p, st) => {
  const ts = all(db, 'SELECT status, COUNT(*) n FROM tasks WHERE project_id=? GROUP BY status', p.id), tc = Object.fromEntries(ts.map(x => [x.status, x.n]));
  const total = ts.reduce((a, x) => a + x.n, 0), done = tc.tayyor || 0;
  return { id: p.id, name: p.name, descr: p.descr, color: p.color, icon: p.icon, logo: p.logo || null, groupId: p.group_id || null, archived: !!p.archived, createdAt: p.created_at, tasks: { yangi: tc.yangi || 0, jarayonda: tc.jarayonda || 0, tekshiruv: tc.tekshiruv || 0, tayyor: tc.tayyor || 0 },
    progress: total ? Math.round(done / total * 100) : 0, members: all(db, 'SELECT staff_id id, prole FROM project_members WHERE project_id=?', p.id), chatLast: one(db, 'SELECT COALESCE(MAX(id),0) n FROM chat WHERE project_id=?', p.id).n,
    lead: st.role === 'owner' || memOf(db, p.id, st)?.prole === 'lead' };
};
const tlog = (db, id, st, kind, text) => run(db, 'INSERT INTO task_log(task_id,staff_id,who,kind,text,at) VALUES(?,?,?,?,?,?)', id, st.id, st.name, kind, String(text || '').slice(0, 1500), now());
const taskOut = t => ({ project: t.project_id || null, id: t.id, title: t.title, body: t.body, creator: t.creator, assignee: t.assignee, status: t.status, review: !!t.review, priority: t.priority, due: t.due, createdAt: t.created_at, updatedAt: t.updated_at });
const primary = db => one(db, "SELECT id FROM staff WHERE role='owner' ORDER BY id LIMIT 1")?.id;
const staffOut = st => ({ logo: st.logo || null, id: st.id, login: st.login, name: st.name, role: st.role, perms: permsOf(st), active: !!st.active, lastLogin: st.last_login, createdAt: st.created_at });
const need = (st, perm) => { if (!permsOf(st).includes(perm)) throw new HttpError(403, 'Bu bo‘limga ruxsatingiz yo‘q.'); };
const owner = st => { if (st.role !== 'owner') throw new HttpError(403, 'Faqat bosh admin (egasi) qila oladi.'); };
/** Xavfli amallar uchun joriy parolni qayta so‘raydi. */
const confirm = (st, b) => { if (!checkPw(String(b.confirm || ''), st.pw_hash)) throw new HttpError(403, 'Parol noto‘g‘ri. Amal bajarilmadi.'); };

/* ---------- ma’lumot qatlamlari ---------- */
const isOnline = s => !!s.last_seen && Date.now() - Date.parse(s.last_seen) < ONLINE_MIN * 60e3;
const schoolOut = s => ({ id: s.id, name: s.name, region: s.region, address: s.address, adminName: s.admin_name, phone: s.phone, url: s.url, note: s.note,
  status: s.status, keyHint: s.key_hint, students: s.students, teachers: s.teachers, classes: s.classes, version: s.version, lastSeen: s.last_seen, online: isOnline(s),
  createdAt: s.created_at, logo: s.logo || null, hasData: !!s.snapshot, snapAt: s.snap_at, demo: !!s.snap_demo });
const saOut = a => ({ id: a.id, schoolId: a.school_id, name: a.name, phone: a.phone, role: a.role, active: !!a.active, createdAt: a.created_at });
const ticketOut = (t, extra = {}) => ({ id: t.id, schoolId: t.school_id, title: t.title, category: t.category, priority: t.priority, status: t.status,
  createdAt: t.created_at, updatedAt: t.updated_at, assignee: t.assignee ?? null, ...extra });
const thread = (db, id) => all(db, 'SELECT side, text, at, who FROM ticket_msgs WHERE ticket_id=? ORDER BY id', id);
const audit = (db, actor, action, detail) => run(db, 'INSERT INTO audit(at,actor,action,detail) VALUES(?,?,?,?)', now(), actor, action, String(detail || '').slice(0, 300));
function addMsg(db, id, side, text, who) { const at = now(); run(db, 'INSERT INTO ticket_msgs(ticket_id,side,text,at,who) VALUES(?,?,?,?,?)', id, side, text, at, who || null); return at; }

/** Logo: faqat rasm data-URI (png/jpeg/webp/gif), ≤ 150 KB. SVG rad etiladi (skript xavfi). */
function logoOf(v) {
  const s = String(v || '');
  if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) throw bad('Logo PNG, JPG yoki WEBP rasm bo‘lsin.');
  if (s.length > 200 * 1024) throw bad('Logo juda katta (150 KB gacha).');
  return s;
}

const S = (v, n) => String(v ?? '').slice(0, n);
const num = v => (v == null || v === '' || !isFinite(+v) ? null : Math.round(+v * 10) / 10);
/** Maktab serveri yuborgan snapshotni tozalaydi (faqat kerakli maydonlar, uzunlik cheklovlari bilan). */
export function cleanSnapshot(x) {
  if (!x || typeof x !== 'object') throw bad('Snapshot noto‘g‘ri.');
  const arr = (a, max) => (Array.isArray(a) ? a.slice(0, max) : []);
  return {
    students: arr(x.students, 20000).map(s => ({ id: Math.floor(+s.id) || 0, name: S(s.name, 100), cls: S(s.cls, 20), phone: S(s.phone, 20), avg: num(s.avg), att: num(s.att), miss: arr(s.miss, 20).map(c => S(c, 20)) })),
    teachers: arr(x.teachers, 3000).map(t => ({ id: S(t.id, 20), name: S(t.name, 100), subj: S(t.subj, 60), phone: S(t.phone, 20), leads: arr(t.leads, 20).map(c => S(c, 20)) })),
    classes: arr(x.classes, 500).map(c => ({ name: S(c.name, 20), leader: S(c.leader, 100), n: Math.floor(+c.n) || 0 })),
    subjects: arr(x.subjects, 100).map(c => S(c, 60))
  };
}

/* ---------- bosh sahifa ---------- */
function overview(db, st) {
  const schools = all(db, 'SELECT id,name,region,status,students,teachers,last_seen FROM schools');
  const t = s => one(db, 'SELECT COUNT(*) c FROM tickets WHERE ' + s).c;
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
  const per = Object.fromEntries(days.map(d => [d, 0]));
  for (const r of all(db, 'SELECT substr(created_at,1,10) d, COUNT(*) c FROM tickets WHERE created_at>=? GROUP BY d', days[0])) if (r.d in per) per[r.d] = r.c;
  const byRegion = {};
  for (const s of schools) { const k = s.region || 'Ko‘rsatilmagan'; byRegion[k] = (byRegion[k] || 0) + 1; }
  const fr = all(db, `SELECT t.created_at c, MIN(m.at) a FROM tickets t JOIN ticket_msgs m ON m.ticket_id=t.id AND m.side='general' GROUP BY t.id`);
  const avgResp = fr.length ? Math.round(fr.reduce((a, r) => a + (Date.parse(r.a) - Date.parse(r.c)) / 60000, 0) / fr.length) : null;
  return {
    taskNew: one(db, "SELECT COUNT(*) n FROM tasks WHERE assignee=? AND status='yangi'", st.id).n, taskReview: st.role === 'owner' ? one(db, "SELECT COUNT(*) n FROM tasks WHERE status='tekshiruv'").n : 0, taskRework: one(db, "SELECT COUNT(*) n FROM tasks WHERE assignee=? AND status='jarayonda' AND id IN (SELECT task_id FROM task_log WHERE kind='rejected')", st.id).n,
    chatLast: st.role === 'owner' ? one(db, 'SELECT COALESCE(MAX(id),0) n FROM chat WHERE project_id IS NULL AND room IS NOT NULL').n : one(db, 'SELECT COALESCE(MAX(id),0) n FROM chat WHERE project_id IS NULL AND room=?', st.role).n, dmUnread: one(db, 'SELECT COUNT(*) n FROM dm WHERE (a=? OR b=?) AND sender<>? AND seen=0', st.id, st.id, st.id).n, avgResp, overdue: t(`status IN ('yangi','jarayonda') AND created_at < '${new Date(Date.now() - 864e5).toISOString()}'`),
    activity: st.role === 'owner' ? all(db, 'SELECT at, actor, action, detail FROM audit ORDER BY id DESC LIMIT 8') : [],
    schools: schools.length, active: schools.filter(s => s.status === 'faol').length, blocked: schools.filter(s => s.status === 'bloklangan').length,
    online: schools.filter(isOnline).length,
    students: schools.reduce((a, s) => a + (s.students || 0), 0), teachers: schools.reduce((a, s) => a + (s.teachers || 0), 0),
    ticketsNew: t("status='yangi'"), ticketsOpen: t("status IN ('yangi','jarayonda')"), ticketsUrgent: t("status IN ('yangi','jarayonda') AND priority='shoshilinch'"),
    unread: t('g_unread=1'), ticketsTotal: t('1=1'), mine: t(`status IN ('yangi','jarayonda') AND assignee=${st.id}`),
    perDay: days.map(d => ({ d, n: per[d] })),
    byStatus: Object.fromEntries(STATUSES.map(s => [s, t(`status='${s}'`)])),
    byCategory: Object.fromEntries(CATEGORIES.map(c => [c, one(db, 'SELECT COUNT(*) c FROM tickets WHERE category=?', c).c])),
    byRegion: Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 8),
    top: [...schools].sort((a, b) => (b.students || 0) - (a.students || 0)).slice(0, 5).map(s => ({ id: s.id, name: s.name, students: s.students || 0 })),
    recent: all(db, `SELECT t.*, s.name sname FROM tickets t JOIN schools s ON s.id=t.school_id ORDER BY t.updated_at DESC LIMIT 6`).map(r => ticketOut(r, { school: r.sname, unread: !!r.g_unread }))
  };
}

/* ---------- namuna ma’lumot (faqat ko‘rish uchun sinash) ---------- */
function demoSnapshot() {
  const F = ['Azizbek', 'Madina', 'Jasur', 'Dilnoza', 'Bobur', 'Zilola', 'Sardor', 'Malika', 'Otabek', 'Nigora', 'Javohir', 'Sevara', 'Umid', 'Shahlo', 'Rustam', 'Gulnora'];
  const L = ['Karimov', 'Aliyev', 'Yusupov', 'Rahimova', 'Tursunov', 'Qodirova', 'Ergashev', 'Nazarova', 'Sobirov', 'Ismoilova'];
  const classes = ['5-A', '5-B', '6-A', '7-A'], codes = ['ariza', 'tibbiy', 'foto', 'metrika', 'ota_id', 'manzil'];
  const students = []; let id = 1;
  for (const c of classes) for (let i = 0; i < 9; i++, id++) {
    const r = (id * 37) % 100;
    students.push({ id, name: `${L[id % L.length]} ${F[(id * 3) % F.length]}`, cls: c, phone: '9' + String(10000000 + id * 7919).slice(0, 8), avg: +(3.2 + (r % 18) / 10).toFixed(1), att: 80 + (r % 20), miss: codes.filter((_, k) => (r + k * 13) % 7 === 0) });
  }
  const subj = ['Matematika', 'Ona tili', 'Fizika', 'Tarix'];
  return { students, teachers: subj.map((s, i) => ({ id: 't' + (i + 1), name: `${L[i + 2]} ${F[i + 5]}`, subj: s, phone: '9' + String(20000000 + i * 811).slice(0, 8), leads: [classes[i]] })),
    classes: classes.map((c, i) => ({ name: c, leader: `${L[i + 2]} ${F[i + 5]}`, n: 9 })), subjects: subj };
}

/* ---------- General panel ---------- */
function generalRoute(db, req, path, b, url, st) {
  const m = req.method, who = st.login;
  if (path === '/api/g/me' && m === 'GET') return { staff: staffOut(st) };
  if (path === '/api/g/me/password' && m === 'POST') {
    if (!checkPw(String(b.old || ''), st.pw_hash)) throw bad('Joriy parol noto‘g‘ri.');
    run(db, 'UPDATE staff SET pw_hash=?, tv=tv+1 WHERE id=?', hashPw(pwOf(b.pw, 'Yangi parol')), st.id);
    audit(db, who, 'staff.password', who);
    return { ok: true, relogin: true };
  }
  if (path === '/api/g/overview' && m === 'GET') return overview(db, st);

  /* — jamoa ro‘yxati va logolar — */
  if (path === '/api/g/team' && m === 'GET') return { team: all(db, 'SELECT id,name,role,logo FROM staff WHERE active=1 ORDER BY role, name COLLATE NOCASE') };
  /* — ishchilar: jamoa a’zolari, ularning bo‘limlari va vazifa statistikasi — */
  if (path === '/api/g/workers' && m === 'GET') {
    const vis = st.role === 'owner' ? null : new Set(all(db, 'SELECT project_id id FROM project_members WHERE staff_id=?', st.id).map(x => x.id));
    const pr = Object.fromEntries(all(db, 'SELECT id,name,icon,color,logo FROM projects WHERE archived=0').map(p => [p.id, p]));
    const mem = {}; for (const x of all(db, 'SELECT project_id, staff_id, prole FROM project_members')) if (pr[x.project_id] && (!vis || vis.has(x.project_id))) (mem[x.staff_id] ||= []).push({ id: x.project_id, name: pr[x.project_id].name, icon: pr[x.project_id].icon, color: pr[x.project_id].color, prole: x.prole });
    const tk = {}; for (const x of all(db, 'SELECT assignee, status, COUNT(*) n FROM tasks WHERE assignee IS NOT NULL GROUP BY assignee, status')) (tk[x.assignee] ||= {})[x.status] = x.n;
    const rows = all(db, st.role === 'owner' ? 'SELECT * FROM staff ORDER BY active DESC, role, name COLLATE NOCASE' : 'SELECT * FROM staff WHERE active=1 ORDER BY role, name COLLATE NOCASE');
    return { workers: rows.map(x => ({ id: x.id, name: x.name, role: x.role, logo: x.logo || null, active: !!x.active, login: st.role === 'owner' ? x.login : undefined, lastLogin: st.role === 'owner' ? x.last_login : undefined, perms: st.role === 'owner' ? permsOf(x) : undefined, projects: mem[x.id] || [], tasks: { running: (tk[x.id]?.yangi || 0) + (tk[x.id]?.jarayonda || 0), review: tk[x.id]?.tekshiruv || 0, done: tk[x.id]?.tayyor || 0 } })) };
  }
  if (path === '/api/g/me/logo' && m === 'POST') { run(db, 'UPDATE staff SET logo=? WHERE id=?', b.data ? logoOf(b.data) : null, st.id); return { ok: true }; }
  let lm = /^\/api\/g\/staff\/(\d+)\/logo$/.exec(path);
  if (lm && m === 'POST') {
    owner(st); const x = one(db, 'SELECT * FROM staff WHERE id=?', +lm[1]); if (!x) throw new HttpError(404, 'Xodim topilmadi.');
    run(db, 'UPDATE staff SET logo=? WHERE id=?', b.data ? logoOf(b.data) : null, x.id); audit(db, who, 'staff.logo', x.login); return { ok: true };
  }
  /* — vazifalar — */
  const canMgTask = t => st.role === 'owner' || (t.project_id && memOf(db, t.project_id, st)?.prole === 'lead');
  if (path === '/api/g/tasks' && m === 'GET') {
    const pid = +url.searchParams.get('project') || 0; let rows;
    if (pid) { projGet(db, pid, st); rows = all(db, 'SELECT * FROM tasks WHERE project_id=? ORDER BY id DESC LIMIT 300', pid); }
    else rows = all(db, `SELECT * FROM tasks ${st.role === 'owner' ? '' : 'WHERE assignee=' + (+st.id)} ORDER BY id DESC LIMIT 300`);
    const ord = { tekshiruv: 0, yangi: 1, jarayonda: 2, tayyor: 3 }; rows.sort((x, y) => ord[x.status] - ord[y.status] || y.id - x.id);
    return { tasks: rows.map(taskOut) };
  }
  if (path === '/api/g/tasks' && m === 'POST') {
    const pid = +b.project || 0, pr0 = pid ? projGet(db, pid, st) : null;
    if (pid ? !pr0.lead : st.role !== 'owner') throw new HttpError(403, 'Vazifa berish uchun bo‘lim rahbari yoki General admin bo‘lish kerak.');
    const a = one(db, 'SELECT * FROM staff WHERE id=? AND active=1', +b.assignee); if (!a) throw bad('Ijrochi tanlang.');
    if (pid && a.role !== 'owner' && !one(db, 'SELECT 1 x FROM project_members WHERE project_id=? AND staff_id=?', pid, a.id)) throw bad('Ijrochi shu bo‘lim a’zosi emas.');
    const pr = PRIORITIES.includes(b.priority) ? b.priority : 'oddiy';
    const due = /^\d{4}-\d{2}-\d{2}$/.test(b.due || '') ? b.due : null;
    const r = run(db, "INSERT INTO tasks(title,body,creator,assignee,status,review,priority,due,created_at,updated_at,project_id) VALUES(?,?,?,?,'yangi',?,?,?,?,?,?)", str(b.title, 140, 'Sarlavha'), String(b.body || '').slice(0, 3000), st.id, a.id, b.review === false ? 0 : 1, pr, due, now(), now(), pid || null);
    tlog(db, +r.lastInsertRowid, st, 'created', `${a.name} ga biriktirildi`); plog(db, pid, st, `📌 vazifa berdi: ${b.title} → ${a.name}`); audit(db, who, 'task.add', b.title);
    return { id: Number(r.lastInsertRowid) };
  }
  let tm = /^\/api\/g\/tasks\/(\d+)(?:\/(accept|finish|approve|reject|comment))?$/.exec(path);
  if (tm) {
    const t = one(db, 'SELECT * FROM tasks WHERE id=?', +tm[1]); if (!t) throw new HttpError(404, 'Vazifa topilmadi.');
    const mg = canMgTask(t), mine = t.assignee === st.id, member = t.project_id && memOf(db, t.project_id, st);
    if (!mg && !mine && !member) throw new HttpError(403, 'Bu vazifa sizga biriktirilmagan.');
    const need = () => { if (!mg) throw new HttpError(403, 'Faqat bo‘lim rahbari yoki General admin qila oladi.'); };
    const act = tm[2], upd = (status, kind, text) => { run(db, 'UPDATE tasks SET status=?, updated_at=? WHERE id=?', status, now(), t.id); tlog(db, t.id, st, kind, text); plog(db, t.project_id, st, `${kind === 'accepted' ? '🤝' : kind === 'rejected' ? '↩️' : kind === 'finished' ? '📤' : '✅'} ${t.title}: ${{ yangi: 'yangi', jarayonda: 'razrabotkada', tekshiruv: 'tekshiruvda', tayyor: 'tayyor' }[status]}`); return { task: taskOut(one(db, 'SELECT * FROM tasks WHERE id=?', t.id)) }; };
    if (!act && m === 'GET') return { task: taskOut(t), manage: mg, log: all(db, 'SELECT id,staff_id sid,who,kind,text,at FROM task_log WHERE task_id=? ORDER BY id', t.id) };
    if (act === 'comment' && m === 'POST') { tlog(db, t.id, st, 'comment', str(b.text, 1500, 'Izoh')); return { ok: true }; }
    if (act === 'accept' && m === 'POST') { if (!mine || t.status !== 'yangi') throw bad('Faqat ijrochi yangi vazifani qabul qila oladi.'); return upd('jarayonda', 'accepted', 'Vazifa qabul qilindi — ish boshlandi'); }
    if (act === 'finish' && m === 'POST') {
      if (!mine || t.status !== 'jarayonda') throw bad('Vazifa ishlanayotgan bo‘lishi kerak.');
      const txt = String(b.text || '').slice(0, 1500);
      return t.review ? upd('tekshiruv', 'finished', txt || 'Ish tugadi — tekshiruvga yuborildi') : upd('tayyor', 'done', txt || 'Ish tugadi — tayyor');
    }
    if (act === 'approve' && m === 'POST') { need(); if (t.status !== 'tekshiruv') throw bad('Vazifa tekshiruvda emas.'); return upd('tayyor', 'approved', String(b.text || '').slice(0, 1500) || 'Maqullandi ✓'); }
    if (act === 'reject' && m === 'POST') { need(); if (t.status !== 'tekshiruv') throw bad('Vazifa tekshiruvda emas.'); return upd('jarayonda', 'rejected', str(b.text, 1500, 'Xato izohi')); }
    if (!act && m === 'PATCH') {
      need(); const a = b.assignee !== undefined ? one(db, 'SELECT * FROM staff WHERE id=? AND active=1', +b.assignee) : null; if (b.assignee !== undefined && !a) throw bad('Ijrochi topilmadi.');
      run(db, 'UPDATE tasks SET title=?, body=?, priority=?, due=?, review=?, assignee=?, status=?, updated_at=? WHERE id=?', b.title !== undefined ? str(b.title, 140, 'Sarlavha') : t.title, b.body !== undefined ? String(b.body).slice(0, 3000) : t.body,
        PRIORITIES.includes(b.priority) ? b.priority : t.priority, b.due !== undefined ? (/^\d{4}-\d{2}-\d{2}$/.test(b.due) ? b.due : null) : t.due, b.review !== undefined ? (b.review ? 1 : 0) : t.review,
        a ? a.id : t.assignee, a && a.id !== t.assignee && t.status !== 'tayyor' ? 'yangi' : t.status, now(), t.id);
      if (a && a.id !== t.assignee) tlog(db, t.id, st, 'reassigned', `${a.name} ga o‘tkazildi`);
      return { task: taskOut(one(db, 'SELECT * FROM tasks WHERE id=?', t.id)) };
    }
    if (!act && m === 'DELETE') { need(); confirm(st, b); run(db, 'DELETE FROM task_log WHERE task_id=?', t.id); run(db, 'DELETE FROM tasks WHERE id=?', t.id); audit(db, who, 'task.del', t.title); return { ok: true }; }
  }
  /* — arxiv: yopilgan bo‘limlar va bajarilgan vazifalar — */
  if (path === '/api/g/archive' && m === 'GET') {
    const all_ = st.role === 'owner' ? all(db, 'SELECT * FROM projects ORDER BY id DESC') : all(db, 'SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id=p.id AND pm.staff_id=? ORDER BY p.id DESC', st.id);
    const pn = Object.fromEntries(all_.map(p => [p.id, { name: p.name, icon: p.icon, color: p.color, logo: p.logo || null, archived: !!p.archived }])), inl = all_.length ? all_.map(p => p.id).join(',') : '0';
    const done = all(db, `SELECT t.*, (SELECT MAX(at) FROM task_log WHERE task_id=t.id AND kind IN ('done','approved')) fin FROM tasks t WHERE t.status='tayyor' AND t.project_id IN (${inl}) ORDER BY t.updated_at DESC LIMIT 500`);
    const closed = all_.filter(p => p.archived);
    const members = new Set(all(db, `SELECT DISTINCT staff_id id FROM project_members WHERE project_id IN (${closed.length ? closed.map(p => p.id).join(',') : '0'})`).map(x => x.id));
    return { projects: closed.map(p => projOut(db, p, st)), tasks: done.map(t => ({ ...taskOut(t), finishedAt: t.fin || t.updated_at, pr: pn[t.project_id] })),
      stats: { projects: closed.length, tasks: done.length, people: members.size, schools: one(db, 'SELECT COUNT(*) n FROM schools').n } };
  }
  /* — test uchun: har bir yo‘nalishga 2 tadan ishchi (faqat egasi) — */
  if (path === '/api/g/staff/seed-test' && m === 'POST') {
    owner(st); confirm(st, b); const made = seedTestStaff(db);
    audit(db, who, 'staff.seedTest', made.length + ' ta'); return { made, password: 'test1234' };
  }
  /* — bosh sahifa (loyihalar bo‘yicha jonli ma’lumot) — */
  if (path === '/api/g/dashboard' && m === 'GET') {
    const ps = (st.role === 'owner' ? all(db, 'SELECT * FROM projects WHERE archived=0 ORDER BY id DESC') : all(db, 'SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id=p.id AND pm.staff_id=? WHERE p.archived=0 ORDER BY p.id DESC', st.id));
    const ids = ps.map(p => p.id), inl = ids.length ? ids.join(',') : '0', pn = Object.fromEntries(ps.map(p => [p.id, { name: p.name, icon: p.icon, color: p.color }]));
    const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }), today = dFmt.format(new Date());
    const tasks = all(db, `SELECT * FROM tasks WHERE project_id IN (${inl})`), cnt = { yangi: 0, jarayonda: 0, tekshiruv: 0, tayyor: 0 };
    for (const t of tasks) cnt[t.status]++;
    const wrap = t => ({ ...taskOut(t), pr: pn[t.project_id] });
    const leadOf = pid => st.role === 'owner' || memOf(db, pid, st)?.prole === 'lead';
    const since = new Date(Date.now() - 15 * 864e5).toISOString(), per = {};
    for (let i = 13; i >= 0; i--) per[dFmt.format(new Date(Date.now() - i * 864e5))] = { tasks: 0 };
    for (const r of all(db, `SELECT l.at FROM task_log l JOIN tasks t ON t.id=l.task_id WHERE l.kind IN ('done','approved') AND t.project_id IN (${inl}) AND l.at>=?`, since)) { const k = dFmt.format(new Date(r.at)); if (per[k]) per[k].tasks++; }
    return {
      projects: ps.map(p => projOut(db, p, st)), counts: cnt,
      overdue: tasks.filter(t => t.due && t.due < today && t.status !== 'tayyor').length,
      my: tasks.filter(t => t.assignee === st.id && t.status !== 'tayyor').sort((a, b) => b.id - a.id).slice(0, 8).map(wrap),
      review: tasks.filter(t => t.status === 'tekshiruv' && leadOf(t.project_id)).slice(0, 8).map(wrap),
      working: tasks.filter(t => t.status === 'jarayonda').sort((a, b) => b.id - a.id).slice(0, 10).map(wrap),
      perDay: Object.entries(per).map(([d, v]) => ({ d, n: v.tasks, tasks: v.tasks })),
      activity: all(db, `SELECT project_id, who, text, at FROM proj_log WHERE project_id IN (${inl}) ORDER BY id DESC LIMIT 12`).map(x => ({ ...x, pr: pn[x.project_id] })),
    };
  }
  /* — bo‘limlar (loyihalar) — */
  /* — katta bo‘limlar (guruhlar): ichida bo‘limlar — */
  const grpOut = (g) => {
    const ps = all(db, 'SELECT * FROM projects WHERE group_id=?', g.id).filter(p => st.role === 'owner' || memOf(db, p.id, st)), o = ps.map(p => projOut(db, p, st));
    const tot = o.reduce((a, p) => a + p.tasks.yangi + p.tasks.jarayonda + p.tasks.tekshiruv + p.tasks.tayyor, 0), dn = o.reduce((a, p) => a + p.tasks.tayyor, 0);
    const mem = new Set(); for (const p of ps) for (const x of all(db, 'SELECT staff_id id FROM project_members WHERE project_id=?', p.id)) mem.add(x.id);
    return { id: g.id, name: g.name, descr: g.descr, color: g.color, icon: g.icon, logo: g.logo || null, projects: o.length, active: o.filter(p => !p.archived).length, members: [...mem], progress: tot ? Math.round(dn / tot * 100) : 0, tasks: { running: o.reduce((a, p) => a + p.tasks.jarayonda, 0), review: o.reduce((a, p) => a + p.tasks.tekshiruv, 0), done: dn } };
  };
  const grpVisible = g => st.role === 'owner' || all(db, 'SELECT id FROM projects WHERE group_id=?', g.id).some(p => memOf(db, p.id, st));
  if (path === '/api/g/groups' && m === 'GET') return { groups: all(db, 'SELECT * FROM groups_ ORDER BY id DESC').filter(grpVisible).map(grpOut) };
  if (path === '/api/g/groups' && m === 'POST') {
    owner(st); const r = run(db, 'INSERT INTO groups_(name,descr,color,icon,logo,created_by,created_at) VALUES(?,?,?,?,?,?,?)', str(b.name, 80, 'Nomi'), String(b.descr || '').slice(0, 600), COLORS.includes(b.color) ? b.color : COLORS[0], String(b.icon || '🗂️').slice(0, 8), b.logo ? logoOf(b.logo) : null, st.id, now());
    audit(db, who, 'group.add', b.name); return { id: Number(r.lastInsertRowid) };
  }
  const gm = /^\/api\/g\/groups\/(\d+)(\/logo)?$/.exec(path);
  if (gm) {
    const g = one(db, 'SELECT * FROM groups_ WHERE id=?', +gm[1]); if (!g || !grpVisible(g)) throw new HttpError(404, 'Katta bo‘lim topilmadi.');
    if (!gm[2] && m === 'GET') return { group: grpOut(g), projects: all(db, 'SELECT * FROM projects WHERE group_id=? ORDER BY archived, id DESC', g.id).filter(p => st.role === 'owner' || memOf(db, p.id, st)).map(p => projOut(db, p, st)), owner: st.role === 'owner' };
    owner(st);
    if (gm[2] && m === 'POST') { run(db, 'UPDATE groups_ SET logo=? WHERE id=?', b.data ? logoOf(b.data) : null, g.id); return { ok: true }; }
    if (!gm[2] && m === 'PATCH') { run(db, 'UPDATE groups_ SET name=?, descr=?, color=?, icon=? WHERE id=?', b.name !== undefined ? str(b.name, 80, 'Nomi') : g.name, b.descr !== undefined ? String(b.descr).slice(0, 600) : g.descr, COLORS.includes(b.color) ? b.color : g.color, b.icon !== undefined ? String(b.icon).slice(0, 8) : g.icon, g.id); return { ok: true }; }
    if (!gm[2] && m === 'DELETE') { confirm(st, b); run(db, 'UPDATE projects SET group_id=NULL WHERE group_id=?', g.id); run(db, 'DELETE FROM groups_ WHERE id=?', g.id); audit(db, who, 'group.del', g.name); return { ok: true }; }
  }
  if (path === '/api/g/projects' && m === 'GET') {
    const rows = st.role === 'owner' ? all(db, 'SELECT * FROM projects ORDER BY archived, id DESC') : all(db, 'SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id=p.id AND pm.staff_id=? ORDER BY p.archived, p.id DESC', st.id);
    return { projects: rows.map(p => projOut(db, p, st)), roles: ROLES_OUT, colors: COLORS };
  }
  if (path === '/api/g/projects' && m === 'POST') {
    owner(st);
    const gid = b.group ? one(db, 'SELECT id FROM groups_ WHERE id=?', +b.group)?.id || null : null;
    const r = run(db, 'INSERT INTO projects(name,descr,color,icon,created_by,created_at,group_id) VALUES(?,?,?,?,?,?,?)', str(b.name, 80, 'Nomi'), String(b.descr || '').slice(0, 600), COLORS.includes(b.color) ? b.color : COLORS[0], String(b.icon || '📁').slice(0, 8), st.id, now(), gid);
    const pid = Number(r.lastInsertRowid);
    for (const x of (Array.isArray(b.members) ? b.members : []).slice(0, 100)) { const u = one(db, 'SELECT id FROM staff WHERE id=? AND active=1', +x.id); if (u) run(db, 'INSERT OR REPLACE INTO project_members(project_id,staff_id,prole) VALUES(?,?,?)', pid, u.id, PROLES.includes(x.prole) ? x.prole : 'member'); }
    plog(db, pid, st, '🚀 bo‘lim yaratildi'); audit(db, who, 'project.add', b.name);
    return { id: pid };
  }
  let pm = /^\/api\/g\/projects\/(\d+)(?:\/(members|logo|notes|log))?(?:\/(\d+))?$/.exec(path);
  if (pm) {
    const { p, lead, write } = projGet(db, pm[1], st), sub = pm[2], sid = pm[3] ? +pm[3] : 0;
    const needLead = () => { if (!lead) throw new HttpError(403, 'Faqat bo‘lim rahbari yoki General admin qila oladi.'); };
    const needWrite = () => { if (!write) throw new HttpError(403, 'Kuzatuvchi faqat ko‘ra oladi.'); };
    if (!sub && m === 'GET') return { project: projOut(db, p, st), members: all(db, 'SELECT staff_id id, prole FROM project_members WHERE project_id=?', p.id), lead, write };
    if (!sub && m === 'PATCH') {
      needLead(); run(db, 'UPDATE projects SET name=?, descr=?, color=?, icon=?, archived=? WHERE id=?', b.name !== undefined ? str(b.name, 80, 'Nomi') : p.name, b.descr !== undefined ? String(b.descr).slice(0, 600) : p.descr,
        COLORS.includes(b.color) ? b.color : p.color, b.icon !== undefined ? String(b.icon).slice(0, 8) : p.icon, b.archived !== undefined ? (b.archived ? 1 : 0) : p.archived, p.id);
      if (b.group !== undefined && st.role === 'owner') run(db, 'UPDATE projects SET group_id=? WHERE id=?', b.group ? one(db, 'SELECT id FROM groups_ WHERE id=?', +b.group)?.id || null : null, p.id);
      plog(db, p.id, st, b.archived !== undefined ? (b.archived ? '📦 arxivlandi' : '♻️ arxivdan qaytarildi') : '✏️ ma’lumotlar yangilandi'); return { ok: true };
    }
    if (!sub && m === 'DELETE') {
      owner(st); confirm(st, b);
      for (const t of all(db, 'SELECT id FROM tasks WHERE project_id=?', p.id)) run(db, 'DELETE FROM task_log WHERE task_id=?', t.id);
      for (const tb of ['tasks', 'todos', 'notes', 'proj_log', 'project_members', 'chat']) run(db, `DELETE FROM ${tb} WHERE project_id=?`, p.id);
      run(db, 'DELETE FROM projects WHERE id=?', p.id); audit(db, who, 'project.del', p.name); return { ok: true };
    }
    if (sub === 'members') {
      if (m === 'POST') {
        needLead(); const u = one(db, 'SELECT * FROM staff WHERE id=? AND active=1', +b.staff); if (!u) throw bad('Xodim topilmadi.');
        run(db, 'INSERT OR REPLACE INTO project_members(project_id,staff_id,prole) VALUES(?,?,?)', p.id, u.id, PROLES.includes(b.prole) ? b.prole : 'member'); plog(db, p.id, st, `👤 ${u.name} qo‘shildi`); return { ok: true };
      }
      if (m === 'PATCH' && sid) { needLead(); run(db, 'UPDATE project_members SET prole=? WHERE project_id=? AND staff_id=?', pick(b.prole, PROLES, 'Rol'), p.id, sid); return { ok: true }; }
      if (m === 'DELETE' && sid) { if (sid !== st.id) needLead(); run(db, 'DELETE FROM project_members WHERE project_id=? AND staff_id=?', p.id, sid); plog(db, p.id, st, sid === st.id ? '👋 bo‘limdan chiqdi' : '🚪 a’zo olib tashlandi'); return { ok: true }; }
    }
    if (sub === 'logo' && m === 'POST') { needLead(); run(db, 'UPDATE projects SET logo=? WHERE id=?', b.data ? logoOf(b.data) : null, p.id); plog(db, p.id, st, b.data ? '🖼️ logo yangilandi' : '🖼️ logo olib tashlandi'); return { ok: true }; }
    if (sub === 'notes') {
      if (m === 'GET') return { notes: all(db, 'SELECT id,title,body,pinned,author_id authorId,author,created_at createdAt,updated_at updatedAt FROM notes WHERE project_id=? ORDER BY pinned DESC, updated_at DESC LIMIT 200', p.id) };
      if (m === 'POST') { needWrite(); const r = run(db, 'INSERT INTO notes(project_id,title,body,pinned,author_id,author,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', p.id, str(b.title, 120, 'Sarlavha'), String(b.body || '').slice(0, 20000), lead && b.pinned ? 1 : 0, st.id, st.name, now(), now()); plog(db, p.id, st, `📝 hujjat: ${b.title}`); return { id: Number(r.lastInsertRowid) }; }
      if ((m === 'PATCH' || m === 'DELETE') && sid) {
        const n = one(db, 'SELECT * FROM notes WHERE id=? AND project_id=?', sid, p.id); if (!n) throw new HttpError(404, 'Topilmadi.');
        if (!lead && n.author_id !== st.id) throw new HttpError(403, 'Faqat muallif yoki rahbar o‘zgartira oladi.');
        if (m === 'DELETE') { run(db, 'DELETE FROM notes WHERE id=?', n.id); return { ok: true }; }
        run(db, 'UPDATE notes SET title=?, body=?, pinned=?, updated_at=? WHERE id=?', b.title !== undefined ? str(b.title, 120, 'Sarlavha') : n.title, b.body !== undefined ? String(b.body).slice(0, 20000) : n.body, lead && b.pinned !== undefined ? (b.pinned ? 1 : 0) : n.pinned, now(), n.id); return { ok: true };
      }
    }
    if (sub === 'log' && m === 'GET') return { log: all(db, 'SELECT who, text, at FROM proj_log WHERE project_id=? ORDER BY id DESC LIMIT 30', p.id) };
  }
  /* — lichka (DM) — */
  if (path === '/api/g/dm' && m === 'GET') {
    const rows = all(db, 'SELECT * FROM dm WHERE a=? OR b=? ORDER BY id DESC LIMIT 2000', st.id, st.id), seen = {};
    for (const r of rows) { const o = r.a === st.id ? r.b : r.a; (seen[o] ||= { id: o, last: r.text, at: r.at, mine: r.sender === st.id, unread: 0 }); if (r.sender !== st.id && !r.seen) seen[o].unread++; }
    return { convs: Object.values(seen) };
  }
  let dm = /^\/api\/g\/dm\/(\d+)$/.exec(path);
  if (dm) {
    const o = one(db, 'SELECT id FROM staff WHERE id=? AND active=1', +dm[1]); if (!o || o.id === st.id) throw bad('Suhbatdosh topilmadi.');
    const lo = Math.min(st.id, o.id), hi = Math.max(st.id, o.id);
    if (m === 'GET') {
      const after = +(url.searchParams.get('after') || 0);
      run(db, 'UPDATE dm SET seen=1 WHERE a=? AND b=? AND sender=? AND seen=0', lo, hi, o.id);
      return { messages: all(db, 'SELECT id, sender, text, at, seen FROM dm WHERE a=? AND b=? AND id>? ORDER BY id DESC LIMIT 100', lo, hi, after).reverse() };
    }
    if (m === 'POST') { const r = run(db, 'INSERT INTO dm(a,b,sender,text,at) VALUES(?,?,?,?,?)', lo, hi, st.id, str(b.text, 2000, 'Xabar'), now()); return { id: Number(r.lastInsertRowid) }; }
  }
  /* — Jamoa chati: har bir lavozim uchun alohida xona. Hamma xonaga faqat General admin kira oladi — */
  const roomOk = r => ROLES[r] && (st.role === 'owner' || r === st.role);
  if (path === '/api/g/chat/rooms' && m === 'GET') {
    const keys = Object.keys(ROLES).filter(roomOk);
    return { me: st.role, rooms: keys.map(k => {
      const last = one(db, 'SELECT id, staff_id sid, who, text, at FROM chat WHERE project_id IS NULL AND room=? ORDER BY id DESC LIMIT 1', k);
      return { key: k, label: ROLES[k].label, members: one(db, 'SELECT COUNT(*) n FROM staff WHERE role=? AND active=1', k).n, lastId: last?.id || 0, last: last || null };
    }) };
  }
  if (path === '/api/g/chat') {
    const pid = +(url.searchParams.get('project') || b.project || 0) || null; if (pid) projGet(db, pid, st);
    const room = pid ? null : String(url.searchParams.get('room') || b.room || st.role);
    if (!pid && !roomOk(room)) throw new HttpError(403, 'Bu chat xonasiga faqat General admin va shu lavozim egalari kira oladi.');
    if (m === 'GET') {
      const after = +(url.searchParams.get('after') || 0);
      return { messages: all(db, `SELECT id,staff_id sid,who,text,at FROM chat WHERE id>? AND ${pid ? 'project_id=?' : 'project_id IS NULL AND room=?'} ORDER BY id DESC LIMIT 100`, after, pid || room).reverse(), me: st.id, room };
    }
    if (m === 'POST') {
      const r = run(db, 'INSERT INTO chat(staff_id,who,text,at,project_id,room) VALUES(?,?,?,?,?,?)', st.id, st.name, str(b.text, 1000, 'Xabar'), now(), pid, room);
      return { id: Number(r.lastInsertRowid) };
    }
  }
  /* — xodimlar (faqat egasi) — */
  if (path === '/api/g/staff') {
    owner(st);
    if (m === 'GET') return { staff: all(db, 'SELECT * FROM staff ORDER BY role, name COLLATE NOCASE').map(staffOut), perms: PERMS, roles: Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, { label: v.label, perms: v.perms }])) };
    if (m === 'POST') {
      const login = str(b.login, 40, 'Login');
      if (!/^[A-Za-z0-9_.-]{3,40}$/.test(login)) throw bad('Login 3–40 ta lotin harf, raqam yoki _ . - bo‘lsin.');
      if (one(db, 'SELECT 1 x FROM staff WHERE login=?', login)) throw bad('Bu login band.');
      const pw = b.pw ? pwOf(b.pw) : genPw();
      const role = ROLES[b.role] ? b.role : 'manager';
      const perms = (Array.isArray(b.perms) ? b.perms : ROLES[role].perms).filter(p => PERMS.includes(p));
      const r = run(db, "INSERT INTO staff(login,name,pw_hash,role,perms,created_at) VALUES(?,?,?,?,?,?)", login, str(b.name, 80, 'Ism'), hashPw(pw), role, role === 'owner' ? '[]' : JSON.stringify(perms), now());
      audit(db, who, b.role === 'owner' ? 'staff.addGeneral' : 'staff.add', login);
      return { staff: staffOut(one(db, 'SELECT * FROM staff WHERE id=?', r.lastInsertRowid)), password: pw };
    }
  }
  let mm = /^\/api\/g\/staff\/(\d+)(\/password)?$/.exec(path);
  if (mm) {
    owner(st);
    const x = one(db, 'SELECT * FROM staff WHERE id=?', +mm[1]);
    if (!x) throw new HttpError(404, 'Xodim topilmadi.');
    if (x.role === 'owner' && x.id !== st.id && st.id !== primary(db)) throw bad('General adminni faqat asosiy General admin boshqaradi.');
    if (mm[2] && m === 'POST') {
      const pw = b.pw ? pwOf(b.pw) : genPw();
      run(db, 'UPDATE staff SET pw_hash=?, tv=tv+1 WHERE id=?', hashPw(pw), x.id);
      audit(db, who, 'staff.reset', x.login);
      return { password: pw };
    }
    if (m === 'PATCH') {
      if (x.id === primary(db)) throw bad('Asosiy General adminni o‘zgartirib bo‘lmaydi.');
      if (x.role === 'owner' && b.active === undefined && b.name === undefined) throw bad('General adminda ruxsatlar to‘liq.');
      const perms = b.perms !== undefined ? (Array.isArray(b.perms) ? b.perms : []).filter(p => PERMS.includes(p)) : JSON.parse(x.perms);
      const nrole = b.role !== undefined && ROLES[b.role] && b.role !== 'owner' ? b.role : x.role;
      run(db, 'UPDATE staff SET role=?, name=?, perms=?, active=?, tv=tv+? WHERE id=?', nrole, b.name !== undefined ? str(b.name, 80, 'Ism') : x.name, JSON.stringify(perms),
        b.active !== undefined ? (b.active ? 1 : 0) : x.active, b.active === false ? 1 : 0, x.id);
      audit(db, who, 'staff.edit', x.login);
      return { staff: staffOut(one(db, 'SELECT * FROM staff WHERE id=?', x.id)) };
    }
    if (m === 'DELETE') {
      if (x.id === primary(db)) throw bad('Asosiy General adminni o‘chirib bo‘lmaydi.');
      if (x.id === st.id) throw bad('O‘zingizni o‘chira olmaysiz.');
      confirm(st, b);
      run(db, 'UPDATE tickets SET assignee=NULL WHERE assignee=?', x.id); run(db, 'DELETE FROM staff WHERE id=?', x.id);
      audit(db, who, 'staff.del', x.login);
      return { ok: true };
    }
  }
  if (path === '/api/g/audit' && m === 'GET') { owner(st); return { audit: all(db, 'SELECT at, actor, action, detail FROM audit ORDER BY id DESC LIMIT 300') }; }

  /* — maktablar — */
  if (path === '/api/g/schools' && m === 'GET') {
    need(st, 'schools');
    return { schools: all(db, 'SELECT * FROM schools ORDER BY name COLLATE NOCASE').map(s => ({ ...schoolOut(s),
      open: one(db, "SELECT COUNT(*) c FROM tickets WHERE school_id=? AND status IN ('yangi','jarayonda')", s.id).c,
      admins: one(db, 'SELECT COUNT(*) c FROM school_admins WHERE school_id=?', s.id).c })) };
  }
  if (path === '/api/g/schools' && m === 'POST') {
    need(st, 'schools');
    const name = str(b.name, 120, 'Maktab nomi');
    if (one(db, 'SELECT 1 x FROM schools WHERE lower(name)=lower(?)', name)) throw bad('Bu nomdagi maktab allaqachon bor.');
    const adm = b.admin && (b.admin.name || b.admin.phone || b.admin.pw) ? b.admin : null;
    let aName, aPhone, aPw;
    if (adm) {
      need(st, 'admins');
      aName = str(adm.name, 80, 'Admin ismi'); aPhone = phoneOf(adm.phone); aPw = adm.pw ? pwOf(adm.pw, 'Admin paroli') : genPw();
      if (one(db, 'SELECT 1 x FROM school_admins WHERE phone=?', aPhone)) throw bad('Bu telefon raqam boshqa adminga biriktirilgan.');
    }
    const key = newKey();
    const logo = b.logo ? logoOf(b.logo) : null;
    const id = tx(db, () => {
      const r = run(db, `INSERT INTO schools(name,region,address,admin_name,phone,url,note,key_hash,key_hint,created_at,logo) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        name, str(b.region, 80, 'Hudud', false), str(b.address, 200, 'Manzil', false), adm ? aName : '', str(b.phone, 30, 'Telefon', false), str(b.url, 200, 'Sayt manzili', false), str(b.note, 500, 'Izoh', false), keyHash(key), key.slice(-4), now(), logo);
      const sid = Number(r.lastInsertRowid);
      if (adm) run(db, "INSERT INTO school_admins(school_id,name,phone,pw_hash,role,created_at) VALUES(?,?,?,?,'admin',?)", sid, aName, aPhone, hashPw(aPw), now());
      audit(db, who, 'school.add', name);
      return sid;
    });
    return { school: schoolOut(one(db, 'SELECT * FROM schools WHERE id=?', id)), key, admin: adm ? { name: aName, phone: aPhone, password: aPw } : null };
  }
  mm = /^\/api\/g\/schools\/(\d+)(\/(key|logo|data|demo-data|admins))?$/.exec(path);
  if (mm) {
    need(st, 'schools');
    const id = +mm[1], s = one(db, 'SELECT * FROM schools WHERE id=?', id), sub = mm[3];
    if (!s) throw new HttpError(404, 'Maktab topilmadi.');
    if (sub === 'key' && m === 'POST') {
      confirm(st, b);
      const key = newKey();
      run(db, 'UPDATE schools SET key_hash=?, key_hint=? WHERE id=?', keyHash(key), key.slice(-4), id);
      audit(db, who, 'school.key', s.name);
      return { key };
    }
    if (sub === 'logo' && m === 'POST') { run(db, 'UPDATE schools SET logo=? WHERE id=?', logoOf(b.data), id); audit(db, who, 'school.logo', s.name); return { ok: true }; }
    if (sub === 'logo' && m === 'DELETE') { run(db, 'UPDATE schools SET logo=NULL WHERE id=?', id); return { ok: true }; }
    if (sub === 'data' && m === 'GET') {
      need(st, 'users');
      return { data: s.snapshot ? JSON.parse(s.snapshot) : null, at: s.snap_at, demo: !!s.snap_demo };
    }
    if (sub === 'demo-data' && m === 'POST') {
      need(st, 'users');
      if (s.snapshot && !s.snap_demo) throw bad('Bu maktabda haqiqiy ma’lumot bor.');
      const d = demoSnapshot();
      run(db, 'UPDATE schools SET snapshot=?, snap_at=?, snap_demo=1, students=?, teachers=?, classes=? WHERE id=?', JSON.stringify(d), now(), d.students.length, d.teachers.length, d.classes.length, id);
      return { ok: true };
    }
    if (sub === 'admins') {
      need(st, 'admins');
      if (m === 'GET') return { admins: all(db, 'SELECT * FROM school_admins WHERE school_id=? ORDER BY role, name COLLATE NOCASE', id).map(saOut) };
      if (m === 'POST') {
        const phone = phoneOf(b.phone), pw = b.pw ? pwOf(b.pw) : genPw();
        if (one(db, 'SELECT 1 x FROM school_admins WHERE phone=?', phone)) throw bad('Bu telefon raqam boshqa adminga biriktirilgan.');
        const r = run(db, 'INSERT INTO school_admins(school_id,name,phone,pw_hash,role,created_at) VALUES(?,?,?,?,?,?)', id, str(b.name, 80, 'Ism'), phone, hashPw(pw), pick(b.role || 'admin', SA_ROLES, 'Rol'), now());
        audit(db, who, 'sadmin.add', `${s.name}: ${b.name}`);
        return { admin: saOut(one(db, 'SELECT * FROM school_admins WHERE id=?', r.lastInsertRowid)), password: pw };
      }
    }
    if (!sub && m === 'GET') {
      const sa = all(db, 'SELECT * FROM school_admins WHERE school_id=? ORDER BY role, name COLLATE NOCASE', id).map(saOut);
      return { school: schoolOut(s), tickets: all(db, 'SELECT * FROM tickets WHERE school_id=? ORDER BY updated_at DESC LIMIT 50', id).map(t => ticketOut(t)), admins: st && permsOf(st).includes('admins') ? sa : [] };
    }
    if (!sub && m === 'PATCH') {
      const name = b.name !== undefined ? str(b.name, 120, 'Maktab nomi') : s.name;
      if (name.toLowerCase() !== s.name.toLowerCase() && one(db, 'SELECT 1 x FROM schools WHERE lower(name)=lower(?) AND id<>?', name, id)) throw bad('Bu nomdagi maktab allaqachon bor.');
      const f = (k, col, max, label) => (b[k] !== undefined ? str(b[k], max, label, false) : s[col]);
      const status = b.status !== undefined ? pick(b.status, SCHOOL_STATUS, 'Holat') : s.status;
      run(db, 'UPDATE schools SET name=?,region=?,address=?,admin_name=?,phone=?,url=?,note=?,status=? WHERE id=?', name, f('region', 'region', 80, 'Hudud'), f('address', 'address', 200, 'Manzil'),
        f('adminName', 'admin_name', 80, 'Admin ismi'), f('phone', 'phone', 30, 'Telefon'), f('url', 'url', 200, 'Sayt manzili'), f('note', 'note', 500, 'Izoh'), status, id);
      audit(db, who, 'school.edit', name + ' ' + status);
      return { school: schoolOut(one(db, 'SELECT * FROM schools WHERE id=?', id)) };
    }
    if (!sub && m === 'DELETE') {
      confirm(st, b);
      tx(db, () => { run(db, 'DELETE FROM ticket_msgs WHERE ticket_id IN (SELECT id FROM tickets WHERE school_id=?)', id); run(db, 'DELETE FROM ticket_notes WHERE ticket_id IN (SELECT id FROM tickets WHERE school_id=?)', id);
        run(db, 'DELETE FROM tickets WHERE school_id=?', id); run(db, 'DELETE FROM school_admins WHERE school_id=?', id); run(db, 'DELETE FROM schools WHERE id=?', id); audit(db, who, 'school.del', s.name); });
      return { ok: true };
    }
  }
  mm = /^\/api\/g\/school-admins\/(\d+)(\/password)?$/.exec(path);
  if (mm) {
    need(st, 'admins');
    const a = one(db, 'SELECT a.*, s.name sname FROM school_admins a JOIN schools s ON s.id=a.school_id WHERE a.id=?', +mm[1]);
    if (!a) throw new HttpError(404, 'Admin topilmadi.');
    if (mm[2] && m === 'POST') { const pw = b.pw ? pwOf(b.pw) : genPw(); run(db, 'UPDATE school_admins SET pw_hash=? WHERE id=?', hashPw(pw), a.id); audit(db, who, 'sadmin.reset', `${a.sname}: ${a.name}`); return { password: pw }; }
    if (m === 'PATCH') {
      const phone = b.phone !== undefined ? phoneOf(b.phone) : a.phone;
      if (phone !== a.phone && one(db, 'SELECT 1 x FROM school_admins WHERE phone=?', phone)) throw bad('Bu telefon raqam boshqa adminga biriktirilgan.');
      run(db, 'UPDATE school_admins SET name=?, phone=?, role=?, active=? WHERE id=?', b.name !== undefined ? str(b.name, 80, 'Ism') : a.name, phone,
        b.role !== undefined ? pick(b.role, SA_ROLES, 'Rol') : a.role, b.active !== undefined ? (b.active ? 1 : 0) : a.active, a.id);
      audit(db, who, 'sadmin.edit', `${a.sname}: ${a.name}`);
      return { admin: saOut(one(db, 'SELECT * FROM school_admins WHERE id=?', a.id)) };
    }
    if (m === 'DELETE') { confirm(st, b); run(db, 'DELETE FROM school_admins WHERE id=?', a.id); audit(db, who, 'sadmin.del', `${a.sname}: ${a.name}`); return { ok: true }; }
  }

  /* — murojaatlar — */
  if (path === '/api/g/tickets' && m === 'GET') {
    need(st, 'tickets');
    const w = [], p = [];
    const stt = url.searchParams.get('status'), sc = url.searchParams.get('school'), pr = url.searchParams.get('priority'), q = (url.searchParams.get('q') || '').trim();
    if (stt === 'ochiq') w.push("t.status IN ('yangi','jarayonda')"); else if (STATUSES.includes(stt)) { w.push('t.status=?'); p.push(stt); }
    if (sc && /^\d+$/.test(sc)) { w.push('t.school_id=?'); p.push(+sc); }
    if (PRIORITIES.includes(pr)) { w.push('t.priority=?'); p.push(pr); }
    if (url.searchParams.get('mine') === '1') { w.push('t.assignee=?'); p.push(st.id); }
    if (q) { w.push('(t.title LIKE ? OR s.name LIKE ?)'); p.push(`%${q.slice(0, 60)}%`, `%${q.slice(0, 60)}%`); }
    const rows = all(db, `SELECT t.*, s.name sname, s.logo slogo, a.name aname FROM tickets t JOIN schools s ON s.id=t.school_id LEFT JOIN staff a ON a.id=t.assignee ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
      ORDER BY t.g_unread DESC, CASE t.priority WHEN 'shoshilinch' THEN 0 WHEN 'yuqori' THEN 1 WHEN 'oddiy' THEN 2 ELSE 3 END, t.updated_at DESC LIMIT 300`, ...p);
    return { tickets: rows.map(r => ticketOut(r, { school: r.sname, logo: r.slogo, assigneeName: r.aname, unread: !!r.g_unread })) };
  }
  mm = /^\/api\/g\/tickets\/(\d+)(\/(reply|status|assign|note))?$/.exec(path);
  if (mm) {
    need(st, 'tickets');
    const id = +mm[1], t = one(db, 'SELECT t.*, s.name sname, s.logo slogo, a.name aname FROM tickets t JOIN schools s ON s.id=t.school_id LEFT JOIN staff a ON a.id=t.assignee WHERE t.id=?', id);
    if (!t) throw new HttpError(404, 'Murojaat topilmadi.');
    if (!mm[2] && m === 'GET') {
      run(db, 'UPDATE tickets SET g_unread=0 WHERE id=?', id);
      return { ticket: ticketOut(t, { school: t.sname, logo: t.slogo, assigneeName: t.aname, unread: false }), messages: thread(db, id),
        notes: all(db, 'SELECT who, text, at FROM ticket_notes WHERE ticket_id=? ORDER BY id', id),
        staff: all(db, "SELECT id, name FROM staff WHERE active=1 ORDER BY name COLLATE NOCASE") };
    }
    if (mm[3] === 'reply' && m === 'POST') {
      const text = str(b.text, 3000, 'Javob');
      if (t.status === 'yopiq') throw bad('Murojaat yopilgan. Avval holatini o‘zgartiring.');
      tx(db, () => {
        const at = addMsg(db, id, 'general', text, st.name);
        run(db, "UPDATE tickets SET updated_at=?, s_unread=1, status=CASE WHEN status='yangi' THEN 'jarayonda' ELSE status END, assignee=COALESCE(assignee,?) WHERE id=?", at, st.id, id);
      });
      return { ok: true };
    }
    if (mm[3] === 'status' && m === 'POST') {
      const s2 = pick(b.status, STATUSES, 'Holat');
      run(db, 'UPDATE tickets SET status=?, updated_at=?, s_unread=1 WHERE id=?', s2, now(), id);
      audit(db, who, 'ticket.status', `#${id} ${s2}`);
      return { ok: true };
    }
    if (mm[3] === 'assign' && m === 'POST') {
      const aid = b.staffId == null || b.staffId === '' ? null : +b.staffId;
      if (aid != null && !one(db, 'SELECT 1 x FROM staff WHERE id=? AND active=1', aid)) throw bad('Xodim topilmadi.');
      run(db, 'UPDATE tickets SET assignee=? WHERE id=?', aid, id);
      audit(db, who, 'ticket.assign', `#${id} → ${aid ?? '—'}`);
      return { ok: true };
    }
    if (mm[3] === 'note' && m === 'POST') {
      run(db, 'INSERT INTO ticket_notes(ticket_id,staff_id,who,text,at) VALUES(?,?,?,?,?)', id, st.id, st.name, str(b.text, 1500, 'Izoh'), now());
      return { ok: true };
    }
  }

  /* — e’lonlar — */
  if (path === '/api/g/announcements' && m === 'GET') { need(st, 'news'); return { announcements: all(db, 'SELECT id,title,body,at FROM announcements ORDER BY id DESC LIMIT 50') }; }
  if (path === '/api/g/announcements' && m === 'POST') {
    need(st, 'news');
    run(db, 'INSERT INTO announcements(title,body,at) VALUES(?,?,?)', str(b.title, 120, 'Sarlavha'), str(b.body, 2000, 'Matn'), now());
    audit(db, who, 'announce', b.title);
    return { ok: true };
  }
  mm = /^\/api\/g\/announcements\/(\d+)$/.exec(path);
  if (mm && m === 'DELETE') { need(st, 'news'); run(db, 'DELETE FROM announcements WHERE id=?', +mm[1]); return { ok: true }; }
  throw new HttpError(404, 'Topilmadi.');
}

/* ---------- Maktab tomoni (API kalit bilan) ---------- */
function schoolRoute(db, req, path, b, school) {
  const m = req.method;
  if (path === '/api/school/me' && m === 'GET') return { school: { id: school.id, name: school.name, region: school.region } };
  if (path === '/api/school/heartbeat' && m === 'POST') {
    const snap = b.snapshot ? cleanSnapshot(b.snapshot) : null;
    if (snap) run(db, 'UPDATE schools SET snapshot=?, snap_at=?, snap_demo=0 WHERE id=?', JSON.stringify(snap), now(), school.id);
    const sc = snap ? [snap.students.length, snap.teachers.length, snap.classes.length] : [cnt(b.students), cnt(b.teachers), cnt(b.classes)];
    run(db, 'UPDATE schools SET students=?, teachers=?, classes=?, version=?, last_seen=? WHERE id=?', ...sc, str(b.version, 30, 'Versiya', false) || null, now(), school.id);
    return { ok: true };
  }
  if (path === '/api/school/announcements' && m === 'GET') return { announcements: all(db, 'SELECT id,title,body,at FROM announcements ORDER BY id DESC LIMIT 20') };
  if (path === '/api/school/tickets' && m === 'GET') {
    const rows = all(db, 'SELECT * FROM tickets WHERE school_id=? ORDER BY s_unread DESC, updated_at DESC LIMIT 200', school.id);
    return { tickets: rows.map(r => ticketOut(r, { unread: !!r.s_unread })), unread: rows.filter(r => r.s_unread).length };
  }
  if (path === '/api/school/tickets' && m === 'POST') {
    const title = str(b.title, 120, 'Sarlavha'), text = str(b.text, 4000, 'Muammo tavsifi');
    const category = pick(b.category || 'boshqa', CATEGORIES, 'Turkum'), priority = pick(b.priority || 'oddiy', PRIORITIES, 'Muhimlik');
    if (one(db, "SELECT COUNT(*) c FROM tickets WHERE school_id=? AND created_at>?", school.id, new Date(Date.now() - 3600e3).toISOString()).c >= 20) throw new HttpError(429, 'Bir soatda 20 tadan ko‘p murojaat yuborib bo‘lmaydi.');
    const id = tx(db, () => {
      const at = now();
      const r = run(db, 'INSERT INTO tickets(school_id,title,category,priority,created_at,updated_at,g_unread,s_unread) VALUES(?,?,?,?,?,?,1,0)', school.id, title, category, priority, at, at);
      addMsg(db, Number(r.lastInsertRowid), 'school', text, school.name);
      return Number(r.lastInsertRowid);
    });
    return { id };
  }
  const mm = /^\/api\/school\/tickets\/(\d+)(\/reply)?$/.exec(path);
  if (mm) {
    const id = +mm[1], t = one(db, 'SELECT * FROM tickets WHERE id=? AND school_id=?', id, school.id);
    if (!t) throw new HttpError(404, 'Murojaat topilmadi.');
    if (!mm[2] && m === 'GET') { run(db, 'UPDATE tickets SET s_unread=0 WHERE id=?', id); return { ticket: ticketOut(t, { unread: false }), messages: thread(db, id).map(({ side, text, at }) => ({ side, text, at })) }; }
    if (mm[2] && m === 'POST') {
      const text = str(b.text, 3000, 'Xabar');
      if (t.status === 'yopiq') throw new HttpError(403, 'Murojaat yopilgan. Yangi murojaat yuboring.');
      tx(db, () => {
        const at = addMsg(db, id, 'school', text, school.name);
        run(db, "UPDATE tickets SET updated_at=?, g_unread=1, status=CASE WHEN status='hal' THEN 'yangi' ELSE status END WHERE id=?", at, id);
      });
      return { ok: true };
    }
  }
  throw new HttpError(404, 'Topilmadi.');
}

/* ---------- login ---------- */
export function doLogin(db, b) {
  const login = String(b.login || '').trim();
  const st = login ? one(db, 'SELECT * FROM staff WHERE login=?', login) : null;
  const ok = st ? checkPw(String(b.pw || ''), st.pw_hash) : (checkPw('x', 's1$1024$00$00'), false); // vaqt farqini kamaytirish
  if (!st || !ok) throw new HttpError(401, 'Login yoki parol noto‘g‘ri.');
  if (!st.active) throw new HttpError(403, 'Hisobingiz o‘chirilgan. Bosh admin bilan bog‘laning.');
  run(db, 'UPDATE staff SET last_login=? WHERE id=?', now(), st.id);
  return st;
}
/** Test ishchilar: har bir yo‘nalishga 5 tadan (login tex1…tex5, parol test1234). Yaratilgan loginlar qaytadi. */
export function seedTestStaff(db) {
  const made = [], pwHash = hashPw('test1234');
  const FIRST = [['Bobur', 'Sardor', 'Jasur', 'Otabek', 'Kamol'], ['Madina', 'Aziza', 'Dilnoza', 'Nigora', 'Laylo']];
  const SUF = { tex: 'Tex', kurator: 'Kurator', dasturchi: 'Dev', dizayner: 'Dizayn', tester: 'QA', moliya: 'Moliya', manager: 'Menejer' };
  Object.entries(SUF).forEach(([role, sf], k) => [0, 1, 2, 3, 4].forEach(n => {
    const login = `${role}${n + 1}`; if (one(db, 'SELECT 1 x FROM staff WHERE login=?', login)) return;
    run(db, 'INSERT INTO staff(login,name,pw_hash,role,perms,created_at) VALUES(?,?,?,?,?,?)', login, FIRST[(n + k) % 2][(n + k * 2) % 5] + ' ' + sf, pwHash, role, JSON.stringify(ROLES[role].perms), now()); made.push(login);
  }));
  return made;
}
export function seedGeneral(db, { login, pw, N = 16384 } = {}) {
  if (one(db, 'SELECT 1 x FROM staff')) return false;
  run(db, "INSERT INTO staff(login,name,pw_hash,role,perms,created_at) VALUES(?,?,?,'owner','[]',?)", login || 'general', 'General admin', hashPw(pw || 'general123', N), now());
  return true;
}

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

export function createApp(db, { secret, staticDir } = {}) {
  secret ||= loadSecret();
  const fails = new Map();
  const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-school-key' }); res.end(JSON.stringify(obj)); };
  const body = (req, max = 1e6) => new Promise((ok, no) => {
    let n = 0; const ch = [];
    req.on('data', c => { n += c.length; if (n > max) { no(new HttpError(413, 'Hajm juda katta.')); req.destroy(); } else ch.push(c); });
    req.on('end', () => { try { ok(ch.length ? JSON.parse(Buffer.concat(ch).toString()) : {}); } catch { no(bad('JSON noto‘g‘ri.')); } });
    req.on('error', no);
  });
  const serveStatic = (res, path) => {
    if (!staticDir || !existsSync(staticDir)) { res.writeHead(404); return res.end('Not found'); }
    let f = normalize(join(staticDir, path === '/' ? 'index.html' : path));
    if (!f.startsWith(normalize(staticDir))) { res.writeHead(403); return res.end(); }
    if (!existsSync(f) || statSync(f).isDirectory()) f = join(staticDir, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  };
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), path = url.pathname;
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-school-key', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE' }); return res.end(); }
      if (!path.startsWith('/api/')) return serveStatic(res, path);
      if (path === '/api/health') return send(res, 200, { ok: true, service: 'dasada' });
      if (path === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || '?', f = fails.get(ip);
        if (f && f.n >= 10 && f.until > Date.now()) throw new HttpError(429, 'Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.');
        let st;
        try { st = doLogin(db, await body(req)); } catch (e) { if (e.status === 401) fails.set(ip, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 15 * 60e3 }); throw e; }
        fails.delete(ip);
        return send(res, 200, { token: signToken(st, secret), staff: staffOut(st) });
      }
      if (path.startsWith('/api/g/')) {
        const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
        const st = m && staffFromToken(db, m[1], secret);
        if (!st) throw new HttpError(401, 'Qaytadan kiring.');
        return send(res, 200, generalRoute(db, req, path, req.method === 'GET' ? {} : await body(req, 400e3), url, st));
      }
      if (path.startsWith('/api/school/')) {
        const key = String(req.headers['x-school-key'] || '');
        const school = key && one(db, 'SELECT * FROM schools WHERE key_hash=?', keyHash(key));
        if (!school) throw new HttpError(401, 'Maktab kaliti noto‘g‘ri.');
        if (school.status !== 'faol') throw new HttpError(403, 'Bu maktab bloklangan. General admin bilan bog‘laning.');
        return send(res, 200, schoolRoute(db, req, path, req.method === 'GET' ? {} : await body(req, path.endsWith('/heartbeat') ? 8e6 : 1e6), school));
      }
      throw new HttpError(404, 'Topilmadi.');
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Server xatosi.', ...(e.extra || {}) });
    }
  });
}
