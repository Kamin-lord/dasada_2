
import { useState, useMemo } from 'react';
import { Building2, GraduationCap, Backpack, ArrowLeft, Wand2, LogIn, CalendarCheck, Star, BookOpenCheck } from 'lucide-react';
import { api } from '../api';
import { useSite } from '../site';
import { Sel, Chips, Logo, Build, Pw, Field } from './UI';

const ROLES = [
  ['admin', 'Administrator', 'Maktab boshqaruvi: o‘quvchi, ustoz, sinf va jadvallar', <Building2 size={34} />],
  ['teacher', 'O‘qituvchi', 'Ustoz va sinf rahbari — baholash, xabarlar, sinf holati', <GraduationCap size={34} />],
  ['student', 'O‘quvchi', 'Baholar, davomat, dars jadvali va uyga vazifa', <Backpack size={34} />]
];

export function Landing({ pick }) {
  const site = useSite();
  return (
    <Build k="roles">
      <div className="land">
        <div className="shapes" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
        </div>
        <div className="land-inner">
          <div className="glow"><Logo s={96} /></div>
          <h1><span>Al-Kundalik</span></h1>
          <p className="lead">{site.name === 'Al-Xorazmiy maktabi' ? 'Al-Xorazmiy maktabining elektron kundaligi. Davomat, dars baholari va uyga vazifalar — bir joyda.' : <><b>{site.name}</b> — <span>elektron kundalik. Davomat, dars baholari va uyga vazifalar — bir joyda.</span></>}</p>
          <div className="roles">
            {ROLES.map(([k, t, d, ic], i) => (
              <button key={k} type="button" className="role" style={{ '--i': i }} onClick={() => pick(k)}>
                <span className="ic">{ic}</span>
                <b>{t}</b>
                <small>{d}</small>
              </button>
            ))}
          </div>
          <div className="feat">
            <span><CalendarCheck size={16} /> Davomat</span>
            <span><Star size={16} /> Baholar</span>
            <span><BookOpenCheck size={16} /> Uyga vazifa</span>
          </div>
        </div>
      </div>
    </Build>
  );
}

export default function Login({ go }) {
  const [role, setRole] = useState(null);
  const [ph, setPh] = useState('');
  const [pw, setPw] = useState('');
  const [er, setEr] = useState('');
  const [nm, setNm] = useState('');
  const [sb, setSb] = useState('');
  const [subjOpts, setSubjOpts] = useState([]);
  const [busy, setBusy] = useState(false);

  const reset = r => { setRole(r); setEr(''); setPh(''); setPw(''); setNm(''); setSb(''); setSubjOpts([]); };

  const needSubj = subjOpts.length > 1;

  const auth = async () => {
    if (busy) return;
    if (role !== 'admin' && !nm.trim()) return setEr('Ism familiyangizni kiriting.');
    setBusy(true); setEr('');
    try {
      go(await api.login({ role, name: nm, subject: sb, phone: ph, pw }));
    } catch (e) {
      if (e.data && e.data.needSubject) setSubjOpts(e.data.subjects);
      setEr(e.message);
    } finally { setBusy(false); }
  };

  const fill = async () => {
    setEr('');
    try {
      const d = await api.demo();
      if (role === 'admin') { setPh(d.admin.phone); setPw(d.admin.pw); }
      else if (role === 'teacher') { setNm(d.teacher.name); setSb(d.teacher.subject); setPw(d.teacher.pw); }
      else { setNm(d.student.name); setPh(d.student.phone); setPw(d.student.pw); }
    } catch (e) { setEr(e.status === 0 ? e.message : 'Demo ma’lumot o‘chirilgan.'); }
  };

  if (!role) return <Landing pick={reset} />;

  const R = ROLES.find(x => x[0] === role);
  return (
    <Build k={role}>
      <main className="auth-wrap">
        <div className="card auth">
          <button className="back-btn" type="button" onClick={() => reset(null)}><ArrowLeft size={17} /> Orqaga</button>
          <div className="auth-h">
            <span className="auth-ic">{R[3]}</span>
            <div><h2>{R[1]}</h2><p className="muted">{role === 'teacher' ? 'Sinf rahbari bo‘lsangiz, qo‘shimcha bo‘limlar avtomatik ochiladi' : 'Hisobingizga kiring'}</p></div>
          </div>

          {role !== 'admin' && (
            <Field label="Ism familiya">
              <input className="w" placeholder={role === 'teacher' ? 'Masalan: Karimov Aziz' : 'Ism familiyangiz'} value={nm} onChange={e => { setNm(e.target.value); setEr(''); }} onKeyDown={e => e.key === 'Enter' && auth()} />
            </Field>
          )}
          {role === 'teacher' && needSubj && (
            <Field label="Bu ism bilan bir nechta ustoz bor — fanni tanlang">
              <Chips o={subjOpts} v={sb} f={setSb} />
            </Field>
          )}
          {role !== 'teacher' && (
            <Field label="Telefon raqam">
              <div className="ph">
                <span>+998</span>
                <input inputMode="numeric" maxLength={12} placeholder="90 123 45 67" value={ph} onChange={e => { setPh(e.target.value); setEr(''); }} onKeyDown={e => e.key === 'Enter' && auth()} />
              </div>
            </Field>
          )}
          <Field label="Parol">
            <Pw v={pw} f={v => { setPw(v); setEr(''); }} gen={false} onEnter={auth} />
          </Field>
          {er && <p className="err shake">{er}</p>}
          <button className="b big full" type="button" onClick={auth}><LogIn size={19} /> Kirish</button>
          <button type="button" className="demo-btn" onClick={fill}><Wand2 size={16} /> Demo ma’lumotni to‘ldirish</button>
        </div>
      </main>
    </Build>
  );
}
