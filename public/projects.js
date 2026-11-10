'use strict';
/* DASADA — Bo‘limlar (loyihalar) va Lichka */
const P_ICONS = ['📁', '🚀', '📘', '🎓', '🏫', '💻', '🎨', '🧪', '📱', '🌐', '🔒', '📊', '💬', '🛠️', '⭐', '🧩'];
const P_ROLE = { lead: ['Rahbar', 'gold'], member: ['A’zo', 'blue'], viewer: ['Kuzatuvchi', 'gray'] };
const ring = (pct, color, size = 64) => { const r = size / 2 - 6, c = 2 * Math.PI * r; return `<svg class="pring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="fg" style="stroke:${color};stroke-dasharray:${c};--to:${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle">${pct}%</text></svg>`; };
const pico = p => p.logo ? `<img class="pc-img" src="${esc(p.logo)}" alt="">` : esc(p.icon);
const stack = (ids, n = 5) => `<span class="stack">${ids.slice(0, n).map(i => pav(i, 28)).join('')}${ids.length > n ? `<em>+${ids.length - n}</em>` : ''}</span>`;
const memberRows = (team, sel) => team.map(x => `<div class="mrow"><label class="mck"><input type="checkbox" name="m" value="${x.id}" ${sel?.[x.id] ? 'checked' : ''}><span class="mk">✓</span></label>${avatar(x, 34)}<span class="mn"><b>${esc(x.name)}</b><small>${esc(roleL(x.role))}</small></span><select data-r="${x.id}">${Object.entries(P_ROLE).map(([k, v]) => `<option value="${k}" ${(sel?.[x.id] || 'member') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>`).join('');

/* ───────── bo‘limlar ro‘yxati ───────── */
async function projectsView(el, id, tab) {
  clearInterval(chatTimer); clearInterval(dmTimer);
  if (id && /^\d+$/.test(id)) return projectView(el, +id, tab);
  const [{ projects }, { groups }] = await Promise.all([api('/g/projects'), api('/g/groups')]); const own = isOwner(); window.__groups = groups; 
  const draw = () => {
    const l = projects.filter(p => !p.archived && !p.groupId);
    const sys = (can('schools') || can('tickets') || can('news') ? schoolCard() : '') + groups.map(groupCard).join('') + archiveCard(projects.filter(p => p.archived).length);
    $('#pg').innerHTML = sys + (l.length ? l.map(projCard).join('') : empty('📁', own ? 'Hali bo‘lim yo‘q. Birinchi DASADA Studios loyihasini yarating!' : 'Siz hali hech qaysi bo‘limga qo‘shilmagansiz.'));
  };
  el.innerHTML = `<div class="top"><h2>Bo‘limlar</h2><span class="muted small">DASADA Studios loyihalari — har birida chat, vazifalar va hujjatlar</span><span class="sp"></span>${own ? `<button class="btn g" id="ng">${ic('plus', 18)} Katta bo‘lim</button><button class="btn" id="np">${ic('plus', 18)} Yangi bo‘lim</button>` : ''}</div><div class="pgrid" id="pg"></div>`;
  draw();
  if (own) { $('#np').onclick = () => projectForm(null, () => render()); $('#ng').onclick = () => groupForm(null, () => render()); }
}

const projCard = (p, i = 0) => { const unread = p.chatLast > (+localStorage.getItem('dsd-pc-' + me.id + '-' + p.id) || 0);
  return `<a class="pcard tilt" href="#/projects/${p.id}" style="--pc:${p.color};animation-delay:${Math.min(i, 10) * 50}ms">
    <div class="pc-top"><span class="pc-ic ${p.logo ? 'has' : ''}">${pico(p)}</span>${unread && !p.archived ? '<span class="pc-dot" title="Yangi chat xabarlari"></span>' : ''}${p.archived ? pill('gray', '📦 arxiv') : ''}<span class="sp"></span>${ring(p.progress, p.color, 58)}</div>
    <h3>${esc(p.name)}</h3><p class="pc-d">${esc(p.descr || 'Tavsif yo‘q')}</p>
    <div class="pc-st"><span title="Razrabotkada">🛠️ ${p.tasks.jarayonda}</span><span title="Tekshiruvda">🔍 ${p.tasks.tekshiruv}</span><span title="Tayyor">✅ ${p.tasks.tayyor}</span><span title="Yangi">🆕 ${p.tasks.yangi}</span></div>
    <div class="row pc-f">${stack(p.members.map(m => m.id))}<span class="sp"></span><span class="muted small">${p.members.length} a’zo</span></div></a>`; };
const groupCard = g => `<a class="pcard tilt sys grp" href="#/groups/${g.id}" style="--pc:${g.color}">
  <div class="pc-top"><span class="pc-ic ${g.logo ? 'has' : ''}">${pico(g)}</span>${pill('blue', '🗂️ Katta bo‘lim')}<span class="sp"></span>${ring(g.progress, g.color, 52)}</div>
  <h3>${esc(g.name)}</h3><p class="pc-d">${esc(g.descr || 'Ichida bo‘limlar bor')}</p>
  <div class="pc-st"><span>📁 ${g.active} bo‘lim</span><span title="Razrabotkada">🛠️ ${g.tasks.running}</span><span title="Tekshiruvda">🔍 ${g.tasks.review}</span><span title="Tayyor">✅ ${g.tasks.done}</span></div>
  <div class="row pc-f">${stack(g.members)}<span class="sp"></span><span class="muted small">${g.members.length} a’zo</span></div></a>`;
const archiveCard = n => `<a class="pcard tilt sys arc" href="#/archive" style="--pc:#64748b">
  <div class="pc-top"><span class="pc-ic">🗄️</span>${pill('gray', '📦 Arxiv')}<span class="sp"></span></div>
  <h3>Yopilganlar</h3><p class="pc-d">Arxivlangan bo‘limlar va barcha bajarilgan vazifalar — qidirish va saralash.</p>
  <div class="pc-st"><span>📦 ${n} bo‘lim</span><span>✅ Bajarilgan ishlar</span><span>🔎 Qidiruv</span></div></a>`;
const schoolCard = () => `<a class="pcard tilt sys" href="#/${can('schools') ? 'schools' : can('tickets') ? 'tickets' : 'news'}" style="--pc:#14b8a6">
  <div class="pc-top"><span class="pc-ic">🏫</span>${pill('gold', '★ Asosiy')}<span class="sp"></span>${counters.unread && can('tickets') ? `<span class="bd" style="position:static">${counters.unread}</span>` : ''}</div>
  <h3>Maktablar</h3><p class="pc-d">Al-Kundalik maktablari, ularning adminlari, murojaatlari va e’lonlar.</p>
  <div class="pc-st">${can('schools') ? '<span>🏫 Maktablar</span>' : ''}${can('tickets') ? '<span>💬 Muammolar</span>' : ''}${can('news') ? '<span>📣 E’lonlar</span>' : ''}</div></a>`;
function projectForm(p, done, defGroup) {
  const grps = window.__groups || [];
  const team = Object.values(TEAM).filter(x => x.id !== me.id), sel = {};
  (p?.members || []).forEach(m => { sel[m.id] = m.prole; });
  modal(`<h3>${p ? '✏️ Bo‘limni tahrirlash' : '📁 Yangi bo‘lim'}</h3><form id="pf2">
    <label class="f"><span>Nomi</span><input name="name" required maxlength="80" value="${esc(p?.name || '')}" placeholder="Masalan: Al-Kundalik" autofocus></label>
    ${isOwner() && grps.length ? `<label class="f"><span>Katta bo‘lim (ixtiyoriy)</span><select name="group"><option value="">— Yo‘q (alohida bo‘lim) —</option>${grps.map(g => `<option value="${g.id}" ${(p ? p.groupId : defGroup) === g.id ? 'selected' : ''}>${esc(g.icon + ' ' + g.name)}</option>`).join('')}</select></label>` : ''}
    <label class="f"><span>Tavsif</span><textarea name="descr" rows="2" maxlength="600" placeholder="Bu bo‘lim nima haqida?">${esc(p?.descr || '')}</textarea></label>
    <div class="logo-up" style="margin:4px 0 12px"><div id="pl">${p?.logo ? `<img class="ava big img" src="${esc(p.logo)}" alt="">` : `<div class="ava big ph" style="font-size:1.6rem">${esc(p?.icon || '📁')}</div>`}</div><div><b>Bo‘lim logosi</b><div class="muted small">PNG, JPG yoki WEBP (ixtiyoriy)</div><div class="row" style="margin-top:6px"><button type="button" class="btn o sm" id="plb">Logo tanlash</button><button type="button" class="btn o sm" id="plx" ${p?.logo ? '' : 'hidden'}>Olib tashlash</button></div></div></div>
    <p class="lbl">Belgi</p><div class="icons">${P_ICONS.map(i => `<label><input type="radio" name="icon" value="${i}" ${(p?.icon || '📁') === i ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div>
    <p class="lbl">Rang</p><div class="swatches">${['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#0ea5e9', '#f97316'].map(c => `<label><input type="radio" name="color" value="${c}" ${(p?.color || '#14b8a6') === c ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div>
    ${p ? '' : `<p class="lbl">A’zolar <span class="muted small">(siz avtomatik kirasiz)</span></p><div class="mlist">${team.length ? memberRows(team, sel) : '<p class="muted small">Avval “Adminlar” bo‘limidan xodim qo‘shing.</p>'}</div>`}
    <div class="row" style="margin-top:16px"><button class="btn">${p ? 'Saqlash' : 'Yaratish'}</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
    let logo; /* undefined = o‘zgarmadi, null = olib tashlash, string = yangi */
    $('#plb', bg).onclick = () => pickLogo(d => { logo = d; $('#pl', bg).innerHTML = `<img class="ava big img" src="${esc(d)}" alt="">`; $('#plx', bg).hidden = false; });
    $('#plx', bg).onclick = () => { logo = null; $('#pl', bg).innerHTML = `<div class="ava big ph" style="font-size:1.6rem">${esc($('[name=icon]:checked', bg)?.value || '📁')}</div>`; $('#plx', bg).hidden = true; };
    $('#pf2', bg).onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      const body = { name: f.get('name'), descr: f.get('descr'), icon: f.get('icon'), color: f.get('color') };
      if (f.has('group')) body.group = +f.get('group') || null;
      if (!p) body.members = f.getAll('m').map(id => ({ id: +id, prole: $(`[data-r="${id}"]`, bg).value }));
      try { let pid = p?.id; if (p) await api('/g/projects/' + p.id, 'PATCH', body); else pid = (await api('/g/projects', 'POST', body)).id; if (logo !== undefined && (pid && (logo || p?.logo))) await api(`/g/projects/${pid}/logo`, 'POST', { data: logo }); close(); Sfx.win(); toast(p ? 'Saqlandi ✓' : 'Bo‘lim yaratildi 🚀'); if (!p) confetti(); done?.(); } catch (er) { fail(er); }
    };
  }, true);
}

/* ───────── bitta bo‘lim ───────── */
async function projectView(el, id, tab) {
  let d; try { d = await api('/g/projects/' + id); } catch (e) { el.innerHTML = empty('🔒', esc(e.message || 'Bo‘lim topilmadi')) + '<p style="text-align:center"><a class="btn o" href="#/projects">← Bo‘limlar</a></p>'; return; }
  const P = { ...d.project, members: d.members, lead: d.lead, write: d.write };
  const tabs = [['umumiy', 'Umumiy', 'home'], ['vazifalar', 'Vazifalar', 'task'], ['chat', 'Chat', 'ticket'], ['hujjat', 'Hujjatlar', 'news'], ['azolar', 'A’zolar', 'staff']];
  const cur = tabs.some(t => t[0] === tab) ? tab : 'umumiy';
  const seen = +localStorage.getItem('dsd-pc-' + me.id + '-' + id) || 0;
  if (isOwner()) api('/g/groups').then(r => { window.__groups = r.groups; }).catch(() => {});
  const gp = P.groupId && (window.__groups || []).find(g => g.id === P.groupId);
  el.innerHTML = `<a class="back" href="${P.groupId ? '#/groups/' + P.groupId : '#/projects'}">← ${gp ? esc(gp.name) : P.groupId ? 'Katta bo‘lim' : 'Bo‘limlar'}</a>
  <div class="pban" style="--pc:${P.color}"><span class="pb-ic ${P.logo ? 'has' : ''}">${pico(P)}</span><div class="pb-t"><h2>${esc(P.name)} ${P.archived ? pill('gray', '📦 arxiv') : ''}</h2><p>${esc(P.descr || '')}</p><div class="row" style="margin-top:8px">${stack(P.members.map(m => m.id), 7)}<span class="small" style="opacity:.85">${P.members.length} a’zo</span></div></div>
    <div class="pb-r">${ring(P.progress, '#fff', 74)}${P.lead ? '<button class="btn o sm" id="pe">⚙ Sozlash</button>' : ''}</div></div>
  <div class="tabs ptabs">${tabs.map(([k, t]) => `<a href="#/projects/${id}/${k}" class="${cur === k ? 'on' : ''}">${t}${k === 'chat' && P.chatLast > seen && cur !== 'chat' ? ' <span class="bd" style="position:static">•</span>' : ''}</a>`).join('')}</div>
  <div id="pt" class="ptab"></div>`;
  const host = $('#pt'); const reload = () => render();
  if (P.lead) $('#pe').onclick = () => projectForm({ ...P }, reload);
  const F = { umumiy: projOverview, vazifalar: (h) => tasksView(h, null, null, P), chat: h => chatView(h, null, null, id), hujjat: projNotes, azolar: projMembers };
  try { await F[cur](host, P, reload); } catch (er) { host.innerHTML = empty('⚠️', esc(er.message || 'Xato')); }
}

async function projOverview(h, P, reload) {
  const [{ log }, { notes }] = await Promise.all([api(`/g/projects/${P.id}/log`), api(`/g/projects/${P.id}/notes`)]);
  const t = P.tasks, pinned = notes.filter(n => n.pinned);
  h.innerHTML = `<div class="grid g4">
    ${[['🆕', t.yangi, 'Yangi'], ['🛠️', t.jarayonda, 'Razrabotkada'], ['🔍', t.tekshiruv, 'Tekshiruvda'], ['✅', t.tayyor, 'Tayyor']].map(([i, n, l]) => `<a class="card ostat tilt" href="#/projects/${P.id}/vazifalar"><span>${i}</span><b data-count="${n}">0</b><small>${l}</small></a>`).join('')}</div>
  <div class="cols" style="margin-top:16px"><div class="card"><h3>📌 Qadalgan hujjatlar</h3>${pinned.length ? pinned.map(n => `<a class="nlink" href="#/projects/${P.id}/hujjat">${esc(n.title)}<small>${esc(n.author)}</small></a>`).join('') : '<p class="muted small">Hali qadalgan hujjat yo‘q. Rahbar “Hujjatlar” bo‘limida qadab qo‘ya oladi.</p>'}</div>
    <div class="card"><h3>⚡ So‘nggi faollik</h3>${log.length ? `<ul class="feed">${log.map(l => `<li><i></i><span><b>${esc(l.who)}</b> ${esc(l.text)}<small>${when(l.at)}</small></span></li>`).join('')}</ul>` : '<p class="muted small">Hali faollik yo‘q.</p>'}</div></div>`;
  $$('[data-count]', h).forEach(countUp);
}

async function projNotes(h, P, reload) {
  const { notes } = await api(`/g/projects/${P.id}/notes`);
  const open = n => modal(`<h3>${n ? '📝 Hujjat' : '📝 Yangi hujjat'}</h3><form id="nf"><label class="f"><span>Sarlavha</span><input name="title" required maxlength="120" value="${esc(n?.title || '')}" ${n && !(P.lead || n.authorId === me.id) ? 'readonly' : ''} autofocus></label>
    <label class="f"><span>Matn</span><textarea name="body" rows="12" maxlength="20000" ${n && !(P.lead || n.authorId === me.id) ? 'readonly' : ''} placeholder="Qaydlar, API manzillari, qarorlar, havolalar…">${esc(n?.body || '')}</textarea></label>
    ${P.lead ? `<label class="ptile wide"><input type="checkbox" name="pin" ${n?.pinned ? 'checked' : ''}><span class="pt-i">📌</span><span class="pt-t">Yuqoriga qadash<small>Umumiy sahifada ham ko‘rinadi</small></span><span class="pt-ok">✓</span></label>` : ''}
    <div class="row" style="margin-top:14px">${!n || P.lead || n.authorId === me.id ? '<button class="btn">Saqlash</button>' : ''}<button type="button" class="btn o" data-close>Yopish</button>${n && (P.lead || n.authorId === me.id) ? '<span class="sp"></span><button type="button" class="btn d sm" id="nd">🗑 O‘chirish</button>' : ''}</div></form>`, (bg, close) => {
    $('#nf', bg).onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const body = { title: f.get('title'), body: f.get('body'), pinned: f.get('pin') === 'on' }; try { n ? await api(`/g/projects/${P.id}/notes/${n.id}`, 'PATCH', body) : await api(`/g/projects/${P.id}/notes`, 'POST', body); close(); toast('Saqlandi ✓'); reload(); } catch (er) { fail(er); } };
    const d = $('#nd', bg); if (d) d.onclick = async () => { try { await api(`/g/projects/${P.id}/notes/${n.id}`, 'DELETE'); close(); reload(); } catch (er) { fail(er); } };
  }, true);
  h.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="muted small">Qaydlar, qarorlar va foydali ma’lumotlar</span><span class="sp"></span>${P.write ? `<button class="btn" id="nn">${ic('plus', 18)} Yangi hujjat</button>` : ''}</div>
    <div class="ngrid">${notes.length ? notes.map(n => `<div class="ncard tilt ${n.pinned ? 'pin' : ''}" data-n="${n.id}" tabindex="0">${n.pinned ? '<span class="pn">📌</span>' : ''}<b>${esc(n.title)}</b><p>${esc((n.body || '').slice(0, 140))}${(n.body || '').length > 140 ? '…' : ''}</p><small>${esc(n.author)} · ${when(n.updatedAt)}</small></div>`).join('') : empty('📝', 'Hali hujjat yo‘q')}</div>`;
  $$('[data-n]', h).forEach(c => { const go = () => open(notes.find(n => n.id === +c.dataset.n)); c.onclick = go; c.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  const nn = $('#nn'); if (nn) nn.onclick = () => open(null);
}

async function projMembers(h, P, reload) {
  const inP = new Set(P.members.map(m => m.id)), cand = Object.values(TEAM).filter(x => !inP.has(x.id));
  h.innerHTML = `<div class="card"><h3>👥 Bo‘lim a’zolari</h3><p class="muted small" style="margin-top:0">General adminlar barcha bo‘limlarni avtomatik ko‘radi. <b>Rahbar</b> vazifa beradi va tekshiradi; <b>A’zo</b> ishlaydi; <b>Kuzatuvchi</b> faqat ko‘radi.</p>
    <div class="mlist2">${P.members.map(m => { const u = who(m.id); return `<div class="mrow2">${avatar(u, 42)}<span class="mn"><b>${esc(u.name)}</b>${rolePill(u.role)}</span>${P.lead ? `<select data-pr="${m.id}">${Object.entries(P_ROLE).map(([k, v]) => `<option value="${k}" ${m.prole === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>` : pill(P_ROLE[m.prole][1], P_ROLE[m.prole][0])}${P.lead || m.id === me.id ? `<button class="btn o sm" data-rm="${m.id}">${m.id === me.id ? 'Chiqish' : '✕'}</button>` : ''}</div>`; }).join('')}</div>
    ${P.lead && cand.length ? `<form id="am" class="tadd" style="margin-top:16px"><select name="s">${cand.map(x => `<option value="${x.id}">${esc(x.name)} — ${esc(roleL(x.role))}</option>`).join('')}</select><select name="r">${Object.entries(P_ROLE).map(([k, v]) => `<option value="${k}" ${k === 'member' ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><button class="btn">${ic('plus', 18)} Qo‘shish</button></form>` : ''}
    ${isOwner() ? '<div class="danger"><button class="btn d sm" id="pd">🗑 Bo‘limni butunlay o‘chirish</button> <button class="btn o sm" id="pa2">' + (P.archived ? '♻️ Arxivdan qaytarish' : '📦 Arxivlash') + '</button></div>' : P.lead ? '<div class="danger"><button class="btn o sm" id="pa2">' + (P.archived ? '♻️ Arxivdan qaytarish' : '📦 Arxivlash') + '</button></div>' : ''}</div>`;
  $$('[data-pr]', h).forEach(s => s.onchange = async () => { try { await api(`/g/projects/${P.id}/members/${s.dataset.pr}`, 'PATCH', { prole: s.value }); toast('Rol o‘zgardi ✓'); } catch (er) { fail(er); } });
  $$('[data-rm]', h).forEach(b => b.onclick = async () => { try { await api(`/g/projects/${P.id}/members/${b.dataset.rm}`, 'DELETE'); +b.dataset.rm === me.id && !isOwner() ? (location.hash = '#/projects') : null; render(); } catch (er) { fail(er); } });
  const f = $('#am'); if (f) f.onsubmit = async e => { e.preventDefault(); try { await api(`/g/projects/${P.id}/members`, 'POST', { staff: +f.s.value, prole: f.r.value }); toast('A’zo qo‘shildi ✓'); render(); } catch (er) { fail(er); } };
  const pa = $('#pa2'); if (pa) pa.onclick = async () => { try { await api('/g/projects/' + P.id, 'PATCH', { archived: !P.archived }); toast('Bajarildi ✓'); render(); } catch (er) { fail(er); } };
  const pd = $('#pd'); if (pd) pd.onclick = async () => { const pw = await askPassword('Bo‘limni o‘chirish', `“${P.name}” va uning barcha vazifa, to-do, hujjat va chatlari o‘chadi.`, 'O‘chirish'); if (!pw) return; try { await api('/g/projects/' + P.id, 'DELETE', { confirm: pw }); toast('O‘chirildi'); location.hash = '#/projects'; } catch (er) { fail(er); } };
}

/* ───────── lichka ───────── */
let dmTimer = null, dmSect = null;
const ROLE_PL = { owner: 'General adminlar', tex: 'Tex adminlar', kurator: 'Kurator adminlar', dasturchi: 'Dasturchilar', dizayner: 'Dizaynerlar', tester: 'Testerlar', moliya: 'Moliyachilar', manager: 'Menejerlar' };
async function dmView(el, peerId) {
  clearInterval(chatTimer); clearInterval(dmTimer);
  const peer = /^\d+$/.test(peerId || '') ? +peerId : 0;
  let convs = {}, q = '', last = 0;
  const load = async () => { const r = await api('/g/dm'); convs = Object.fromEntries(r.convs.map(c => [c.id, c])); };
  await load();
  el.innerHTML = `<div class="dm ${peer ? 'has' : ''}"><aside class="dm-l"><div class="top" style="margin:0 0 10px"><h2>Lichka</h2></div><input id="dq" placeholder="Ism bo‘yicha qidirish…" autocomplete="off"><div id="dl"></div></aside>
    <section class="dm-r">${peer ? `<header><a class="back" href="#/dm">←</a>${pav(peer, 40)}<span><b>${esc(who(peer).name)}</b><small>${esc(roleL(who(peer).role))}</small></span></header><div class="cmsgs" id="dmm"></div><form class="cform" id="dmf"><input name="t" placeholder="Xabar yozing…" maxlength="2000" autocomplete="off"><button class="btn">${ic('send', 18)} Yuborish</button></form>` : empty('💌', 'Suhbatni tanlang — istalgan xodimga shaxsiy xabar yozishingiz mumkin')}</section></div>`;
  const person = x => { const c = convs[x.id]; return `<a class="dmi ${x.id === peer ? 'on' : ''}" href="#/dm/${x.id}">${pav(x.id, 44)}<span class="dn"><b>${esc(x.name)}</b><small>${c ? (c.mine ? 'Siz: ' : '') + esc(c.last.slice(0, 40)) : esc(roleL(x.role))}</small></span>${c?.unread && x.id !== peer ? `<span class="bd" style="position:static">${c.unread}</span>` : ''}</a>`; };
  const list = () => {
    const all_ = Object.values(TEAM).filter(x => x.id !== me.id), box = $('#dl');
    const byRole = k => all_.filter(x => x.role === k).sort((a, b) => a.name.localeCompare(b.name));
    if (q) { /* qidiruv — barcha bo‘limlar bo‘yicha */
      const l = all_.filter(x => x.name.toLowerCase().includes(q) || roleL(x.role).toLowerCase().includes(q));
      box.innerHTML = l.map(person).join('') || '<p class="muted small" style="padding:10px">Hech kim topilmadi</p>'; return;
    }
    if (dmSect) { /* tanlangan bo‘lim ichidagi odamlar */
      const l = byRole(dmSect);
      box.innerHTML = `<button class="sect-back" id="sb">← Barcha bo‘limlar</button><div class="sect-head">${roomPill(dmSect, 40)}<div><b>${esc(ROLE_PL[dmSect] || roleL(dmSect))}</b><small>${l.length} nafar</small></div></div>${l.map(person).join('') || '<p class="muted small" style="padding:10px">Bu bo‘limda hozircha hech kim yo‘q</p>'}`;
      $('#sb').onclick = () => { dmSect = null; list(); }; return;
    }
    /* bosh ko‘rinish: oxirgi suhbatlar + lavozim bo‘limlari */
    const recent = all_.filter(x => convs[x.id]).sort((a, b) => convs[b.id].at.localeCompare(convs[a.id].at)).slice(0, 5);
    const cards = Object.keys(ROLE_PL).map(k => { const l = byRole(k); if (!l.length) return ''; const un = l.reduce((n, x) => n + (convs[x.id]?.unread || 0), 0);
      return `<button class="sect-card" data-sect="${k}">${roomPill(k, 46)}<span class="dn"><b>${esc(ROLE_PL[k])}</b><small>${l.length} nafar</small></span>${un ? `<span class="bd" style="position:static">${un}</span>` : '<span class="chev">›</span>'}</button>`; }).join('');
    box.innerHTML = `${recent.length ? `<p class="sect-t">Oxirgi suhbatlar</p>${recent.map(person).join('')}` : ''}<p class="sect-t">Ish bo‘limlari</p><div class="sect-grid">${cards}</div>`;
    $$('[data-sect]', box).forEach(b => b.onclick = () => { dmSect = b.dataset.sect; list(); });
  };
  list(); $('#dq').oninput = e => { q = e.target.value.trim().toLowerCase(); list(); };
  if (!peer) { dmTimer = setInterval(async () => { if (!$('#dl')) return clearInterval(dmTimer); try { await load(); list(); } catch { /* ignore */ } }, 5000); return; }
  const box = $('#dmm');
  const add = ms => { const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 90 || !last; for (const m of ms) { last = Math.max(last, m.id); const mine = m.sender === me.id; box.insertAdjacentHTML('beforeend', `<div class="cm ${mine ? 'mine' : ''}">${mine ? '' : pav(peer, 34)}<div class="cb"><p>${esc(m.text)}</p><small>${when(m.at)}${mine ? (m.seen ? ' ✓✓' : ' ✓') : ''}</small></div></div>`); } if (ms.length && stick) box.scrollTop = box.scrollHeight; };
  const poll = async () => { if (!$('#dmm')) return clearInterval(dmTimer); try { const r = await api(`/g/dm/${peer}?after=${last}`); if (r.messages.length) { const fresh = last > 0 && r.messages.some(m => m.sender !== me.id); add(r.messages); if (fresh) Sfx.ok(); } await load(); list(); } catch { /* keyingi urinish */ } };
  await poll(); if (!last) box.innerHTML = empty('👋', 'Hali yozishmadi. Salom deng!'); else box.scrollTop = box.scrollHeight;
  dmTimer = setInterval(poll, 3000);
  $('#dmf').onsubmit = async e => { e.preventDefault(); const i = e.target.t, t = i.value.trim(); if (!t) return; i.value = ''; try { if (!last) box.innerHTML = ''; await api('/g/dm/' + peer, 'POST', { text: t }); await poll(); box.scrollTop = box.scrollHeight; } catch (er) { fail(er); i.value = t; } };
  $('#dmf input').focus();
}

/* yangi lichka xabari — fonda tekshirish */
setInterval(async () => {
  if (!token || document.hidden || $('.modal-bg')) return;
  try { const o = await api('/g/overview'); const was = counters.dmUnread || 0;
    if ((o.dmUnread || 0) > was && route()[0] !== 'dm') { Sfx.ok(); toast('💌 Lichkada yangi xabar'); counters = o; render(); } else { counters.dmUnread = o.dmUnread; }
  } catch { /* ignore */ }
}, 20000);

/* ───────── Katta arxiv ───────── */
async function archiveView(el) {
  clearInterval(chatTimer); clearInterval(dmTimer);
  const A = await api('/g/archive'); let tab = 'bolim', q = '', pr = '', mon = '';
  const st = A.stats, months = [...new Set(A.tasks.map(t => (t.finishedAt || '').slice(0, 7)).filter(Boolean))];
  const prs = Object.entries(Object.fromEntries(A.tasks.map(t => [t.project, t.pr])));
  el.innerHTML = `<a class="back" href="#/projects">← Bo‘limlar</a>
  <div class="pban arcban" style="--pc:#64748b"><span class="pb-ic">🗄️</span><div class="pb-t"><h2>Yopilganlar</h2><p>Yopilgan bo‘limlar va barcha bajarilgan vazifalar bir joyda.</p></div></div>
  <div class="grid g4" style="margin-top:14px">${tile('', 'folder', st.projects, 'Arxivdagi bo‘lim')}${tile('ok', 'task', st.tasks, 'Bajarilgan vazifa')}${tile('blue', 'staff', st.people, 'Qatnashgan odam')}${tile('gold', 'school', st.schools, 'Ulangan maktab')}</div>
  <div class="tabs" id="at" style="margin-top:14px"><a class="on" data-t="bolim">📦 Bo‘limlar</a><a data-t="vazifa">✅ Bajarilgan vazifalar</a></div>
  <div class="row" id="af" style="margin:10px 0;flex-wrap:wrap"><input id="aq" type="search" placeholder="Qidirish…" style="flex:1;min-width:180px"></div>
  <div id="ab"></div>`;
  const draw = () => {
    const needle = q.toLowerCase(), box = $('#ab');
    if (tab === 'bolim') {
      const l = A.projects.filter(p => !needle || (p.name + ' ' + (p.descr || '')).toLowerCase().includes(needle));
      box.innerHTML = l.length ? `<div class="pgrid">${l.map(projCard).join('')}</div>` : `<div class="card">${empty('📦', 'Arxivda bo‘lim yo‘q. Bo‘limning “A’zolar” sahifasi pastidagi “Arxivlash” tugmasi orqali yopishingiz mumkin.')}</div>`;
    } else {
      const l = A.tasks.filter(t => (!pr || String(t.project) === pr) && (!mon || (t.finishedAt || '').startsWith(mon)) && (!needle || (t.title + ' ' + (t.body || '') + ' ' + who(t.assignee).name).toLowerCase().includes(needle)));
      box.innerHTML = l.length ? `<div class="card">${l.map(t => `<a class="hrow" href="#/projects/${t.project}/vazifalar">${pav(t.assignee, 34)}<span class="hn"><b>${esc(t.title)}</b><small>${t.pr ? esc(t.pr.icon + ' ' + t.pr.name) + (t.pr.archived ? ' · 📦' : '') : ''} · ${esc(who(t.assignee).name)}</small></span>${pill('ok', '✅ ' + when(t.finishedAt))}</a>`).join('')}</div>` : `<div class="card">${empty('✅', 'Hech narsa topilmadi.')}</div>`;
    }
    $$('.tilt', box).forEach(x => x.classList.remove('tilt'));
  };
  const fl = () => { $('#af').innerHTML = `<input id="aq" type="search" placeholder="Qidirish…" value="${esc(q)}" style="flex:1;min-width:180px">` + (tab === 'vazifa' ? `<select id="ap"><option value="">Barcha bo‘limlar</option>${prs.map(([id, x]) => `<option value="${id}" ${pr === id ? 'selected' : ''}>${esc((x?.icon || '') + ' ' + (x?.name || id))}</option>`).join('')}</select><select id="am"><option value="">Barcha oylar</option>${months.map(m => `<option ${mon === m ? 'selected' : ''}>${m}</option>`).join('')}</select>` : '');
    $('#aq').oninput = e => { q = e.target.value; draw(); }; const ap = $('#ap'); if (ap) { ap.onchange = () => { pr = ap.value; draw(); }; $('#am').onchange = e => { mon = e.target.value; draw(); }; } };
  $$('#at a').forEach(a => a.onclick = () => { tab = a.dataset.t; $$('#at a').forEach(x => x.classList.toggle('on', x === a)); fl(); draw(); });
  fl(); draw(); $$('[data-count]', el).forEach(countUp);
}

/* ───────── Katta bo‘lim (guruh): ichida bo‘limlar ───────── */
function groupForm(g, done) {
  modal(`<h3>${g ? '✏️ Katta bo‘limni tahrirlash' : '🗂️ Yangi katta bo‘lim'}</h3><form id="gf">
    <div class="logo-up" style="margin:4px 0 12px"><div id="gl">${g?.logo ? `<img class="ava big img" src="${esc(g.logo)}" alt="">` : `<div class="ava big ph" style="font-size:1.6rem">${esc(g?.icon || '🗂️')}</div>`}</div><div><b>Logo</b><div class="muted small">PNG, JPG yoki WEBP (ixtiyoriy)</div><div class="row" style="margin-top:6px"><button type="button" class="btn o sm" id="glb">Logo tanlash</button><button type="button" class="btn o sm" id="glx" ${g?.logo ? '' : 'hidden'}>Olib tashlash</button></div></div></div>
    <label class="f"><span>Nomi</span><input name="name" required maxlength="80" value="${esc(g?.name || '')}" placeholder="Masalan: Kofe sayt" autofocus></label>
    <label class="f"><span>Tavsif</span><textarea name="descr" rows="2" maxlength="600" placeholder="Bu katta bo‘lim nima haqida? (ichida 12-ko‘cha, 13-ko‘cha kabi bo‘limlar bo‘ladi)">${esc(g?.descr || '')}</textarea></label>
    <p class="lbl">Belgi</p><div class="icons">${['🗂️', ...P_ICONS].map(i => `<label><input type="radio" name="icon" value="${i}" ${(g?.icon || '🗂️') === i ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div>
    <p class="lbl">Rang</p><div class="swatches">${['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#0ea5e9', '#f97316'].map(c => `<label><input type="radio" name="color" value="${c}" ${(g?.color || '#6366f1') === c ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn">${g ? 'Saqlash' : 'Yaratish'}</button><button type="button" class="btn o" data-close>Bekor</button></div></form>`, (bg, close) => {
    let logo;
    $('#glb', bg).onclick = () => pickLogo(d => { logo = d; $('#gl', bg).innerHTML = `<img class="ava big img" src="${esc(d)}" alt="">`; $('#glx', bg).hidden = false; });
    $('#glx', bg).onclick = () => { logo = null; $('#gl', bg).innerHTML = `<div class="ava big ph" style="font-size:1.6rem">${esc($('[name=icon]:checked', bg)?.value || '🗂️')}</div>`; $('#glx', bg).hidden = true; };
    $('#gf', bg).onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), body = { name: f.get('name'), descr: f.get('descr'), icon: f.get('icon'), color: f.get('color') };
      try { let id = g?.id; if (g) await api('/g/groups/' + g.id, 'PATCH', body); else id = (await api('/g/groups', 'POST', body)).id; if (logo !== undefined && (logo || g?.logo)) await api(`/g/groups/${id}/logo`, 'POST', { data: logo }); close(); Sfx.win(); toast(g ? 'Saqlandi ✓' : 'Katta bo‘lim yaratildi 🗂️'); if (!g) confetti(); done?.(id); } catch (er) { fail(er); } };
  }, true);
}
async function groupView(el, id) {
  clearInterval(chatTimer); clearInterval(dmTimer);
  if (isOwner()) api('/g/groups').then(r => { window.__groups = r.groups; }).catch(() => {});
  let d; try { d = await api('/g/groups/' + id); } catch (e) { el.innerHTML = empty('🔒', esc(e.message || 'Topilmadi')) + '<p style="text-align:center"><a class="btn o" href="#/projects">← Bo‘limlar</a></p>'; return; }
  const G = d.group, own = d.owner, act = d.projects.filter(p => !p.archived), arc = d.projects.filter(p => p.archived);
  el.innerHTML = `<a class="back" href="#/projects">← Bo‘limlar</a>
  <div class="pban" style="--pc:${G.color}"><span class="pb-ic ${G.logo ? 'has' : ''}">${pico(G)}</span><div class="pb-t"><h2>${esc(G.name)}</h2><p>${esc(G.descr || '')}</p><div class="row" style="margin-top:8px">${stack(G.members, 7)}<span class="small" style="opacity:.85">${G.members.length} a’zo</span></div></div>
    <div class="pb-r">${ring(G.progress, '#fff', 74)}${own ? '<button class="btn o sm" id="ge">⚙ Sozlash</button>' : ''}</div></div>
  <div class="grid g4" style="margin-top:14px">${tile('', 'folder', G.active, 'Bo‘lim')}${tile('warn', 'task', G.tasks.running, 'Razrabotkada')}${tile('gold', 'search', G.tasks.review, 'Tekshiruvda')}${tile('ok', 'task', G.tasks.done, 'Tayyor')}</div>
  <div class="row" style="margin:16px 0 10px"><h3 style="margin:0">Bo‘limlar</h3><span class="sp"></span>${own ? `<button class="btn" id="gnp">${ic('plus', 18)} Yangi bo‘lim</button>` : ''}</div>
  <div class="pgrid">${act.length ? act.map(projCard).join('') : `<div class="card" style="grid-column:1/-1">${empty('📁', own ? 'Hali bo‘lim yo‘q. Masalan: “12-ko‘cha”, “13-ko‘cha” kabi bo‘lim yarating.' : 'Sizga bu yerda bo‘lim biriktirilmagan.')}</div>`}</div>
  ${arc.length ? `<h3 style="margin:22px 0 10px">📦 Arxivlangan</h3><div class="pgrid">${arc.map(projCard).join('')}</div>` : ''}`;
  $$('[data-count]', el).forEach(countUp);
  if (own) {
    $('#gnp').onclick = () => projectForm(null, () => render(), G.id);
    $('#ge').onclick = () => modal(`<h3>⚙ ${esc(G.name)}</h3><div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><button class="btn" id="g1">✏️ Tahrirlash</button><button class="btn d" id="g2">🗑 Katta bo‘limni o‘chirish</button></div><p class="muted small">O‘chirilsa, ichidagi bo‘limlar o‘chmaydi — ular umumiy ro‘yxatga qaytadi.</p><button class="btn o" data-close>Yopish</button>`, (bg, close) => {
      $('#g1', bg).onclick = () => { close(); groupForm(G, () => render()); };
      $('#g2', bg).onclick = async () => { close(); const pw = await askPassword('Katta bo‘limni o‘chirish', `“${G.name}” o‘chiriladi (ichidagi bo‘limlar saqlanadi).`, 'O‘chirish'); if (!pw) return; try { await api('/g/groups/' + G.id, 'DELETE', { confirm: pw }); toast('O‘chirildi'); location.hash = '#/projects'; } catch (er) { fail(er); } };
    });
  }
}
