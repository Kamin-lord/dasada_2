// Maktab sayti brendi (nomi, logosi). Shablon bir xil; har maktab uchun nom/logo serverdan keladi (/api/site).
import { useEffect, useState } from 'react';

/** Sayt /s/<maktab>/ yo‘lida ochilgan bo‘lsa (DASADA sinov manzili) — API so‘rovlari shu prefiks bilan ketadi. */
const m = typeof location !== 'undefined' && /^\/s\/([a-z0-9-]+)(\/|$)/.exec(location.pathname);
export const BASE = m ? '/s/' + m[1] : '';

let site = { name: 'Al-Xorazmiy maktabi', logo: null };
const subs = new Set();
const apply = s => {
  site = { ...site, ...s };
  try { document.title = 'Al-Kundalik — ' + site.name; } catch { /* ignore */ }
  subs.forEach(f => f(site));
};

export function loadSite() {
  fetch(BASE + '/api/site').then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.name) apply(j); }).catch(() => {});
}

export function useSite() {
  const [s, set] = useState(site);
  useEffect(() => { subs.add(set); set(site); return () => { subs.delete(set); }; }, []);
  return s;
}
