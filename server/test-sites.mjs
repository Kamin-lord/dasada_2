import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from './db.js';
import { createApp, seedGeneral } from './app.js';
import { SiteHub, slugify, normHost } from './sites.js';
import { http } from './test-http.mjs';

const dir = mkdtempSync(join(tmpdir(), 'dsd-'));
const tpl = mkdtempSync(join(tmpdir(), 'tpl-')); mkdirSync(join(tpl, 'dist')); writeFileSync(join(tpl, 'dist', 'index.html'), '<html>SITE</html>');
let srv, port, G, id, slug;
const call = (m, p, b, h = {}) => http(port, m, p, b, h);
const g = (m, p, b) => call(m, p, b, { authorization: 'Bearer ' + G });

test('slug va domen', () => {
  assert.equal(slugify('Al-Xorazmiy maktabi'), 'al-xorazmiy-maktabi');
  assert.equal(slugify('Bo‘z-2 maktab!'), 'boz-2-maktab');
  assert.equal(slugify('Мактаб'), 'maktab');
  assert.equal(normHost('https://Al-Xorazmiy.uz:443/x'), 'al-xorazmiy.uz');
  assert.equal(normHost('yomon domen'), null);
  assert.equal(normHost(''), '');
});

test('start', async () => {
  const db = openDb(':memory:');
  seedGeneral(db, { login: 'gen', pw: 'sirli123', N: 1024 });
  const hub = new SiteHub(db, { dataDir: dir, baseDomain: 'kundalik.uz', templateDir: tpl });
  srv = createApp(db, { secret: 'x'.repeat(32), hub }).listen(0);
  await new Promise(r => srv.once('listening', r));
  port = srv.address().port;
  G = (await call('POST', '/api/login', { login: 'gen', pw: 'sirli123' })).j.token;
});

test('sayt yaratish', async () => {
  assert.equal((await g('POST', '/api/g/schools', { name: 'Bez admin', createSite: true })).s, 400);
  const r = await g('POST', '/api/g/schools', { name: 'Al-Xorazmiy maktabi', createSite: true, host: 'al-xorazmiy.uz', admin: { name: 'Direktor', phone: '901234567', pw: 'parol123' } });
  assert.equal(r.s, 200); id = r.j.school.id; slug = r.j.school.slug;
  assert.equal(slug, 'al-xorazmiy-maktabi');
  assert.deepEqual(r.j.school.site.map(x => x.kind), ['domain', 'subdomain', 'path']);
  assert.equal((await g('POST', '/api/g/schools', { name: 'Boshqa', createSite: true, host: 'al-xorazmiy.uz', admin: { name: 'A', phone: '902222222', pw: 'parol123' } })).s, 400);
  assert.ok(existsSync(join(dir, 'sites', slug, 'kundalik.db')));
});

test('Host, subdomen va yo‘l orqali ochiladi', async () => {
  for (const h of ['al-xorazmiy.uz', slug + '.kundalik.uz']) {
    const s = await call('GET', '/api/site', null, { host: h });
    assert.equal(s.j.name, 'Al-Xorazmiy maktabi');
  }
  assert.equal((await call('GET', '/s/' + slug + '/api/site')).j.name, 'Al-Xorazmiy maktabi');
  assert.equal((await call('GET', '/api/site')).s, 404, 'DASADA o‘z domenida maktab API si yo‘q');
  const html = await fetch(`http://127.0.0.1:${port}/s/${slug}/`).then(r => r.text()); assert.match(html, /SITE/);
});

test('maktab admini kirishi (DASADA dagi parol bilan)', async () => {
  const L = (pw, h) => call('POST', '/api/login', { role: 'admin', phone: '90 123 45 67', pw }, { host: h });
  assert.equal((await L('xato', 'al-xorazmiy.uz')).s, 401);
  const r = await L('parol123', 'al-xorazmiy.uz'); assert.equal(r.s, 200);
  assert.equal(r.j.state.classes.length, 1); assert.equal(r.j.state.students.length, 0);
  // boshqa maktab tokeni bu yerda ishlamaydi (alohida sir)
  const r2 = await g('POST', '/api/g/schools', { name: 'Ikkinchi', createSite: true, admin: { name: 'B', phone: '903333333', pw: 'parol456' } });
  const tok = r.j.token;
  assert.equal((await call('GET', '/api/state', null, { host: r2.j.school.slug + '.kundalik.uz', authorization: 'Bearer ' + tok })).s, 401);
  // DASADA da parol almashsa — maktabda ham
  const det = (await g('GET', '/api/g/schools/' + id)).j; assert.equal(det.school.site.length, 3);
  const adm = det.admins[0];
  await g('POST', '/api/g/school-admins/' + adm.id + '/password', { pw: 'yangi-parol' });
  assert.equal((await L('parol123', 'al-xorazmiy.uz')).s, 401);
  assert.equal((await L('yangi-parol', 'al-xorazmiy.uz')).s, 200);
});

test('nom/logo, bloklash, jonli ma’lumot, o‘chirish', async () => {
  await g('PATCH', '/api/g/schools/' + id, { name: 'Yangi Nom', status: 'faol' });
  assert.equal((await call('GET', '/api/site', null, { host: 'al-xorazmiy.uz' })).j.name, 'Yangi Nom');
  const d = await g('GET', '/api/g/schools/' + id + '/data'); assert.equal(d.j.data.classes[0].name, '1-A');
  const l = (await g('GET', '/api/g/schools')).j.schools[0]; assert.equal(l.classes, 1); assert.equal(l.hosted, true);
  await g('PATCH', '/api/g/schools/' + id, { name: 'Yangi Nom', status: 'bloklangan' });
  assert.equal((await call('GET', '/api/site', null, { host: 'al-xorazmiy.uz' })).s, 403);
  const dl = await g('DELETE', '/api/g/schools/' + id, { confirm: 'sirli123' }); assert.equal(dl.s, 200, JSON.stringify(dl.j));
  assert.ok(readdirSync(join(dir, 'sites')).some(n => n.startsWith('_deleted-')));
});

test('mavjud maktabga sayt', async () => {
  const a = await g('POST', '/api/g/schools', { name: 'Eski maktab' });
  assert.equal((await g('POST', `/api/g/schools/${a.j.school.id}/site`, {})).s, 400, 'admin yo‘q');
  await g('POST', `/api/g/schools/${a.j.school.id}/admins`, { name: 'Dir', phone: '905555555', pw: 'parol789' });
  const r = await g('POST', `/api/g/schools/${a.j.school.id}/site`, {}); assert.equal(r.s, 200); assert.equal(r.j.school.slug, 'eski-maktab');
  const L = await call('POST', '/api/login', { role: 'admin', phone: '905555555', pw: 'parol789' }, { host: 'eski-maktab.kundalik.uz' }); assert.equal(L.s, 200);
});

test('Yordam: maktabdan general adminga murojaat yetib boradi', async () => {
  const r = await g('POST', '/api/g/schools', { name: 'Yordam maktabi', createSite: true, admin: { name: 'D', phone: '906666666', pw: 'parol000' } });
  const sl = r.j.school.slug, h = { host: sl + '.kundalik.uz' };
  const L = await call('POST', '/api/login', { role: 'admin', phone: '906666666', pw: 'parol000' }, h);
  const A = { ...h, authorization: 'Bearer ' + L.j.token };
  assert.equal((await call('POST', '/api/support/tickets', { title: 'Baho chiqmayapti', text: 'Matn' }, h)).s, 401, 'kirmasdan yozib bo‘lmaydi');
  const c = await call('POST', '/api/support/tickets', { title: 'Baho chiqmayapti', text: '7-A da baholar ko‘rinmayapti', category: 'texnik', priority: 'yuqori' }, A);
  assert.equal(c.s, 200, JSON.stringify(c.j));
  const gl = (await g('GET', '/api/g/tickets')).j.tickets.find(t => t.id === c.j.id);
  assert.ok(gl, 'general adminda ko‘rinadi'); assert.equal(gl.school, 'Yordam maktabi'); assert.equal(gl.unread, true);
  await g('POST', `/api/g/tickets/${c.j.id}/reply`, { text: 'Ko‘ryapmiz' });
  const sl2 = await call('GET', '/api/support/tickets', null, A); assert.equal(sl2.j.unread, 1);
  const th = await call('GET', '/api/support/tickets/' + c.j.id, null, A);
  assert.deepEqual(th.j.messages.map(m => m.side), ['school', 'general']);
  assert.equal((await call('POST', `/api/support/tickets/${c.j.id}/reply`, { text: 'Rahmat' }, A)).s, 200);
  assert.equal((await call('POST', '/api/support/heartbeat', {}, A)).s, 404, 'boshqa yo‘llar yopiq');
});

test('stop', () => srv.close());
