// Yumshoq tovush effektlari (WebAudio bilan yaratiladi, fayl kerak emas). Ovoz past: gain 0.03–0.05.
let ctx = null, master = null, on = true;
try { on = localStorage.getItem('kd-sound') !== '0'; } catch { /* ignore */ }

function ensure() {
  if (!on) return null;
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { t = 0, d = 0.09, type = 'sine', v = 0.04, to } = {}) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + t;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + d + 0.03);
}

const GRADE = { 2: 311, 3: 392, 4: 494, 5: 659 };

export const sfx = {
  click: () => tone(540, { d: 0.05, v: 0.025, type: 'triangle' }),
  tab: () => tone(420, { d: 0.08, v: 0.03, to: 560 }),
  grade: n => {
    tone(GRADE[n] || 440, { d: 0.13, v: 0.045 });
    if (n === 5) tone(988, { t: 0.07, d: 0.16, v: 0.025 });
  },
  present: () => tone(620, { d: 0.09, v: 0.035, to: 740 }),
  absent: () => tone(260, { d: 0.12, v: 0.035, type: 'triangle', to: 200 }),
  ok: () => { tone(523, { d: 0.14, v: 0.035 }); tone(784, { t: 0.09, d: 0.2, v: 0.035 }); },
  info: () => tone(600, { d: 0.1, v: 0.03 }),
  bell: () => { tone(880, { d: 0.5, v: 0.03 }); tone(660, { t: 0.28, d: 0.65, v: 0.03 }); },
  err: () => { tone(220, { d: 0.16, v: 0.04, type: 'triangle' }); tone(175, { t: 0.1, d: 0.22, v: 0.04, type: 'triangle' }); }
};

export const isOn = () => on;
export const setOn = v => {
  on = v;
  try { localStorage.setItem('kd-sound', v ? '1' : '0'); } catch { /* ignore */ }
  if (v) sfx.ok();
};

/** Bosish (pointerdown) bo‘yicha tovush: baho, davomat, tab va oddiy tugmalar uchun turlicha. */
export function initSfx() {
  const h = e => {
    const el = e.target.closest?.('button, .role');
    if (!el || el.disabled || el.classList.contains('sound-btn')) return;
    if (el.closest('.gr')) return sfx.grade(+el.textContent);
    if (el.classList.contains('doc-t')) return el.classList.contains('on') ? sfx.absent() : sfx.present();
    if (el.closest('.lang-sw')) return sfx.tab();
    if (el.closest('.tg')) return /Darsda/.test(el.textContent) ? sfx.present() : sfx.absent();
    if (el.closest('.tabs') || el.classList.contains('chip') || el.classList.contains('daytab')) return sfx.tab();
    sfx.click();
  };
  document.addEventListener('pointerdown', h, true);
  return () => document.removeEventListener('pointerdown', h, true);
}
