'use strict';
/* DASADA — maxsus tanlash (dropdown) va kalendar. Oddiy <select> va <input type=date> avtomatik almashtiriladi. */
(() => {
  const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const MON = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const CHEV = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let open = null;   // { pop, anchor, close }

  const closeAll = () => { if (open) { const o = open; open = null; o.pop.classList.add('out'); setTimeout(() => o.pop.remove(), 140); o.anchor.classList.remove('open'); o.anchor.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', o.key, true); } };
  const place = (pop, a) => {
    const r = a.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
    let left = Math.min(Math.max(8, r.left), vw - pw - 8), top = r.bottom + 6, up = false;
    if (top + ph > vh - 8 && r.top - ph - 6 > 8) { top = r.top - ph - 6; up = true; }
    pop.style.left = left + 'px'; pop.style.top = Math.max(8, top) + 'px'; pop.style.minWidth = pop.classList.contains('dp') ? '300px' : r.width + 'px'; pop.classList.toggle('up', up);
  };
  const show = (pop, anchor, key) => {
    closeAll(); document.body.appendChild(pop); place(pop, anchor); anchor.classList.add('open'); anchor.setAttribute('aria-expanded', 'true');
    open = { pop, anchor, key }; document.addEventListener('keydown', key, true);
  };
  document.addEventListener('mousedown', e => { if (open && !open.pop.contains(e.target) && !open.anchor.contains(e.target)) closeAll(); }, true);
  addEventListener('resize', closeAll);
  addEventListener('scroll', e => { if (open && !open.pop.contains(e.target)) closeAll(); }, true);

  /* ───── dropdown ───── */
  function enhanceSelect(sel) {
    if (sel.dataset.cs || sel.multiple || sel.size > 1) return; sel.dataset.cs = '1';
    const wrap = document.createElement('div'); wrap.className = 'cs'; wrap.style.cssText = sel.style.cssText;
    if (/width:\s*auto/.test(sel.style.cssText)) wrap.classList.add('inl');
    sel.style.cssText = ''; sel.classList.add('cs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cs-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    wrap.appendChild(btn);
    const label = () => { const o = sel.selectedOptions[0]; btn.innerHTML = `<span class="cs-t ${o && o.value === '' ? 'ph' : ''}">${E(o ? o.textContent : '—')}</span><i>${CHEV('M6 9l6 6 6-6')}</i>`; };
    label(); btn.disabled = sel.disabled;
    sel.addEventListener('change', label);
    const lab = sel.closest('label.f'); if (lab) lab.addEventListener('click', e => { if (!wrap.contains(e.target)) { e.preventDefault(); btn.click(); } });
    const toggle = () => {
      if (open && open.anchor === btn) return closeAll();
      const opts = [...sel.options]; let cur = Math.max(0, sel.selectedIndex), q = '', tq = 0;
      const pop = document.createElement('div'); pop.className = 'cs-pop'; pop.setAttribute('role', 'listbox');
      const searchable = opts.length > 8;
      pop.innerHTML = `${searchable ? '<input class="cs-s" placeholder="Qidirish…" autocomplete="off">' : ''}<div class="cs-l"></div>`;
      const list = pop.querySelector('.cs-l');
      const draw = () => {
        const f = q ? opts.filter(o => o.textContent.toLowerCase().includes(q)) : opts;
        list.innerHTML = f.length ? f.map(o => `<div class="cs-o ${o.index === sel.selectedIndex ? 'sel' : ''} ${o.index === cur ? 'on' : ''} ${o.disabled ? 'dis' : ''}" role="option" data-i="${o.index}"><span>${E(o.textContent)}</span><b>✓</b></div>`).join('') : '<div class="cs-e">Topilmadi</div>';
        list.querySelectorAll('.cs-o').forEach(d => { d.onmousemove = () => { if (+d.dataset.i !== cur) { cur = +d.dataset.i; list.querySelector('.on')?.classList.remove('on'); d.classList.add('on'); } }; d.onclick = () => pick(+d.dataset.i); });
        list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
      };
      const pick = i => { if (opts[i]?.disabled) return; sel.selectedIndex = i; closeAll(); label(); sel.dispatchEvent(new Event('change', { bubbles: true })); btn.focus(); };
      const move = d => { const f = [...list.querySelectorAll('.cs-o:not(.dis)')]; if (!f.length) return; let k = f.findIndex(x => +x.dataset.i === cur); k = Math.min(f.length - 1, Math.max(0, k + d)); cur = +f[k].dataset.i; draw(); };
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAll(); btn.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); pick(cur); }
        else if (e.key === 'Tab') closeAll();
        else if (!searchable && e.key.length === 1) { q = (Date.now() - tq < 700 ? q : '') + e.key.toLowerCase(); tq = Date.now(); const m = opts.find(o => o.textContent.toLowerCase().startsWith(q)); if (m) { cur = m.index; draw(); } q = ''; q = ''; }
      };
      show(pop, btn, key); draw();
      const si = pop.querySelector('.cs-s'); if (si) { si.focus(); si.oninput = () => { q = si.value.trim().toLowerCase(); const f = opts.filter(o => o.textContent.toLowerCase().includes(q)); cur = f[0]?.index ?? cur; draw(); }; }
      place(pop, btn);
    };
    btn.onclick = toggle;
    btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); if (!(open && open.anchor === btn)) toggle(); } });
  }

  /* ───── kalendar ───── */
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  const fmt = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${+m[3]} ${MON[+m[2] - 1]} ${m[1]}` : ''; };
  function enhanceDate(inp) {
    if (inp.dataset.cs) return; inp.dataset.cs = '1';
    const wrap = document.createElement('div'); wrap.className = 'cs dpw'; inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp); inp.type = 'hidden';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cs-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); wrap.appendChild(btn);
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'dp-x'; clr.title = 'Tozalash'; clr.innerHTML = '✕'; wrap.appendChild(clr);
    const label = () => { const t = fmt(inp.value); btn.innerHTML = `<i class="cal">${CHEV('M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z')}</i><span class="cs-t ${t ? '' : 'ph'}">${t || 'Sanani tanlang'}</span>`; clr.style.display = t ? '' : 'none'; };
    label();
    const set = v => { inp.value = v; label(); inp.dispatchEvent(new Event('change', { bubbles: true })); };
    clr.onclick = () => set('');
    btn.onclick = () => {
      if (open && open.anchor === btn) return closeAll();
      const t = todayIso(), base = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : t;
      let Y = +base.slice(0, 4), M = +base.slice(5, 7) - 1;
      const pop = document.createElement('div'); pop.className = 'cs-pop dp'; pop.setAttribute('role', 'dialog');
      const draw = () => {
        const first = new Date(Y, M, 1), lead = (first.getDay() + 6) % 7, days = new Date(Y, M + 1, 0).getDate();
        const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
        pop.innerHTML = `<div class="dp-h"><button type="button" data-n="-12" title="Oldingi yil">${CHEV('M11 17l-5-5 5-5M18 17l-5-5 5-5')}</button><button type="button" data-n="-1" title="Oldingi oy">${CHEV('M15 18l-6-6 6-6')}</button>
          <b>${MONTHS[M]} ${Y}</b><button type="button" data-n="1" title="Keyingi oy">${CHEV('M9 18l6-6-6-6')}</button><button type="button" data-n="12" title="Keyingi yil">${CHEV('M13 17l5-5-5-5M6 17l5-5-5-5')}</button></div>
          <div class="dp-w">${WD.map(w => `<span>${w}</span>`).join('')}</div>
          <div class="dp-g">${cells.map((d, i) => d ? `<button type="button" class="dp-d ${iso(Y, M, d) === t ? 'today' : ''} ${iso(Y, M, d) === inp.value ? 'sel' : ''} ${(i % 7) === 6 ? 'sun' : ''}" data-d="${iso(Y, M, d)}" style="animation-delay:${i * 8}ms">${d}</button>` : '<span></span>').join('')}</div>
          <div class="dp-f"><button type="button" data-a="today">Bugun</button><button type="button" data-a="tom">Ertaga</button><button type="button" data-a="week">+7 kun</button><button type="button" data-a="clear" class="mut">Tozalash</button></div>`;
        pop.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const n = +b.dataset.n; const d = new Date(Y, M + n, 1); Y = d.getFullYear(); M = d.getMonth(); draw(); });
        pop.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { set(b.dataset.d); closeAll(); btn.focus(); });
        const add = n => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
        pop.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { set({ today: t, tom: add(1), week: add(7), clear: '' }[b.dataset.a]); closeAll(); btn.focus(); });
      };
      const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAll(); btn.focus(); } else if (e.key === 'PageDown') { M++; if (M > 11) { M = 0; Y++; } draw(); } else if (e.key === 'PageUp') { M--; if (M < 0) { M = 11; Y--; } draw(); } };
      draw(); show(pop, btn, key); place(pop, btn);
      const redraw = draw; pop.addEventListener('click', () => requestAnimationFrame(() => place(pop, btn)));
    };
  }

  const scan = root => { (root.querySelectorAll ? root : document).querySelectorAll('select:not([data-cs])').forEach(enhanceSelect); (root.querySelectorAll ? root : document).querySelectorAll('input[type=date]:not([data-cs])').forEach(enhanceDate); if (open && !open.anchor.isConnected) closeAll(); };
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); if (open && !open.anchor.isConnected) closeAll(); }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();
