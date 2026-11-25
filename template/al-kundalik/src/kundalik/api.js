// Server bilan aloqa: login, holatni olish va o‘zgarishlarni (delta) yuborish.
import { BASE } from './site';

const KEY = 'kd-token';
let token = null;
try { token = sessionStorage.getItem(KEY); } catch { /* ignore */ }

export const hasToken = () => !!token;
export const setToken = t => {
  token = t;
  try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};

async function call(path, body) {
  let r;
  try {
    r = await fetch(BASE + '/api' + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw Object.assign(new Error('Server bilan aloqa yo‘q. Backend ishga tushganini tekshiring (npm run api).'), { status: 0 });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const down = !j.error && (r.status >= 500 || r.status === 404);
    throw Object.assign(new Error(j.error || (down ? 'Backend ishlamayapti. Alohida terminalda “npm run api” ni ishga tushiring va oynani yopmang.' : 'Xatolik yuz berdi.')), { status: down ? 0 : r.status, data: j });
  }
  return j;
}

export const api = {
  login: b => call('/login', b),
  state: () => call('/state'),
  sync: d => call('/sync', d),
  demo: () => call('/demo'),
  support: {
    list: () => call('/support/tickets'),
    get: id => call('/support/tickets/' + id),
    create: b => call('/support/tickets', b),
    reply: (id, text) => call('/support/tickets/' + id + '/reply', { text })
  }
};

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Oldingi (server bilan sinxron) holat bilan hozirgisini solishtirib, faqat o‘zgarganini qaytaradi. */
export function diffState(base, cur, role) {
  if (role !== 'admin' && role !== 'teacher') return null;
  const d = {};
  let any = false;
  const set = (k, v) => { d[k] = v; any = true; };

  if (role === 'admin') {
    if (!same(base.classes, cur.classes)) set('classes', cur.classes);
    ['subjects', 'teachers', 'students', 'sched', 'assign', 'leaders', 'hw', 'quarters'].forEach(k => { if (!same(base[k], cur[k])) set(k, cur[k]); });
    const fbNew = cur.fb.filter(x => !base.fb.includes(x));
    if (fbNew.length) set('fbNew', fbNew);
    const del = Object.keys(base.recMap).filter(k => !(k in cur.recMap));
    if (del.length) set('recDel', del);
  }

  const up = {};
  for (const k in cur.recMap) if (!same(base.recMap[k], cur.recMap[k])) up[k] = cur.recMap[k];
  if (Object.keys(up).length) set('recUp', up);

  if (role === 'teacher') {
    const hwUp = {};
    for (const k in cur.hw) if (base.hw[k] !== cur.hw[k]) hwUp[k] = cur.hw[k];
    for (const k in base.hw) if (!(k in cur.hw)) hwUp[k] = '';
    if (Object.keys(hwUp).length) set('hwUp', hwUp);
    const logoUp = {};
    for (const k in cur.logos) if (base.logos[k] !== cur.logos[k]) logoUp[k] = cur.logos[k];
    for (const k in base.logos) if (!(k in cur.logos)) logoUp[k] = '';
    if (Object.keys(logoUp).length) set('logoUp', logoUp);
    const docUp = {};
    const bd = base.docs || {}, cd = cur.docs || {};
    for (const k of new Set([...Object.keys(bd), ...Object.keys(cd)])) {
      if ((bd[k] || []).slice().sort().join() !== (cd[k] || []).slice().sort().join()) docUp[k] = cd[k] || [];
    }
    if (Object.keys(docUp).length) set('docUp', docUp);
    const msgsNew = cur.msgs.filter(x => !base.msgs.includes(x));
    if (msgsNew.length) set('msgsNew', msgsNew);
  }
  return any ? d : null;
}
