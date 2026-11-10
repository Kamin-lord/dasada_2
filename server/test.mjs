import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { createApp, seedGeneral } from './app.js';

let srv, base, G;
const call = async (method, path, body, h = {}) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const g = (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + G });

test('start', async () => {
  const db = openDb(':memory:');
  seedGeneral(db, { login: 'gen', pw: 'sirli123', N: 1024 });
  srv = createApp(db, { secret: 'x'.repeat(32) }).listen(0);
  await new Promise(r => srv.once('listening', r));
  base = 'http://127.0.0.1:' + srv.address().port;
  assert.equal((await call('GET', '/api/health')).j.ok, true);
});

test('login', async () => {
  assert.equal((await call('POST', '/api/login', { login: 'gen', pw: 'xato' })).s, 401);
  const r = await call('POST', '/api/login', { login: 'GEN', pw: 'sirli123' });
  assert.equal(r.s, 200); G = r.j.token;
  assert.equal((await call('GET', '/api/g/overview')).s, 401);
  assert.equal((await call('GET', '/api/g/overview', null, { authorization: 'Bearer abc.def' })).s, 401);
});

let k1, k2, id1, id2;
test('maktab qo‘shish', async () => {
  assert.equal((await g('POST', '/api/g/schools', { name: '  ' })).s, 400);
  const a = await g('POST', '/api/g/schools', { name: '1-maktab', region: 'Farg‘ona' });
  assert.equal(a.s, 200); k1 = a.j.key; id1 = a.j.school.id;
  assert.match(k1, /^DSD(-[A-Z2-9]{4}){5}$/);
  assert.equal(a.j.school.keyHint, k1.slice(-4));
  assert.equal((await g('POST', '/api/g/schools', { name: '1-MAKTAB' })).s, 400);
  const b = await g('POST', '/api/g/schools', { name: '2-maktab' }); k2 = b.j.key; id2 = b.j.school.id;
  const l = await g('GET', '/api/g/schools');
  assert.equal(l.j.schools.length, 2);
  assert.ok(!JSON.stringify(l.j).includes(k1), 'kalit ro‘yxatda ko‘rinmasin');
});

test('maktab kaliti va heartbeat', async () => {
  assert.equal((await call('GET', '/api/school/me')).s, 401);
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': 'DSD-AAAA-BBBB-CCCC-DDDD-EEEE' })).s, 401);
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': k1 })).j.school.name, '1-maktab');
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': ' ' + k1.toLowerCase().replaceAll('-', ' ') + ' ' })).s, 200, 'katta-kichik harf va tire farq qilmasin');
  assert.equal((await call('POST', '/api/school/heartbeat', { students: 320, teachers: 25, classes: 16, version: '1.0' }, { 'x-school-key': k1 })).s, 200);
  const o = (await g('GET', '/api/g/overview')).j;
  assert.equal(o.students, 320); assert.equal(o.online, 1);
});

let tid;
test('muammo yuborish va javob', async () => {
  const H = { 'x-school-key': k1 };
  assert.equal((await call('POST', '/api/school/tickets', { title: '', text: 'x' }, H)).s, 400);
  assert.equal((await call('POST', '/api/school/tickets', { title: 'a', text: 'b', priority: 'zo‘r' }, H)).s, 400);
  const c = await call('POST', '/api/school/tickets', { title: 'Baholar saqlanmayapti', text: 'Ustozlar baho qo‘yolmayapti', category: 'texnik', priority: 'shoshilinch' }, H);
  assert.equal(c.s, 200); tid = c.j.id;
  const l = (await g('GET', '/api/g/tickets?status=ochiq')).j.tickets;
  assert.equal(l.length, 1); assert.equal(l[0].school, '1-maktab'); assert.equal(l[0].unread, true);
  assert.equal((await g('GET', '/api/g/overview')).j.ticketsUrgent, 1);
  const d = (await g('GET', '/api/g/tickets/' + tid)).j;
  assert.equal(d.messages.length, 1); assert.equal(d.messages[0].side, 'school');
  assert.equal((await g('GET', '/api/g/tickets')).j.tickets[0].unread, false);
  assert.equal((await g('POST', `/api/g/tickets/${tid}/reply`, { text: 'Ko‘ryapmiz' })).s, 200);
  const s = (await call('GET', '/api/school/tickets', null, H)).j;
  assert.equal(s.unread, 1); assert.equal(s.tickets[0].status, 'jarayonda');
  const sd = (await call('GET', '/api/school/tickets/' + tid, null, H)).j;
  assert.equal(sd.messages.length, 2);
  assert.equal((await call('GET', '/api/school/tickets', null, H)).j.unread, 0);
});

test('boshqa maktab murojaatini ko‘ra olmaydi', async () => {
  const H2 = { 'x-school-key': k2 };
  assert.equal((await call('GET', '/api/school/tickets/' + tid, null, H2)).s, 404);
  assert.equal((await call('POST', `/api/school/tickets/${tid}/reply`, { text: 'hack' }, H2)).s, 404);
  assert.equal((await call('GET', '/api/school/tickets', null, H2)).j.tickets.length, 0);
});

test('holat: hal → qayta ochish, yopiq → qulf', async () => {
  const H = { 'x-school-key': k1 };
  assert.equal((await g('POST', `/api/g/tickets/${tid}/status`, { status: 'hal' })).s, 200);
  assert.equal((await g('POST', `/api/g/tickets/${tid}/status`, { status: 'noma' })).s, 400);
  await call('POST', `/api/school/tickets/${tid}/reply`, { text: 'Yana xato' }, H);
  assert.equal((await call('GET', '/api/school/tickets', null, H)).j.tickets[0].status, 'yangi');
  await g('POST', `/api/g/tickets/${tid}/status`, { status: 'yopiq' });
  assert.equal((await call('POST', `/api/school/tickets/${tid}/reply`, { text: 'x' }, H)).s, 403);
  assert.equal((await g('POST', `/api/g/tickets/${tid}/reply`, { text: 'x' })).s, 400);
});

test('e’lon', async () => {
  assert.equal((await g('POST', '/api/g/announcements', { title: 'Yangilanish', body: 'Shanba kuni texnik ishlar' })).s, 200);
  const a = (await call('GET', '/api/school/announcements', null, { 'x-school-key': k2 })).j.announcements;
  assert.equal(a.length, 1);
});

test('bloklash, kalitni almashtirish, o‘chirish', async () => {
  assert.equal((await g('PATCH', '/api/g/schools/' + id2, { status: 'bloklangan' })).s, 200);
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': k2 })).s, 403);
  const nk = (await g('POST', `/api/g/schools/${id2}/key`, { confirm: 'sirli123' })).j.key;
  assert.notEqual(nk, k2);
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': k2 })).s, 401);
  await g('PATCH', '/api/g/schools/' + id2, { status: 'faol' });
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': nk })).s, 200);
  assert.equal((await g('DELETE', '/api/g/schools/' + id1)).s, 403, 'parolsiz o‘chirib bo‘lmaydi');
  assert.equal((await g('DELETE', '/api/g/schools/' + id1, { confirm: 'xato' })).s, 403);
  assert.equal((await g('DELETE', '/api/g/schools/' + id1, { confirm: 'sirli123' })).s, 200);
  assert.equal((await g('GET', '/api/g/tickets')).j.tickets.length, 0);
  assert.equal((await call('GET', '/api/school/me', null, { 'x-school-key': k1 })).s, 401);
});

let mtok;
test('menejer: ruxsatlar va parol almashtirish', async () => {
  assert.equal((await g('POST', '/api/g/staff', { login: 'ab', name: 'X' })).s, 400);
  const c = await g('POST', '/api/g/staff', { login: 'menejer1', name: 'Ali Menejer', perms: ['tickets'] });
  assert.equal(c.s, 200); const pw = c.j.password; assert.ok(pw.length >= 8);
  const lg = await call('POST', '/api/login', { login: 'menejer1', pw });
  assert.equal(lg.s, 200); mtok = lg.j.token;
  const mg = (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + mtok });
  assert.equal((await mg('GET', '/api/g/tickets')).s, 200);
  assert.equal((await mg('GET', '/api/g/schools')).s, 403, 'maktablarga ruxsat yo‘q');
  assert.equal((await mg('GET', '/api/g/staff')).s, 403);
  assert.equal((await mg('GET', '/api/g/audit')).s, 403);
  assert.equal((await mg('POST', '/api/g/announcements', { title: 'a', body: 'b' })).s, 403);
  // egasi ruxsat beradi
  const id = c.j.staff.id;
  await g('PATCH', '/api/g/staff/' + id, { perms: ['tickets', 'news'] });
  assert.equal((await mg('POST', '/api/g/announcements', { title: 'Menejer e’loni', body: 'x' })).s, 200);
  // o‘z parolini almashtiradi — eski token yaroqsiz
  assert.equal((await mg('POST', '/api/g/me/password', { old: 'noto‘g‘ri', pw: 'yangi1234' })).s, 400);
  assert.equal((await mg('POST', '/api/g/me/password', { old: pw, pw: '123' })).s, 400);
  assert.equal((await mg('POST', '/api/g/me/password', { old: pw, pw: 'yangi1234' })).s, 200);
  assert.equal((await mg('GET', '/api/g/tickets')).s, 401);
  assert.equal((await call('POST', '/api/login', { login: 'menejer1', pw: 'yangi1234' })).s, 200);
  // o‘chirilgan (faolsiz) xodim kira olmaydi
  await g('PATCH', '/api/g/staff/' + id, { active: false });
  assert.equal((await call('POST', '/api/login', { login: 'menejer1', pw: 'yangi1234' })).s, 403);
  assert.equal((await g('DELETE', '/api/g/staff/' + id)).s, 403);
  assert.equal((await g('DELETE', '/api/g/staff/' + id, { confirm: 'sirli123' })).s, 200);
  const owner = (await g('GET', '/api/g/staff')).j.staff.find(x => x.role === 'owner');
  assert.equal((await g('DELETE', '/api/g/staff/' + owner.id, { confirm: 'sirli123' })).s, 400);
});

test('maktab + admin (telefon, parol) + logo', async () => {
  assert.equal((await g('POST', '/api/g/schools', { name: 'Admin sinov', admin: { name: 'Qodir', phone: '123', pw: 'parol123' } })).s, 400, 'telefon noto‘g‘ri');
  assert.equal((await g('POST', '/api/g/schools', { name: 'Admin sinov', admin: { name: 'Qodir', phone: '90 123 45 67', pw: '12' } })).s, 400, 'parol qisqa');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const c = await g('POST', '/api/g/schools', { name: 'Admin sinov', region: 'Qo‘qon', logo: png, admin: { name: 'Qodir Aliyev', phone: '+998 90 123 45 67', pw: 'parol123' } });
  assert.equal(c.s, 200); assert.equal(c.j.admin.phone, '901234567'); assert.equal(c.j.admin.password, 'parol123'); assert.equal(c.j.school.logo, png);
  const sid = c.j.school.id;
  // telefon takrorlanmaydi
  assert.equal((await g('POST', '/api/g/schools', { name: 'Boshqa', admin: { name: 'Q', phone: '901234567' } })).s, 400);
  assert.equal((await g('GET', '/api/g/schools')).j.schools.find(x => x.name === 'Boshqa'), undefined, 'xato bo‘lsa maktab ham yaratilmasin');
  // parolsiz admin — parol avtomatik yaratiladi
  const a2 = await g('POST', `/api/g/schools/${sid}/admins`, { name: 'Menejer Bek', phone: '935556677', role: 'menejer' });
  assert.equal(a2.s, 200); assert.ok(a2.j.password.length >= 8);
  assert.equal((await g('GET', `/api/g/schools/${sid}/admins`)).j.admins.length, 2);
  assert.ok(!JSON.stringify((await g('GET', `/api/g/schools/${sid}`)).j).includes('pw_hash'), 'parol hash chiqmasin');
  assert.equal((await g('POST', `/api/g/school-admins/${a2.j.admin.id}/password`, {})).j.password.length >= 8, true);
  assert.equal((await g('PATCH', `/api/g/school-admins/${a2.j.admin.id}`, { phone: '901234567' })).s, 400);
  // logo
  assert.equal((await g('POST', `/api/g/schools/${sid}/logo`, { data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })).s, 400, 'SVG rad etiladi');
  assert.equal((await g('POST', `/api/g/schools/${sid}/logo`, { data: 'javascript:alert(1)' })).s, 400);
  assert.equal((await g('DELETE', `/api/g/schools/${sid}/logo`)).s, 200);
  assert.equal((await g('GET', `/api/g/schools/${sid}`)).j.school.logo, null);
  globalThis.__sid = sid;
});

test('maktab snapshoti: foydalanuvchilar ma’lumoti', async () => {
  const sid = globalThis.__sid;
  const key = (await g('POST', `/api/g/schools/${sid}/key`, { confirm: 'sirli123' })).j.key;
  assert.equal((await g('GET', `/api/g/schools/${sid}/data`)).j.data, null);
  const snap = { students: [{ id: 1, name: 'Ali Valiyev', cls: '5-A', phone: '901112233', avg: 4.3, att: 96, miss: ['tibbiy'], pw: 'SIR', pw_hash: 'x' }], teachers: [{ id: 't1', name: 'Ustoz', subj: 'Fizika', phone: '', leads: ['5-A'] }], classes: [{ name: '5-A', leader: 'Ustoz', n: 1 }], subjects: ['Fizika'] };
  assert.equal((await call('POST', '/api/school/heartbeat', { snapshot: snap, version: '1' }, { 'x-school-key': key })).s, 200);
  const d = (await g('GET', `/api/g/schools/${sid}/data`)).j;
  assert.equal(d.data.students[0].name, 'Ali Valiyev'); assert.deepEqual(d.data.students[0].miss, ['tibbiy']);
  assert.ok(!JSON.stringify(d).includes('SIR') && !JSON.stringify(d).includes('pw_hash'), 'parol maydonlari saqlanmasin');
  assert.equal((await g('GET', '/api/g/schools')).j.schools.find(x => x.id === sid).students, 1);
  // namuna ma’lumot haqiqiyning ustiga yozilmaydi
  assert.equal((await g('POST', `/api/g/schools/${sid}/demo-data`)).s, 400);
});

test('namuna ma’lumot va jurnal, murojaatni biriktirish', async () => {
  const k = (await g('POST', '/api/g/schools', { name: 'Namuna maktab' })).j;
  assert.equal((await g('POST', `/api/g/schools/${k.school.id}/demo-data`)).s, 200);
  const d = (await g('GET', `/api/g/schools/${k.school.id}/data`)).j;
  assert.equal(d.demo, true); assert.ok(d.data.students.length >= 30);
  const t = (await call('POST', '/api/school/tickets', { title: 'Biriktirish', text: 'sinov' }, { 'x-school-key': k.key })).j.id;
  const me = (await g('GET', '/api/g/me')).j.staff;
  assert.equal((await g('POST', `/api/g/tickets/${t}/assign`, { staffId: me.id })).s, 200);
  assert.equal((await g('POST', `/api/g/tickets/${t}/note`, { text: 'ichki izoh' })).s, 200);
  const det = (await g('GET', '/api/g/tickets/' + t)).j;
  assert.equal(det.ticket.assigneeName, 'General admin'); assert.equal(det.notes.length, 1);
  assert.equal((await g('GET', '/api/g/tickets?mine=1')).j.tickets.length, 1);
  assert.equal((await g('GET', '/api/g/tickets?q=Biriktir')).j.tickets.length, 1);
  assert.equal((await g('GET', '/api/g/audit')).j.audit.length > 5, true);
  const ov = (await g('GET', '/api/g/overview')).j; assert.equal(ov.perDay.length, 14);
  assert.ok(ov.avgResp >= 0, 'o‘rtacha javob vaqti hisoblandi'); assert.equal(ov.overdue, 0); assert.ok(ov.activity.length > 3);
});

test('General admin qo‘shish va jamoa chati', async () => {
  const c = await g('POST', '/api/g/staff', { login: 'gen2', name: 'Ikkinchi General', role: 'owner' });
  assert.equal(c.s, 200); assert.equal(c.j.staff.role, 'owner'); assert.ok(c.j.staff.perms.includes('schools'));
  const l = await call('POST', '/api/login', { login: 'gen2', pw: c.j.password });
  const G2 = (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + l.j.token });
  assert.equal((await G2('GET', '/api/g/staff')).s, 200, 'yangi General admin xodimlarni ko‘radi');
  assert.equal((await G2('PATCH', '/api/g/staff/1', { active: false })).s, 400, 'asosiy adminni o‘zgartirib bo‘lmaydi');
  assert.equal((await G2('POST', '/api/g/chat', { text: '' })).s, 400);
  await g('POST', '/api/g/chat', { text: 'Salom jamoa' }); await G2('POST', '/api/g/chat', { text: 'Salom!' });
  const m = await g('GET', '/api/g/chat?after=0'); assert.equal(m.j.messages.length, 2); assert.equal(m.j.messages[1].who, 'Ikkinchi General');
  assert.equal((await g('GET', '/api/g/chat?after=' + m.j.messages[0].id)).j.messages.length, 1);
  assert.ok((await g('GET', '/api/g/overview')).j.chatLast >= 2);
  assert.equal((await call('GET', '/api/g/chat')).s, 401);
});

test('vazifalar oqimi va xodim logosi', async () => {
  const mc = await g('POST', '/api/g/staff', { login: 'ijrochi', name: 'Ijrochi', perms: ['tickets'] });
  const ml = await call('POST', '/api/login', { login: 'ijrochi', pw: mc.j.password });
  const M = (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + ml.j.token });
  assert.equal((await M('POST', '/api/g/tasks', { title: 'X', assignee: 1 })).s, 403, 'menejer vazifa bera olmaydi');
  const t1 = (await g('POST', '/api/g/tasks', { title: 'Hisobot tayyorlash', assignee: mc.j.staff.id, priority: 'yuqori' })).j.id;
  const t2 = (await g('POST', '/api/g/tasks', { title: 'Oddiy ish', assignee: mc.j.staff.id, review: false })).j.id;
  assert.equal((await M('GET', '/api/g/tasks')).j.tasks.length, 2);
  assert.equal((await M('GET', '/api/g/overview')).j.taskNew, 2);
  assert.equal((await M('POST', `/api/g/tasks/${t1}/finish`, {})).s, 400, 'qabul qilmay tugatib bo‘lmaydi');
  assert.equal((await M('POST', `/api/g/tasks/${t1}/accept`)).j.task.status, 'jarayonda');
  assert.equal((await M('POST', `/api/g/tasks/${t1}/finish`, { text: 'tayyor' })).j.task.status, 'tekshiruv');
  assert.equal((await M('POST', `/api/g/tasks/${t1}/approve`)).s, 403);
  assert.equal((await g('POST', `/api/g/tasks/${t1}/reject`, {})).s, 400, 'izohsiz qaytarib bo‘lmaydi');
  assert.equal((await g('POST', `/api/g/tasks/${t1}/reject`, { text: 'Raqamlar xato' })).j.task.status, 'jarayonda');
  assert.equal((await M('GET', '/api/g/overview')).j.taskRework, 1);
  await M('POST', `/api/g/tasks/${t1}/finish`, {}); assert.equal((await g('POST', `/api/g/tasks/${t1}/approve`)).j.task.status, 'tayyor');
  await M('POST', `/api/g/tasks/${t2}/accept`); assert.equal((await M('POST', `/api/g/tasks/${t2}/finish`, {})).j.task.status, 'tayyor', 'tekshiruvsiz vazifa to‘g‘ridan-to‘g‘ri tayyor');
  const d = (await g('GET', `/api/g/tasks/${t1}`)).j; assert.ok(d.log.length >= 6);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  assert.equal((await M('POST', '/api/g/me/logo', { data: png })).s, 200);
  assert.equal((await g('POST', `/api/g/staff/${mc.j.staff.id}/logo`, { data: 'x' })).s, 400);
  assert.ok((await M('GET', '/api/g/team')).j.team.find(x => x.login === undefined && x.name === 'Ijrochi').logo);
  assert.equal((await g('DELETE', `/api/g/tasks/${t2}`, { confirm: 'sirli123' })).s, 200);
});

test('bo‘limlar, rollar, to-do, hujjat, lichka', async () => {
  const mk = async (login, role) => { const c = await g('POST', '/api/g/staff', { login, name: login, role }); const l = await call('POST', '/api/login', { login, pw: c.j.password }); return { id: c.j.staff.id, c, H: (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + l.j.token }) }; };
  const tex = await mk('texadmin', 'tex'), kur = await mk('kurator1', 'kurator'), dev = await mk('dev1', 'dasturchi'), out = await mk('outsider', 'manager');
  assert.deepEqual(tex.c.j.staff.perms.sort(), ['admins', 'schools', 'users']);
  assert.equal(kur.c.j.staff.role, 'kurator');
  assert.equal((await tex.H('POST', '/api/g/projects', { name: 'X' })).s, 403);
  const pid = (await g('POST', '/api/g/projects', { name: 'Al-Kundalik', descr: 'maktab kundaligi', icon: '📘', members: [{ id: kur.id, prole: 'lead' }, { id: dev.id, prole: 'member' }, { id: tex.id, prole: 'viewer' }] })).j.id;
  assert.ok(pid);
  assert.equal((await out.H('GET', '/api/g/projects/' + pid)).s, 403, 'a’zo bo‘lmagan kira olmaydi');
  assert.equal((await dev.H('GET', '/api/g/projects')).j.projects.length, 1);
  assert.equal((await out.H('GET', '/api/g/projects')).j.projects.length, 0);
  // rahbar vazifa beradi, a'zo bajaradi
  const t = await kur.H('POST', '/api/g/tasks', { title: 'Login sahifa', assignee: dev.id, project: pid }); assert.equal(t.s, 200);
  assert.equal((await dev.H('POST', '/api/g/tasks', { title: 'x', assignee: dev.id, project: pid })).s, 403, 'oddiy a’zo vazifa bera olmaydi');
  assert.equal((await kur.H('POST', '/api/g/tasks', { title: 'x', assignee: out.id, project: pid })).s, 400, 'a’zo bo‘lmagan ijrochi bo‘lmaydi');
  await dev.H('POST', `/api/g/tasks/${t.j.id}/accept`); await dev.H('POST', `/api/g/tasks/${t.j.id}/finish`, {});
  assert.equal((await dev.H('POST', `/api/g/tasks/${t.j.id}/approve`)).s, 403);
  assert.equal((await kur.H('POST', `/api/g/tasks/${t.j.id}/approve`)).j.task.status, 'tayyor', 'bo‘lim rahbari tekshiradi');
  assert.equal((await tex.H('GET', '/api/g/tasks?project=' + pid)).j.tasks.length, 1, 'kuzatuvchi ko‘radi');
  // to-do
  // hujjat
  const nt = await dev.H('POST', `/api/g/projects/${pid}/notes`, { title: 'API', body: 'matn', pinned: true }); assert.equal((await dev.H('GET', `/api/g/projects/${pid}/notes`)).j.notes[0].pinned, 0, 'a’zo qadab qo‘ya olmaydi');
  assert.equal((await kur.H('PATCH', `/api/g/projects/${pid}/notes/${nt.j.id}`, { pinned: true })).s, 200);
  // bo'lim chati alohida
  await dev.H('POST', '/api/g/chat', { project: pid, text: 'Salom bo‘lim' });
  assert.equal((await kur.H('GET', '/api/g/chat?project=' + pid)).j.messages.length, 1);
  assert.equal((await out.H('GET', '/api/g/chat?project=' + pid)).s, 403);
  assert.ok(!(await g('GET', '/api/g/chat?after=0')).j.messages.some(x => x.text === 'Salom bo‘lim'), 'umumiy chatga tushmaydi');
  // loyiha stat va jurnal
  const pr = (await g('GET', '/api/g/projects')).j.projects.find(x => x.id === pid); assert.equal(pr.tasks.tayyor, 1); assert.equal(pr.progress, 100);
  assert.ok((await kur.H('GET', `/api/g/projects/${pid}/log`)).j.log.length >= 4);
  // lichka
  assert.equal((await dev.H('POST', `/api/g/dm/${out.id}`, { text: 'Salom!' })).s, 200);
  assert.equal((await out.H('GET', '/api/g/overview')).j.dmUnread, 1);
  assert.equal((await out.H('GET', '/api/g/dm')).j.convs[0].unread, 1);
  assert.equal((await out.H('GET', `/api/g/dm/${dev.id}`)).j.messages[0].text, 'Salom!');
  assert.equal((await out.H('GET', '/api/g/overview')).j.dmUnread, 0, 'o‘qilgach belgi yo‘qoladi');
  assert.equal((await kur.H('GET', `/api/g/dm/${out.id}`)).j.messages.length, 0, 'begona lichkani ko‘rmaydi');
  assert.equal((await dev.H('POST', `/api/g/dm/${dev.id}`, { text: 'x' })).s, 400);
  const db0 = (await dev.H('GET', '/api/g/dashboard')).j;
  assert.equal(db0.projects.length, 1); assert.equal(db0.counts.tayyor, 1); assert.equal(db0.perDay.length, 14);
  assert.ok(db0.perDay.reduce((a, d) => a + d.n, 0) >= 1, 'bajarilgan ishlar grafikda');
  assert.equal((await out.H('GET', '/api/g/dashboard')).j.projects.length, 0, 'a’zo bo‘lmagan bo‘limni ko‘rmaydi');
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.equal((await g('POST', `/api/g/projects/${pid}/logo`, { data: PNG })).s, 200);
  assert.equal((await g('GET', `/api/g/projects/${pid}`)).j.project.logo, PNG, 'bo‘lim logosi saqlandi');
  assert.equal((await g('POST', `/api/g/projects/${pid}/logo`, { data: 'data:image/svg+xml;base64,AAAA' })).s, 400, 'SVG rad etiladi');
  assert.equal((await tex.H('POST', `/api/g/projects/${pid}/logo`, { data: PNG })).s, 403, 'kuzatuvchi logo qo‘ya olmaydi');
  assert.equal((await g('GET', `/api/g/projects/${pid}/todos`)).s, 404, 'to-do olib tashlangan');
  assert.equal((await g('PATCH', `/api/g/projects/${pid}`, { archived: true })).s, 200);
  const ar = (await g('GET', '/api/g/archive')).j;
  assert.equal(ar.projects.length, 1); assert.ok(ar.tasks.length >= 1, 'bajarilgan vazifa arxivda'); assert.equal(ar.stats.projects, 1);
  assert.equal((await out.H('GET', '/api/g/archive')).j.projects.length, 0, 'a’zo bo‘lmagan arxivni ko‘rmaydi');
  assert.equal((await g('PATCH', `/api/g/projects/${pid}`, { archived: false })).s, 200);
  assert.equal((await dev.H('POST', '/api/g/staff/seed-test', { confirm: 'x' })).s, 403, 'faqat egasi');
  const sd = (await g('POST', '/api/g/staff/seed-test', { confirm: 'sirli123' })).j; assert.equal(sd.made.length, 34, 'har bir yo‘nalishga 5 tadan');
  assert.equal((await g('POST', '/api/g/staff/seed-test', { confirm: 'sirli123' })).j.made.length, 0, 'takror yaratmaydi');
  assert.equal((await call('POST', '/api/login', { login: 'tex2', pw: 'test1234' })).s, 200, 'test ishchi kira oladi');
  const gr = (await g('POST', '/api/g/groups', { name: 'Kofe sayt' })).j.id; assert.ok(gr);
  assert.equal((await dev.H('POST', '/api/g/groups', { name: 'x' })).s, 403, 'faqat egasi katta bo‘lim yaratadi');
  assert.equal((await g('PATCH', `/api/g/projects/${pid}`, { group: gr })).s, 200);
  assert.equal((await g('POST', '/api/g/projects', { name: '13-ko‘cha', group: gr })).s, 200);
  assert.equal((await g('GET', `/api/g/groups/${gr}`)).j.projects.length, 2, 'katta bo‘lim ichida 2 bo‘lim');
  assert.equal((await dev.H('GET', `/api/g/groups/${gr}`)).j.projects.length, 1, 'a’zo faqat o‘z bo‘limini ko‘radi');
  assert.equal((await out.H('GET', `/api/g/groups/${gr}`)).s, 404, 'begona ko‘rmaydi');
  assert.equal((await g('DELETE', `/api/g/groups/${gr}`, { confirm: 'sirli123' })).s, 200);
  assert.equal((await g('GET', `/api/g/projects/${pid}`)).j.project.groupId, null, 'o‘chirilsa bo‘lim saqlanadi');
  // o'chirish
  assert.equal((await g('DELETE', '/api/g/projects/' + pid, { confirm: 'sirli123' })).s, 200);
  assert.equal((await kur.H('GET', '/api/g/projects/' + pid)).s, 404);
});

test('ishchilar ro‘yxati: bo‘limlar va vazifa statistikasi', async () => {
  const mk = async (login, role) => { const c = await g('POST', '/api/g/staff', { login, name: login, role }); const l = await call('POST', '/api/login', { login, pw: c.j.password }); return { id: c.j.staff.id, H: (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + l.j.token }, ) }; };
  const a = await mk('ishchi_a', 'dasturchi'), b = await mk('ishchi_b', 'dizayner');
  const pid = (await g('POST', '/api/g/projects', { name: 'Ishchilar sinovi', members: [{ id: a.id, prole: 'member' }] })).j.id;
  assert.equal((await g('POST', `/api/g/projects/${pid}/members`, { staff: b.id, prole: 'member' })).s, 200);
  const all = (await g('GET', '/api/g/workers')).j.workers;
  const wa = all.find(w => w.id === a.id);
  assert.ok(wa.login, 'egasi loginni ko‘radi'); assert.equal(wa.projects.length, 1); assert.equal(wa.tasks.running, 0);
  const mine = (await a.H('GET', '/api/g/workers')).j.workers;
  assert.ok(mine.length >= 2); assert.equal(mine.find(w => w.id === b.id).login, undefined, 'oddiy xodim loginni ko‘rmaydi');
});


test('lavozim chat xonalari: har biri alohida, hammasini faqat General admin ko‘radi', async () => {
  const mk = async (login, role) => { const c = await g('POST', '/api/g/staff', { login, name: login, role }); const l = await call('POST', '/api/login', { login, pw: c.j.password }); return (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + l.j.token }); };
  const D = await mk('dizx1', 'dizayner'), D2 = await mk('dizx2', 'dizayner'), T = await mk('texx1', 'tex');
  assert.equal((await D('POST', '/api/g/chat', { text: 'Maket tayyor', room: 'dizayner' })).s, 200);
  assert.equal((await D2('GET', '/api/g/chat?room=dizayner')).j.messages.length, 1, 'bir lavozim xonani ko‘radi');
  assert.equal((await T('GET', '/api/g/chat?room=dizayner')).s, 403, 'boshqa lavozim kira olmaydi');
  assert.equal((await T('POST', '/api/g/chat', { text: 'x', room: 'dizayner' })).s, 403, 'boshqa lavozim yoza olmaydi');
  assert.equal((await T('GET', '/api/g/chat?room=owner')).s, 403, 'General admin xonasi yopiq');
  assert.equal((await T('GET', '/api/g/chat')).j.messages.length, 0, 'xona ko‘rsatilmasa — o‘z lavozimi');
  assert.equal((await g('GET', '/api/g/chat?room=dizayner')).j.messages[0].text, 'Maket tayyor', 'General admin hamma xonani ko‘radi');
  assert.equal((await g('POST', '/api/g/chat', { text: 'Salom dizaynerlar', room: 'dizayner' })).s, 200);
  assert.equal((await D('GET', '/api/g/chat?room=dizayner')).j.messages.length, 2);
  assert.equal((await g('GET', '/api/g/chat?room=yoq')).s, 403);
  assert.equal((await g('GET', '/api/g/chat/rooms')).j.rooms.length, 8, 'General admin 8 ta xonani ko‘radi');
  const tr = (await T('GET', '/api/g/chat/rooms')).j.rooms; assert.equal(tr.length, 1); assert.equal(tr[0].key, 'tex');
  assert.equal((await T('GET', '/api/g/overview')).j.chatLast, 0, 'tex xodim dizayner xabarlarini sanamaydi');
});

test('stop', () => srv.close());
