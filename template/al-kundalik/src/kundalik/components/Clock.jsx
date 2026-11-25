import { useEffect, useRef, useState } from 'react';
import { Clock3, Radio } from 'lucide-react';
import { CL, TN, tzNow, phaseAt } from '../data';
import { tr, tx, useLang } from '../i18n';
import { sfx } from '../sfx';
import { ClassLogo } from './UI';

export function useClock(ms = 1000) {
  const [n, set] = useState(tzNow);
  useEffect(() => { const t = setInterval(() => set(tzNow()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

const tone = ph => (ph.kind === 'lesson' ? 'lesson' : ph.kind === 'break' ? 'break' : ph.kind === 'meal' ? 'meal' : 'off');

/** Umumiy holat matni (tanaffus, ovqat vaqti, dars boshlanmagan va h.k.) */
function baseText(ph) {
  if (ph.kind === 'weekend') return tx('Bugun dam olish kuni');
  if (ph.kind === 'before') return tr('Darslar hali boshlanmagan · {a} da nonushta', { a: ph.a });
  if (ph.kind === 'after') return tx('Bugungi darslar tugadi');
  if (ph.kind === 'break') return tr('Hozir tanaffus · yana {m} daqiqa', { m: ph.left });
  if (ph.kind === 'meal') return tr('Hozir ovqat vaqti: {n} · yana {m} daqiqa', { n: ph.n, m: ph.left });
  return '';
}

const adminText = (ph, n, S) => tr('Hozir {i}-dars · {k} ta sinfda dars bormoqda · yana {m} daqiqa', { i: ph.idx + 1, k: CL.filter(k => S.sched[k]?.[n.wd]?.[ph.idx]).length, m: ph.left });

/** Rolga mos holat: o‘quvchiga hozirgi dars, ustozga qaysi sinfda darsi borligi, adminga nechta sinfda dars bormoqda */
export function statusText(ph, n, me, S) {
  if (ph.kind !== 'lesson') return baseText(ph);
  const m = ph.left, i = ph.idx + 1;
  if (me && me.r === 'student') {
    const st = S.students.find(x => String(x.id) === me.id);
    const sub = st && S.sched[st.cls]?.[n.wd]?.[ph.idx];
    if (sub) return tr('Hozir {i}-dars: {s} · {t} · yana {m} daqiqa', { i, s: sub, t: TN(S.assign[st.cls]?.[sub], S.teachers), m });
  }
  if (me && me.r === 'teacher') {
    const t = S.teachers.find(x => x.id === me.id);
    const c = t && CL.find(k => S.sched[k]?.[n.wd]?.[ph.idx] === t.subj && S.assign[k]?.[t.subj] === t.id);
    return c ? tr('Hozir {c} sinfida darsingiz bor ({i}-dars) · yana {m} daqiqa', { c, i, m }) : tr('Hozir darsingiz yo‘q · {i}-dars davom etmoqda', { i });
  }
  if (me && me.r === 'admin') return adminText(ph, n, S);
  return tr('Hozir {i}-dars davom etmoqda · yana {m} daqiqa', { i, m });
}

/** Sarlavhadagi soat: Farg‘ona vaqti + soat ostida “hozir tanaffus / ovqat vaqti / dars” */
export function ClockBar({ me, S }) {
  useLang();
  const n = useClock(1000);
  const ph = phaseAt(n.min, n.wd);
  const key = ph.kind + (ph.idx ?? '') + (ph.n ?? '') + (ph.a ?? '');
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    if (ph.kind === 'lesson' || ph.kind === 'break' || ph.kind === 'meal') sfx.bell();
  }, [key]);
  return (
    <div className="clockbar" role="timer">
      <div className="cb-time"><Clock3 size={15} /><b>{n.hms}</b><small>Farg‘ona vaqti</small></div>
      <div className={'cb-st ' + tone(ph)}><i className="cb-dot" />{statusText(ph, n, me, S)}</div>
    </div>
  );
}

/** Admin: hozir qaysi sinfda qaysi dars bo‘layotgani */
export function NowBoard({ S }) {
  useLang();
  const n = useClock(15000);
  const ph = phaseAt(n.min, n.wd);
  const lesson = ph.kind === 'lesson';
  return (
    <div className="card">
      <div className="toolbar">
        <h3 className="h-ic" style={{ margin: 0 }}><Radio size={20} /> Hozir qaysi sinfda qaysi dars</h3>
        <span className="sp" />
        <span className={'cb-st ' + tone(ph)}><i className="cb-dot" />{lesson ? adminText(ph, n, S) : baseText(ph)}</span>
      </div>
      <div className="nowgrid">
        {CL.map(c => {
          const sub = lesson ? S.sched[c]?.[n.wd]?.[ph.idx] : null;
          return (
            <div key={c} className={'nowcell' + (sub ? ' on' : '')}>
              <ClassLogo cls={c} logos={S.logos} s={30} />
              <div>
                <b>{c}</b>
                {sub ? <><span>{sub}</span><small>{TN(S.assign[c]?.[sub], S.teachers)}</small></> : <small>—</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
