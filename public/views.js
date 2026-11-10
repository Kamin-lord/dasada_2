'use strict';
/* DASADA — ko‘rinishlar (sahifalar). core.js dan keyin yuklanadi. */
window.addEventListener('hashchange', render);
let counters = { unread: 0 }, TEAM = {}, PROJ = {};
const projNew = () => Object.values(PROJ).filter(p => !p.archived && p.chatLast > (+localStorage.getItem('dsd-pc-' + me.id + '-' + p.id) || 0)).length;
const who = id => TEAM[id] || { id, name: 'Noma’lum', role: 'manager' };
const pav = (id, size = 34) => avatar(who(id), size);
const chatSeen = () => { try { return +localStorage.getItem('dsd-chat-' + me.id) || 0; } catch { return 0; } };
const chatNew = () => (counters.chatLast || 0) > chatSeen() && route()[0] !== 'chat' ? '•' : '';
const route = () => (location.hash.replace('#/', '') || 'home').split('/');
const pill = (cls, t) => `<span class="pill ${cls}">${esc(t)}</span>`;
const tile = (cls, icon, n, label, dec) => `<div class="card tile tilt ${cls}"><span class="ti">${ic(icon, 24)}</span><div><b data-count="${n ?? 0}" ${dec ? `data-dec="${dec}"` : ''}>0</b><span class="l">${label}</span></div></div>`;
const empty = (e, t, extra = '') => `<div class="empty"><span class="ei">${e}</span><p>${t}</p>${extra}</div>`;
const pageFoot = el => { if (!$('.pfoot', el)) el.insertAdjacentHTML('beforeend', '<footer class="pfoot"><img src="logo-icon.png" alt=""><span>DASADA Studios · Jamoa, loyihalar va vazifalar</span></footer>'); };
const skeleton = () => `<div class="loadlogo"><img src="logo-icon.png" alt=""></div><div class="skel"></div><div class="skel s2"></div><div class="skel s3"></div>`;

async function render() {
  const app = $('#app');
  if (!token) return loginView(app);
  let [page, a1, a2] = route(); if (page === 'staff') { location.hash = '#/workers'; page = 'workers'; }
  Bar.start();
  try { const tm = await api('/g/team'); TEAM = Object.fromEntries(tm.team.map(x => [x.id, x])); } catch { /* ignore */ }
  try { const pj = await api('/g/projects'); PROJ = Object.fromEntries(pj.projects.map(x => [x.id, x])); } catch { /* ignore */ }
  try { counters = await api('/g/overview'); } catch (e) { if (!token) return; counters = { unread: 0 }; }
  const nav = [['home', 'Bosh sahifa', 'home', true], ['projects', 'Bo‘limlar', 'folder', true], ['workers', 'Ishchilar', 'staff', true], ['dm', 'Lichka', 'mail', true], ['chat', 'Jamoa chati', 'ticket', true], ['audit', 'Jurnal', 'log', isOwner()], ['settings', 'Sozlama', 'cog', true]].filter(x => x[3]);
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><img class="blogo" src="logo-icon.png" alt="DASADA Studios"><div><b>DASADA</b><small>STUDIOS · Admin</small></div></div>
      <button class="srch" data-act="pal">${ic('search', 16)}<span>Qidirish…</span><kbd>Ctrl K</kbd></button>
      <nav class="nav">${nav.map(([k, t, i]) => `<a href="#/${k}" class="${page === k || (k === 'projects' && ['schools', 'tickets', 'news', 'tasks', 'archive', 'groups'].includes(page)) ? 'on' : ''}">${ic(i, 20)}<span>${t}</span>${k === 'dm' && counters.dmUnread ? `<span class="bd">${counters.dmUnread}</span>` : ''}${k === 'projects' && (projNew() + (counters.taskNew || 0) + (counters.taskReview || 0) + (counters.taskRework || 0) + ((can('tickets') && counters.unread) || 0)) ? `<span class="bd">${projNew() + (counters.taskNew || 0) + (counters.taskReview || 0) + (counters.taskRework || 0) + ((can('tickets') && counters.unread) || 0)}</span>` : ''}${k === 'chat' && chatNew() ? `<span class="bd">${chatNew()}</span>` : ''}</a>`).join('')}</nav>
      <div class="sp"></div>
      <div class="clk" id="clk"><b>${clockText()[0]}</b><small>${clockText()[1]}</small></div>
      <div class="sfoot"><img src="logo-icon.png" alt=""><span>DASADA Studios<small>© 2026 · v16</small></span></div>
      <div class="me" data-act="mylogo" title="Rasmni almashtirish" style="cursor:pointer">${pav(me.id, 40)}<div><b>${esc(me.name)}</b><small>${esc(roleL(me.role))}</small></div></div>
      <div class="row" style="margin-top:8px"><button class="btn o sm out" data-act="theme" title="Mavzu">${ic('moon', 16)}</button><button class="btn o sm out" data-act="snd" title="Tovush">${Sfx.on ? '🔊' : '🔇'}</button><button class="btn o sm out sp" data-act="logout">${ic('out', 16)} Chiqish</button></div>
    </aside>
    <main class="main"><div id="page" class="page">${skeleton()}</div></main></div>`;
  $('[data-act=logout]').onclick = () => { setSession(null); render(); };
  $('[data-act=theme]').onclick = toggleTheme;
  $('[data-act=pal]').onclick = palette;
  $('[data-act=mylogo]').onclick = () => pickLogo(d => api('/g/me/logo', 'POST', { data: d }).then(() => { toast('Rasm saqlandi ✓'); render(); }).catch(fail));
  $('[data-act=snd]').onclick = e => { e.currentTarget.textContent = Sfx.toggle() ? '🔊' : '🔇'; };
  const el = $('#page');
  try {
    const V = { projects: projectsView, groups: groupView, archive: archiveView, dm: dmView, workers: workersView, tasks: tasksView, chat: chatView, home: homeView, schools: schoolsView, tickets: ticketsView, news: newsView, audit: auditView, settings: settingsView }[page] || homeView;
    if (SCHOOL_SEC.includes(page)) { el.innerHTML = '<div id="sec"></div>'; const host = document.createElement('div'); host.id = 'secbody'; el.appendChild(host); $('#sec').outerHTML = schoolBar(page); await V(host, a1, a2); countUp(el); pageFoot(el); Bar.done(); return; }
    await V(el, a1, a2);
    countUp(el); pageFoot(el);
    Bar.done();
  } catch (e) { if (token) el.innerHTML = `<div class="card">${empty('⚠️', esc(e.message))}</div>`; }
}

/* ───────── kirish ───────── */
const SCHOOL_SEC = ['schools', 'tickets', 'news'];
const schoolBar = page => `<div class="secbar"><a class="back" href="#/projects">← Bo‘limlar</a><div class="sec-t"><span class="pc-ic" style="--pc:#14b8a6">🏫</span><div><b>Maktablar bo‘limi</b><small>Al-Kundalik maktablari, ularning murojaatlari va e’lonlar</small></div></div>
  <div class="tabs">${[['schools', 'Maktablar', can('schools')], ['tickets', 'Muammolar', can('tickets')], ['news', 'E’lonlar', can('news')]].filter(x => x[2]).map(([k, t]) => `<a href="#/${k}" class="${page === k ? 'on' : ''}">${t}${k === 'tickets' && counters.unread ? ` <span class="bd" style="position:static">${counters.unread}</span>` : ''}</a>`).join('')}</div></div>`;
function loginView(app) {
  app.innerHTML = `<div class="login">
    <section class="lhero"><img class="llogo" src="logo-full.png" alt="DASADA Studios">
      <p>Jamoa, loyihalar va vazifalar — bitta joyda. Bo‘limlarni boshqaring, ishlarni taqsimlang, hamkasblar bilan yozishing.</p>
      <ul><li><i>${ic('folder', 18)}</i> Loyihalar (bo‘limlar) va jarayon</li><li><i>${ic('task', 18)}</i> Vazifalar, to-do va tekshiruv</li><li><i>${ic('mail', 18)}</i> Jamoa chati va lichka</li><li><i>${ic('lock', 18)}</i> Parol bilan himoyalangan</li></ul></section>
    <section class="lform"><form id="lf">
      <img class="flogo" src="logo-icon.png" alt="DASADA Studios"><h2>Xush kelibsiz</h2><p class="muted" style="margin:0 0 22px">Davom etish uchun login va parolingizni kiriting</p>
      <label class="f"><span>Login</span><input name="login" autocomplete="username" required autofocus></label>
      ${pwField('pw', 'Parol').replace('autocomplete="new-password"', 'autocomplete="current-password" required')}
      <p id="le" style="color:var(--err);margin:0 0 12px;font-weight:700;min-height:1.2em"></p>
      <button class="btn" style="width:100%;padding:14px">Kirish →</button><p class="lfoot"><img src="logo-icon.png" alt="">DASADA Studios © 2026</p></form></section></div>`;
  wireEyes(app); particles($('.lhero'));
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), btn = $('button.btn', e.target); btn.disabled = true;
    try { const r = await api('/login', 'POST', { login: f.get('login'), pw: f.get('pw') }); setSession(r.token, r.staff); location.hash = '#/home'; render(); }
    catch (er) { $('#le').textContent = er.message; $('#lf').classList.remove('shake'); void $('#lf').offsetWidth; $('#lf').classList.add('shake'); } finally { btn.disabled = false; }
  };
}

/* ───────── grafiklar ───────── */
function barChart(days) {
  const max = Math.max(1, ...days.map(d => d.n)), W = 560, H = 150, bw = W / days.length;
  return `<svg viewBox="0 0 ${W} ${H + 26}" class="chart" role="img" aria-label="So‘nggi 14 kunlik murojaatlar">
    ${[0, .5, 1].map(p => `<line x1="0" x2="${W}" y1="${H - H * p}" y2="${H - H * p}" class="grid-l"/>`).join('')}
    ${days.map((d, i) => { const h = Math.max(d.n ? 6 : 2, d.n / max * (H - 14)); return `<g><rect class="bar" style="animation-delay:${i * 45}ms" x="${i * bw + bw * .2}" y="${H - h}" width="${bw * .6}" height="${h}" rx="5"><title>${d.d}: ${d.n}</title></rect>${d.n ? `<text x="${i * bw + bw / 2}" y="${H - h - 5}" class="bt">${d.n}</text>` : ''}<text x="${i * bw + bw / 2}" y="${H + 17}" class="bl">${d.d.slice(8)}</text></g>`; }).join('')}</svg>`;
}
function donut(data, colors, labels) {
  const tot = Object.values(data).reduce((a, b) => a + b, 0), R = 54, C = 2 * Math.PI * R; let off = 0;
  const segs = Object.entries(data).map(([k, v], i) => { const len = tot ? v / tot * C : 0; const s = `<circle class="seg" r="${R}" cx="70" cy="70" fill="none" stroke="${colors[k]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" style="animation-delay:${i * 120}ms"><title>${labels[k]}: ${v}</title></circle>`; off += len; return s; }).join('');
  return `<div class="donut-w"><svg viewBox="0 0 140 140" class="donut"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--line)" stroke-width="18"/><g transform="rotate(-90 70 70)">${segs}</g><text x="70" y="68" text-anchor="middle" class="dn">${tot}</text><text x="70" y="86" text-anchor="middle" class="dl">jami</text></svg>
    <ul class="legend">${Object.keys(data).map(k => `<li><i style="background:${colors[k]}"></i>${labels[k]} <b>${data[k]}</b></li>`).join('')}</ul></div>`;
}
const hbars = (rows, color = 'var(--grad)') => { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<div class="hb">${rows.map(([k, v], i) => `<div class="hbr"><span>${esc(k)}</span><div class="hbt"><i style="width:${v / max * 100}%;background:${color};animation-delay:${i * 80}ms"></i></div><b>${v}</b></div>`).join('')}</div>` : '<p class="muted small">Ma’lumot yo‘q</p>'; };

const fmtMin = m => m == null ? '—' : m < 60 ? Math.round(m) + ' daq' : m < 1440 ? (m / 60).toFixed(1) + ' soat' : (m / 1440).toFixed(1) + ' kun';
const spark = v => { const W = 120, H = 34, mx = Math.max(1, ...v), pts = v.map((n, i) => [i / Math.max(1, v.length - 1) * W, H - 3 - n / mx * (H - 8)]); const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' '); return `<svg class="spark" viewBox="0 0 ${W} ${H}"><path d="${d} L${W} ${H} L0 ${H}Z" class="sa"/><path d="${d}" class="sl" pathLength="1"/></svg>`; };
const waiting = t => { if (!['yangi', 'jarayonda'].includes(t.status)) return ''; const h = (Date.now() - new Date(t.updatedAt).getTime()) / 36e5; return pill(h > 24 ? 'err' : h > 6 ? 'warn' : 'gray', '⏱ ' + (h < 1 ? Math.round(h * 60) + ' daq' : h < 48 ? Math.round(h) + ' soat' : Math.round(h / 24) + ' kun')); };

/* ───────── bosh sahifa ───────── */
async function homeView(el) {
  const D = await api('/g/dashboard'), c = D.counts, hr = +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  const hello = hr < 5 ? 'Xayrli tun' : hr < 12 ? 'Xayrli tong' : hr < 18 ? 'Xayrli kun' : 'Xayrli kech';
  const running = c.yangi + c.jarayonda + c.tekshiruv;
  const trow = t => `<a class="hrow" href="#/projects/${t.project}/vazifalar">${pav(t.assignee, 34)}<span class="hn"><b>${esc(t.title)}</b><small>${t.pr ? esc(t.pr.icon + ' ' + t.pr.name) : ''} · ${esc(who(t.assignee).name)}</small></span>${pill(TS_C[t.status], TS[t.status])}${dueChip(t)}</a>`;
  el.innerHTML = `
  <div class="card hero hhero"><img class="hwm" src="logo-icon.png" alt=""><h2>${hello}, ${esc(me.name.split(' ')[0])}!</h2>
    <p>${D.projects.length ? `<b>${D.projects.length}</b> ta faol loyiha · <b>${c.jarayonda}</b> ta vazifa ishlanmoqda${c.tekshiruv ? ` · <b>${c.tekshiruv}</b> ta tekshiruv kutmoqda` : ''}${D.overdue ? ` · <b class="bad">${D.overdue}</b> ta muddati o‘tgan` : ''}` : 'Hozircha sizga biriktirilgan loyiha yo‘q.'}</p>
    <div class="row" style="margin-top:14px;flex-wrap:wrap"><a class="btn g" href="#/projects">${ic('folder', 18)} Bo‘limlar</a>${isOwner() ? '<a class="btn o" href="#/projects" data-newp>+ Yangi bo‘lim</a>' : ''}<a class="btn o" href="#/dm">${ic('mail', 18)} Lichka</a></div></div>
  <div class="grid g6">${tile('', 'folder', D.projects.length, 'Faol loyiha')}${tile('warn', 'task', c.jarayonda, 'Razrabotkada')}${tile('gold', 'search', c.tekshiruv, 'Tekshiruvda')}${tile('ok', 'task', c.tayyor, 'Tayyor vazifa')}${tile('err', 'plus', c.yangi, 'Yangi vazifa')}${tile('blue', 'log', D.overdue, 'Muddati o‘tgan')}</div>
  <div class="cols"><div class="card"><h3>Bajarilgan ishlar — so‘nggi 14 kun</h3>${barChart(D.perDay)}<p class="muted small" style="margin:6px 0 0">Tayyor bo‘lgan vazifalar</p></div>
    <div class="card"><h3>Ishlar holati</h3>${donut({ yangi: c.yangi, jarayonda: c.jarayonda, tekshiruv: c.tekshiruv, tayyor: c.tayyor }, { yangi: '#3b82f6', jarayonda: '#f59e0b', tekshiruv: '#a855f7', tayyor: '#16a34a' }, TS)}</div></div>
  <div class="row" style="margin:6px 0 10px"><h3 style="margin:0">Ketayotgan loyihalar</h3><span class="sp"></span><a class="btn o sm" href="#/projects">Hammasi</a></div>
  ${D.projects.length ? `<div class="pgrid">${D.projects.slice(0, 6).map(projCard).join('')}</div>` : `<div class="card">${empty('📁', isOwner() ? 'Hali bo‘lim yo‘q. “Bo‘limlar”dan birinchi loyihani yarating.' : 'Siz hali hech qaysi bo‘limga qo‘shilmagansiz.')}</div>`}
  <div class="cols" style="margin-top:16px">
    <div class="card"><h3>🛠️ Hozir ishlanayotgan vazifalar</h3>${D.working.length ? D.working.map(trow).join('') : '<p class="muted small">Hozir ishlanayotgan vazifa yo‘q.</p>'}</div>
    <div class="card"><h3>🎯 Mening vazifalarim</h3>${D.my.length ? D.my.map(trow).join('') : '<p class="muted small">Sizda ochiq vazifa yo‘q — hammasi tayyor! 🎉</p>'}
      ${D.review.length ? `<h3 style="margin-top:18px">🔍 Tekshiruv kutmoqda</h3>${D.review.map(trow).join('')}` : ''}</div></div>
  <div class="cols">
    <div class="card"><h3>⚡ Jonli faollik</h3>${D.activity.length ? `<ul class="feed">${D.activity.map(a => `<li><i></i><span><b>${esc(a.who)}</b> ${esc(a.text)}<small>${esc(a.pr.icon + ' ' + a.pr.name)} · ${when(a.at)}</small></span></li>`).join('')}</ul>` : '<p class="muted small">Hali faollik yo‘q.</p>'}</div></div>`;
  const np = $('[data-newp]'); if (np) np.onclick = e => { e.preventDefault(); location.hash = '#/projects'; setTimeout(() => $('#np')?.click(), 500); };
}

/* ───────── maktablar ro‘yxati ───────── */
async function schoolsView(el, arg, tab) {
  if (!can('schools')) return el.innerHTML = `<div class="card">${empty('🔒', 'Bu bo‘limga ruxsatingiz yo‘q.')}</div>`;
  if (arg === 'new') { history.replaceState(null, '', '#/schools'); setTimeout(() => schoolForm(null, () => render()), 0); }
  else if (arg) return schoolDetail(el, +arg, tab || 'info');
  const { schools } = await api('/g/schools');
  const f = schoolsView.f || (schoolsView.f = { q: '', st: '' });
  const draw = () => {
    const l = schools.filter(s => (s.name + ' ' + s.region).toLowerCase().includes(f.q.toLowerCase()) && (!f.st || (f.st === 'onlayn' ? s.online : s.status === f.st)));
    $('#sl').innerHTML = l.length ? l.map((s, i) => `<div class="sc tilt ${s.status === 'faol' ? '' : 'blk'}" data-go="${s.id}" style="animation-delay:${Math.min(i, 12) * 45}ms" tabindex="0" role="button">
      <div class="row nowrap">${avatar(s)}<div style="min-width:0;flex:1"><h3>${esc(s.name)}</h3><div class="muted small">${esc(s.region) || '—'}${s.adminName ? ' · ' + esc(s.adminName) : ''}</div></div>
        ${s.status === 'faol' ? '' : pill('err', 'Bloklangan')}</div>
      <div class="stats"><div><b>${nf(s.students)}</b><small>O‘QUVCHI</small></div><div><b>${nf(s.teachers)}</b><small>USTOZ</small></div>
        <div><b>${s.open || 0}</b><small>MUAMMO</small></div><div class="r"><span class="dot ${s.online ? 'on' : ''}"></span><br><small class="muted">${s.online ? 'onlayn' : s.lastSeen ? ago(s.lastSeen) : 'ulanmagan'}</small></div></div></div>`).join('')
      : `<div class="card empty" style="grid-column:1/-1"><span class="ei">🏫</span><p>${schools.length ? 'Maktab topilmadi.' : 'Hali maktab yo‘q. “+ Maktab qo‘shish” tugmasini bosing.'}</p></div>`;
    $$('[data-go]', $('#sl')).forEach(r => { const go = () => { location.hash = '#/schools/' + r.dataset.go; }; r.onclick = go; r.onkeydown = e => e.key === 'Enter' && go(); });
  };
  const chip = (v, t) => `<button class="chip ${f.st === v ? 'on' : ''}" data-st="${v}">${t}</button>`;
  el.innerHTML = `<div class="top"><h2>Maktablar <span class="muted" style="font-size:1rem">(${schools.length})</span></h2><span class="sp"></span>
    <input class="search" id="sq" placeholder="Qidirish…" aria-label="Qidirish" value="${esc(f.q)}"><button class="btn" id="add">${ic('plus', 18)} Maktab qo‘shish</button></div>
    <div class="chips">${chip('', 'Hammasi')}${chip('faol', 'Faol')}${chip('bloklangan', 'Bloklangan')}${chip('onlayn', 'Onlayn')}</div><div class="sgrid" id="sl"></div>`;
  $('#sq').oninput = e => { f.q = e.target.value; draw(); };
  $$('[data-st]', el).forEach(c => c.onclick = () => { f.st = c.dataset.st; $$('[data-st]', el).forEach(x => x.classList.toggle('on', x === c)); draw(); });
  $('#add').onclick = () => schoolForm(null, () => render());
  draw();
}

const SCHOOL_FIELDS = (s = {}) => `
  <label class="f"><span>Maktab nomi *</span><input name="name" required maxlength="120" value="${esc(s.name)}" placeholder="Masalan: 12-umumiy o‘rta maktab"></label>
  <div class="two"><label class="f"><span>Hudud</span><input name="region" maxlength="80" value="${esc(s.region)}" placeholder="Farg‘ona viloyati"></label>
  <label class="f"><span>Maktab telefoni</span><input name="phone" maxlength="30" value="${esc(s.phone)}" placeholder="+998 90 123 45 67"></label></div>
  <label class="f"><span>Manzil</span><input name="address" maxlength="200" value="${esc(s.address)}"></label>
  <label class="f"><span>Ichki izoh</span><input name="note" maxlength="500" value="${esc(s.note)}"></label>`;

function schoolForm(s, done) {
  let logo = null;
  const isNew = !s;
  modal(`<h3>${ic('school', 22)} ${isNew ? 'Yangi maktab qo‘shish' : 'Maktabni tahrirlash'}</h3><form id="sf">
    ${isNew ? `<div class="logo-up"><div id="lp" class="ava big ph">${ic('school', 28)}</div><div><b>Maktab logosi</b><div class="muted small">PNG, JPG yoki WEBP (ixtiyoriy)</div><button type="button" class="btn o sm" id="lb" style="margin-top:6px">Rasm tanlash</button></div></div>` : ''}
    ${SCHOOL_FIELDS(s || {})}
    ${isNew && can('admins') ? `<div class="sect"><h4>${ic('user', 18)} Maktab admini</h4><p class="muted small" style="margin-top:0">Admin telefon raqami va paroli bilan keyinchalik maktab saytiga kiradi. Parolni bo‘sh qoldirsangiz, tizim o‘zi yaratadi.</p>
      <div class="two"><label class="f"><span>Ism familiya</span><input name="a_name" maxlength="80"></label><label class="f"><span>Telefon</span><input name="a_phone" inputmode="tel" placeholder="90 123 45 67"></label></div>
      ${pwField('a_pw', 'Parol (kamida 6 belgi)', 'bo‘sh = avtomatik')}</div>` : ''}
    <div class="row" style="margin-top:6px"><button class="btn">${isNew ? 'Maktabni qo‘shish' : 'Saqlash'}</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
    wireEyes(bg);
    if (isNew) $('#lb', bg).onclick = () => pickLogo(d => { logo = d; $('#lp', bg).outerHTML = `<img id="lp" class="ava big img" src="${esc(d)}" alt="">`; });
    $('#sf', bg).onsubmit = async e => {
      e.preventDefault();
      const b = Object.fromEntries(new FormData(e.target)), btn = $('button.btn', e.target); btn.disabled = true;
      try {
        if (!isNew) { await api('/g/schools/' + s.id, 'PATCH', b); close(); toast('Saqlandi ✓'); return done(); }
        const body = { name: b.name, region: b.region, phone: b.phone, address: b.address, note: b.note, logo };
        if (b.a_name || b.a_phone || b.a_pw) body.admin = { name: b.a_name, phone: b.a_phone, pw: b.a_pw };
        const r = await api('/g/schools', 'POST', body); close(); confetti(); createdModal(r, done);
      } catch (er) { fail(er); btn.disabled = false; }
    };
  });
}
const codeOf = key => location.origin + '#' + key;
function createdModal(r, done) {
  modal(`<h3>🎉 “${esc(r.school.name)}” qo‘shildi!</h3>
    ${r.admin ? `<div class="sect"><h4>${ic('user', 18)} Maktab admini</h4>${copyRow('Ism', r.admin.name)}${copyRow('Telefon', '+998 ' + r.admin.phone)}${copyRow('Parol', r.admin.password)}
      <p class="small muted" style="margin-bottom:0">Parol faqat hozir ko‘rinadi. Keyin “Yangi parol” orqali almashtirish mumkin.</p></div>` : ''}
    <div class="sect"><h4>${ic('globe', 18)} Server ulanish kodi</h4><p class="muted small" style="margin-top:0">Maktab sayti ulanganda kerak bo‘ladi (Al-Kundalik → Yordam bo‘limiga joylanadi).</p>
      <button class="code" type="button" data-copy="${esc(codeOf(r.key))}">${esc(codeOf(r.key))}</button></div>
    <div class="warnbox">Maktab sayti hozircha ochilmaydi — admin hisobi saqlandi va sayt tayyor bo‘lganda ishlatiladi.</div>
    <div class="row"><button class="btn" data-close>Tayyor</button></div>`, bg => { wireCopy(bg); $$('[data-close]', bg).forEach(b => b.addEventListener('click', done)); });
}

/* ───────── maktab sahifasi ───────── */
async function schoolDetail(el, id, tab) {
  const { school: s, tickets, admins } = await api('/g/schools/' + id);
  const tabs = [['info', 'Umumiy', true], ['users', 'Foydalanuvchilar', can('users')], ['admins', 'Adminlar', can('admins')], ['tickets', `Murojaatlar${tickets.length ? ' (' + tickets.length + ')' : ''}`, true]].filter(x => x[2]);
  el.innerHTML = `<div class="top"><a class="btn o sm" href="#/schools">← Maktablar</a></div>
    <div class="card sh-head"><div class="row nowrap">${avatar(s, 64)}<div style="min-width:0;flex:1"><h2 style="margin:0">${esc(s.name)}</h2><div class="muted">${esc(s.region) || '—'} ${s.address ? '· ' + esc(s.address) : ''}</div>
      <div class="row" style="margin-top:8px">${s.status === 'faol' ? pill('ok', 'Faol') : pill('err', 'Bloklangan')}${pill('gray', s.online ? '● onlayn' : 'oxirgi signal: ' + ago(s.lastSeen))}${s.demo ? pill('warn', 'Namuna ma’lumot') : ''}</div></div></div></div>
    <div class="tabs">${tabs.map(([k, t]) => `<a href="#/schools/${id}/${k}" class="${tab === k ? 'on' : ''}">${t}</a>`).join('')}</div><div id="tb" class="page"></div>`;
  const tb = $('#tb');
  if (tab === 'users' && can('users')) return usersTab(tb, s);
  if (tab === 'admins' && can('admins')) return adminsTab(tb, s, admins);
  if (tab === 'tickets') { tb.innerHTML = `<div class="card">${tickets.length ? tickets.map(t => ticketRow({ ...t, school: s.name })).join('') : empty('📭', 'Bu maktabdan murojaat yo‘q.')}</div>`; return bindTickets(tb); }
  infoTab(tb, s, id);
}

function infoTab(tb, s, id) {
  tb.innerHTML = `
  <div class="grid">${tile('blue', 'kids', s.students, 'O‘quvchi')}${tile('gold', 'teach', s.teachers, 'Ustoz')}${tile('', 'school', s.classes, 'Sinf')}</div>
  <div class="cols">
    <div class="card"><div class="row"><h3 style="margin:0">Ma’lumotlar</h3><span class="sp"></span><button class="btn o sm" id="ed">Tahrirlash</button></div>
      <dl class="dl">${[['Hudud', s.region], ['Manzil', s.address], ['Telefon', s.phone], ['Qo‘shilgan', when(s.createdAt)], ['Versiya', s.version], ['Izoh', s.note]].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v) || '—'}</dd>`).join('')}</dl></div>
    <div class="card"><h3>Logo</h3><div class="logo-up">${s.logo ? `<img class="ava big img" src="${esc(s.logo)}" alt="">` : `<div class="ava big ph">${ic('school', 28)}</div>`}
      <div><button class="btn sm" id="lg">${s.logo ? 'Logoni almashtirish' : 'Logo qo‘yish'}</button> ${s.logo ? '<button class="btn o sm" id="lgd">Olib tashlash</button>' : ''}<div class="muted small" style="margin-top:6px">Rasm avtomatik 256×256 ga moslanadi.</div></div></div></div>
  </div>
  <div class="card site-card"><div class="row"><span class="ti big">${ic('globe', 26)}</span><div style="flex:1;min-width:200px"><h3 style="margin:0">Maktab sayti</h3><div class="muted">Maktabning o‘z Al-Kundalik sayti hozircha ochilmagan. Admin hisoblari saqlanadi va sayt tayyor bo‘lganda ishlaydi.</div></div>
    <button class="btn o" disabled title="Tez orada">Saytga kirish — tez orada</button></div></div>
  <div class="card"><h3>Server aloqasi</h3><p class="muted small">Maktab serveri ulanganda foydalanuvchilar ma’lumoti shu yerga kelib turadi. Ulanish kodi oxiri: <b>…${esc(s.keyHint)}</b></p>
    <div class="row"><button class="btn o sm" id="rk">Yangi ulanish kodi</button><button class="btn o sm" id="bl">${s.status === 'faol' ? 'Bloklash' : 'Blokdan chiqarish'}</button><span class="sp"></span><button class="btn d sm" id="dl">Maktabni o‘chirish</button></div></div>`;
  $('#ed', tb).onclick = () => schoolForm(s, () => render());
  $('#lg', tb).onclick = () => pickLogo(d => api(`/g/schools/${id}/logo`, 'POST', { data: d }).then(() => { toast('Logo saqlandi ✓'); render(); }).catch(fail));
  const lgd = $('#lgd', tb); if (lgd) lgd.onclick = () => api(`/g/schools/${id}/logo`, 'DELETE').then(() => render()).catch(fail);
  $('#bl', tb).onclick = () => api('/g/schools/' + id, 'PATCH', { status: s.status === 'faol' ? 'bloklangan' : 'faol' }).then(() => { toast('Holat o‘zgardi'); render(); }).catch(fail);
  $('#rk', tb).onclick = async () => {
    const pw = await askPassword('Yangi ulanish kodi', 'Eski kod darhol ishlamay qoladi. Davom etish uchun parolingizni kiriting.'); if (!pw) return;
    try { const r = await api(`/g/schools/${id}/key`, 'POST', { confirm: pw }); modal(`<h3>Yangi kod</h3><button class="code" type="button" data-copy="${esc(codeOf(r.key))}">${esc(codeOf(r.key))}</button><p class="muted small">Bosing — nusxalanadi. Kod faqat hozir ko‘rinadi.</p><button class="btn" data-close>Yopish</button>`, wireCopy); } catch (e) { fail(e); }
  };
  $('#dl', tb).onclick = async () => {
    const pw = await askPassword('Maktabni o‘chirish', `“${s.name}”, uning adminlari va barcha murojaatlari o‘chadi. Qaytarib bo‘lmaydi.`, 'Ha, o‘chirish'); if (!pw) return;
    api('/g/schools/' + id, 'DELETE', { confirm: pw }).then(() => { toast('O‘chirildi'); location.hash = '#/schools'; }).catch(fail);
  };
}

/* — foydalanuvchilar (maktab ma’lumotlari nusxasi) — */
async function usersTab(tb, s) {
  const { data, at, demo } = await api(`/g/schools/${s.id}/data`);
  if (!data) {
    tb.innerHTML = `<div class="card">${empty('🛰️', 'Bu maktabning ma’lumoti hali kelmagan. Maktab serveri ulanganda o‘quvchi, ustoz va sinflar shu yerda paydo bo‘ladi.',
      isOwner() || can('users') ? '<button class="btn o" id="dm">Namuna ma’lumot bilan ko‘rish</button>' : '')}</div>`;
    const b = $('#dm', tb); if (b) b.onclick = () => api(`/g/schools/${s.id}/demo-data`, 'POST').then(() => { toast('Namuna ma’lumot yuklandi'); render(); }).catch(fail);
    return;
  }
  const st = usersTab.st || (usersTab.st = { sub: 'students', q: '', cls: '', sort: 'name', miss: false });
  const classes = [...new Set(data.students.map(x => x.cls))].sort((a, b) => a.localeCompare(b, 'uz', { numeric: true }));
  const missTotal = data.students.filter(x => x.miss.length).length;
  const avgAll = data.students.filter(x => x.avg != null);
  tb.innerHTML = `<div class="grid">${tile('blue', 'kids', data.students.length, 'O‘quvchi')}${tile('gold', 'teach', data.teachers.length, 'Ustoz')}${tile('', 'school', data.classes.length, 'Sinf')}
    ${tile('ok', 'check', avgAll.length ? avgAll.reduce((a, b) => a + b.avg, 0) / avgAll.length : 0, 'O‘rtacha baho', 1)}${tile(missTotal ? 'warn' : 'ok', 'doc', missTotal, 'Hujjati to‘liq emas')}</div>
    <div class="card"><div class="row"><div class="chips" style="margin:0">${[['students', 'O‘quvchilar'], ['teachers', 'Ustozlar'], ['classes', 'Sinflar'], ['docs', 'Hujjatlar']].map(([k, t]) => `<button class="chip ${st.sub === k ? 'on' : ''}" data-sub="${k}">${t}</button>`).join('')}</div>
      <span class="sp"></span><span class="muted small">Yangilangan: ${at ? ago(at) : '—'}${demo ? ' · namuna' : ''}</span></div>
      <div class="row" style="margin:12px 0"><input class="search" id="uq" placeholder="Ism, telefon yoki sinf…" value="${esc(st.q)}">
      ${st.sub === 'students' || st.sub === 'docs' ? `<select id="uc" style="width:auto"><option value="">Barcha sinflar</option>${classes.map(c => `<option ${c === st.cls ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
      ${st.sub === 'students' ? `<select id="us" style="width:auto"><option value="name" ${st.sort === 'name' ? 'selected' : ''}>Ism bo‘yicha</option><option value="avg" ${st.sort === 'avg' ? 'selected' : ''}>Baho (yuqori)</option><option value="att" ${st.sort === 'att' ? 'selected' : ''}>Davomat (past)</option></select>` : ''}
      <span class="sp"></span><button class="btn o sm" id="ex">CSV yuklab olish</button></div><div id="ut" class="wrap"></div></div>`;
  const body = $('#ut', tb); let exportRows = [];
  const draw = () => {
    const q = st.q.toLowerCase(), has = x => !q || Object.values(x).join(' ').toLowerCase().includes(q);
    if (st.sub === 'students') {
      let l = data.students.filter(x => has({ n: x.name, p: x.phone, c: x.cls }) && (!st.cls || x.cls === st.cls));
      l = [...l].sort(st.sort === 'avg' ? (a, b) => (b.avg ?? -1) - (a.avg ?? -1) : st.sort === 'att' ? (a, b) => (a.att ?? 101) - (b.att ?? 101) : (a, b) => a.name.localeCompare(b.name, 'uz'));
      exportRows = [['Ism', 'Sinf', 'Telefon', 'O‘rtacha baho', 'Davomat %', 'Yetishmaydigan hujjatlar'], ...l.map(x => [x.name, x.cls, x.phone, x.avg ?? '', x.att ?? '', x.miss.map(c => DOC_L[c] || c).join(', ')])];
      body.innerHTML = l.length ? `<table><thead><tr><th>#</th><th>O‘quvchi</th><th>Sinf</th><th>Telefon</th><th>Baho</th><th>Davomat</th><th>Hujjat</th></tr></thead><tbody>${l.map((x, i) => `<tr><td class="muted">${i + 1}</td><td><b>${esc(x.name)}</b></td><td>${pill('', x.cls)}</td><td>${esc(x.phone) ? '+998 ' + esc(x.phone) : '—'}</td>
        <td>${x.avg == null ? '—' : `<span class="gr g${Math.round(x.avg)}">${x.avg.toFixed(1)}</span>`}</td><td><div class="mini-bar"><i style="width:${x.att ?? 0}%;background:${(x.att ?? 100) < 85 ? 'var(--warn)' : 'var(--ok)'}"></i></div><small>${x.att == null ? '—' : Math.round(x.att) + '%'}</small></td>
        <td>${x.miss.length ? pill('warn', x.miss.length + ' ta yo‘q') : pill('ok', 'To‘liq')}</td></tr>`).join('')}</tbody></table>` : empty('🔍', 'Topilmadi.');
    } else if (st.sub === 'teachers') {
      const l = data.teachers.filter(x => has({ n: x.name, s: x.subj, p: x.phone }));
      exportRows = [['Ism', 'Fan', 'Telefon', 'Sinf rahbari'], ...l.map(x => [x.name, x.subj, x.phone, x.leads.join(', ')])];
      body.innerHTML = l.length ? `<table><thead><tr><th>Ustoz</th><th>Fan</th><th>Telefon</th><th>Sinf rahbari</th></tr></thead><tbody>${l.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.subj)}</td><td>${x.phone ? '+998 ' + esc(x.phone) : '—'}</td><td>${x.leads.length ? x.leads.map(c => pill('blue', c)).join(' ') : '—'}</td></tr>`).join('')}</tbody></table>` : empty('🔍', 'Topilmadi.');
    } else if (st.sub === 'classes') {
      const l = data.classes.filter(x => has({ n: x.name, l: x.leader }));
      exportRows = [['Sinf', 'Sinf rahbari', 'O‘quvchi soni'], ...l.map(x => [x.name, x.leader, x.n])];
      body.innerHTML = l.length ? `<div class="sgrid sm">${l.map(x => `<div class="sc tilt"><h3>${esc(x.name)}</h3><div class="muted small">Rahbar: ${esc(x.leader) || '—'}</div><div class="stats"><div><b>${x.n}</b><small>O‘QUVCHI</small></div></div></div>`).join('')}</div>` : empty('🔍', 'Topilmadi.');
    } else {
      const codes = Object.keys(DOC_L).filter(c => data.students.some(x => x.miss.includes(c)));
      let l = data.students.filter(x => x.miss.length && has({ n: x.name, c: x.cls }) && (!st.cls || x.cls === st.cls));
      exportRows = [['Ism', 'Sinf', 'Yetishmaydigan hujjatlar'], ...l.map(x => [x.name, x.cls, x.miss.map(c => DOC_L[c] || c).join(', ')])];
      body.innerHTML = `<div class="chips">${codes.map(c => `<span class="pill warn">${DOC_L[c]}: ${data.students.filter(x => x.miss.includes(c)).length}</span>`).join('')}</div>` +
        (l.length ? `<table><thead><tr><th>O‘quvchi</th><th>Sinf</th><th>Yetishmaydi</th></tr></thead><tbody>${l.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${pill('', x.cls)}</td><td>${x.miss.map(c => pill('warn', DOC_L[c] || c)).join(' ')}</td></tr>`).join('')}</tbody></table>` : empty('🎉', 'Hamma hujjat to‘liq!'));
    }
  };
  $$('[data-sub]', tb).forEach(b => b.onclick = () => { st.sub = b.dataset.sub; st.q = ''; usersTab(tb, s); });
  $('#uq', tb).oninput = e => { st.q = e.target.value; draw(); };
  const uc = $('#uc', tb); if (uc) uc.onchange = e => { st.cls = e.target.value; draw(); };
  const us = $('#us', tb); if (us) us.onchange = e => { st.sort = e.target.value; draw(); };
  $('#ex', tb).onclick = () => csv(`${s.name}-${st.sub}.csv`, exportRows);
  draw(); countUp(tb);
}

/* — maktab adminlari — */
function adminsTab(tb, s, admins) {
  const sid = s.id;
  tb.innerHTML = `<div class="card"><div class="row"><h3 style="margin:0">Maktab adminlari</h3><span class="sp"></span><button class="btn" id="aa">${ic('plus', 18)} Admin qo‘shish</button></div>
    <p class="muted small">Har bir admin telefon raqami va paroli bilan kiradi. Parollar shifrlangan holda saqlanadi — ularni qayta ko‘rib bo‘lmaydi, faqat yangisini yaratish mumkin.</p>
    ${admins.length ? `<div class="wrap"><table class="cardt"><thead><tr><th>Ism</th><th>Telefon</th><th>Rol</th><th>Holat</th><th></th></tr></thead><tbody>${admins.map(a => `<tr><td><b>${esc(a.name)}</b></td><td>+998 ${esc(a.phone)}</td><td>${pill(a.role === 'admin' ? 'blue' : 'gray', a.role === 'admin' ? 'Admin' : 'Menejer')}</td><td>${a.active ? pill('ok', 'Faol') : pill('err', 'O‘chirilgan')}</td>
      <td class="acts"><button class="btn o sm" data-ed="${a.id}">Tahrirlash</button><button class="btn o sm" data-pw="${a.id}">Yangi parol</button><button class="btn d sm" data-rm="${a.id}">×</button></td></tr>`).join('')}</tbody></table></div>` : empty('👤', 'Bu maktabga hali admin qo‘shilmagan.')}</div>`;
  const adminForm = a => modal(`<h3>${ic('user', 22)} ${a ? 'Adminni tahrirlash' : 'Yangi admin'}</h3><form id="af">
    <label class="f"><span>Ism familiya</span><input name="name" required maxlength="80" value="${esc(a?.name)}"></label>
    <div class="two"><label class="f"><span>Telefon</span><input name="phone" required inputmode="tel" placeholder="90 123 45 67" value="${esc(a?.phone)}"></label>
    <label class="f"><span>Rol</span><select name="role"><option value="admin" ${a?.role === 'admin' ? 'selected' : ''}>Admin</option><option value="menejer" ${a?.role === 'menejer' ? 'selected' : ''}>Menejer</option></select></label></div>
    ${a ? `<label class="chk"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}> Hisob faol</label>` : pwField('pw', 'Parol (kamida 6 belgi)', 'bo‘sh = avtomatik')}
    <div class="row" style="margin-top:10px"><button class="btn">${a ? 'Saqlash' : 'Qo‘shish'}</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
    wireEyes(bg);
    $('#af', bg).onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      try {
        if (a) { await api('/g/school-admins/' + a.id, 'PATCH', { name: f.get('name'), phone: f.get('phone'), role: f.get('role'), active: f.get('active') === 'on' }); close(); toast('Saqlandi ✓'); render(); }
        else { const r = await api(`/g/schools/${sid}/admins`, 'POST', { name: f.get('name'), phone: f.get('phone'), role: f.get('role'), pw: f.get('pw') }); close(); credModal(r.admin.name, r.admin.phone, r.password); }
      } catch (er) { fail(er); }
    };
  });
  const credModal = (name, phone, pw) => modal(`<h3>🔑 Kirish ma’lumotlari</h3>${copyRow('Ism', name)}${copyRow('Telefon', '+998 ' + phone)}${copyRow('Parol', pw)}<p class="small muted">Parol faqat hozir ko‘rinadi — nusxalab oling.</p><button class="btn" data-close>Yopish</button>`, bg => { wireCopy(bg); $$('[data-close]', bg).forEach(b => b.addEventListener('click', () => render())); });
  $('#aa', tb).onclick = () => adminForm(null);
  $$('[data-ed]', tb).forEach(b => b.onclick = () => adminForm(admins.find(a => a.id === +b.dataset.ed)));
  $$('[data-pw]', tb).forEach(b => b.onclick = () => { const a = admins.find(x => x.id === +b.dataset.pw); modal(`<h3>Yangi parol — ${esc(a.name)}</h3><form id="pf">${pwField('pw', 'Yangi parol', 'bo‘sh = avtomatik yaratish')}<div class="row"><button class="btn">Parolni almashtirish</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => { wireEyes(bg);
    $('#pf', bg).onsubmit = async e => { e.preventDefault(); try { const r = await api(`/g/school-admins/${a.id}/password`, 'POST', { pw: new FormData(e.target).get('pw') }); close(); credModal(a.name, a.phone, r.password); } catch (er) { fail(er); } }; }); });
  $$('[data-rm]', tb).forEach(b => b.onclick = async () => { const a = admins.find(x => x.id === +b.dataset.rm); const pw = await askPassword('Adminni o‘chirish', `“${a.name}” hisobi o‘chiriladi.`, 'O‘chirish'); if (!pw) return; api('/g/school-admins/' + a.id, 'DELETE', { confirm: pw }).then(() => { toast('O‘chirildi'); render(); }).catch(fail); });
}

/* ───────── murojaatlar ───────── */
function ticketRow(t) {
  return `<div class="tk tilt ${t.unread ? 'unread' : ''} pr-${t.priority}" data-t="${t.id}" tabindex="0" role="button">
    ${t.logo ? `<img class="ava img sm" src="${esc(t.logo)}" alt="">` : ''}
    <div style="flex:1;min-width:0"><b>${esc(t.title)}</b><div class="muted small">${esc(t.school || '')} · ${ago(t.updatedAt)}${t.assigneeName ? ' · 👤 ' + esc(t.assigneeName) : ''}</div>
    <div class="meta">${pill(ST_C[t.status], ST[t.status])}${pill(PRI_C[t.priority], PRI[t.priority])}${pill('gray', CAT[t.category] || t.category)}${t.unread ? pill('blue', 'Yangi xabar') : ''}${waiting(t)}</div></div></div>`;
}
function bindTickets(el) {
  $$('[data-t]', el).forEach(r => { const go = () => { location.hash = '#/tickets/' + r.dataset.t; }; r.onclick = go; r.onkeydown = e => { if (e.key === 'Enter') go(); }; });
}
async function ticketsView(el, arg) {
  if (!can('tickets')) return el.innerHTML = `<div class="card">${empty('🔒', 'Bu bo‘limga ruxsatingiz yo‘q.')}</div>`;
  if (arg) return ticketDetail(el, +arg);
  const f = ticketsView.f || (ticketsView.f = { status: 'ochiq', priority: '', school: '', q: '', mine: '' });
  const [{ tickets }, { schools }] = await Promise.all([api(`/g/tickets?status=${f.status}&priority=${f.priority}&school=${f.school}&mine=${f.mine}&q=${encodeURIComponent(f.q)}`), can('schools') ? api('/g/schools') : { schools: [] }]);
  const chip = (k, v, t) => `<button class="chip ${f[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}">${t}</button>`;
  el.innerHTML = `<div class="top"><h2>Muammolar</h2><span class="sp"></span><input class="search" id="tq" placeholder="Sarlavha yoki maktab…" value="${esc(f.q)}"></div>
  <div class="card"><div class="chips">${chip('status', 'ochiq', 'Ochiq')}${Object.entries(ST).map(([k, v]) => chip('status', k, v)).join('')}${chip('status', '', 'Hammasi')}<span style="width:12px"></span>${chip('mine', '1', '👤 Menga biriktirilgan')}</div>
  <div class="row"><select id="fp" style="max-width:200px" aria-label="Muhimlik"><option value="">Barcha muhimlik</option>${Object.entries(PRI).map(([k, v]) => `<option value="${k}" ${f.priority === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
  ${schools.length ? `<select id="fs" style="max-width:260px" aria-label="Maktab"><option value="">Barcha maktablar</option>${schools.map(s => `<option value="${s.id}" ${String(s.id) === f.school ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}</div></div>
  <div>${tickets.length ? tickets.map(ticketRow).join('') : `<div class="card">${empty('📭', 'Murojaat topilmadi.')}</div>`}</div>`;
  $$('.chip', el).forEach(c => c.onclick = () => { f[c.dataset.k] = f[c.dataset.k] === c.dataset.v && c.dataset.k === 'mine' ? '' : c.dataset.v; render(); });
  $('#fp').onchange = e => { f.priority = e.target.value; render(); };
  const fs = $('#fs'); if (fs) fs.onchange = e => { f.school = e.target.value; render(); };
  let tm; $('#tq').oninput = e => { f.q = e.target.value; clearTimeout(tm); tm = setTimeout(async () => { const pos = e.target.selectionStart; await render(); const n = $('#tq'); n.focus(); n.setSelectionRange(pos, pos); }, 350); };
  bindTickets(el);
}
async function ticketDetail(el, id) {
  const { ticket: t, messages, notes, staff } = await api('/g/tickets/' + id);
  const closed = t.status === 'yopiq';
  el.innerHTML = `<div class="top"><a class="btn o sm" href="#/tickets">← Muammolar</a><h2 style="flex:1;min-width:200px">${esc(t.title)}</h2></div>
  <div class="cols tk-cols"><div class="card"><div class="row">${t.logo ? `<img class="ava img sm" src="${esc(t.logo)}" alt="">` : ''}${can('schools') ? `<a href="#/schools/${t.schoolId}"><b>${esc(t.school)}</b></a>` : `<b>${esc(t.school)}</b>`}${pill(PRI_C[t.priority], PRI[t.priority])}${pill('gray', CAT[t.category] || '')}<span class="muted small">#${t.id} · ${when(t.createdAt)}</span></div>
    <div class="thread">${messages.map(m => `<div class="msg ${m.side}"><small>${m.side === 'general' ? esc(m.who || 'General admin') : esc(t.school)} · ${when(m.at)}</small>${esc(m.text)}</div>`).join('')}</div>
    ${closed ? '<div class="warnbox">Murojaat yopilgan. Javob yozish uchun holatini o‘zgartiring.</div>' : `<form id="rf"><textarea name="text" placeholder="Maktab adminiga javob…" required maxlength="3000"></textarea><div class="row" style="margin-top:10px"><button class="btn">Javob yuborish</button><button type="button" class="btn g" id="rs">${ic('check', 16)} Javob berib, “Hal qilindi”</button></div></form>`}</div>
  <div><div class="card"><h3>Boshqaruv</h3><label class="f"><span>Holat</span><select id="st">${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="f"><span>Mas’ul xodim</span><select id="as"><option value="">— biriktirilmagan —</option>${staff.map(x => `<option value="${x.id}" ${x.id === t.assignee ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>
  <div class="card"><h3>🔒 Ichki izohlar</h3><p class="muted small" style="margin-top:0">Maktab ko‘rmaydi — faqat xodimlar uchun.</p>${notes.map(n => `<div class="note"><b>${esc(n.who)}</b> <small class="muted">${when(n.at)}</small><br>${esc(n.text)}</div>`).join('') || '<p class="muted small">Hozircha izoh yo‘q.</p>'}
    <form id="nf"><textarea name="text" style="min-height:70px" placeholder="Izoh yozing…" maxlength="1500" required></textarea><button class="btn o sm" style="margin-top:8px">Izoh qo‘shish</button></form></div></div></div>`;
  $('#st').onchange = e => api(`/g/tickets/${id}/status`, 'POST', { status: e.target.value }).then(() => { if (e.target.value === 'hal') confetti(); toast('Holat o‘zgardi'); render(); }).catch(fail);
  $('#as').onchange = e => api(`/g/tickets/${id}/assign`, 'POST', { staffId: e.target.value || null }).then(() => { toast('Biriktirildi'); render(); }).catch(fail);
  $('#nf').onsubmit = e => { e.preventDefault(); api(`/g/tickets/${id}/note`, 'POST', { text: new FormData(e.target).get('text') }).then(render).catch(fail); };
  const rf = $('#rf');
  if (rf) {
    const send = async solve => {
      const text = rf.text.value.trim(); if (!text) return rf.text.focus();
      try { await api(`/g/tickets/${id}/reply`, 'POST', { text }); if (solve) { await api(`/g/tickets/${id}/status`, 'POST', { status: 'hal' }); confetti(); } toast('Yuborildi ✓'); render(); } catch (e) { fail(e); }
    };
    rf.onsubmit = e => { e.preventDefault(); send(false); };
    $('#rs').onclick = () => send(true);
  }
}

/* ───────── e’lonlar ───────── */
async function newsView(el) {
  if (!can('news')) return el.innerHTML = `<div class="card">${empty('🔒', 'Bu bo‘limga ruxsatingiz yo‘q.')}</div>`;
  const { announcements: a } = await api('/g/announcements');
  el.innerHTML = `<div class="top"><h2>E’lonlar</h2></div>
  <div class="card"><h3>Barcha maktablarga e’lon yuborish</h3><p class="muted small">E’lon har bir maktab adminining panelidagi “Yordam” bo‘limida ko‘rinadi.</p>
  <form id="nf"><label class="f"><span>Sarlavha</span><input name="title" required maxlength="120"></label><label class="f"><span>Matn</span><textarea name="body" required maxlength="2000"></textarea></label><button class="btn">${ic('news', 18)} E’lon qilish</button></form></div>
  <div class="card"><h3>Yuborilgan e’lonlar</h3>${a.length ? a.map(x => `<div class="tk" style="cursor:default"><div style="flex:1"><b>${esc(x.title)}</b><div class="muted small">${when(x.at)}</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(x.body)}</p></div><button class="btn o sm" data-del="${x.id}">O‘chirish</button></div>`).join('') : empty('📣', 'Hozircha e’lon yo‘q.')}</div>`;
  $('#nf').onsubmit = async e => { e.preventDefault(); try { await api('/g/announcements', 'POST', Object.fromEntries(new FormData(e.target))); toast('E’lon qilindi ✓'); render(); } catch (er) { fail(er); } };
  $$('[data-del]', el).forEach(b => b.onclick = () => confirm('E’lon o‘chirilsinmi?') && api('/g/announcements/' + b.dataset.del, 'DELETE').then(render).catch(fail));
}

/* ───────── ishchilar (jamoa) ───────── */
const PROLE_L = { lead: 'Rahbar', member: 'A’zo', viewer: 'Kuzatuvchi' };
const PERM_I = { schools: 'school', tickets: 'ticket', users: 'kids', admins: 'lock', news: 'news' };
async function workersView(el) {
  const { workers } = await api('/g/workers');
  let q = '', rf = 'all';
  const roles = [...new Set(workers.map(w => w.role))];
  const owner = isOwner();
  el.innerHTML = `<div class="top wtop"><h2>Ishchilar</h2><span class="muted small">${workers.filter(w => w.active).length} nafar jamoa a’zosi</span><span class="sp"></span><input class="search" id="wq" placeholder="Ism yoki lavozim…" autocomplete="off">${owner ? `<button class="btn g" id="wg2">${ic('plus', 18)} General admin</button><button class="btn" id="wa">${ic('plus', 18)} Ishchi qo‘shish</button>` : ''}</div>
  <div class="rfilter" id="wr"></div><div class="wgrid" id="wg"></div>`;
  const card = w => `<div class="card wcard ${w.active ? '' : 'off'}"><img class="wwm" src="logo-icon.png" alt="">
    <div class="row">${avatar(w, 60)}<div class="hn"><b>${esc(w.name)}${w.id === me.id ? ' <span class="muted small">(siz)</span>' : ''}</b>${rolePill(w.role)}${w.active ? '' : pill('err', 'O‘chirilgan')}${w.login ? `<small>@${esc(w.login)}${w.lastLogin ? ' · ' + ago(w.lastLogin) : ''}</small>` : ''}</div></div>
    <div class="wst"><span><b>${w.tasks.running}</b>jarayonda</span><span><b>${w.tasks.review}</b>tekshiruvda</span><span><b>${w.tasks.done}</b>tayyor</span></div>
    <div class="wpr">${w.projects.length ? w.projects.map(p => `<a class="chip" href="#/projects/${p.id}" style="--pc:${esc(p.color)}" title="${esc(PROLE_L[p.prole] || '')}">${esc(p.icon || '📁')} ${esc(p.name)}</a>`).join('') : '<span class="muted small">Hali bo‘limga qo‘shilmagan</span>'}</div>
    <div class="row wact">${w.id === me.id || !w.active ? '' : `<a class="btn o sm" href="#/dm/${w.id}">${ic('mail', 16)} Lichka</a>`}${owner && w.active && w.role !== 'owner' ? `<button class="btn o sm" data-wp="${w.id}">+ Bo‘lim</button>` : ''}${owner ? `<button class="btn o sm" data-wl="${w.id}">Rasm</button>` : ''}${owner && w.role !== 'owner' ? `<button class="btn o sm" data-we="${w.id}">Tahrirlash</button>` : ''}${owner ? `<button class="btn o sm" data-wk="${w.id}">Parol</button>` : ''}${owner && w.role !== 'owner' && w.id !== me.id ? `<button class="btn d sm" data-wd="${w.id}">×</button>` : ''}</div></div>`;
  const byId = id => workers.find(w => w.id === +id);
  const cred = (login, pw) => modal(`<h3>🔑 Kirish ma’lumotlari</h3>${copyRow('Login', login)}${copyRow('Parol', pw)}<p class="small muted">Parol faqat hozir ko‘rinadi — nusxalab oling.</p><button class="btn" data-close>Yopish</button>`, b => { wireCopy(b); $$('[data-close]', b).forEach(x => x.addEventListener('click', () => render())); });
  const draw = () => {
    $('#wr').innerHTML = [['all', 'Hammasi', workers.length], ...roles.map(r => [r, roleL(r), workers.filter(w => w.role === r).length])].map(([k, t, n]) => `<a href="javascript:void 0" data-r="${k}" class="${rf === k ? 'on' : ''}">${esc(t)}<em>${n}</em></a>`).join('');
    const list = workers.filter(w => (rf === 'all' || w.role === rf) && (!q || (w.name + ' ' + roleL(w.role)).toLowerCase().includes(q)));
    $('#wg').innerHTML = list.length ? list.map(card).join('') : `<div class="card" style="grid-column:1/-1">${empty('🔎', 'Hech kim topilmadi.')}</div>`;
    $$('[data-r]', el).forEach(a => a.onclick = () => { rf = a.dataset.r; draw(); });
    $$('[data-wp]', el).forEach(b => b.onclick = () => addToProject(byId(b.dataset.wp)));
    $$('[data-wl]', el).forEach(b => b.onclick = () => pickLogo(d => api(`/g/staff/${b.dataset.wl}/logo`, 'POST', { data: d }).then(() => { toast('Rasm saqlandi ✓'); render(); }).catch(fail)));
    $$('[data-we]', el).forEach(b => b.onclick = () => editWorker(byId(b.dataset.we)));
    $$('[data-wk]', el).forEach(b => b.onclick = () => resetPw(byId(b.dataset.wk)));
    $$('[data-wd]', el).forEach(b => b.onclick = async () => { const x = byId(b.dataset.wd); const pw = await askPassword('Ishchini o‘chirish', `“${x.name}” hisobi o‘chiriladi.`, 'O‘chirish'); if (!pw) return; api('/g/staff/' + x.id, 'DELETE', { confirm: pw }).then(() => { toast('O‘chirildi'); render(); }).catch(fail); });
  };
  const addToProject = w => {
    const free = Object.values(PROJ).filter(p => !p.archived && !w.projects.some(x => x.id === p.id));
    if (!free.length) return toast('Barcha bo‘limlarda allaqachon bor.');
    modal(`<h3>${ic('folder', 22)} ${esc(w.name)} — bo‘limga qo‘shish</h3><form id="pf"><label class="f"><span>Bo‘lim</span><select name="p">${free.map(p => `<option value="${p.id}">${esc(p.icon || '📁')} ${esc(p.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Bo‘limdagi roli</span><select name="r">${Object.entries(PROLE_L).map(([k, t]) => `<option value="${k}" ${k === 'member' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="row"><button class="btn">Qo‘shish</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
      $('#pf', bg).onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api(`/g/projects/${f.get('p')}/members`, 'POST', { staff: w.id, prole: f.get('r') }); close(); toast('Qo‘shildi ✓'); render(); } catch (er) { fail(er); } };
    });
  };
  const resetPw = x => modal(`<h3>🔑 Yangi parol</h3><p class="muted small" style="margin-top:-6px">${esc(x.name)}</p><form id="pf">${pwField('pw', 'Yangi parol', 'bo‘sh = avtomatik')}<div class="row"><button class="btn">Almashtirish</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => { wireEyes(bg);
    $('#pf', bg).onsubmit = async e => { e.preventDefault(); try { const r = await api(`/g/staff/${x.id}/password`, 'POST', { pw: new FormData(e.target).get('pw') }); close(); cred(x.login, r.password); } catch (er) { fail(er); } }; });
  const roleTiles = sel => `<div class="rtiles">${Object.keys(ROLE).filter(k => k !== 'owner').map(k => `<label class="rtile"><input type="radio" name="role" value="${k}" ${k === sel ? 'checked' : ''}><span class="rt-e">${ROLE[k][2]}</span><span class="rt-t">${esc(ROLE[k][0])}</span></label>`).join('')}</div>`;
  const head = (t, sub) => `<div class="mhead"><img src="logo-icon.png" alt=""><div><h3>${t}</h3><small>${sub}</small></div></div>`;
  const editWorker = x => {
    const { perms } = { perms: Object.keys(PERM_L) };
    modal(`${head('Ishchini tahrirlash', esc(x.name))}<form id="ef"><label class="f"><span>Ism familiya</span><input name="name" required maxlength="80" value="${esc(x.name)}"></label>
      <p class="mlab">Lavozim</p>${roleTiles(x.role)}
      <p class="mlab">Ruxsat berilgan bo‘limlar</p><div class="permgrid tiles">${perms.map(p => `<label class="ptile"><input type="checkbox" name="perm" value="${p}" ${(x.perms || ROLE_PERMS[x.role] || []).includes(p) ? 'checked' : ''}><span class="pt-i">${ic(PERM_I[p] || 'cog', 20)}</span><span class="pt-t">${PERM_L[p]}</span><span class="pt-ok">✓</span></label>`).join('')}</div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" name="active" ${x.active ? 'checked' : ''}> Hisob faol</label>
      <div class="row" style="margin-top:16px"><button class="btn">Saqlash</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
      const rs = $$('[name=role]', bg); rs.forEach(r => r.onchange = () => $$('[name=perm]', bg).forEach(c => { c.checked = (ROLE_PERMS[r.value] || []).includes(c.value); }));
      $('#ef', bg).onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api('/g/staff/' + x.id, 'PATCH', { name: f.get('name'), role: f.get('role'), perms: f.getAll('perm'), active: f.get('active') === 'on' }); close(); toast('Saqlandi ✓'); render(); } catch (er) { fail(er); } };
    }, true);
  };
  const addWorker = gen => {
    const projs = Object.values(PROJ).filter(p => !p.archived);
    modal(`${head(gen ? 'Yangi General admin' : 'Yangi ishchi', gen ? 'To‘liq huquqli hisob' : 'Jamoaga yangi a’zo qo‘shing')}<form id="wf">
      <div class="avup"><button type="button" class="avpick" id="wb" title="Rasm tanlash"><span id="wl">${ic('staff', 34)}</span><i>＋</i></button><div class="avtxt"><b>Profil rasmi</b><span>PNG, JPG yoki WEBP · ixtiyoriy</span></div></div>
      <label class="f"><span>Ism familiya</span><input name="name" required maxlength="80" placeholder="Masalan: Jasur Karimov"></label>
      ${gen ? '' : `<p class="mlab">Lavozim</p>${roleTiles('dasturchi')}`}
      <div class="two"><label class="f"><span>Login (lotin harflarida)</span><input name="login" required maxlength="40" autocomplete="off" placeholder="jasur"></label>${pwField('pw', 'Parol', 'bo‘sh = avtomatik')}</div>
      ${!gen && projs.length ? `<p class="mlab">Bo‘limlarga qo‘shish <small>(ixtiyoriy)</small></p><div class="wpick">${projs.map(p => `<label class="pchip"><input type="checkbox" name="pj" value="${p.id}"><span>${esc(p.icon || '📁')} ${esc(p.name)}</span></label>`).join('')}</div>` : ''}
      <div class="row" style="margin-top:18px"><button class="btn" style="flex:1">${ic('plus', 18)} Qo‘shish</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
      wireEyes(bg); let logo = null;
      $('#wb', bg).onclick = () => pickLogo(d => { logo = d; $('#wl', bg).innerHTML = `<img src="${esc(d)}" alt="">`; });
      $('#wf', bg).onsubmit = async e => {
        e.preventDefault(); const f = new FormData(e.target), role = gen ? 'owner' : f.get('role');
        try {
          const r = await api('/g/staff', 'POST', { name: f.get('name'), login: f.get('login'), pw: f.get('pw'), role, perms: ROLE_PERMS[role] || [] });
          if (logo) await api(`/g/staff/${r.staff.id}/logo`, 'POST', { data: logo }).catch(() => {});
          for (const pid of f.getAll('pj')) await api(`/g/projects/${pid}/members`, 'POST', { staff: r.staff.id, prole: 'member' }).catch(() => {});
          close(); cred(r.staff.login, r.password);
        } catch (er) { fail(er); }
      };
    }, true);
  };
  $('#wq').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  if (owner) {
    $('#wa').onclick = () => addWorker(false);
    $('#wg2').onclick = () => addWorker(true);
  }
  draw();
}

/* ───────── vazifalar ───────── */
const TS = { yangi: 'Yangi', jarayonda: 'Razrabotkada', tekshiruv: 'Tekshiruvda', tayyor: 'Tayyor' }, TS_C = { yangi: 'blue', jarayonda: 'warn', tekshiruv: 'gold', tayyor: 'ok' };
const TS_I = { yangi: '🆕', jarayonda: '🛠️', tekshiruv: '🔍', tayyor: '✅' };
const dueChip = t => { if (!t.due) return ''; const d = Math.ceil((new Date(t.due + 'T23:59:59+05:00') - Date.now()) / 864e5); return t.status === 'tayyor' ? pill('gray', '📅 ' + t.due.slice(5)) : pill(d < 0 ? 'err' : d <= 1 ? 'warn' : 'gray', '📅 ' + t.due.slice(5) + (d < 0 ? ' · muddat o‘tdi' : d === 0 ? ' · bugun' : '')); };
async function tasksView(el, arg, _b, P) {
  const { tasks } = await api('/g/tasks' + (P ? '?project=' + P.id : '')), team = P ? P.members.map(x => who(x.id)) : Object.values(TEAM), own = P ? P.lead : isOwner();
  const card = t => `<div class="tcard tilt pr-${t.priority}" data-task="${t.id}" tabindex="0">
    <b>${esc(t.title)}</b>${t.body ? `<p>${esc(t.body.slice(0, 90))}${t.body.length > 90 ? '…' : ''}</p>` : ''}
    <div class="meta">${!P && t.project && PROJ[t.project] ? `<span class="pill gray">${esc(PROJ[t.project].icon)} ${esc(PROJ[t.project].name)}</span>` : ''}${pill(PRI_C[t.priority], PRI[t.priority])}${dueChip(t)}${t.review ? '' : pill('gray', 'tekshiruvsiz')}</div>
    <div class="row tw">${pav(t.assignee, 28)}<span class="small"><b>${esc(who(t.assignee).name)}</b><br><span class="muted">${t.status === 'jarayonda' ? '🛠️ ishlayapti' : t.status === 'yangi' ? 'qabul qilishi kutilmoqda' : t.status === 'tekshiruv' ? 'tekshiruvni kutyapti' : 'bajardi'}</span></span></div></div>`;
  el.innerHTML = `<div class="top" ${P ? 'style="display:none"' : ''}><h2>Vazifalar</h2><span class="muted small">${own ? 'Jamoaga vazifa bo‘lib bering va jarayonni kuzating' : 'Sizga biriktirilgan vazifalar'}</span><span class="sp"></span>${own && !P ? `<button class="btn" id="nt">${ic('plus', 18)} Yangi vazifa</button>` : ''}</div>
  ${P && own ? `<div class="row" style="margin-bottom:12px"><span class="sp"></span><button class="btn" id="nt">${ic('plus', 18)} Yangi vazifa</button></div>` : ''}
  <div class="kanban">${Object.keys(TS).map(k => { const l = tasks.filter(t => t.status === k); return `<section class="kcol k-${k}"><h4>${TS_I[k]} ${TS[k]} <em>${l.length}</em></h4>${l.length ? l.map(card).join('') : '<div class="kempty">bo‘sh</div>'}</section>`; }).join('')}</div>`;
  $$('[data-task]', el).forEach(c => { const go = () => taskModal(+c.dataset.task); c.onclick = go; c.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  if (own) $('#nt').onclick = () => modal(`<h3>${ic('plus', 22)} Yangi vazifa</h3><form id="tf"><label class="f"><span>Sarlavha</span><input name="title" required maxlength="140" autofocus></label>
    <label class="f"><span>Tavsif</span><textarea name="body" rows="3" maxlength="3000" placeholder="Nima qilish kerak?"></textarea></label>
    <div class="two"><label class="f"><span>Ijrochi</span><select name="assignee" required>${team.map(x => `<option value="${x.id}" ${x.id === me.id ? '' : ''}>${esc(x.name)}${x.role === 'owner' && !/admin/i.test(x.name) ? ' (General admin)' : ''}</option>`).join('')}</select></label>
    <label class="f"><span>Muhimlik</span><select name="priority">${Object.entries(PRI).map(([k, v]) => `<option value="${k}" ${k === 'oddiy' ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <label class="f"><span>Muddat (ixtiyoriy)</span><input type="date" name="due"></label>
    <label class="ptile wide"><input type="checkbox" name="review" checked><span class="pt-i">🔍</span><span class="pt-t">Ish tugagach <b>tekshirish kerak</b><small>O‘chirsangiz, tugatilganda to‘g‘ridan-to‘g‘ri “Tayyor”ga o‘tadi</small></span><span class="pt-ok">✓</span></label>
    <div class="row" style="margin-top:14px"><button class="btn">Biriktirish</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
      $('#tf', bg).onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api('/g/tasks', 'POST', { project: P ? P.id : undefined, title: f.get('title'), body: f.get('body'), assignee: +f.get('assignee'), priority: f.get('priority'), due: f.get('due'), review: f.get('review') === 'on' }); close(); Sfx.ok(); toast('Vazifa biriktirildi ✓'); render(); } catch (er) { fail(er); } };
    });
  if (arg && /^\d+$/.test(arg)) taskModal(+arg);
}
const askText = (title, label, req) => new Promise(res => { let ok = false; modal(`<h3>${esc(title)}</h3><form id="atf"><label class="f"><span>${esc(label)}</span><textarea name="t" rows="3" maxlength="1500" ${req ? 'required' : ''} autofocus></textarea></label><div class="row"><button class="btn">Tasdiqlash</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => { $('#atf', bg).onsubmit = e => { e.preventDefault(); ok = true; res(new FormData(e.target).get('t').trim()); close(); }; new MutationObserver(() => { if (!bg.isConnected && !ok) { ok = true; res(null); } }).observe(document.body, { childList: true }); }); });
const KIND_I = { created: '📌', accepted: '🤝', finished: '📤', done: '✅', approved: '✅', rejected: '↩️', comment: '💬', reassigned: '🔁' };
async function taskModal(id) {
  const { task: t, log, manage } = await api('/g/tasks/' + id).catch(e => { fail(e); return {}; }); if (!t) return;
  const mine = t.assignee === me.id, own = manage;
  const acts = [];
  if (mine && t.status === 'yangi') acts.push('<button class="btn g" data-a="accept">🤝 Qabul qilish</button>');
  if (mine && t.status === 'jarayonda') acts.push(`<button class="btn" data-a="finish">${t.review ? '📤 Tekshiruvga yuborish' : '✅ Tugatdim'}</button>`);
  if (own && t.status === 'tekshiruv') acts.push('<button class="btn" data-a="approve">✅ Maqullash</button><button class="btn d" data-a="reject">↩️ Xato bor — qaytarish</button>');
  modal(`<div class="row"><h3 style="margin:0;flex:1">${esc(t.title)}</h3>${pill(TS_C[t.status], TS_I[t.status] + ' ' + TS[t.status])}</div>
    ${t.body ? `<p style="white-space:pre-wrap">${esc(t.body)}</p>` : ''}
    <div class="meta" style="margin:10px 0">${pill(PRI_C[t.priority], PRI[t.priority])}${dueChip(t)}${pill('gray', t.review ? 'tekshiruv bilan' : 'tekshiruvsiz')}</div>
    <div class="row" style="margin-bottom:12px">${pav(t.assignee, 38)}<span><b>${esc(who(t.assignee).name)}</b><br><span class="muted small">ijrochi · biriktirdi: ${esc(who(t.creator).name)}</span></span></div>
    <div class="tlog">${log.map(l => `<div class="tl ${l.kind}"><i>${KIND_I[l.kind] || '•'}</i><div><b>${esc(l.who)}</b> <small class="muted">${when(l.at)}</small><p>${esc(l.text || '')}</p></div></div>`).join('')}</div>
    <form id="cf2" class="cform" style="padding:10px 0 0;border:0"><input name="t" placeholder="Izoh yozing…" maxlength="1500" autocomplete="off"><button class="btn o">Yuborish</button></form>
    <div class="row" style="margin-top:12px">${acts.join('')}${own ? '<span class="sp"></span><button class="btn o sm" data-a="del">🗑</button>' : ''}</div>`, (bg, close) => {
    const done = async (msg) => { close(); Sfx.win(); if (msg) toast(msg); render(); };
    $('#cf2', bg).onsubmit = async e => { e.preventDefault(); const v = e.target.t.value.trim(); if (!v) return; try { await api(`/g/tasks/${id}/comment`, 'POST', { text: v }); close(); taskModal(id); } catch (er) { fail(er); } };
    $$('[data-a]', bg).forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      try {
        if (a === 'accept') { await api(`/g/tasks/${id}/accept`, 'POST'); done('Vazifa qabul qilindi — ish boshlandi 🛠️'); }
        else if (a === 'finish') { const txt = await askText('Ishni tugatish', 'Nima qilindi? (ixtiyoriy)', false); if (txt === null) return; await api(`/g/tasks/${id}/finish`, 'POST', { text: txt }); done(t.review ? 'Tekshiruvga yuborildi 🔍' : 'Vazifa tayyor ✅'); confetti?.(); }
        else if (a === 'approve') { await api(`/g/tasks/${id}/approve`, 'POST'); done('Maqullandi — vazifa tayyor ✅'); confetti?.(); }
        else if (a === 'reject') { const txt = await askText('Qaytarish', 'Xato nimada? Ijrochiga ko‘rinadi.', true); if (!txt) return; await api(`/g/tasks/${id}/reject`, 'POST', { text: txt }); done('Qaytarildi — yana razrabotkada ↩️'); }
        else if (a === 'del') { const pw = await askPassword('Vazifani o‘chirish', `“${t.title}” butunlay o‘chiriladi.`, 'O‘chirish'); if (!pw) return; await api('/g/tasks/' + id, 'DELETE', { confirm: pw }); done('O‘chirildi'); }
      } catch (er) { fail(er); }
    });
  }, true);
}

/* ───────── jamoa chati: har bir lavozim uchun alohida xona ───────── */
let chatTimer = null;
const roomSeenKey = k => 'dsd-room-' + me.id + '-' + k;
const roomSeen = k => { try { return +localStorage.getItem(roomSeenKey(k)) || 0; } catch { return 0; } };
const roomPill = (r, size = 46) => `<span class="rm-ic" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .5)}px">${(ROLE[r] || ROLE.manager)[2]}</span>`;

/* xabarlar oynasi (bo‘lim chati va lavozim xonasi uchun umumiy) */
async function chatPane(el, { pid = null, room = null, onNew = () => {} }) {
  const box = $('#cm', el); let last = 0; const meId = me.id, qs = pid ? '&project=' + pid : '&room=' + room;
  const add = ms => {
    const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80 || !last;
    let prev = box.dataset.prev || '';
    for (const m of ms) {
      last = Math.max(last, m.id); const mine = m.sid === meId, first = prev !== String(m.sid); prev = String(m.sid);
      box.insertAdjacentHTML('beforeend', `<div class="cm ${mine ? 'mine' : ''} ${first ? 'first' : 'cont'}">${mine ? '' : first ? pav(m.sid, 34) : '<span class="ava-sp"></span>'}<div class="cb">${mine || !first ? '' : `<b>${esc(m.who)} <i class="rl">${esc(roleL(who(m.sid).role))}</i></b>`}<p>${esc(m.text)}</p><small>${when(m.at)}</small></div></div>`);
    }
    box.dataset.prev = prev;
    if (ms.length && stick) box.scrollTop = box.scrollHeight;
    onNew(last);
  };
  const poll = async () => {
    if (!$('#cm') || !token) return clearInterval(chatTimer);
    try { const r = await api('/g/chat?after=' + last + qs); if (r.messages.length) { const fresh = last > 0 && r.messages.some(m => m.sid !== meId); add(r.messages); if (fresh) Sfx.ok(); } } catch { /* keyingi urinish */ }
  };
  await poll(); if (!last) box.innerHTML = empty('💬', 'Hali xabar yo‘q. Birinchi bo‘lib yozing!'); else box.scrollTop = box.scrollHeight;
  clearInterval(chatTimer); chatTimer = setInterval(poll, 3000);
  $('#cf', el).onsubmit = async e => { e.preventDefault(); const i = e.target.t, t = i.value.trim(); if (!t) return; i.value = ''; try { if (!last) box.innerHTML = ''; await api('/g/chat', 'POST', pid ? { text: t, project: pid } : { text: t, room }); await poll(); box.scrollTop = box.scrollHeight; } catch (er) { fail(er); i.value = t; } };
  $('#cf input', el).focus();
}
const chatForm = () => `<div class="cmsgs" id="cm"></div><form class="cform" id="cf"><input name="t" placeholder="Xabar yozing…" maxlength="1000" autocomplete="off"><button class="btn">${ic('send', 18)} Yuborish</button></form>`;

async function chatView(el, roomArg, _b, pid) {
  clearInterval(chatTimer);
  if (pid) { el.innerHTML = `<div class="card chat inproj">${chatForm()}</div>`; return chatPane(el, { pid, onNew: last => { try { localStorage.setItem('dsd-pc-' + me.id + '-' + pid, String(last)); } catch { /* ignore */ } } }); }
  const { rooms } = await api('/g/chat/rooms');
  const owner = isOwner(), keys = rooms.map(r => r.key);
  const cur = keys.includes(roomArg) ? roomArg : (owner ? '' : keys[0]);
  /* nav belgisini tozalash: ochilgan paytdagi eng yangi xabar ko‘rilgan hisoblanadi */
  try { localStorage.setItem('dsd-chat-' + me.id, String(Math.max(0, ...rooms.map(r => r.lastId)))); } catch { /* ignore */ }
  const unread = r => r.lastId > roomSeen(r.key) && r.last && r.last.sid !== me.id && r.key !== cur;
  const roomList = () => rooms.map(r => `<a class="rmi ${r.key === cur ? 'on' : ''}" href="#/chat/${r.key}">${roomPill(r.key)}<span class="dn"><b>${esc(r.label)}</b><small>${r.last ? esc(r.last.who.split(' ')[0]) + ': ' + esc(r.last.text.slice(0, 34)) : r.members + ' nafar · xabar yo‘q'}</small></span>${unread(r) ? '<span class="bd" style="position:static">●</span>' : ''}</a>`).join('');
  const cr = rooms.find(r => r.key === cur);
  el.innerHTML = `<div class="dm rooms ${cur ? 'has' : ''}">
    ${owner ? `<aside class="dm-l"><div class="top" style="margin:0 0 4px"><h2>Jamoa chati</h2></div><p class="muted small" style="margin:0 0 10px">Har bir lavozim uchun alohida xona. Hammasini faqat General admin ko‘radi.</p><div id="dl">${roomList()}</div></aside>` : ''}
    <section class="dm-r">${cr ? `<header>${owner ? '<a class="back" href="#/chat">←</a>' : ''}${roomPill(cr.key, 42)}<span><b>${esc(cr.label)} xonasi</b><small>${cr.members} nafar a’zo${owner ? '' : ' · faqat shu lavozim va General admin'}</small></span><span class="sp"></span><span class="lockb" title="Yopiq xona">${ic('lock', 16)}</span></header>${chatForm()}` : empty('💬', 'Chap tomondan lavozim xonasini tanlang')}</section></div>`;
  if (!cr) return;
  await chatPane(el, { room: cur, onNew: last => { try { localStorage.setItem(roomSeenKey(cur), String(last)); } catch { /* ignore */ } } });
}

/* ───────── jurnal ───────── */
async function auditView(el) {
  if (!isOwner()) return el.innerHTML = `<div class="card">${empty('🔒', 'Faqat bosh admin uchun.')}</div>`;
  const { audit } = await api('/g/audit');
  el.innerHTML = `<div class="top"><h2>Harakatlar jurnali</h2></div><div class="card"><div class="wrap"><table><thead><tr><th>Vaqt</th><th>Kim</th><th>Harakat</th><th>Tafsilot</th></tr></thead><tbody>${audit.map(a => `<tr><td class="muted small">${when(a.at)}</td><td><b>${esc(a.actor)}</b></td><td>${esc(ACT_L[a.action] || a.action)}</td><td class="muted">${esc(a.detail)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('📜', 'Hozircha yozuv yo‘q.')}</td></tr>`}</tbody></table></div></div>`;
}

/* ───────── sozlamalar ───────── */
async function settingsView(el) {
  const { staff: m } = await api('/g/me').catch(() => ({ staff: me }));
  const full = m.role === 'owner', PI = { schools: 'school', tickets: 'ticket', users: 'kids', admins: 'lock', news: 'news' };
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  el.innerHTML = `<div class="top"><h2>Sozlamalar</h2><span class="muted small">Profil, xavfsizlik va ko‘rinish</span></div>
  <div class="set-grid">
    <div class="card prof"><div class="prof-bg"></div>
      <button class="prof-ava" id="pa" title="Rasmni almashtirish">${avatar(m, 96)}<span class="cam">${ic('plus', 16)}</span></button>
      <h3 class="prof-n">${esc(m.name)}</h3>
      <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">${rolePill(m.role)}${pill('gray', '@' + m.login)}</div>
      <div class="prof-st"><div><b>${m.lastLogin ? ago(m.lastLogin) : '—'}</b><small>oxirgi kirish</small></div><div><b>${m.createdAt ? when(m.createdAt).slice(0, 5).replace('-', '.') : '—'}</b><small>qo‘shilgan</small></div><div><b>${full ? 'Hammasi' : (m.perms || []).length}</b><small>ruxsat</small></div></div>
      <p class="prof-h">Ruxsat berilgan bo‘limlar</p>
      <div class="prof-p">${full ? '<span class="pchip all">✨ Barcha bo‘limlar</span>' : (m.perms || []).map(p => `<span class="pchip">${ic(PI[p] || 'cog', 14)} ${PERM_L[p]}</span>`).join('') || '<span class="muted small">Hozircha ruxsat berilmagan</span>'}</div>
    </div>
    <div class="col-r">
      <div class="card"><h3>${ic('lock', 20)} Parolni almashtirish</h3><form id="pf">${pwField('old', 'Joriy parol').replace('new-password', 'current-password')}${pwField('pw', 'Yangi parol (kamida 6 belgi)')}
        <div class="meter"><i></i><i></i><i></i><i></i></div><p class="muted small" id="mt" style="margin:6px 0 14px">Kuchli parol: harf, raqam va belgilar aralashmasi</p><button class="btn">Almashtirish</button></form></div>
      <div class="card"><h3>${ic('cog', 20)} Ko‘rinish va tovush</h3>
        <div class="pref"><div><b>Mavzu</b><small>Yorug‘ yoki qorong‘u rejim</small></div><div class="seg" id="thm"><button data-t="" class="${!theme ? 'on' : ''}">Avto</button><button data-t="light" class="${theme === 'light' ? 'on' : ''}">☀️ Yorug‘</button><button data-t="dark" class="${theme === 'dark' ? 'on' : ''}">🌙 Qorong‘u</button></div></div>
        <div class="pref"><div><b>Tovush effektlari</b><small>Tugma, xabar va yutuq tovushlari</small></div><label class="sw"><input type="checkbox" id="snd" ${Sfx.on ? 'checked' : ''}><i></i></label></div>
        <div class="pref"><div><b>Tezkor qidiruv</b><small>Istalgan joyda <kbd>Ctrl</kbd> <kbd>K</kbd> yoki <kbd>/</kbd></small></div><button class="btn o sm" id="pl">Ochish</button></div></div>
    </div></div>`;
  wireEyes(el);
  $('#pa').onclick = () => pickLogo(d => api('/g/me/logo', 'POST', { data: d }).then(() => { toast('Rasm saqlandi ✓'); render(); }).catch(fail));
  $$('#thm button').forEach(b => b.onclick = () => { theme = b.dataset.t || null; try { theme ? localStorage.setItem('dsd-theme', theme) : localStorage.removeItem('dsd-theme'); } catch { /* ignore */ } applyTheme(); $$('#thm button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#snd').onchange = e => { if (e.target.checked !== Sfx.on) Sfx.toggle(); };
  $('#pl').onclick = palette;
  const pwi = $('[name=pw]', el), bars = $$('.meter i', el);
  pwi.oninput = () => { const v = pwi.value; let sc = 0; if (v.length >= 6) sc++; if (v.length >= 10) sc++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) sc++; if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) sc++; if (!v) sc = 0; bars.forEach((b, i) => { b.className = i < sc ? 's' + sc : ''; }); $('#mt').textContent = !v ? 'Kuchli parol: harf, raqam va belgilar aralashmasi' : ['Juda oddiy', 'Zaif', 'O‘rtacha', 'Yaxshi', 'Juda kuchli'][sc]; };
  $('#pf').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api('/g/me/password', 'POST', { old: f.get('old'), pw: f.get('pw') }); toast('Parol almashdi. Qaytadan kiring.'); setSession(null); render(); } catch (er) { fail(er); } };
}

render();
setInterval(() => { if (token && !$('.modal-bg') && !document.activeElement?.matches('input,textarea,select')) render(); }, 60000);
