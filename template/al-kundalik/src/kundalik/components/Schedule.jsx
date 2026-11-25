
import { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { DAYS, SL, TL, TN, tm, TZ } from '../data';

// Qurilma vaqt zonasidan qat’i nazar Farg‘ona (Toshkent, UTC+5) devor soati
const wall = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
import { Chips } from './UI';

export function useNow(ms = 30000) {
  const [n, setN] = useState(wall);
  useEffect(() => {
    const t = setInterval(() => setN(wall()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

export function Schedule({ cls, S }) {
  const now = useNow();
  const m = now.getHours() * 60 + now.getMinutes();
  const td = now.getDay() - 1;
  const [d, setD] = useState(td >= 0 && td < 5 ? td : 0);
  return (
    <div className="card">
      <div className="row between">
        <h3 className="h-ic"><CalendarDays size={20} /> Dars jadvali · {cls}</h3>
      </div>
      <Chips o={DAYS.map((x, i) => [i, x])} v={d} f={setD} className="days" />
      <div className="tl">
        {TL.map((x, i) => {
          const a = x.l != null ? SL[x.l][0] : x.a, b = x.l != null ? SL[x.l][1] : x.b;
          const on = d === td && m >= tm(a) && m < tm(b);
          if (x.l == null) return (
            <div key={i} className={'br' + (on ? ' now' : '')}>
              <span className="t">{a}–{b}</span>{x.n}
            </div>
          );
          const sub = S.sched[cls]?.[d]?.[x.l] || '—';
          return (
            <div key={i} className={on ? 'now' : ''}>
              <span className="t">{a}–{b}</span>
              <b>{x.l + 1}-dars · {sub}</b>
              <span className="sp"></span>
              <span className="muted">{TN(S.assign[cls]?.[sub], S.teachers)}</span>
              {on && <span className="live">hozir</span>}
            </div>
          );
        })}
        <div className="br"><span className="t">17:10</span>Kun yakunlandi</div>
      </div>
    </div>
  );
}
