
import { useState, useMemo } from 'react';
import {
  Sunrise, ClipboardCheck, MessageSquare, Crown, Trophy, Users, TrendingUp, CalendarCheck, TriangleAlert, Send, Flame, Heart, BookOpenCheck, CheckCheck, Sparkles, Clock, Table2, GraduationCap, Lock, ChevronLeft, ChevronRight, Info, ImagePlus, Trash2, FileCheck
} from 'lucide-react';
import { CL, DAYS, SL, ABS, TN, DATES, tm, iso, L, hwG, f1, mean, rep, cl, todayIso, addDays, mondayOf, wdIdx, dayState, daysLeft, fmtDay } from '../data';
import { Gr, Tog, Sel, G, Bar, Tabs, Build, Chips, Avatar, Count, Empty, toast, ClassLogo, fileToLogo } from './UI';
import { Schedule, useNow } from './Schedule';
import { DocsBoard } from './Docs';
import { tx, tr } from '../i18n';

const ICONS = {
  'Bugun': <Sunrise size={17} />,
  'Baholash': <ClipboardCheck size={17} />,
  'Xabarlar': <MessageSquare size={17} />,
  'Sinfim': <Crown size={17} />,
  'Hujjatlar': <FileCheck size={17} />,
  'Sinf baholari': <Table2 size={17} />
};

export default function Teacher({ S, t }) {
  const cls = useMemo(() => CL.filter(c => S.assign[c]?.[t.subj] === t.id), [S.assign, t]);
  const led = useMemo(() => CL.filter(c => S.leaders[c] === t.id), [S.leaders, t]);
  const tabs = ['Bugun', 'Baholash', 'Xabarlar', ...(led.length ? ['Sinfim', 'Hujjatlar', 'Sinf baholari'] : [])];
  const [tab, setTab] = useState('Bugun');
  const [c, setC] = useState(cls[0] || CL[0]);
  const [lc, setLc] = useState(led[0] || '');
  const curLc = led.includes(lc) ? lc : led[0];
  const curC = cls.includes(c) ? c : (cls[0] || c);
  const goGrade = k => { setC(k); setTab('Baholash'); };

  return (
    <>
      <Tabs t={tabs} icons={ICONS} v={tab} f={setTab} />
      <Build k={tab}>
        <main>
          {tab === 'Bugun' && <Today S={S} t={t} cls={cls} led={led} c={curC} setC={setC} goGrade={goGrade} />}
          {tab === 'Baholash' && <Grading S={S} t={t} cls={cls} c={curC} setC={setC} />}
          {tab === 'Xabarlar' && <Messages S={S} t={t} cls={cls} c={curC} setC={setC} />}
          {tab === 'Sinfim' && <MyClass S={S} led={led} c={curLc} setC={setLc} />}
          {tab === 'Hujjatlar' && <DocsLeader S={S} led={led} c={curLc} setC={setLc} />}
          {tab === 'Sinf baholari' && <ClassGrades S={S} led={led} c={curLc} setC={setLc} />}
        </main>
      </Build>
    </>
  );
}

/* ═══════════ HUJJATLAR (faqat sinf rahbari) ═══════════ */
function DocsLeader({ S, led, c, setC }) {
  return (
    <>
      <ClassPick led={led} c={c} setC={setC} />
      <DocsBoard S={S} cls={c} />
    </>
  );
}

/* ═══════════ BUGUN ═══════════ */
function Today({ S, t, cls, led, c, setC, goGrade }) {
  const now = useNow();
  const m = now.getHours() * 60 + now.getMinutes();
  const td = now.getDay() - 1;
  const school = td >= 0 && td < 5;

  const lessons = [];
  if (school) cls.forEach(k => S.sched[k]?.[td]?.forEach((s, i) => { if (s === t.subj) lessons.push({ k, i }); }));
  lessons.sort((a, b) => a.i - b.i);
  const cur = lessons.find(x => m >= tm(SL[x.i][0]) && m < tm(SL[x.i][1]));
  const nxt = lessons.find(x => tm(SL[x.i][0]) > m);
  const nStud = S.students.filter(s => cls.includes(s.cls)).length;
  const hr = now.getHours();
  const hello = hr < 6 ? 'Xayrli tun' : hr < 12 ? 'Xayrli tong' : hr < 18 ? 'Xayrli kun' : 'Xayrli kech';

  return (
    <>
      <div className="hero card">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> {hello}</span>
          <h2>{t.name}</h2>
          <div className="cls-pills">
            <span className="pill">{t.subj}</span>
            {led.map(k => <span key={k} className="crown"><Crown size={14} /> {k} sinf rahbari</span>)}
          </div>
          <p className="hero-now">
            {cur
              ? <>Hozir <b>{cur.k}</b> sinfida {cur.i + 1}-dars ({SL[cur.i][0]}–{SL[cur.i][1]}) <span className="live">jonli</span></>
              : !school ? 'Bugun dam olish kuni — yaxshi dam oling!'
              : nxt ? <>Hozir darsingiz yo‘q. Keyingi dars: <b>{nxt.k}</b>, {nxt.i + 1}-dars, {SL[nxt.i][0]}.</>
              : 'Bugun boshqa darsingiz qolmadi.'}
          </p>
        </div>
        <div className="hero-avg">
          <b><Count to={lessons.length} /></b>
          <span>bugungi dars</span>
        </div>
      </div>

      <div className="grid tiles">
        <div className="card tile static"><span className="tile-ic"><Users /></span><b><Count to={cls.length} /></b><span>sinf</span></div>
        <div className="card tile static"><span className="tile-ic"><GraduationCap /></span><b><Count to={nStud} /></b><span>o‘quvchi</span></div>
        <div className="card tile static"><span className="tile-ic"><Clock /></span><b><Count to={weekCount(S, t, cls)} /></b><span>haftalik dars</span></div>
      </div>

      {cls.length === 0 ? (
        <div className="card"><Empty t="Hali sinfga biriktirilmagan" d="Administrator sizni sinflarga biriktirgach, bu yerda jadval va o‘quvchilar ko‘rinadi." /></div>
      ) : (
        <>
          <div className="card">
            <h3 className="h-ic"><CalendarCheck size={20} /> Bugungi darslarim</h3>
            {lessons.length === 0 ? <p className="muted">{school ? 'Bugun darsingiz yo‘q.' : 'Bugun dam olish kuni.'}</p> : (
              <div className="today-list">
                {lessons.map(x => {
                  const on = cur && cur.i === x.i && cur.k === x.k;
                  const past = tm(SL[x.i][1]) <= m;
                  return (
                    <div key={x.k + x.i} className={'today' + (on ? ' now' : '') + (past ? ' past' : '')}>
                      <span className="ln">{x.i + 1}</span>
                      <div className="lt"><b>{x.k}</b><small>{SL[x.i][0]}–{SL[x.i][1]}</small></div>
                      {on && <span className="live">jonli</span>}
                      <span className="sp" />
                      <button type="button" className="b o sm" onClick={() => goGrade(x.k)}><ClipboardCheck size={16} /> Baholash</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="h-ic"><Table2 size={20} /> Haftalik jadvalim</h3>
            <div className="wrap">
              <table className="week">
                <thead><tr><th></th>{DAYS.map((d, i) => <th key={d} className={i === td ? 'today-col' : ''}>{d}</th>)}</tr></thead>
                <tbody>
                  {SL.map((s, i) => (
                    <tr key={i}>
                      <td><b>{i + 1}</b> <small className="muted">{s[0]}</small></td>
                      {DAYS.map((d, di) => {
                        const ks = cls.filter(k => S.sched[k]?.[di]?.[i] === t.subj);
                        return <td key={di} className={di === td ? 'today-col' : ''}>{ks.map(k => <span key={k} className="mini">{k}</span>)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card plain">
            <h3>Sinf jadvali</h3>
            <Chips o={cls} v={c} f={setC} className="sm" />
          </div>
          <Schedule cls={c} S={S} />
        </>
      )}
    </>
  );
}
function weekCount(S, t, cls) {
  let n = 0;
  cls.forEach(k => S.sched[k]?.forEach(day => day.forEach(s => { if (s === t.subj) n++; })));
  return n;
}

/* ═══════════ BAHOLASH (hafta kunlari bo‘yicha) ═══════════ */
function Grading({ S, t, cls, c, setC }) {
  const today = todayIso();
  const [wk, setWk] = useState(0); // 0 = shu hafta, -1 = o‘tgan hafta …
  const [di, setDi] = useState(Math.min(wdIdx(today), 4));
  if (!cls.length) return <div className="card"><Empty t="Sinf biriktirilmagan" d="Baholash uchun administrator sizni kamida bitta sinfga biriktirishi kerak." /></div>;

  const goWeek = n => { setWk(n); if (n === 0) setDi(Math.min(wdIdx(today), 4)); };
  const mon = addDays(mondayOf(today), wk * 7);
  const d = addDays(mon, di);
  const lessons = (S.sched[c]?.[di] || []).map((s, i) => (s === t.subj ? i : -1)).filter(i => i >= 0);
  const state = dayState(d, today);
  const lock = state !== 'open' || lessons.length === 0;
  const sts = S.students.filter(s => s.cls === c);
  const keyOf = (s, date = d) => s.id + '|' + t.subj + '|' + date;
  const rec = s => S.recMap[keyOf(s)];
  const blank = s => ({ sid: s.id, subj: t.subj, date: d, att: 'Bor', act: 5, beh: 5, hw: 100, c: '' });
  const up = (s, p) => { if (!lock) S.setRecMap({ ...S.recMap, [keyOf(s)]: { ...(rec(s) || blank(s)), ...p } }); };
  const bulk = p => {
    if (lock) return;
    const n = { ...S.recMap };
    sts.forEach(s => { n[keyOf(s)] = { ...(rec(s) || blank(s)), ...p }; });
    S.setRecMap(n);
  };
  const done = sts.filter(s => rec(s)).length;
  const absN = sts.filter(s => rec(s)?.att === ABS).length;
  const left = daysLeft(d, today);

  return (
    <div className="card">
      <div className="toolbar">
        <Sel v={c} o={cls} f={setC} />
        <span className="pill">{t.subj}</span>
        <span className="sp" />
        <div className="week-nav">
          <button type="button" className="b o sm ib" onClick={() => goWeek(wk - 1)} disabled={wk <= -8} aria-label="Oldingi hafta"><ChevronLeft size={17} /></button>
          <span>{wk === 0 ? tx('Shu hafta') : wk === -1 ? tx('O‘tgan hafta') : tr('{n} hafta oldin', { n: -wk })}</span>
          <button type="button" className="b o sm ib" onClick={() => goWeek(wk + 1)} disabled={wk >= 0} aria-label="Keyingi hafta"><ChevronRight size={17} /></button>
          {wk !== 0 && <button type="button" className="b o sm" onClick={() => goWeek(0)}>Shu hafta</button>}
        </div>
      </div>

      <div className="daytabs">
        {DAYS.map((nm, i) => {
          const dt = addDays(mon, i), stt = dayState(dt, today), has = (S.sched[c]?.[i] || []).includes(t.subj);
          const n = has ? sts.filter(s => S.recMap[keyOf(s, dt)]).length : 0;
          return (
            <button key={nm} type="button" disabled={stt === 'future'} onClick={() => setDi(i)}
              className={'daytab' + (i === di ? ' on' : '') + (stt === 'locked' ? ' locked' : '') + (!has ? ' none' : '') + (dt === today ? ' today' : '')}>
              <b>{nm}</b>
              <span className="dt-st">{!has ? 'dars yo‘q' : stt === 'locked' ? <><Lock size={12} /> qulflangan</> : stt === 'future' ? 'hali kelmagan' : n + '/' + sts.length}</span>
            </button>
          );
        })}
      </div>

      {lessons.length === 0
        ? <div className="lockbar none"><Info size={17} /> {c} sinfida {DAYS[di]} kuni {t.subj} darsi yo‘q — baholash dars jadvaliga bog‘langan.</div>
        : state === 'locked'
          ? <div className="lockbar"><Lock size={17} /> Bu kunning baholari qulflangan: 7 kundan oshgan, o‘zgartirib bo‘lmaydi. Faqat administrator tuzata oladi.</div>
          : <div className="lockbar open"><Clock size={17} /> {DAYS[di]}: {lessons.map(i => `${i + 1}-dars (${SL[i][0]}–${SL[i][1]})`).join(', ')}. {left === 0 ? 'Bugun tahrirlash uchun oxirgi kun.' : `Baholarni yana ${left} kun ichida o‘zgartirish mumkin, keyin qulflanadi.`}</div>}

      <div className="progress-line">
        <div className="grow"><Bar p={sts.length ? done * 100 / sts.length : 0} /></div>
        <span className="muted small">Baholangan: <b>{done}</b> / {sts.length} · Kelmagan: <b>{absN}</b></span>
      </div>

      <label className="hw-box">
        <BookOpenCheck size={19} />
        <span>Uyga vazifa</span>
        <input className="w" value={S.hw[c + '|' + t.subj] || ''} placeholder="Topshiriq matni (o‘quvchilar ko‘radi)" onChange={e => S.setHw({ ...S.hw, [c + '|' + t.subj]: e.target.value })} />
      </label>

      <div className="quick-row">
        <span className="muted small">Tezkor:</span>
        <button type="button" className="b o sm" disabled={lock} onClick={() => { bulk({ att: 'Bor' }); toast('Hamma o‘quvchi “Darsda” deb belgilandi', { ms: 2200 }); }}><CheckCheck size={16} /> Hamma darsda</button>
        <button type="button" className="b o sm" disabled={lock} onClick={() => { bulk({ act: 5, beh: 5, hw: 100 }); toast('Hammaga a’lo baho qo‘yildi', { ms: 2200 }); }}><Flame size={16} /> Hammaga 5 baho</button>
      </div>

      <div className="wrap">
        <table className="grading">
          <thead>
            <tr>
              <th>O‘quvchi</th><th>Davomat</th><th>Faollik</th><th>Tarbiya</th>
              <th>Uyga vazifa %</th><th>Izoh</th><th className="c">Dars bahosi</th>
            </tr>
          </thead>
          <tbody>
            {sts.map((s, i) => {
              const r = rec(s), ab = r?.att === ABS;
              return (
                <tr key={s.id} className={ab ? 'absent' : ''} style={{ '--i': i % 25 }}>
                  <td><div className="who-cell"><Avatar name={s.name} s={30} /><b>{s.name}</b></div></td>
                  <td><Tog v={r ? r.att : null} dis={lock} f={v => up(s, { att: v })} /></td>
                  <td><Gr v={r ? r.act : null} dis={lock || ab} f={v => up(s, { act: v })} /></td>
                  <td><Gr v={r ? r.beh : null} dis={lock || ab} f={v => up(s, { beh: v })} /></td>
                  <td>
                    <div className="hw-in">
                      <input className="n" type="number" min="0" max="100" disabled={lock || ab || !r} value={r ? r.hw : ''} onChange={e => up(s, { hw: cl(+e.target.value || 0, 0, 100) })} />
                      {r && !ab && <G g={hwG(r.hw)} />}
                    </div>
                  </td>
                  <td><input className="w" disabled={lock || !r} value={r?.c || ''} placeholder={r ? 'Izoh' : 'Avval davomatni belgilang'} onChange={e => up(s, { c: e.target.value })} /></td>
                  <td className="c">{!r || ab ? '—' : <G g={L(r)} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════ XABARLAR ═══════════ */
function Messages({ S, t, cls, c, setC }) {
  const [ps, setPs] = useState('');
  const [pt, setPt] = useState('');
  if (!cls.length) return <div className="card"><Empty t="Sinf biriktirilmagan" d="Xabar yuborish uchun avval sinfga biriktirilishingiz kerak." /></div>;
  const sts = S.students.filter(s => s.cls === c);
  const pst = ps && sts.some(s => String(s.id) === ps) ? ps : sts[0] && String(sts[0].id);
  const send = () => {
    if (!pt.trim() || !pst) return;
    S.setMsgs([{ sid: +pst, t: t.id, x: pt.trim(), d: iso(new Date()) }, ...S.msgs]);
    setPt('');
    toast('Xabar yuborildi');
  };
  return (
    <div className="card">
      <h3 className="h-ic"><Heart size={20} /> Ota-onaga izoh qoldirish</h3>
      <div className="row">
        {cls.length > 1 && <Sel v={c} o={cls} f={v => { setC(v); setPs(''); }} />}
        <Sel v={String(pst)} o={sts.map(s => [String(s.id), s.name])} f={setPs} />
      </div>
      <textarea value={pt} onChange={e => setPt(e.target.value)} placeholder="Xabar matni…" />
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="b" onClick={send} disabled={!pt.trim()}><Send size={17} /> Yuborish</button>
      </div>
      {S.msgs.filter(x => x.t === t.id).slice(0, 6).map((x, i) => (
        <p key={i} className="fb-item">
          <span className="pill">{(S.students.find(s => s.id === x.sid) || {}).name}</span> <span className="muted">{x.d}</span> — {x.x}
        </p>
      ))}
    </div>
  );
}

/* ═══════════ SINF RAHBARI: SINFIM ═══════════ */
function ClassPick({ led, c, setC }) {
  if (led.length < 2) return null;
  return <div className="card plain"><h3>Qaysi sinf?</h3><Chips o={led} v={c} f={setC} className="sm gold" /></div>;
}

function MyClass({ S, led, c, setC }) {
  const st = S.students.filter(s => s.cls === c);
  const A = S.A;
  const cav = k => mean(S.students.filter(s => s.cls === k).map(s => A[s.id]?.avg).filter(x => x != null));
  const rk = CL.map(k => [k, cav(k)]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  const top = k => [...st].sort((a, b) => ((A[b.id]?.[k]) || 0) - ((A[a.id]?.[k]) || 0)).slice(0, 3);
  const prob = st.map(s => {
    const a = A[s.id] || {}, w = [];
    if (a.avg != null && a.avg < 3.5) w.push('past baho');
    if (a.att != null && a.att < 85) w.push('davomat past');
    if (a.beh != null && a.beh < 3.5) w.push('tarbiya past');
    if (a.hw != null && a.hw < 60) w.push('uyga vazifa kam');
    return [s, w];
  }).filter(x => x[1].length);
  const attAvg = mean(st.map(s => A[s.id]?.att).filter(x => x != null)) || 0;
  const place = rk.findIndex(x => x[0] === c) + 1;

  const Top = ({ title, k, icon }) => (
    <div className="card">
      <h3 className="h-ic">{icon} {title}</h3>
      {top(k).map((s, i) => (
        <div key={s.id} className="top-item">
          <span className={'medal m' + (i + 1)}>{i + 1}</span>
          <Avatar name={s.name} s={30} />
          <span className="tn">{s.name}</span>
          <span className="pill">{k === 'hw' ? Math.round(A[s.id]?.[k] || 0) + '%' : f1(A[s.id]?.[k])}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <ClassPick led={led} c={c} setC={setC} />
      <div className="card logo-box">
        <ClassLogo cls={c} logos={S.logos} s={72} />
        <div className="lb-t"><b>{c} sinf logotipi</b><small>Logoni faqat sinf rahbari o‘zgartira oladi. Kvadrat rasm tavsiya etiladi (PNG, JPG, WEBP).</small></div>
        <label className="b o sm" style={{ cursor: 'pointer' }}>
          <ImagePlus size={16} /> Logo yuklash
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => {
            const f = e.target.files[0]; e.target.value = '';
            if (!f) return;
            try { S.setLogos({ ...S.logos, [c]: await fileToLogo(f) }); toast('Logo yangilandi'); }
            catch (err) { toast(err.message, { tone: 'err' }); }
          }} />
        </label>
        {S.logos[c] && <button type="button" className="b o sm" onClick={() => { const n = { ...S.logos }; delete n[c]; S.setLogos(n); }}><Trash2 size={16} /> Olib tashlash</button>}
      </div>
      <div className="hero card gold">
        <div>
          <span className="eyebrow"><Crown size={14} /> Sinf rahbari</span>
          <h2>{c} sinf</h2>
          <p>{st.length} ta o‘quvchi · maktab bo‘yicha o‘rtacha {f1(cav(c))}</p>
        </div>
        <div className="hero-avg"><b><Count to={place} />-o‘rin</b><span>{CL.length} ta sinf ichida</span></div>
      </div>
      <div className="grid tiles">
        <div className="card tile static"><span className="tile-ic"><Users /></span><b><Count to={st.length} /></b><span>o‘quvchi</span></div>
        <div className="card tile static"><span className="tile-ic"><CalendarCheck /></span><b><Count to={Math.round(attAvg)} suffix="%" /></b><span>sinf davomati</span></div>
        <div className="card tile static"><span className="tile-ic"><TrendingUp /></span><b><Count to={cav(c) || 0} /></b><span>o‘rtacha baho</span></div>
      </div>
      <div className="card">
        <h3 className="h-ic"><Trophy size={20} /> Sinflar reytingi</h3>
        <div className="rank-list">
          {rk.map(([k, v], i) => (
            <div className={'rank' + (k === c ? ' me' : '')} key={k} style={{ '--i': i }}>
              <span className="rk">{i + 1}</span>
              <b className="cls-label">{k}</b>
              <div className="grow"><Bar p={(v || 0) * 20} /></div>
              <G g={v} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid">
        <Top title="Eng tarbiyali" k="beh" icon={<Heart size={19} />} />
        <Top title="Eng faol" k="act" icon={<Flame size={19} />} />
        <Top title="Uyga vazifada eng yaxshi" k="hw" icon={<BookOpenCheck size={19} />} />
      </div>
      <div className="card">
        <h3 className="h-ic"><TriangleAlert size={20} /> Muammoli o‘quvchilar</h3>
        {prob.length
          ? prob.map(([s, w]) => (
            <div key={s.id} className="top-item">
              <Avatar name={s.name} s={30} /><span className="tn"><b>{s.name}</b></span>
              <span className="tags">{w.map(x => <span key={x} className="pill warn-p">{x}</span>)}</span>
            </div>
          ))
          : <Empty t="Muammoli o‘quvchi yo‘q" d="Barcha o‘quvchilar yaxshi natijada." />}
      </div>
    </>
  );
}

/* ═══════════ SINF RAHBARI: BAHOLAR ═══════════ */
function ClassGrades({ S, led, c, setC }) {
  const st = S.students.filter(s => s.cls === c);
  return (
    <>
      <ClassPick led={led} c={c} setC={setC} />
      <div className="card">
        <h3 className="h-ic"><Table2 size={20} /> {c} · o‘quvchilar baholari</h3>
        <div className="wrap">
          <table className="rows">
            <thead>
              <tr>
                <th>O‘quvchi</th>
                {S.subjects.map(s => <th className="c" key={s} title={s}>{s.slice(0, 6)}.</th>)}
                <th className="c">Davomat</th>
                <th className="c">O‘rtacha</th>
              </tr>
            </thead>
            <tbody>
              {st.map((s, i) => {
                const rs = S.bySid.get(s.id) || [];
                const a = S.A[s.id] || {};
                return (
                  <tr key={s.id} style={{ '--i': i % 25 }}>
                    <td><div className="who-cell"><Avatar name={s.name} s={30} /><b>{s.name}</b></div></td>
                    {S.subjects.map(j => {
                      const x = rs.filter(r => r.subj === j && r.att !== ABS).map(L);
                      return <td className="c" key={j}><G g={mean(x)} /></td>;
                    })}
                    <td className="c">{a.att == null ? '—' : Math.round(a.att) + '%'}</td>
                    <td className="c"><G g={a.avg} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
