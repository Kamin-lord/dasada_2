import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { seedIfEmpty } from './seed.js';
import { createApp } from './app.js';
import { todayIso, addDays, wdIdx, dayState } from '../src/kundalik/data.js';

const db = openDb(':memory:');
seedIfEmpty(db);
const srv = createApp(db, { secret: 'test-secret', demo: true });
await new Promise(r => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;
const call = async (path, { token, body, method } = {}) => {
  const r = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json() };
};
const demo = (await call('/api/demo')).j;
const login = async b => call('/api/login', { body: b });
test.after(() => srv.close());

test('health + noto‘g‘ri login', async () => {
  assert.equal((await call('/api/health')).j.ok, true);
  assert.equal((await login({ role: 'admin', phone: '901000000', pw: 'xato' })).s, 401);
  assert.equal((await call('/api/state')).s, 401);
});

test('admin login va to‘liq state', async () => {
  const r = await login({ role: 'admin', phone: demo.admin.phone, pw: demo.admin.pw });
  assert.equal(r.s, 200);
  const st = r.j.state;
  assert.equal(Object.keys(st.leaders).length, 16);
  assert.ok(st.students.length > 250);
  assert.ok(st.students[0].pw, 'admin o‘quvchi parolini ko‘radi');
  assert.equal(st.sched['5-A'].length, 5);
  assert.equal(st.sched['5-A'][0].length, 7);
});

test('o‘quvchi: faqat o‘z sinfi, parolsiz, yozolmaydi', async () => {
  const r = await login({ role: 'student', ...demo.student });
  assert.equal(r.s, 200);
  const cls = r.j.state.students.find(s => String(s.id) === r.j.me.id).cls;
  assert.ok(r.j.state.students.every(s => s.cls === cls));
  assert.ok(r.j.state.students.every(s => !('pw' in s)));
  assert.ok(r.j.state.teachers.every(t => !('pw' in t)));
  assert.deepEqual(Object.keys(r.j.state.sched), [cls]);
  assert.equal((await call('/api/sync', { token: r.j.token, body: { recUp: {} } })).s, 403);
  assert.equal((await login({ role: 'student', ...demo.student, name: 'Boshqa Odam' })).s, 401);
});

test('ustoz: faqat o‘z fani/sinfi, jadval kuni va 7 kunlik oyna ichida baho qo‘ya oladi', async () => {
  const r = await login({ role: 'teacher', name: demo.teacher.name, subject: demo.teacher.subject, pw: demo.teacher.pw });
  assert.equal(r.s, 200);
  const tid = r.j.me.id, st = r.j.state, subj = demo.teacher.subject, today = todayIso();
  const mine = Object.entries(st.assign).find(([c, m]) => m[subj] === tid)[0];
  const other = Object.entries(st.assign).find(([c, m]) => m[subj] !== tid)[0];
  const stu = c => st.students.find(s => s.cls === c);
  const mk = (s, sub, date, extra = {}) => ({ [`${s.id}|${sub}|${date}`]: { sid: s.id, subj: sub, date, att: 'Bor', act: 5, beh: 4, hw: 90, c: 'Zo‘q', ...extra } });
  const send = recUp => call('/api/sync', { token: r.j.token, body: { recUp } });
  // oynadagi, jadvalda bor kun
  let good = null, nolesson = null;
  for (let i = 0; i < 7; i++) { const dt = addDays(today, -i), di = wdIdx(dt); if (di > 4) continue; if (st.sched[mine][di].includes(subj)) good ||= dt; else nolesson ||= dt; }
  assert.ok(good, 'oynada dars kuni bor');
  assert.equal((await send(mk(stu(mine), subj, good))).s, 200);
  assert.equal((await call('/api/state', { token: r.j.token })).j.state.recMap[`${stu(mine).id}|${subj}|${good}`].act, 5, 'saqlandi');
  assert.equal((await send(mk(stu(other), subj, good))).s, 403, 'boshqa sinf');
  assert.equal((await send(mk(stu(mine), st.subjects.find(s => s !== subj), good))).s, 403, 'boshqa fan');
  assert.equal((await send(mk(stu(mine), subj, good, { act: 6 }))).s, 400, '2–5 dan tashqari');
  assert.equal((await send(mk(stu(mine), subj, addDays(today, 1)))).s, 403, 'kelajak');
  // 7 kundan oshgan sana qulflangan
  let old = addDays(today, -8); while (wdIdx(old) > 4) old = addDays(old, -1);
  assert.equal(dayState(old, today), 'locked');
  const lk = await send(mk(stu(mine), subj, old));
  assert.equal(lk.s, 403); assert.match(lk.j.error, /qulflangan/);
  if (nolesson) { const nl = await send(mk(stu(mine), subj, nolesson)); assert.equal(nl.s, 403); assert.match(nl.j.error, /darsi yo‘q/); }
  assert.equal((await call('/api/sync', { token: r.j.token, body: { students: [] } })).s, 403, 'admin amali');
  assert.equal((await call('/api/sync', { token: r.j.token, body: { quarters: [] } })).s, 403, 'choraklar faqat admin');
  assert.equal((await call('/api/sync', { token: r.j.token, body: { msgsNew: [{ sid: stu(other).id, x: 'salom', d: today }] } })).s, 403, 'boshqa sinf ota-onasiga xabar');
  assert.equal((await call('/api/sync', { token: r.j.token, body: { msgsNew: [{ sid: stu(mine).id, x: 'Yaxshi o‘qiyapti', d: today }] } })).s, 200);
});

test('admin: qulflangan sanani ham tuzatadi; choraklarni saqlaydi', async () => {
  const a = await login({ role: 'admin', phone: demo.admin.phone, pw: demo.admin.pw });
  const s0 = a.j.state.students[0], subj = a.j.state.subjects[0];
  let old = addDays(todayIso(), -40); while (wdIdx(old) > 4) old = addDays(old, -1);
  const rec = { sid: s0.id, subj, date: old, att: 'Bor', act: 3, beh: 3, hw: 60, c: '' };
  assert.equal((await call('/api/sync', { token: a.j.token, body: { recUp: { [`${s0.id}|${subj}|${old}`]: rec } } })).s, 200);
  assert.equal(a.j.state.quarters.length, 4);
  const q = [['2026-09-01', '2026-10-25'], ['2026-11-02', '2026-12-30'], ['2027-01-11', '2027-03-14'], ['2027-03-22', '2027-05-25']];
  assert.equal((await call('/api/sync', { token: a.j.token, body: { quarters: q } })).s, 200);
  assert.deepEqual((await call('/api/state', { token: a.j.token })).j.state.quarters, q);
  assert.equal((await call('/api/sync', { token: a.j.token, body: { quarters: [q[1], q[0], q[2], q[3]] } })).s, 400, 'tartibsiz choraklar');
});

test('admin: o‘quvchi qo‘shadi, yangi o‘quvchi kira oladi, o‘chirilsa kira olmaydi', async () => {
  const a = await login({ role: 'admin', phone: demo.admin.phone, pw: demo.admin.pw });
  const students = [...a.j.state.students, { id: 99999, name: 'Yangi O‘quvchi', cls: '1-A', q: 0.6, phone: '901112233', pw: 'sinov123' }];
  assert.equal((await call('/api/sync', { token: a.j.token, body: { students } })).s, 200);
  const n = await login({ role: 'student', name: 'yangi  o‘quvchi', phone: '+998 90 111 22 33', pw: 'sinov123' });
  assert.equal(n.s, 200);
  assert.equal((await call('/api/sync', { token: a.j.token, body: { students: a.j.state.students } })).s, 200);
  assert.equal((await call('/api/state', { token: n.j.token })).s, 401, 'o‘chirilgan foydalanuvchi tokeni ishlamaydi');
  assert.equal((await call('/api/sync', { token: a.j.token, body: { students: [{ id: 1, name: 'X', cls: 'yo‘q', phone: '901112233' }] } })).s, 400);
});

test('token soxtalashtirib bo‘lmaydi', async () => {
  const r = await login({ role: 'student', ...demo.student });
  const [p, m] = r.j.token.split('.');
  const forged = Buffer.from(JSON.stringify({ r: 'admin', id: null, exp: 9999999999 })).toString('base64url') + '.' + m;
  assert.equal((await call('/api/state', { token: forged })).s, 401);
});

test('sinf qo‘shish/o‘chirish va logo: logoni faqat sinf rahbari qo‘ya oladi', async () => {
  const a = await login({ role: 'admin', phone: demo.admin.phone, pw: demo.admin.pw });
  const S0 = a.j.state, sync = (token, body) => call('/api/sync', { token, body });
  const leaderId = S0.leaders['5-A'], lt = S0.teachers.find(t => t.id === leaderId);
  const sched = { 'Yangi-A': Array.from({ length: 5 }, () => Array(7).fill(S0.subjects[0])) };
  assert.equal((await sync(a.j.token, { classes: [...S0.classes, 'Yangi-A'], sched, leaders: { 'Yangi-A': leaderId } })).s, 200);
  const st = (await call('/api/state', { token: a.j.token })).j.state;
  assert.equal(st.classes.at(-1), 'Yangi-A'); assert.equal(st.leaders['Yangi-A'], leaderId);
  assert.equal((await sync(a.j.token, { classes: [...S0.classes, 'Yangi-A', 'yangi-a'] })).s, 400, 'nom takrori');
  assert.equal((await sync(a.j.token, { classes: [...S0.classes, '<b>x'] })).s, 400, 'noto‘g‘ri nom');
  assert.equal((await sync(a.j.token, { classes: S0.classes.filter(c => c !== '5-A') })).s, 400, 'o‘quvchili sinfni o‘chirib bo‘lmaydi');

  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==';
  assert.equal((await sync(a.j.token, { logoUp: { 'Yangi-A': png } })).s, 403, 'admin logo qo‘ya olmaydi');
  const l = await login({ role: 'teacher', name: lt.name, subject: lt.subj, pw: lt.pw });
  assert.equal(l.s, 200);
  assert.equal((await sync(l.j.token, { logoUp: { 'Yangi-A': png } })).s, 200, 'sinf rahbari logo qo‘yadi');
  assert.equal((await call('/api/state', { token: l.j.token })).j.state.logos['Yangi-A'], png);
  assert.equal((await sync(l.j.token, { logoUp: { '6-A': png } })).s, 403, 'boshqa sinf logosi');
  assert.equal((await sync(l.j.token, { logoUp: { 'Yangi-A': 'data:text/html;base64,PHNjcmlwdD4=' } })).s, 400, 'rasm bo‘lmagan fayl');
  assert.equal((await sync(l.j.token, { logoUp: { 'Yangi-A': '' } })).s, 200, 'logoni olib tashlash');
  assert.equal((await sync(l.j.token, { classes: [] })).s, 403, 'ustoz sinf qo‘sha olmaydi');

  assert.equal((await sync(a.j.token, { classes: S0.classes })).s, 200, 'bo‘sh sinfni o‘chirish');
  assert.equal(Object.hasOwn((await call('/api/state', { token: a.j.token })).j.state.leaders, 'Yangi-A'), false);
});

test('hujjatlar: faqat sinf rahbari belgilaydi, admin ko‘radi, o‘quvchi faqat o‘zini ko‘radi', async () => {
  const a = await login({ role: 'admin', phone: demo.admin.phone, pw: demo.admin.pw });
  const S0 = a.j.state, sync = (token, body) => call('/api/sync', { token, body });
  assert.ok(Object.keys(S0.docs).length > 100, 'admin hamma hujjatni ko‘radi');
  const leaderId = S0.leaders['5-A'], lt = S0.teachers.find(t => t.id === leaderId);
  const mine = S0.students.find(s => s.cls === '5-A'), other = S0.students.find(s => s.cls === '6-A');
  assert.equal((await sync(a.j.token, { docUp: { [mine.id]: ['ariza'] } })).s, 403, 'admin belgilay olmaydi');
  const l = await login({ role: 'teacher', name: lt.name, subject: lt.subj, pw: lt.pw });
  const ls = l.j.state;
  assert.ok(ls.students.some(s => s.cls === '5-A'));
  assert.ok(Object.keys(ls.docs).every(id => ls.students.find(s => String(s.id) === id).cls === '5-A'), 'rahbar faqat o‘z sinfi hujjatlarini oladi');
  assert.equal((await sync(l.j.token, { docUp: { [mine.id]: ['ariza', 'tibbiy'] } })).s, 200);
  assert.deepEqual((await call('/api/state', { token: l.j.token })).j.state.docs[mine.id].sort(), ['ariza', 'tibbiy']);
  assert.equal((await sync(l.j.token, { docUp: { [other.id]: ['ariza'] } })).s, 403, 'boshqa sinf');
  assert.equal((await sync(l.j.token, { docUp: { [mine.id]: ['soxta'] } })).s, 400, 'noma’lum hujjat turi');
  assert.deepEqual((await call('/api/state', { token: a.j.token })).j.state.docs[mine.id].sort(), ['ariza', 'tibbiy'], 'admin yangi holatni ko‘radi');
  const st = await login({ role: 'student', name: mine.name, phone: mine.phone, pw: mine.pw });
  assert.equal(st.s, 200);
  assert.deepEqual(Object.keys(st.j.state.docs), [String(mine.id)], 'o‘quvchi faqat o‘z hujjatini ko‘radi');
});

test('login cheklovi (10 xato)', async () => {
  let last; for (let i = 0; i < 12; i++) last = await login({ role: 'admin', phone: '901000000', pw: 'x' + i });
  assert.equal(last.s, 429);
});

