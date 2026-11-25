import { useMemo, useState } from 'react';
import { Check, X, FileCheck, Search, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { CL, DOC_TYPES, REQ_DOCS, missingDocs, TN } from '../data';
import { Chips, Avatar, Bar, Count, Empty, ClassLogo } from './UI';
import { tx } from '../i18n';

const have = (S, sid) => S.docs[sid] || [];
const docOf = code => DOC_TYPES.find(d => d.code === code);

function Legend() {
  return (
    <div className="doc-legend">
      {DOC_TYPES.map(d => (
        <span key={d.code} className="doc-lg">
          <b>{d.short}</b> — {d.label}
          <em className={d.src === 'lex' ? 'lex' : ''}>{d.src === 'lex' ? 'Rasmiy ro‘yxat' : 'Amalda so‘raladi'}</em>
          <em className={d.need ? 'need' : ''}>{d.need ? 'Majburiy' : 'Ixtiyoriy'}</em>
        </span>
      ))}
      <p className="muted small">Hujjatlar ro‘yxati O‘zbekiston maktablariga qabul qoidalariga (lex.uz) asoslangan. Maktabingiz talabiga qarab o‘zgartirishingiz mumkin.</p>
    </div>
  );
}

/** Sinf rahbari uchun: o‘z sinfi o‘quvchilarining hujjatlarini belgilash */
export function DocsBoard({ S, cls }) {
  const sts = S.students.filter(s => s.cls === cls);
  const full = sts.filter(s => !missingDocs(have(S, s.id)).length).length;
  const toggle = (s, code) => {
    const cur = have(S, s.id);
    S.setDocs({ ...S.docs, [s.id]: cur.includes(code) ? cur.filter(x => x !== code) : [...cur, code] });
  };
  return (
    <>
      <div className="grid tiles">
        <div className="card tile static"><span className="tile-ic"><Users /></span><b><Count to={sts.length} /></b><span>Jami o‘quvchi</span></div>
        <div className="card tile static"><span className="tile-ic"><ShieldCheck /></span><b><Count to={full} /></b><span>Hujjati to‘liq</span></div>
        <div className="card tile static"><span className="tile-ic"><TriangleAlert /></span><b><Count to={sts.length - full} /></b><span>Hujjati yetishmaydi</span></div>
      </div>
      <div className="card">
        <h3 className="h-ic"><FileCheck size={20} /> Hujjatlar · {cls}</h3>
        <p className="muted small">Hujjat topshirilgan bo‘lsa, katakchani belgilang. Faqat sinf rahbari o‘zgartira oladi.</p>
        <Legend />
        {sts.length === 0 ? <Empty t="Bu sinfda o‘quvchi yo‘q" /> : (
          <div className="wrap">
            <table className="docs">
              <thead>
                <tr><th>O‘quvchi</th>{DOC_TYPES.map(d => <th key={d.code} className={'c' + (d.need ? '' : ' opt')} title={d.label}>{d.short}</th>)}<th className="c">Hujjatlar holati</th></tr>
              </thead>
              <tbody>
                {sts.map(s => {
                  const h = have(S, s.id), miss = missingDocs(h);
                  return (
                    <tr key={s.id}>
                      <td><div className="who-cell"><Avatar name={s.name} s={30} /><b>{s.name}</b></div></td>
                      {DOC_TYPES.map(d => {
                        const ok = h.includes(d.code);
                        return (
                          <td key={d.code} className="c">
                            <button type="button" className={'doc-t' + (ok ? ' on' : '')} aria-pressed={ok} aria-label={d.label} onClick={() => toggle(s, d.code)}>
                              {ok ? <Check size={16} /> : <X size={16} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="c"><span className={'pill ' + (miss.length ? 'warn' : 'okp')}>{miss.length ? tx('Yetishmaydi') + ': ' + miss.length : tx('To‘liq')}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/** Admin: qaysi o‘quvchida qanday hujjat yo‘qligi (faqat ko‘rish) */
export function DocsAdmin({ S }) {
  const [c, setC] = useState('Hammasi');
  const [q, setQ] = useState('');
  const rows = useMemo(() => S.students
    .filter(s => (c === 'Hammasi' || s.cls === c) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())))
    .map(s => ({ s, miss: missingDocs(have(S, s.id)) })), [S.students, S.docs, c, q]);
  const bad = rows.filter(r => r.miss.length);
  const perDoc = REQ_DOCS.map(code => [code, rows.filter(r => r.miss.includes(code)).length]).sort((a, b) => b[1] - a[1]);
  const perClass = CL.map(k => {
    const st = S.students.filter(s => s.cls === k);
    const ok = st.filter(s => !missingDocs(have(S, s.id)).length).length;
    return [k, st.length, ok];
  });
  return (
    <>
      <div className="card">
        <h3 className="h-ic"><FileCheck size={20} /> Hujjatlar holati</h3>
        <p className="muted small">Hujjatlarni faqat sinf rahbari belgilaydi. Bu yerda faqat ko‘rinadi.</p>
        <div className="toolbar">
          <label className="search"><Search size={17} /><input placeholder="Ism bo‘yicha qidirish…" value={q} onChange={e => setQ(e.target.value)} /></label>
        </div>
        <Chips o={['Hammasi', ...CL]} v={c} f={setC} />
      </div>

      <div className="grid tiles">
        <div className="card tile static"><span className="tile-ic"><Users /></span><b><Count to={rows.length} /></b><span>Jami o‘quvchi</span></div>
        <div className="card tile static"><span className="tile-ic"><ShieldCheck /></span><b><Count to={rows.length - bad.length} /></b><span>Hujjati to‘liq</span></div>
        <div className="card tile static"><span className="tile-ic"><TriangleAlert /></span><b><Count to={bad.length} /></b><span>Hujjati yetishmaydi</span></div>
      </div>

      <div className="card">
        <h3>Sinflar bo‘yicha</h3>
        {perClass.map(([k, n, ok]) => (
          <div className="qrank" key={k}>
            <b className="cls-line"><ClassLogo cls={k} logos={S.logos} s={24} /> {k}</b>
            <Bar p={n ? ok * 100 / n : 0} />
            <span className="muted small">{ok}/{n}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Eng ko‘p yetishmaydigan hujjatlar</h3>
        <div className="chips-row">
          {perDoc.map(([code, n]) => <span key={code} className={'pill ' + (n ? 'warn' : 'okp')}>{docOf(code).short}: {n}</span>)}
        </div>
      </div>

      <div className="card">
        <h3>Hujjati yetishmaydigan o‘quvchilar</h3>
        {bad.length === 0 ? <Empty t="Hammasi joyida: barcha majburiy hujjatlar topshirilgan." /> : (
          <div className="wrap">
            <table className="rows">
              <thead><tr><th>O‘quvchi</th><th>Sinf</th><th>Yetishmaydi</th><th>Sinf rahbari</th></tr></thead>
              <tbody>
                {bad.map(({ s, miss }) => (
                  <tr key={s.id}>
                    <td><div className="who-cell"><Avatar name={s.name} s={30} /><b>{s.name}</b></div></td>
                    <td>{s.cls}</td>
                    <td><div className="chips-row">{miss.map(code => <span key={code} className="pill warn" title={docOf(code).label}><X size={12} /> {docOf(code).short}</span>)}</div></td>
                    <td>{TN(S.leaders[s.cls], S.teachers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/** O‘quvchi: o‘z hujjatlari holati */
export function DocsMine({ S, s }) {
  const h = have(S, s.id), miss = missingDocs(h);
  return (
    <div className="card">
      <h3 className="h-ic"><FileCheck size={20} /> Hujjatlarim</h3>
      <p className={'lockbar ' + (miss.length ? '' : 'open')}>
        {miss.length ? <><TriangleAlert size={17} /> <span>{tx('Yetishmaydi')}: {miss.map(c => docOf(c).short).join(', ')}</span></> : <><ShieldCheck size={17} /> <span>{tx('Hammasi joyida: barcha majburiy hujjatlar topshirilgan.')}</span></>}
      </p>
      <div className="doc-list">
        {DOC_TYPES.map(d => {
          const ok = h.includes(d.code);
          return (
            <div key={d.code} className={'doc-row' + (ok ? ' ok' : '')}>
              <span className="doc-ic">{ok ? <Check size={16} /> : <X size={16} />}</span>
              <span>{d.label}</span>
              <em className={d.need ? 'need' : ''}>{d.need ? 'Majburiy' : 'Ixtiyoriy'}</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}
