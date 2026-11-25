
import { useState, useMemo, useEffect, useRef } from 'react';
import { Sun, Moon, LogOut, Crown, Volume2, VolumeX } from 'lucide-react';
import { INITIAL_SUBJ, INITIAL_T, CL, TN, agg, genSched, genAssign, mkS, seed } from './data';
import { Logo, Avatar, Build, ToastHost, toast, useFx } from './components/UI';
import Admin from './components/Admin';
import Teacher from './components/Teacher';
import Student from './components/Student';
import Login from './components/Login';
import { api, setToken, hasToken, diffState } from './api';
import { initSfx, isOn, setOn } from './sfx';
import { ClockBar } from './components/Clock';
import { useLang, setLang, LANGS } from './i18n';
import { DEFAULT_Q } from './data';
import { useSite } from './site';

function ThemeBtn() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let t = null;
    try { t = localStorage.getItem('kd-theme'); } catch { /* ignore */ }
    const d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(d);
    document.documentElement.dataset.theme = d ? 'dark' : 'light';
  }, []);
  const flip = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.add('theme-fade');
    document.documentElement.dataset.theme = d ? 'dark' : 'light';
    try { localStorage.setItem('kd-theme', d ? 'dark' : 'light'); } catch { /* ignore */ }
    setTimeout(() => document.documentElement.classList.remove('theme-fade'), 500);
  };
  return (
    <button type="button" className={'theme-btn' + (dark ? ' dark' : '')} onClick={flip} aria-label={dark ? 'Yorug‘ rejim' : 'Tungi rejim'} title={dark ? 'Yorug‘ rejim' : 'Tungi rejim'}>
      <Sun size={19} className="i-sun" /><Moon size={19} className="i-moon" />
    </button>
  );
}

function LangSwitch() {
  const l = useLang();
  return (
    <div className="lang-sw" role="group" aria-label="Til / Language / Язык">
      {LANGS.map(([k, s, n]) => <button key={k} type="button" className={l === k ? 'on' : ''} title={n} aria-pressed={l === k} onClick={() => setLang(k)}>{s}</button>)}
    </div>
  );
}

function SoundBtn() {
  const [on, set] = useState(isOn());
  const flip = () => { setOn(!on); set(!on); };
  return (
    <button type="button" className="theme-btn sound-btn" onClick={flip} aria-pressed={on} aria-label={on ? 'Ovozni o‘chirish' : 'Ovozni yoqish'} title={on ? 'Ovoz yoqilgan' : 'Ovoz o‘chirilgan'}>
      {on ? <Volume2 size={19} /> : <VolumeX size={19} />}
    </button>
  );
}

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [sched, setSched] = useState({});
  const [assign, setAssign] = useState({});
  const [recMap, setRecMap] = useState({});
  const [leaders, setLeaders] = useState({});
  const [fb, setFb] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [hw, setHw] = useState({});
  const [quarters, setQuarters] = useState(DEFAULT_Q);
  const [classes, setClasses] = useState([]);
  const [logos, setLogos] = useState({});
  const [docs, setDocs] = useState({});
  const site = useSite();
  useLang(); // til o‘zgarganda butun interfeys qayta chiziladi
  CL.splice(0, CL.length, ...classes); // sinflar ro‘yxati serverdan keladi (CL — umumiy massiv)
  useEffect(() => initSfx(), []);
  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(hasToken());
  const base = useRef(null);

  const hydrate = st => {
    base.current = st;
    setSubjects(st.subjects); setTeachers(st.teachers); setStudents(st.students); setSched(st.sched); setAssign(st.assign);
    setRecMap(st.recMap); setLeaders(st.leaders); setFb(st.fb); setMsgs(st.msgs); setHw(st.hw);
    setQuarters(st.quarters || DEFAULT_Q); setClasses(st.classes || []); setLogos(st.logos || {}); setDocs(st.docs || {});
  };
  const EMPTY = { subjects: [], teachers: [], students: [], sched: {}, assign: {}, recMap: {}, leaders: {}, fb: [], msgs: [], hw: {}, quarters: DEFAULT_Q, classes: [], logos: {}, docs: {} };

  // Sahifa yangilanganda sessiyani tiklash
  useEffect(() => {
    if (!hasToken()) return;
    api.state().then(r => { hydrate(r.state); setMe(r.me); }).catch(() => setToken(null)).finally(() => setBooting(false));
  }, []);

  // O‘zgarishlarni serverga yuborish (0.5 s kutib, faqat farqini)
  useEffect(() => {
    if (!me || !base.current) return;
    const cur = { subjects, teachers, students, sched, assign, recMap, leaders, fb, msgs, hw, quarters, classes, logos, docs };
    const d = diffState(base.current, cur, me.r);
    if (!d) return;
    const t = setTimeout(() => {
      api.sync(d).then(() => { base.current = cur; }).catch(e => {
        toast(e.message, { tone: 'err', ms: 5200 });
        api.state().then(r => hydrate(r.state)).catch(() => {});
      });
    }, 500);
    return () => clearTimeout(t);
  }, [me, subjects, teachers, students, sched, assign, recMap, leaders, fb, msgs, hw, quarters, classes, logos, docs]);
  const [scrolled, setScrolled] = useState(false);
  useFx();
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  const recs = useMemo(() => Object.values(recMap), [recMap]);
  const bySid = useMemo(() => {
    const m = new Map();
    recs.forEach(r => { let l = m.get(r.sid); if (!l) m.set(r.sid, l = []); l.push(r); });
    return m;
  }, [recs]);
  const A = useMemo(() => {
    const m = {};
    students.forEach(s => { m[s.id] = agg(bySid.get(s.id) || []); });
    return m;
  }, [students, bySid]);

  const S = {
    subjects, setSubjects, teachers, setTeachers,
    students, setStudents, sched, setSched, assign, setAssign,
    recMap, setRecMap, recs, bySid, A, leaders, setLeaders, fb, setFb, msgs, setMsgs, hw, setHw,
    quarters, setQuarters, classes, setClasses, logos, setLogos, docs, setDocs
  };

  const teacher = me?.r === 'teacher' ? teachers.find(t => t.id === me.id) : null;
  const student = me?.r === 'student' ? students.find(s => String(s.id) === me.id) : null;
  const led = teacher ? CL.filter(c => leaders[c] === teacher.id) : [];
  const who = !me ? null
    : me.r === 'admin' ? { n: 'Administrator', s: 'Maktab boshqaruvi' }
    : teacher ? { n: teacher.name, s: teacher.subj + (led.length ? ' · Sinf rahbari' : '') }
    : student ? { n: student.name, s: student.cls + ' sinf' }
    : { n: '—', s: '' };

  const login = res => {
    setToken(res.token);
    hydrate(res.state);
    setMe(res.me);
    window.scrollTo({ top: 0 });
    const st = res.state, u = res.me;
    const n = u.r === 'admin' ? 'Administrator' : u.r === 'teacher' ? TN(u.id, st.teachers) : (st.students.find(x => String(x.id) === u.id) || {}).name;
    toast('Xush kelibsiz, ' + n + '!', { ms: 2600 });
  };
  const logout = () => { setToken(null); setMe(null); hydrate(EMPTY); base.current = null; };

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className={'top' + (scrolled ? ' scrolled' : '')}>
        <button type="button" className="brand" onClick={() => me && window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Al-Kundalik">
          <Logo />
          <span>
            <span className="nm">Al-Kundalik</span>
            <small>{site.name}</small>
          </span>
        </button>
        <ClockBar me={me} S={S} />
        <span className="sp"></span>
        <LangSwitch />
        <SoundBtn />
        <ThemeBtn />
        {me && who && (
          <>
            <span className="who">
              <Avatar name={who.n} s={34} />
              <span className="who-t"><b>{who.n}</b><small>{led.length > 0 && <Crown size={12} />} {who.s}</small></span>
            </span>
            <button type="button" className="b gold" onClick={logout}><LogOut size={17} /> <span>Chiqish</span></button>
          </>
        )}
      </header>

      {booting ? (
        <main className="auth-wrap" />
      ) : !me ? (
        <Login go={login} />
      ) : (
        <Build k={me.r + (me.id || '')}>
          {me.r === 'admin' ? (
            <Admin S={S} />
          ) : teacher ? (
            <Teacher S={S} t={teacher} />
          ) : student ? (
            <Student S={S} s={student} />
          ) : (
            <main><p>Foydalanuvchi topilmadi.</p></main>
          )}
        </Build>
      )}
      <ToastHost />
    </div>
  );
}
