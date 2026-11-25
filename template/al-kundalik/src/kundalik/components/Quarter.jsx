import { useMemo, useState } from 'react';
import { CalendarRange, Download, Award, Users, TriangleAlert, Info, Trophy } from 'lucide-react';
import { CL, ABS, L, todayIso, mean } from '../data';
import { Sel, Chips, G, Bar, Avatar, Count, Empty, toast } from './UI';

const NAMES = ['1-chorak', '2-chorak', '3-chorak', '4-chorak'];

/** Bitta o‘quvchining chorak bahosi: har bir fan bo‘yicha dars baholarining o‘rtachasi, butun songa yaxlitlanadi. */
function calc(S, s, from, to) {
  const rs = (S.bySid.get(s.id) || []).filter(r => r.date >= from && r.date <= to);
  const per = S.subjects.map(j => {
    const mine = rs.filter(r => r.subj === j);
    const g = mine.filter(r => r.att !== ABS).map(L);
    return { n: g.length, v: g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : null };
  });
  const vals = per.filter(x => x.v != null).map(x => x.v);
  return {
    per,
    overall: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
    abs: rs.filter(r => r.att === ABS).length,
    raw: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  };
}

export default function QuarterTab({ S }) {
  const q = S.quarters;
  const today = todayIso();
  const [qi, setQi] = useState(Math.max(0, q.findIndex(x => today >= x[0] && today <= x[1])));
  const [c, setC] = useState(CL[0]);
  const cc = CL.includes(c) ? c : CL[0];
  const [from, to] = q[qi];

  const all = useMemo(() => {
    const m = new Map();
    S.students.forEach(s => m.set(s.id, calc(S, s, from, to)));
    return m;
  }, [S.students, S.bySid, S.subjects, from, to]);

  const rows = S.students.filter(s => s.cls === cc).map(s => ({ s, ...all.get(s.id) }));
  const graded = rows.filter(r => r.overall != null);
  const colAvg = S.subjects.map((_, j) => {
    const v = rows.map(r => r.per[j].v).filter(x => x != null);
    return v.length ? Math.round(mean(v)) : null;
  });
  const rank = CL.map(k => {
    const v = S.students.filter(s => s.cls === k).map(s => all.get(s.id)?.raw).filter(x => x != null);
    return [k, v.length ? mean(v) : null];
  }).sort((a, b) => (b[1] || 0) - (a[1] || 0));

  const setRange = (i, k, val) => {
    if (!val) return;
    const n = q.map(x => [...x]);
    n[i][k] = val;
    const ok = n.every((x, j) => x[0] <= x[1] && (j === 0 || n[j - 1][1] < x[0]));
    if (!ok) return toast('Sanalar noto‘g‘ri: boshi oxiridan oldin bo‘lsin va choraklar ketma-ket kelsin.', { tone: 'err' });
    S.setQuarters(n);
  };

  const csv = () => {
    const lines = [['O‘quvchi', ...S.subjects, 'O‘rtacha', 'Kelmagan darslar'], ...rows.map(r => [r.s.name, ...r.per.map(x => x.v ?? ''), r.overall ?? '', r.abs])];
    const txt = '\ufeff' + lines.map(l => l.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = `${cc}-${NAMES[qi]}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Jadval yuklab olindi (CSV)');
  };

  return (
    <>
      <div className="card">
        <h3 className="h-ic"><CalendarRange size={20} /> Choraklik baholar</h3>
        <p className="muted small">
          Chorak bahosi avtomatik hisoblanadi: shu chorak ichidagi har bir fan bo‘yicha dars baholarining o‘rtachasi butun songa yaxlitlanadi
          (4,5 va undan yuqori — 5). Kelmagan darslar hisobga olinmaydi. Umumiy baho — fanlar bo‘yicha chorak baholarining o‘rtachasi.
        </p>
        <Chips o={NAMES} v={NAMES[qi]} f={v => setQi(NAMES.indexOf(v))} />
        <div className="q-dates">
          <label>Boshlanishi<input type="date" value={from} onChange={e => setRange(qi, 0, e.target.value)} /></label>
          <label>Tugashi<input type="date" value={to} onChange={e => setRange(qi, 1, e.target.value)} /></label>
          {today >= from && today <= to && <span className="pill">Hozirgi chorak</span>}
        </div>
      </div>

      <div className="grid tiles">
        <div className="card tile static"><span className="tile-ic"><Users /></span><b><Count to={graded.length} /></b><span>baholangan o‘quvchi ({rows.length} dan)</span></div>
        <div className="card tile static"><span className="tile-ic"><Award /></span><b><Count to={graded.filter(r => r.overall === 5).length} /></b><span>a’lo (5) o‘quvchi</span></div>
        <div className="card tile static"><span className="tile-ic"><TriangleAlert /></span><b><Count to={graded.filter(r => r.overall <= 2).length} /></b><span>qoniqarsiz (2)</span></div>
      </div>

      <div className="card">
        <div className="toolbar">
          <Sel v={cc} o={CL} f={setC} />
          <span className="sp" />
          <button type="button" className="b o sm" onClick={csv} disabled={!rows.length}><Download size={16} /> CSV yuklab olish</button>
        </div>
        {rows.length === 0 ? <Empty t="Bu sinfda o‘quvchi yo‘q" /> : (
          <div className="wrap">
            <table className="rows">
              <thead>
                <tr><th>O‘quvchi</th>{S.subjects.map(j => <th key={j} className="c">{j}</th>)}<th className="c">Umumiy</th><th className="c">Kelmagan</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.s.id}>
                    <td><div className="who-cell"><Avatar name={r.s.name} s={30} /><b>{r.s.name}</b></div></td>
                    {r.per.map((x, j) => <td key={j} className="c" title={x.n + ' ta dars'}><G g={x.v} /></td>)}
                    <td className="c"><G g={r.overall} /></td>
                    <td className="c">{r.abs}</td>
                  </tr>
                ))}
                <tr className="sum">
                  <td><b>Sinf bo‘yicha</b></td>
                  {colAvg.map((v, j) => <td key={j} className="c"><G g={v} /></td>)}
                  <td className="c"><G g={graded.length ? Math.round(mean(graded.map(r => r.overall))) : null} /></td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="h-ic"><Trophy size={20} /> Sinflar reytingi · {NAMES[qi]}</h3>
        {rank.map(([k, v], i) => (
          <div className="qrank" key={k}>
            <b>{i + 1}. {k}</b>
            <Bar p={(v || 0) * 20} />
            <G g={v} />
          </div>
        ))}
        {rank.every(x => x[1] == null) && <p className="muted small"><Info size={14} /> Bu chorakda hali baho yo‘q.</p>}
      </div>
    </>
  );
}
