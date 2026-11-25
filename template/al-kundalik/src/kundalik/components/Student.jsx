
import { useState } from 'react';
import {
  LayoutDashboard, GraduationCap, CalendarDays, BookOpenCheck, MessageSquare, Trophy, CalendarCheck, Star, Award, FileCheck
} from 'lucide-react';
import { TN, L, hwG, f1, rep, AL, dayLabel } from '../data';
import { G, Sel, Bar, Tabs, Build, Avatar, Count, Empty, ClassLogo } from './UI';
import { Schedule } from './Schedule';
import { DocsMine } from './Docs';
import { dayRelT } from '../i18n';

const ICONS = {
  'Umumiy': <LayoutDashboard size={17} />,
  'Baholarim': <GraduationCap size={17} />,
  'Dars jadvali': <CalendarDays size={17} />,
  'Uyga vazifa': <BookOpenCheck size={17} />,
  'Izohlar': <MessageSquare size={17} />,
  'Hujjatlarim': <FileCheck size={17} />
};

export default function Student({ S, s }) {
  const [tab, setTab] = useState('Umumiy');
  const [sub, setSub] = useState(S.subjects[0]);
  const mate = S.students.filter(x => x.cls === s.cls);
  const all = id => S.bySid.get(id) || [];
  const A = S.A[s.id] || {};
  const rank = f => 1 + mate.filter(x => (f(x) || 0) > (f(s) || 0)).length;
  const subAvg = (x, j) => {
    const v = all(x.id).filter(r => r.subj === j && r.att !== 'Yo‘q').map(L);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const mine = all(s.id).filter(r => r.subj === sub).sort((a, b) => b.date.localeCompare(a.date));
  const comments = all(s.id).filter(r => r.c).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  const myMsgs = S.msgs.filter(x => x.sid === s.id);

  return (
    <>
      <Tabs t={['Umumiy', 'Baholarim', 'Dars jadvali', 'Uyga vazifa', 'Izohlar', 'Hujjatlarim']} icons={ICONS} v={tab} f={setTab} />
      <Build k={tab}>
        <main>
          {tab === 'Umumiy' && (
            <>
              <div className="hero card">
                <div className="hero-who">
                  <Avatar name={s.name} s={64} />
                  <div>
                    <span className="eyebrow"><ClassLogo cls={s.cls} logos={S.logos} s={22} /> {s.cls} sinf o‘quvchisi</span>
                    <h2>{s.name}</h2>
                    <p>Natijalaringiz bir joyda — davom eting!</p>
                  </div>
                </div>
                <div className="hero-avg"><b><Count to={rank(x => S.A[x.id]?.avg)} />-o‘rin</b><span>{s.cls} sinfda</span></div>
              </div>
              <div className="grid tiles">
                <div className="card tile static"><span className="tile-ic"><Star /></span><b><Count to={A.avg || 0} /></b><span>o‘rtacha baho</span></div>
                <div className="card tile static"><span className="tile-ic"><Trophy /></span><b>{rank(x => S.A[x.id]?.avg)}/{mate.length}</b><span>{s.cls} sinfdagi o‘rnim</span></div>
                <div className="card tile static"><span className="tile-ic"><CalendarCheck /></span><b><Count to={Math.round(A.att || 0)} suffix="%" /></b><span>davomat</span></div>
                <div className="card tile static"><span className="tile-ic"><Award /></span><b><Count to={rep(A)} /></b><span>umumiy ball</span></div>
              </div>
              <div className="card">
                <h3>Fanlar bo‘yicha darajam</h3>
                <div className="rank-list">
                  {S.subjects.map((j, i) => {
                    const v = subAvg(s, j);
                    return (
                      <div className="rank wide" key={j} style={{ '--i': i }}>
                        <b className="subj-label">{j}</b>
                        <div className="grow"><Bar p={(v || 0) * 20} /></div>
                        <G g={v} />
                        <span className="muted rn">{rank(x => subAvg(x, j))}-o‘rin</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'Baholarim' && (
            <div className="card">
              <div className="toolbar">
                <h3 style={{ margin: 0 }}>Fan:</h3>
                <Sel v={sub} o={S.subjects} f={setSub} />
              </div>
              <div className="wrap">
                <table className="rows">
                  <thead>
                    <tr>
                      <th>Sana</th><th>Davomat</th><th className="c">Faollik</th>
                      <th className="c">Tarbiya</th><th className="c">Uyga vazifa</th><th className="c">Dars bahosi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((r, i) => {
                      const l = L(r);
                      return (
                        <tr key={r.date} style={{ '--i': i }}>
                          <td>{dayRelT(r.date)}</td>
                          <td><span className={'pill ' + (r.att === 'Yo‘q' ? 'warn-p' : '')}>{AL(r.att)}</span></td>
                          {l == null
                            ? <td colSpan={4} className="c muted">— dars bahosi qo‘yilmagan</td>
                            : <>
                              <td className="c"><G g={r.act} /></td>
                              <td className="c"><G g={r.beh} /></td>
                              <td className="c">{r.hw}% <G g={hwG(r.hw)} /></td>
                              <td className="c"><G g={l} /></td>
                            </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {mine.length === 0 && <Empty t="Hozircha baho yo‘q" />}
            </div>
          )}

          {tab === 'Dars jadvali' && <Schedule cls={s.cls} S={S} />}

          {tab === 'Uyga vazifa' && (
            <div className="card">
              <h3>Uyga vazifalar</h3>
              <div className="wrap">
                <table className="rows">
                  <tbody>
                    {S.subjects.map((j, i) => {
                      const l = all(s.id).filter(r => r.subj === j).sort((a, b) => b.date.localeCompare(a.date))[0];
                      return (
                        <tr key={j} style={{ '--i': i }}>
                          <td><b>{j}</b></td>
                          <td>{S.hw[s.cls + '|' + j] || <span className="muted">Topshiriq berilmagan</span>}</td>
                          <td>{l ? <span className="pill">{l.hw}%</span> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Hujjatlarim' && <DocsMine S={S} s={s} />}
          {tab === 'Izohlar' && (
            <div className="card">
              <h3>Ustozlar izohlari</h3>
              {myMsgs.map((x, i) => (
                <p key={'m' + i} className="fb-item"><span className="pill">{TN(x.t, S.teachers)}</span> <span className="muted">{x.d}</span> — {x.x}</p>
              ))}
              {comments.map((r, i) => (
                <p key={i} className="fb-item">
                  <span className="pill">{r.subj}</span> <span className="muted">{dayRelT(r.date)}</span> — {r.c}{' '}
                  <small className="muted">({TN(S.assign[s.cls]?.[r.subj], S.teachers)})</small>
                </p>
              ))}
              {!myMsgs.length && !comments.length && <Empty t="Hozircha izoh yo‘q" d="Ustozlar izoh qoldirganda shu yerda ko‘rinadi." />}
            </div>
          )}
        </main>
      </Build>
    </>
  );
}
