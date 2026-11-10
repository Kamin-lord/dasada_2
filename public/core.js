'use strict';
/* DASADA — yadro: yordamchilar, API, modal, effektlar. Barcha matn escape qilinadi. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => (n == null ? '—' : Number(n).toLocaleString('uz'));

const CAT = { texnik: 'Texnik nosozlik', hisob: 'Hisob / parol', malumot: 'Ma’lumot xatosi', taklif: 'Taklif', boshqa: 'Boshqa' };
const ROLE = {
  owner: ['General admin', 'gold', '★'], tex: ['Tex admin', 'blue', '🛠️'], kurator: ['Kurator admin', 'purple', '🎓'], dasturchi: ['Dasturchi', 'ok', '💻'], dizayner: ['Dizayner', 'pink', '🎨'],
  tester: ['Tester (QA)', 'warn', '🧪'], moliya: ['Moliyachi', 'ok', '💰'], manager: ['Menejer', 'gray', '📋'] };
const roleL = r => (ROLE[r] || ROLE.manager)[0];
const rolePill = r => `<span class="pill ${(ROLE[r] || ROLE.manager)[1]}">${(ROLE[r] || ROLE.manager)[2]} ${esc(roleL(r))}</span>`;
const ROLE_PERMS = { tex: ['schools', 'users', 'admins'], kurator: ['schools', 'tickets', 'users', 'news'], dasturchi: ['users'], dizayner: ['news'], tester: ['tickets', 'users'], moliya: ['schools'], manager: ['schools', 'tickets'] };
const PRI = { past: 'Past', oddiy: 'Oddiy', yuqori: 'Yuqori', shoshilinch: 'Shoshilinch' };
const PRI_C = { past: 'gray', oddiy: 'blue', yuqori: 'warn', shoshilinch: 'err' };
const ST = { yangi: 'Yangi', jarayonda: 'Jarayonda', hal: 'Hal qilindi', yopiq: 'Yopiq' };
const ST_C = { yangi: 'err', jarayonda: 'warn', hal: 'ok', yopiq: 'gray' };
const PERM_L = { schools: 'Maktablar', tickets: 'Muammolar', users: 'Foydalanuvchi ma’lumotlari', admins: 'Maktab adminlari', news: 'E’lonlar' };
const DOC_L = { ariza: 'Ariza', tibbiy: 'Tibbiy', foto: 'Foto', metrika: 'Guvohnoma', ota_id: 'Ota-ona ID', manzil: 'Manzil', shaxsiy: 'Shaxsiy ish', imtiyoz: 'Imtiyoz' };
const ACT_L = { 'school.add': 'Maktab qo‘shildi', 'school.edit': 'Maktab o‘zgartirildi', 'school.del': 'Maktab o‘chirildi', 'school.key': 'Ulanish kodi yangilandi', 'school.logo': 'Logo o‘zgardi', 'sadmin.add': 'Maktab admini qo‘shildi', 'sadmin.edit': 'Maktab admini o‘zgardi', 'sadmin.reset': 'Admin paroli yangilandi', 'sadmin.del': 'Maktab admini o‘chirildi', 'staff.add': 'Xodim qo‘shildi', 'staff.edit': 'Xodim o‘zgardi', 'staff.del': 'Xodim o‘chirildi', 'staff.reset': 'Xodim paroli yangilandi', 'staff.password': 'Parol almashdi', 'ticket.status': 'Murojaat holati', 'ticket.assign': 'Murojaat biriktirildi', announce: 'E’lon yuborildi' };

const I = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
  task: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M8 13l3 3 5-6"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', school: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
  ticket: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', news: '<path d="M4 11v2a2 2 0 0 0 2 2h1l5 4V5L7 9H6a2 2 0 0 0-2 2zM16 8a5 5 0 0 1 0 8"/>',
  staff: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.6 3 5"/>',
  log: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>', kids: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.6 3 5"/>',
  teach: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>', fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', plus: '<path d="M12 5v14M5 12h14"/>', moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  check: '<path d="M20 6L9 17l-5-5"/>', doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
};
const ic = (k, s) => I(ICON[k], s);

/* ───────── sessiya va API ───────── */
let token = null, me = null;
try { token = sessionStorage.getItem('dsd-token'); me = JSON.parse(sessionStorage.getItem('dsd-me') || 'null'); } catch { /* ignore */ }
const setSession = (t, m) => { token = t; me = m; try { t ? (sessionStorage.setItem('dsd-token', t), sessionStorage.setItem('dsd-me', JSON.stringify(m))) : (sessionStorage.removeItem('dsd-token'), sessionStorage.removeItem('dsd-me')); } catch { /* ignore */ } };
const can = p => !!me && (me.role === 'owner' || (me.perms || []).includes(p));
const isOwner = () => me?.role === 'owner';

async function api(path, method = 'GET', body) {
  let r;
  try { r = await fetch('/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error('Server bilan aloqa yo‘q.'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { setSession(null); render(); throw new Error(j.error || 'Qaytadan kiring.'); }
  if (!r.ok) throw new Error(j.error || 'Xatolik yuz berdi.');
  return j;
}

/* ───────── vaqt ───────── */
const TZ = 'Asia/Tashkent';
const ago = iso => {
  if (!iso) return '—';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'hozir'; if (m < 60) return m + ' daqiqa oldin'; if (m < 1440) return Math.floor(m / 60) + ' soat oldin';
  return new Date(iso).toLocaleDateString('uz-UZ', { timeZone: TZ });
};
const when = iso => new Date(iso).toLocaleString('uz-UZ', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* ───────── toast, nusxalash ───────── */
let toast = function (msg, err) {
  const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : ''); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 250); }, err ? 4500 : 2600);
};
const fail = e => toast(e.message, true);
const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Nusxalandi ✓'); } catch { toast('Nusxalab bo‘lmadi — qo‘lda belgilab oling', true); } };

/* ───────── modal ───────── */
function modal(html, onMount, wide) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.classList.add('out'); setTimeout(() => bg.remove(), 160); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  document.addEventListener('keydown', key);
  document.body.appendChild(bg);
  $$('[data-close]', bg).forEach(b => b.addEventListener('click', close));
  onMount && onMount(bg, close);
  const f = $('input:not([type=hidden]):not([type=file]),textarea,select', bg); f && f.focus();
  return close;
}
/** Xavfli amal uchun parolni qayta so‘raydi → parol matnini qaytaradi (bekor qilinsa null). */
function askPassword(title, text, okLabel = 'Tasdiqlash') {
  return new Promise(res => {
    let done = false;
    modal(`<h3>${ic('lock', 22)} ${esc(title)}</h3><p class="muted">${esc(text)}</p>
      <form id="pf"><label class="f"><span>Parolingiz</span><input name="pw" type="password" autocomplete="current-password" required></label>
      <div class="row"><button class="btn d">${esc(okLabel)}</button><button type="button" class="btn o" data-close>Bekor qilish</button></div></form>`, (bg, close) => {
      $('#pf', bg).onsubmit = e => { e.preventDefault(); done = true; res(new FormData(e.target).get('pw')); close(); };
      new MutationObserver(() => { if (!bg.isConnected && !done) { done = true; res(null); } }).observe(document.body, { childList: true });
    });
  });
}
const copyRow = (label, val) => `<div class="cred"><span>${esc(label)}</span><b>${esc(val)}</b><button type="button" class="btn o sm" data-copy="${esc(val)}">Nusxalash</button></div>`;
const wireCopy = root => $$('[data-copy]', root).forEach(b => b.onclick = () => copy(b.dataset.copy));

/* ───────── effektlar ───────── */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(root = document) {
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count || 0, dec = +el.dataset.dec || 0;
    if (reduced || to === 0) { el.textContent = to.toLocaleString('uz', { maximumFractionDigits: dec }); return; }
    const t0 = performance.now(), dur = 900;
    const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toLocaleString('uz', { maximumFractionDigits: dec, minimumFractionDigits: dec }); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
document.addEventListener('mousemove', e => {          // 3D tilt + nur
  const c = e.target.closest && e.target.closest('.tilt'); if (!c || reduced) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); c.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
  c.style.setProperty('--mx', (x + .5) * 100 + '%'); c.style.setProperty('--my', (y + .5) * 100 + '%');
});
document.addEventListener('mouseout', e => { const c = e.target.closest && e.target.closest('.tilt'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
document.addEventListener('pointerdown', e => {          // ripple
  const b = e.target.closest && e.target.closest('.btn,.chip'); if (!b || reduced) return;
  const r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height) * 2;
  s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
});
function confetti() {
  if (reduced) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
  const g = cv.getContext('2d'), cols = ['#14b8a6', '#f5b942', '#fb7185', '#60a5fa', '#a78bfa', '#4ade80'];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .6, vx: (Math.random() - .5) * 16, vy: -Math.random() * 18 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
  let n = 0;
  (function f() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.vy += .5; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - n / 110); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
    if (++n < 110) requestAnimationFrame(f); else cv.remove();
  })();
}
/* mavzu */
let theme = null; try { theme = localStorage.getItem('dsd-theme'); } catch { /* ignore */ }
const applyTheme = () => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; };
const toggleTheme = () => { const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; theme = dark ? 'light' : 'dark'; try { localStorage.setItem('dsd-theme', theme); } catch { /* ignore */ } applyTheme(); };
applyTheme();

/* ───────── logo tanlash (brauzerda 256px ga kichraytiriladi) ───────── */
function pickLogo(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    if (f.size > 8e6) return toast('Rasm juda katta (8 MB gacha).', true);
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
      const k = Math.min(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
      g.clearRect(0, 0, S, S); g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h); URL.revokeObjectURL(url);
      let d = cv.toDataURL('image/png'); if (d.length > 190e3) d = cv.toDataURL('image/webp', .85);
      d.length > 190e3 ? toast('Logo juda og‘ir — soddaroq rasm tanlang.', true) : cb(d);
    };
    img.onerror = () => toast('Rasmni o‘qib bo‘lmadi.', true);
    img.src = url;
  };
  inp.click();
}
const avatar = (s, size = 50) => s.logo ? `<img class="ava img" style="width:${size}px;height:${size}px" src="${esc(s.logo)}" alt="">`
  : `<span class="ava" style="width:${size}px;height:${size}px;background:${['#0f766e', '#2563eb', '#9333ea', '#e11d48', '#d97706', '#0891b2', '#16a34a'][s.id % 7]}">${esc((String(s.name).match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase())}</span>`;
const pwField = (name, label, ph = '') => `<label class="f"><span>${label}</span><div class="pwbox"><input name="${name}" type="password" autocomplete="new-password" placeholder="${esc(ph)}"><button type="button" class="eye" data-eye aria-label="Ko‘rsatish">${ic('eye', 18)}</button></div></label>`;
const wireEyes = root => $$('[data-eye]', root).forEach(b => b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; });
const csv = (name, rows) => {
  const t = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ═════ v3: tovush, qidiruv palitrasi, nur, zarrachalar, soat ═════ */
const Sfx = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem('dsd-sound') !== '0'; } catch { /* ignore */ }
  const beep = (f, d = .09, type = 'sine', v = .05, at = 0) => {
    if (!on || reduced) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + .02);
    } catch { /* ovoz bo‘lmasa ham ishlayveradi */ }
  };
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('dsd-sound', on ? '1' : '0'); } catch { /* ignore */ } if (on) this.ok(); return on; },
    tap() { beep(620, .05, 'triangle', .035); }, ok() { beep(523, .12, 'sine', .05); beep(784, .18, 'sine', .05, .09); },
    err() { beep(180, .22, 'sawtooth', .04); }, open() { beep(440, .08, 'sine', .04); beep(660, .1, 'sine', .04, .06); }, win() { [523, 659, 784, 1047].forEach((f, i) => beep(f, .2, 'sine', .05, i * .08)); }
  };
})();
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn,.chip,.nav a,.tabs a,.sc,.tk')) Sfx.tap(); }, true);
const _toast = toast;
toast = function (msg, err) { err ? Sfx.err() : Sfx.ok(); return _toast(msg, err); };

/* kursor nuri (fonda) */
document.addEventListener('mousemove', e => { document.documentElement.style.setProperty('--cx', e.clientX + 'px'); document.documentElement.style.setProperty('--cy', e.clientY + 'px'); }, { passive: true });

/* tepadagi yuklanish chizig‘i */
const Bar = { el: null, start() { if (!this.el) { this.el = document.createElement('div'); this.el.id = 'topbar'; document.body.appendChild(this.el); } this.el.className = ''; void this.el.offsetWidth; this.el.className = 'go'; }, done() { if (this.el) this.el.className = 'end'; } };

/* kirish sahifasidagi zarrachalar */
function particles(host) {
  if (reduced) return () => {};
  const cv = document.createElement('canvas'); cv.className = 'particles'; host.prepend(cv);
  const g = cv.getContext('2d'); let w, h, raf, ps = [];
  const fit = () => { w = cv.width = host.clientWidth; h = cv.height = host.clientHeight; ps = Array.from({ length: Math.min(70, w * h / 14000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, r: 1 + Math.random() * 2 })); };
  fit(); addEventListener('resize', fit);
  (function f() {
    if (!cv.isConnected) return removeEventListener('resize', fit);
    g.clearRect(0, 0, w, h);
    for (const p of ps) { p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y); if (d < 110) { g.strokeStyle = `rgba(245,185,66,${(1 - d / 110) * .35})`; g.beginPath(); g.moveTo(ps[i].x, ps[i].y); g.lineTo(ps[j].x, ps[j].y); g.stroke(); } }
    raf = requestAnimationFrame(f);
  })();
  return () => cancelAnimationFrame(raf);
}

/* Toshkent vaqti */
const clockText = () => {
  const d = new Date(), t = new Intl.DateTimeFormat('uz-UZ', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'numeric', weekday: 'short' }).formatToParts(d).map(x => [x.type, x.value]));
  const WD = { Mon: 'Dushanba', Tue: 'Seshanba', Wed: 'Chorshanba', Thu: 'Payshanba', Fri: 'Juma', Sat: 'Shanba', Sun: 'Yakshanba' }, MO = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const day = `${WD[p.weekday]}, ${p.day}-${MO[p.month - 1]}`;
  return [t, day];
};
setInterval(() => { const c = $('#clk'); if (c) { const [t, d] = clockText(); c.firstElementChild.textContent = t; c.lastElementChild.textContent = d; } }, 1000);

/* ───────── buyruqlar palitrasi (Ctrl+K yoki /) ───────── */
async function palette() {
  if ($('.pal')) return;
  Sfx.open();
  const bg = document.createElement('div'); bg.className = 'modal-bg pal';
  bg.innerHTML = `<div class="palbox"><input id="pi" placeholder="Maktab, murojaat yoki bo‘lim qidiring…  (↑↓ Enter)" autocomplete="off"><div id="pl" class="pl"></div><div class="palh"><span><kbd>↑</kbd><kbd>↓</kbd> tanlash</span><span><kbd>Enter</kbd> ochish</span><span><kbd>Esc</kbd> yopish</span><span class="sp"></span><img class="pal-logo" src="logo-icon.png" alt=""></div></div>`;
  document.body.appendChild(bg);
  const close = () => { bg.classList.add('out'); setTimeout(() => bg.remove(), 160); document.removeEventListener('keydown', key, true); };
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  const go = h => () => { close(); location.hash = h; };
  const base = [['Bosh sahifa', '#/home', 'home', 'Bo‘lim'], ...(can('schools') ? [['Maktablar', '#/schools', 'school', 'Bo‘lim'], ['Yangi maktab qo‘shish', '#/schools/new', 'plus', 'Amal']] : []), ...(can('tickets') ? [['Muammolar', '#/tickets', 'ticket', 'Bo‘lim']] : []),
    ...(can('news') ? [['E’lonlar', '#/news', 'news', 'Bo‘lim']] : []), ...(isOwner() ? [['Jurnal', '#/audit', 'log', 'Bo‘lim']] : []), ['Bo‘limlar', '#/projects', 'folder', 'Bo‘lim'], ['Ishchilar', '#/workers', 'staff', 'Bo‘lim'], ['Lichka', '#/dm', 'mail', 'Bo‘lim'], ['Jamoa chati', '#/chat', 'ticket', 'Bo‘lim'], ['Sozlamalar', '#/settings', 'cog', 'Bo‘lim']].map(([t, h, i, k]) => ({ t, h, i, k }));
  let items = [...base], sel = 0;
  const [sc, tk] = await Promise.all([can('schools') ? api('/g/schools').catch(() => ({ schools: [] })) : { schools: [] }, can('tickets') ? api('/g/tickets?status=').catch(() => ({ tickets: [] })) : { tickets: [] }]);
  items.push(...sc.schools.map(s => ({ t: s.name, s: s.region, h: '#/schools/' + s.id, i: 'school', k: 'Maktab' })), ...tk.tickets.slice(0, 80).map(t => ({ t: t.title, s: t.school, h: '#/tickets/' + t.id, i: 'ticket', k: 'Murojaat' })));
  try { const pj = await api('/g/projects'); items.push(...pj.projects.filter(x => !x.archived).map(x => ({ t: x.icon + ' ' + x.name, s: 'Bo‘lim', h: '#/projects/' + x.id, i: 'folder', k: 'Bo‘lim' }))); } catch { /* ignore */ }
  items.push({ t: 'Mavzuni almashtirish', h: null, i: 'moon', k: 'Amal', fn: toggleTheme }, { t: 'Chiqish', h: null, i: 'out', k: 'Amal', fn: () => { setSession(null); render(); } });
  const list = $('#pl', bg), inp = $('#pi', bg);
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    const l = (q ? items.filter(x => (x.t + ' ' + (x.s || '')).toLowerCase().includes(q)) : base).slice(0, 12); sel = Math.min(sel, Math.max(0, l.length - 1));
    list.innerHTML = l.length ? l.map((x, i) => `<div class="pi ${i === sel ? 'on' : ''}" data-i="${i}">${ic(x.i, 18)}<span class="pt">${esc(x.t)}${x.s ? `<small>${esc(x.s)}</small>` : ''}</span><em>${x.k}</em></div>`).join('') : '<div class="empty" style="padding:24px">Hech narsa topilmadi</div>';
    $$('.pi', list).forEach(el => { el.onclick = () => run(l[+el.dataset.i]); el.onmousemove = () => { sel = +el.dataset.i; $$('.pi', list).forEach((e2, j) => e2.classList.toggle('on', j === sel)); }; });
    draw.l = l;
  };
  const run = x => { if (!x) return; if (x.fn) { close(); x.fn(); } else go(x.h)(); };
  const key = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, draw.l.length - 1); draw(); $('.pi.on', list)?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); $('.pi.on', list)?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); run(draw.l[sel]); }
  };
  document.addEventListener('keydown', key, true);
  inp.oninput = () => { sel = 0; draw(); }; draw(); inp.focus();
}
document.addEventListener('keydown', e => {
  if (!token) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
  else if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); palette(); }
});
