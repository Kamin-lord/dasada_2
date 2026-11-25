
import { useSite } from '../site';
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X, Copy, Undo2, CircleCheck, CircleAlert, Info, Eye, EyeOff, Dices, Inbox } from 'lucide-react';
import { gc, ABS, cl } from '../data';
import { sfx } from '../sfx';

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── Baho tugmalari ───────── */
export function Gr({ v, f, dis }) {
  return (
    <span className={'gr' + (dis ? ' dis' : '')}>
      {[2, 3, 4, 5].map(n => (
        <button key={n} type="button" className={v === n ? 'on ' + gc(n) : ''} onClick={() => f(n)}>{n}</button>
      ))}
    </span>
  );
}

export function ClassLogo({ cls, logos, s = 40 }) {
  const src = logos && logos[cls];
  if (src) return <img className="cls-logo" src={src} alt={cls + ' sinfi logotipi'} style={{ width: s, height: s }} />;
  return <span className="cls-logo" style={{ width: s, height: s, fontSize: Math.max(10, s * 0.36) }} aria-hidden="true">{String(cls).slice(0, 3)}</span>;
}

/** Rasmni kvadratga kesib, 160×160 ga kichraytiradi (logo hajmi ~10–30 KB bo‘ladi). */
export function fileToLogo(file, size = 160) {
  return new Promise((ok, no) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return no(new Error('Faqat rasm fayli (PNG, JPG, WEBP).'));
    if (file.size > 5e6) return no(new Error('Rasm 5 MB dan oshmasin.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const m = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', 0.85);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
      ok(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Rasmni o‘qib bo‘lmadi.')); };
    img.src = url;
  });
}

export function Tog({ v, f, dis }) {
  return (
    <span className={'tg' + (dis ? ' dis' : '')}>
      {[['Bor', 'Darsda', 'y'], [ABS, 'Kelmadi', 'n']].map(([a, b, c]) => (
        <button key={a} type="button" className={v === a ? 'on ' + c : ''} onClick={() => f(a)}>{b}</button>
      ))}
    </span>
  );
}

/* ───────── Tanlash (dropdown) ───────── */
export function Sel({ v, o, f, ph = 'Tanlang', full, className = '' }) {
  const [op, setOp] = useState(false);
  const [pos, setPos] = useState({});
  const ref = useRef(null);
  const dlRef = useRef(null);
  const opts = (o || []).map(x => Array.isArray(x) ? x : [x, x]);
  const cur = opts.find(x => String(x[0]) === String(v));

  const place = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openDown = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 140) - 8));
    setPos({
      left,
      minWidth: Math.max(r.width, 120),
      maxWidth: Math.min(320, window.innerWidth - 16),
      maxHeight: Math.max(160, Math.min(280, (openDown ? spaceBelow : spaceAbove) - 16)),
      ...(openDown
        ? { top: r.bottom + 6, bottom: 'auto', transformOrigin: 'top left' }
        : { bottom: window.innerHeight - r.top + 6, top: 'auto', transformOrigin: 'bottom left' }),
    });
  }, []);

  useEffect(() => {
    if (!op) return;
    place();
    let ignore = true;
    const t = setTimeout(() => { ignore = false; }, 0);
    const close = () => setOp(false);
    const onDown = e => {
      if (ignore) return;
      if (dlRef.current?.contains(e.target) || ref.current?.contains(e.target)) return;
      close();
    };
    const onKey = e => e.key === 'Escape' && close();
    const onScroll = e => { if (dlRef.current?.contains(e.target)) return; place(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [op, place]);

  useEffect(() => {
    if (op) dlRef.current?.querySelector('button.on')?.scrollIntoView({ block: 'nearest' });
  }, [op]);

  const toggle = e => {
    e.preventDefault();
    e.stopPropagation();
    if (op) setOp(false);
    else { place(); setOp(true); }
  };

  const menu = op ? createPortal(
    <div className="dl" ref={dlRef} style={pos} role="listbox">
      {opts.map(([a, b], i) => (
        <button
          key={String(a)}
          type="button"
          role="option"
          style={{ animationDelay: Math.min(i, 8) * 18 + 'ms' }}
          aria-selected={String(a) === String(v)}
          className={String(a) === String(v) ? 'on' : ''}
          onClick={e => { e.stopPropagation(); f(a); setOp(false); }}
        >
          <span>{b}</span>
          {String(a) === String(v) && <Check size={15} strokeWidth={3} />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <span className={'sl' + (full ? ' full' : '') + ' ' + className}>
      <button type="button" ref={ref} className={'sb' + (op ? ' op' : '') + (cur ? '' : ' empty')} onClick={toggle} aria-haspopup="listbox" aria-expanded={op}>
        <span>{cur ? cur[1] : ph}</span>
        <ChevronDown size={16} strokeWidth={2.6} />
      </button>
      {menu}
    </span>
  );
}

/* ───────── Chiplar (bosib tanlash) ───────── */
export function Chips({ o, v, f, multi, className = '' }) {
  const opts = (o || []).map(x => Array.isArray(x) ? x : [x, x]);
  const sel = multi ? new Set(v) : null;
  const click = a => {
    if (!multi) return f(a);
    const n = new Set(sel);
    n.has(a) ? n.delete(a) : n.add(a);
    f(opts.map(x => x[0]).filter(x => n.has(x)));
  };
  return (
    <div className={'chips ' + className} role={multi ? 'group' : 'radiogroup'}>
      {opts.map(([a, b, hint]) => {
        const on = multi ? sel.has(a) : a === v;
        return (
          <button key={String(a)} type="button" title={hint || undefined} aria-pressed={on} className={'chip' + (on ? ' on' : '')} onClick={() => click(a)}>
            <Check size={13} strokeWidth={3.4} className="ck" />{b}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Kichik bloklar ───────── */
export function G({ g }) {
  return g == null || isNaN(g) ? <span className="muted">—</span> : <span className={'bd ' + gc(Math.round(g))}>{Math.round(g)}</span>;
}

export function Bar({ p, tone }) {
  return <div className={'bar' + (tone ? ' ' + tone : '')}><i style={{ width: cl(p || 0, 0, 100) + '%' }} /></div>;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={'fld ' + className}>
      {label && <span className="fl">{label}</span>}
      {children}
      {hint && <small className="fh">{hint}</small>}
    </div>
  );
}

export function Empty({ icon, t, d, children }) {
  return (
    <div className="empty">
      <span className="empty-ic">{icon || <Inbox size={28} />}</span>
      <b>{t}</b>
      {d && <p>{d}</p>}
      {children}
    </div>
  );
}

const hueOf = s => [...String(s)].reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), 7) % 360;
export function Avatar({ name = '?', s = 38 }) {
  const ini = String(name).split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const h = hueOf(name);
  return (
    <span className="av" style={{ width: s, height: s, fontSize: Math.round(s * .38), background: `linear-gradient(135deg, hsl(${h} 72% 50%), hsl(${(h + 45) % 360} 76% 38%))` }}>
      {ini}
    </span>
  );
}

export function Count({ to = 0, dur = 1000, suffix = '', dec = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced()) { setV(to); return; }
    let raf, t0;
    const step = t => {
      if (t0 == null) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{dec ? v.toFixed(dec) : Math.round(v)}{suffix}</>;
}

/* ───────── Parol maydoni ───────── */
const genPw = () => {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 7 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};
export function Pw({ v, f, ph, gen = true, onEnter }) {
  const [show, setShow] = useState(gen);
  return (
    <span className="pw-wrap">
      <input className="w" type={show ? 'text' : 'password'} value={v} placeholder={ph} onChange={e => f(e.target.value)} onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()} autoComplete="off" />
      <span className="pw-btns">
        {gen && <button type="button" className="eye" title="Tasodifiy parol" aria-label="Tasodifiy parol" onClick={() => { f(genPw()); setShow(true); }}><Dices size={18} /></button>}
        <button type="button" className="eye" aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} onClick={() => setShow(s => !s)}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </span>
  );
}

/* ───────── Logo ───────── */
export function Logo({ s = 44 }) {
  const site = useSite();
  if (site.logo) return <img className="logo" src={site.logo} width={s} height={s} alt={site.name} style={{ objectFit: 'contain', borderRadius: Math.round(s / 4), background: '#fff' }} />;
  return (
    <svg className="logo" width={s} height={s} viewBox="0 0 64 64" role="img" aria-label="Al-Kundalik logotipi">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22c5b5" />
          <stop offset="1" stopColor="#0f6f78" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg1)" />
      <g fill="none" stroke="#f5c14e" strokeWidth="2.4" strokeLinejoin="round">
        <rect x="24" y="8" width="16" height="16" />
        <rect x="24" y="8" width="16" height="16" transform="rotate(45 32 16)" />
      </g>
      <circle cx="32" cy="16" r="2.6" fill="#f5c14e" />
      <path d="M9 33q11-4 23 2 12-6 23-2v19q-11-4-23 2-12-6-23-2z" fill="#fff" />
      <path d="M32 35v19" stroke="#0e2a47" strokeWidth="2" />
      <path d="M15 40q7-1 13 2M15 46q7-1 13 2M36 42q6-3 13-2M36 48q6-3 13-2" stroke="#1b8a8f" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

/* ───────── Tablar (siljuvchi indikator bilan) ───────── */
export function Tabs({ t, v, f, icons = {}, badges = {} }) {
  const ref = useRef(null);
  const first = useRef(true);
  const [ind, setInd] = useState(null);
  const key = t.join('|');
  const measure = useCallback(() => {
    const el = ref.current?.querySelector('button.on');
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);
  useIso(() => { measure(); }, [v, key, measure]);
  useEffect(() => {
    const el = ref.current?.querySelector('button.on');
    if (el && !first.current) ref.current.scrollTo({ left: el.offsetLeft - 24, behavior: reduced() ? 'auto' : 'smooth' });
    first.current = false;
  }, [v]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  return (
    <div className="tabs" role="tablist" ref={ref}>
      <div className="tabs-in">
        {ind && <span className="tab-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />}
        {t.map(x => (
          <button key={x} type="button" role="tab" aria-selected={v === x} className={v === x ? 'on' : ''} onClick={() => f(x)}>
            {icons[x]}
            <span>{x}</span>
            {badges[x] ? <em className="tab-badge">{badges[x]}</em> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Build({ k, children }) {
  return <div className="build" key={k}>{children}</div>;
}

/* ───────── Modal ───────── */
export function Modal({ open, onClose, title, icon, children, foot, wide, tone }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const key = e => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tm = setTimeout(() => ref.current?.querySelector('input:not([type=hidden]):not([disabled]), textarea')?.focus({ preventScroll: true }), 120);
    return () => {
      clearTimeout(tm);
      document.removeEventListener('keydown', key);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="mo" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'md' + (wide ? ' wide' : '') + (tone ? ' ' + tone : '')} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="md-h">
          {icon && <span className="md-ic">{icon}</span>}
          <h3>{title}</h3>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Yopish"><X size={20} /></button>
        </div>
        <div className="md-b">{children}</div>
        {foot && <div className="md-f">{foot}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Confirm({ open, title, text, ok = 'Ha, o‘chirish', danger = true, onOk, onClose, icon }) {
  return (
    <Modal open={open} onClose={onClose} title={title} tone={danger ? 'danger' : ''} icon={icon}
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Bekor qilish</button>
        <button type="button" className={'b' + (danger ? ' red' : '')} onClick={() => { onOk(); onClose(); }}>{ok}</button>
      </>}>
      <p className="confirm-t">{text}</p>
    </Modal>
  );
}

/* ───────── Xabarnomalar (toast) ───────── */
const subs = new Set();
export const toast = (msg, o = {}) => {
  const t = { id: Date.now() + Math.random(), msg, tone: 'ok', ms: 4800, ...o };
  subs.forEach(f => f(t));
  (sfx[t.tone === 'err' ? 'err' : t.tone === 'info' ? 'info' : 'ok'])();
};

export function ToastHost() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const f = t => {
      setList(l => [...l.slice(-3), t]);
      setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), t.ms);
    };
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  const close = id => setList(l => l.filter(x => x.id !== id));
  return (
    <div className="toasts" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={'toast ' + t.tone} style={{ '--ms': t.ms + 'ms' }}>
          <span className="toast-ic">
            {t.tone === 'err' ? <CircleAlert size={20} /> : t.tone === 'info' ? <Info size={20} /> : <CircleCheck size={20} />}
          </span>
          <span className="toast-t">{t.msg}</span>
          {t.undo && (
            <button type="button" className="toast-undo" onClick={() => { t.undo(); close(t.id); }}>
              <Undo2 size={15} /> Qaytarish
            </button>
          )}
          <button type="button" className="toast-x" aria-label="Yopish" onClick={() => close(t.id)}><X size={16} /></button>
          <i className="toast-bar" />
        </div>
      ))}
    </div>
  );
}

/* ───────── Nusxalash ───────── */
export async function copyText(text, msg = 'Nusxalandi') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg, { ms: 2200 });
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg, { ms: 2200 }); } catch { toast('Nusxalab bo‘lmadi', { tone: 'err' }); }
    ta.remove();
  }
}

/* ───────── Konfetti ───────── */
export function burst(x, y, n = 36) {
  if (typeof document === 'undefined' || reduced()) return;
  const W = window.innerWidth, H = window.innerHeight;
  const ox = x ?? W / 2, oy = y ?? H * .4;
  const colors = ['#14b8a6', '#f5b942', '#fb7185', '#60a5fa', '#a78bfa', '#34d399', '#fbbf24'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'cf';
    const size = 6 + Math.random() * 7;
    el.style.cssText = `left:${ox}px;top:${oy}px;width:${size}px;height:${size * (Math.random() > .5 ? 1 : .45)}px;background:${colors[i % colors.length]};border-radius:${Math.random() > .6 ? '50%' : '2px'}`;
    document.body.appendChild(el);
    const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 190;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 80;
    el.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 720 - 360}deg) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 220}px)) rotate(${Math.random() * 900 - 450}deg) scale(.6)`, opacity: 0 }
    ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => el.remove();
  }
}

/* ───────── Global effektlar: ripple, spotlight, tilt ───────── */
export function useFx() {
  useEffect(() => {
    if (reduced()) return;
    const RIP = '.b, .tabs button, .role, .sb, .chip, .qa, .ib, .theme-btn, .dl button, .gr button, .tg button, .toast-undo';
    const down = e => {
      const el = e.target.closest?.(RIP);
      if (!el || el.disabled) return;
      const r = el.getBoundingClientRect();
      const s = Math.max(r.width, r.height) * 2.2;
      const sp = document.createElement('span');
      sp.className = 'ripple';
      sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      el.appendChild(sp);
      sp.addEventListener('animationend', () => sp.remove());
    };
    let raf = 0;
    const move = e => {
      const el = e.target.closest?.('.card, .role, .tc, .qa, .tile');
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
        if (el.classList.contains('role')) {
          el.style.setProperty('--rx', ((y / r.height - .5) * -10).toFixed(2) + 'deg');
          el.style.setProperty('--ry', ((x / r.width - .5) * 12).toFixed(2) + 'deg');
        }
      });
    };
    const leave = e => {
      const el = e.target.closest?.('.role');
      if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      cancelAnimationFrame(raf);
    };
  }, []);
}
