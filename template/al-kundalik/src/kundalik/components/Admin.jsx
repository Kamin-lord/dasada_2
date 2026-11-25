
import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays, School, UserPlus, Plus, Pencil, Trash2, Search, Copy, KeyRound, Crown, MessageSquare, Send, Star, TriangleAlert, PartyPopper, CopyPlus, Sparkles, CircleCheck, ArrowRight, Wand2, CalendarRange, FileCheck, Settings2, ArrowRightLeft, LifeBuoy
} from 'lucide-react';
import QuarterTab from './Quarter';
import { DocsAdmin } from './Docs';
import Support from './Support';
import { NowBoard } from './Clock';
import { CL, DAYS, SL, TN, nz, sPhone, tPwOf, iso, f1, mean, rep } from '../data';
import {
  Sel, Chips, G, Bar, Tabs, Build, Modal, Confirm, Field, Avatar, Count, Empty, Pw, toast, burst, copyText, ClassLogo
} from './UI';

const TABS = ['Umumiy', 'O‘quvchilar', 'Ustozlar', 'Sinflar', 'Fanlar', 'Dars jadvali', 'Choraklar', 'Hujjatlar', 'Yordam'];
const ICONS = {
  'Umumiy': <LayoutDashboard size={17} />,
  'O‘quvchilar': <Users size={17} />,
  'Ustozlar': <GraduationCap size={17} />,
  'Sinflar': <School size={17} />,
  'Fanlar': <BookOpen size={17} />,
  'Dars jadvali': <CalendarDays size={17} />,
  'Choraklar': <CalendarRange size={17} />,
  'Hujjatlar': <FileCheck size={17} />,
  'Yordam': <LifeBuoy size={17} />
};
const SUGGEST = ['Kimyo', 'Geografiya', 'Adabiyot', 'Rus tili', 'Texnologiya', 'Tasviriy san‘at', 'Musiqa', 'Huquq', 'Iqtisodiyot', 'Algebra', 'Geometriya', 'Chizmachilik'];

/* ═══════════════ ASOSIY ═══════════════ */
export default function Admin({ S }) {
  const [tab, setTab] = useState('Umumiy');
  const [modal, setModal] = useState(null); // {k:'student'|'teacher'|'feedback', id?}

  const snap = () => ({ subjects: S.subjects, teachers: S.teachers, students: S.students, sched: S.sched, assign: S.assign, leaders: S.leaders });
  const restore = s => {
    S.setSubjects(s.subjects); S.setTeachers(s.teachers); S.setStudents(s.students);
    S.setSched(s.sched); S.setAssign(s.assign); S.setLeaders(s.leaders);
  };
  const undoable = (msg, fn) => {
    const b = snap();
    fn();
    toast(msg, { undo: () => { restore(b); toast('Qaytarildi', { ms: 2200, tone: 'info' }); } });
  };

  const warns = useMemo(() => {
    const w = [];
    CL.forEach(c => { if (!S.leaders[c]) w.push({ t: c + ' sinfiga rahbar tayinlanmagan', go: 'Sinflar' }); });
    CL.forEach(c => S.subjects.forEach(s => { if (!S.assign[c]?.[s]) w.push({ t: c + ' · ' + s + ' fanidan ustoz yo‘q', go: 'Sinflar' }); }));
    return w;
  }, [S.leaders, S.assign, S.subjects]);

  const props = { S, undoable, open: setModal, go: setTab };
  return (
    <>
      <Tabs t={TABS} icons={ICONS} v={tab} f={setTab} badges={{ 'Sinflar': warns.length > 99 ? '99+' : warns.length || 0 }} />
      <Build k={tab}>
        <main>
          {tab === 'Umumiy' && <Overview {...props} warns={warns} />}
          {tab === 'O‘quvchilar' && <StudentsTab {...props} />}
          {tab === 'Ustozlar' && <TeachersTab {...props} />}
          {tab === 'Sinflar' && <ClassesTab {...props} />}
          {tab === 'Fanlar' && <SubjectsTab {...props} />}
          {tab === 'Dars jadvali' && <ScheduleTab {...props} />}
          {tab === 'Choraklar' && <QuarterTab S={S} />}
          {tab === 'Hujjatlar' && <DocsAdmin S={S} />}
          {tab === 'Yordam' && <Support />}
        </main>
      </Build>
      {modal?.k === 'student' && <StudentModal S={S} id={modal.id} onClose={() => setModal(null)} />}
      {modal?.k === 'teacher' && <TeacherModal S={S} id={modal.id} onClose={() => setModal(null)} />}
      {modal?.k === 'feedback' && <FeedbackModal S={S} id={modal.id} onClose={() => setModal(null)} />}
    </>
  );
}

/* ═══════════════ UMUMIY ═══════════════ */
function Overview({ S, open, go, warns }) {
  const rows = useMemo(() => CL.map(c => {
    const st = S.students.filter(s => s.cls === c);
    return { c, n: st.length, v: mean(st.map(s => S.A[s.id]?.avg).filter(x => x != null)) };
  }).sort((a, b) => (b.v || 0) - (a.v || 0)), [S.students, S.A]);
  const overall = mean(rows.map(r => r.v).filter(x => x != null));

  const tiles = [
    ['O‘quvchilar', S.students.length, <Users />, 'o‘quvchi', 'O‘quvchilar'],
    ['Ustozlar', S.teachers.length, <GraduationCap />, 'ustoz', 'Ustozlar'],
    ['Sinflar', CL.length, <School />, 'sinf', 'Sinflar'],
    ['Fanlar', S.subjects.length, <BookOpen />, 'fan', 'Fanlar']
  ];
  const quick = [
    [<UserPlus />, 'O‘quvchi qo‘shish', 'Yangi o‘quvchini ro‘yxatga olish', () => open({ k: 'student' })],
    [<GraduationCap />, 'Ustoz qo‘shish', 'Fan, sinf va sinf rahbarligi bilan', () => open({ k: 'teacher' })],
    [<School />, 'Sinflarni sozlash', 'Rahbar va fan ustozlari', () => go('Sinflar')],
    [<CalendarDays />, 'Dars jadvali', 'Kun va soat bo‘yicha tahrirlash', () => go('Dars jadvali')]
  ];

  return (
    <>
      <div className="hero card">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> Boshqaruv markazi</span>
          <h2>Xush kelibsiz, administrator!</h2>
          <p>Maktabning barcha ma’lumotlari bir joyda. Eng ko‘p kerak bo‘ladigan amallar pastda — bir bosishda.</p>
        </div>
        <div className="hero-avg">
          <b><Count to={overall || 0} /></b>
          <span>maktab o‘rtacha bahosi</span>
        </div>
      </div>

      <div className="grid tiles">
        {tiles.map(([t, n, ic, u, to], i) => (
          <button key={t} type="button" className="card tile" style={{ '--i': i }} onClick={() => go(to)}>
            <span className="tile-ic">{ic}</span>
            <b><Count to={n} /></b>
            <span>{t}</span>
            <ArrowRight className="tile-go" size={18} />
          </button>
        ))}
      </div>

      <NowBoard S={S} />

      <h3 className="sec">Tezkor amallar</h3>
      <div className="grid qas">
        {quick.map(([ic, t, d, fn], i) => (
          <button key={t} type="button" className="qa" style={{ '--i': i }} onClick={fn}>
            <span className="qa-ic">{ic}</span>
            <span className="qa-t"><b>{t}</b><small>{d}</small></span>
          </button>
        ))}
      </div>

      <div className="grid two">
        <div className="card">
          <h3 className="h-ic"><Star size={19} /> Sinflar reytingi</h3>
          <div className="rank-list">
            {rows.map((r, i) => (
              <div className="rank" key={r.c} style={{ '--i': i }}>
                <span className="rk">{i + 1}</span>
                <b className="cls-label">{r.c}</b>
                <div className="grow"><Bar p={(r.v || 0) * 20} /></div>
                <span className="muted rn">{r.n} ta</span>
                <G g={r.v} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="h-ic"><TriangleAlert size={19} /> E’tibor talab qiladi</h3>
          {warns.length === 0 ? (
            <Empty icon={<PartyPopper size={28} />} t="Hammasi joyida!" d="Barcha sinflarda rahbar va fan ustozlari bor." />
          ) : (
            <>
              <p className="muted small">{warns.length} ta kamchilik topildi. “Tuzatish” tugmasi sizni kerakli joyga olib boradi.</p>
              <div className="warns">
                {warns.slice(0, 6).map((w, i) => (
                  <div className="warn" key={i}><span>{w.t}</span></div>
                ))}
                {warns.length > 6 && <div className="warn more">…va yana {warns.length - 6} ta</div>}
              </div>
              <button type="button" className="b" onClick={() => go('Sinflar')}><Wand2 size={17} /> Tuzatish</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════ O‘QUVCHILAR ═══════════════ */
function StudentsTab({ S, undoable, open }) {
  const [q, setQ] = useState('');
  const [fc, setFc] = useState('Hammasi');
  const [lim, setLim] = useState(25);
  const [del, setDel] = useState(null);
  const list = useMemo(() => S.students.filter(s =>
    (fc === 'Hammasi' || s.cls === fc) && (!q.trim() || nz(s.name).includes(nz(q)) || s.phone.includes(q.trim()))
  ), [S.students, fc, q]);

  return (
    <div className="card">
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input placeholder="Ism yoki telefon bo‘yicha qidirish…" value={q} onChange={e => { setQ(e.target.value); setLim(25); }} />
        </div>
        <Sel v={fc} o={['Hammasi', ...CL]} f={v => { setFc(v); setLim(25); }} />
        <button type="button" className="b" onClick={() => open({ k: 'student' })}><UserPlus size={18} /> O‘quvchi qo‘shish</button>
      </div>
      <p className="muted small count-line">{list.length} ta o‘quvchi topildi</p>

      {list.length === 0 ? (
        <Empty t="Hech narsa topilmadi" d="Qidiruvni o‘zgartiring yoki yangi o‘quvchi qo‘shing.">
          <button type="button" className="b" onClick={() => open({ k: 'student' })}><UserPlus size={18} /> O‘quvchi qo‘shish</button>
        </Empty>
      ) : (
        <div className="wrap">
          <table className="rows">
            <thead>
              <tr><th>O‘quvchi</th><th>Sinf</th><th className="c">O‘rtacha</th><th>Davomat</th><th>Reputatsiya</th><th>Kirish ma’lumoti</th><th></th></tr>
            </thead>
            <tbody>
              {list.slice(0, lim).map((s, i) => {
                const a = S.A[s.id] || {};
                const p = rep(a);
                return (
                  <tr key={s.id} style={{ '--i': i % 25 }}>
                    <td><div className="who-cell"><Avatar name={s.name} s={34} /><b>{s.name}</b></div></td>
                    <td><span className="pill">{s.cls}</span></td>
                    <td className="c"><G g={a.avg} /></td>
                    <td>{a.att == null ? '—' : Math.round(a.att) + '%'}</td>
                    <td><div className="rep-row"><Bar p={p} /><b>{p}</b></div></td>
                    <td>
                      <button type="button" className="cred" title="Nusxalash" onClick={() => copyText(`${s.name}\nTelefon: +998 ${s.phone}\nParol: ${s.pw}`, 'Kirish ma’lumoti nusxalandi')}>
                        <span>+998 {s.phone}</span><i>·</i><span>{s.pw}</span><Copy size={14} />
                      </button>
                    </td>
                    <td className="actions">
                      <button type="button" className="ib" title="Tahrirlash" aria-label="Tahrirlash" onClick={() => open({ k: 'student', id: s.id })}><Pencil size={17} /></button>
                      <button type="button" className="ib danger" title="O‘chirish" aria-label="O‘chirish" onClick={() => setDel(s)}><Trash2 size={17} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.length > lim && (
        <div className="center">
          <button type="button" className="b o" onClick={() => setLim(l => l + 25)}>Yana {Math.min(25, list.length - lim)} ta ko‘rsatish</button>
        </div>
      )}
      <Confirm open={!!del} title="O‘quvchini o‘chirish" icon={<Trash2 />}
        text={del ? `${del.name} (${del.cls}) ro‘yxatdan o‘chiriladi. Xohlasangiz, keyin “Qaytarish” tugmasi bilan tiklashingiz mumkin.` : ''}
        onClose={() => setDel(null)}
        onOk={() => undoable(del.name + ' o‘chirildi', () => S.setStudents(S.students.filter(x => x.id !== del.id)))} />
    </div>
  );
}

function StudentModal({ S, id, onClose }) {
  const edit = id != null ? S.students.find(s => s.id === id) : null;
  const nid = Math.max(0, ...S.students.map(s => s.id)) + 1;
  const [f, setF] = useState(edit
    ? { name: edit.name, cls: edit.cls, phone: edit.phone, pw: edit.pw }
    : { name: '', cls: CL[0], phone: sPhone(nid), pw: 'oquvchi' + nid });
  const [er, setEr] = useState('');
  const [done, setDone] = useState(null);
  const set = p => { setF({ ...f, ...p }); setEr(''); };

  const save = e => {
    const name = f.name.trim();
    const phone = f.phone.replace(/\D/g, '').slice(-9);
    if (name.length < 3) return setEr('Ism familiyani to‘liq kiriting');
    if (phone.length !== 9) return setEr('Telefon raqam 9 ta raqamdan iborat bo‘lishi kerak (masalan 90 123 45 67)');
    if (S.students.some(s => s.phone === phone && s.id !== edit?.id)) return setEr('Bu telefon raqam boshqa o‘quvchiga biriktirilgan');
    const pw = f.pw.trim() || 'oquvchi' + (edit?.id ?? nid);
    if (edit) {
      S.setStudents(S.students.map(x => x.id === edit.id ? { ...x, name, cls: f.cls, phone, pw } : x));
      toast(name + ' ma’lumotlari saqlandi');
      onClose();
    } else {
      S.setStudents([...S.students, { id: nid, name, cls: f.cls, q: .5 + Math.random() * .4, phone, pw }]);
      setDone({ name, cls: f.cls, phone, pw });
      burst(e?.clientX, e?.clientY);
    }
  };

  if (done) return (
    <Modal open onClose={onClose} title="O‘quvchi qo‘shildi!" icon={<PartyPopper />} tone="success"
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Yopish</button>
        <button type="button" className="b" onClick={() => { setDone(null); setF({ name: '', cls: done.cls, phone: sPhone(nid), pw: 'oquvchi' + nid }); }}><Plus size={18} /> Yana qo‘shish</button>
      </>}>
      <div className="done-card">
        <Avatar name={done.name} s={56} />
        <b>{done.name}</b>
        <span className="pill">{done.cls}</span>
      </div>
      <div className="creds">
        <div><small>Telefon (login)</small><b>+998 {done.phone}</b></div>
        <div><small>Parol</small><b>{done.pw}</b></div>
      </div>
      <button type="button" className="b o full" onClick={() => copyText(`${done.name}\nTelefon: +998 ${done.phone}\nParol: ${done.pw}`, 'Nusxalandi')}><Copy size={17} /> Kirish ma’lumotini nusxalash</button>
    </Modal>
  );

  return (
    <Modal open onClose={onClose} title={edit ? 'O‘quvchini tahrirlash' : 'Yangi o‘quvchi'} icon={edit ? <Pencil /> : <UserPlus />}
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Bekor qilish</button>
        <button type="button" className="b" onClick={save}>{edit ? 'Saqlash' : 'Qo‘shish'}</button>
      </>}>
      <div className="form" onKeyDown={e => e.key === 'Enter' && e.target.tagName === 'INPUT' && save(e)}>
        <Field label="Ism familiya">
          <input className="w" placeholder="Masalan: Aziza Qodirova" value={f.name} onChange={e => set({ name: e.target.value })} />
        </Field>
        <Field label="Sinf">
          <Chips o={CL} v={f.cls} f={v => set({ cls: v })} className="sm" />
        </Field>
        <div className="two-f">
          <Field label="Telefon (login)">
            <div className="ph"><span>+998</span><input inputMode="numeric" maxLength={12} value={f.phone} onChange={e => set({ phone: e.target.value })} /></div>
          </Field>
          <Field label="Parol">
            <Pw v={f.pw} f={v => set({ pw: v })} />
          </Field>
        </div>
        <p className="muted small">Telefon va parol avtomatik to‘ldirilgan — xohlasangiz o‘zgartiring.</p>
        {er && <p className="err shake">{er}</p>}
      </div>
    </Modal>
  );
}

/* ═══════════════ USTOZLAR ═══════════════ */
function TeachersTab({ S, undoable, open }) {
  const [q, setQ] = useState('');
  const [fs, setFs] = useState('Hammasi');
  const [del, setDel] = useState(null);
  const classesOf = t => CL.filter(c => S.assign[c]?.[t.subj] === t.id);
  const ledBy = t => CL.filter(c => S.leaders[c] === t.id);
  const list = S.teachers.filter(t => (fs === 'Hammasi' || t.subj === fs) && (!q.trim() || nz(t.name).includes(nz(q))));

  const remove = t => {
    undoable(t.name + ' o‘chirildi', () => {
      const fb = (subj, ci) => {
        const l = S.teachers.filter(x => x.subj === subj && x.id !== t.id);
        return l.length ? l[ci % l.length].id : '';
      };
      const assign = {};
      CL.forEach((c, ci) => {
        const row = { ...(S.assign[c] || {}) };
        Object.keys(row).forEach(sj => { if (row[sj] === t.id) row[sj] = fb(sj, ci); });
        assign[c] = row;
      });
      const leaders = { ...S.leaders };
      CL.forEach(c => { if (leaders[c] === t.id) leaders[c] = ''; });
      S.setTeachers(S.teachers.filter(x => x.id !== t.id));
      S.setAssign(assign);
      S.setLeaders(leaders);
    });
  };

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input placeholder="Ustoz ismi bo‘yicha qidirish…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Sel v={fs} o={['Hammasi', ...S.subjects]} f={setFs} />
          <button type="button" className="b" onClick={() => open({ k: 'teacher' })}><UserPlus size={18} /> Ustoz qo‘shish</button>
        </div>
        <p className="muted small count-line">{list.length} ta ustoz · ustoz bir vaqtning o‘zida sinf rahbari ham bo‘lishi mumkin</p>
        {list.length === 0 ? (
          <Empty t="Ustoz topilmadi" d="Qidiruvni o‘zgartiring yoki yangi ustoz qo‘shing.">
            <button type="button" className="b" onClick={() => open({ k: 'teacher' })}><UserPlus size={18} /> Ustoz qo‘shish</button>
          </Empty>
        ) : (
          <div className="tgrid">
            {list.map((t, i) => {
              const cs = classesOf(t), ld = ledBy(t);
              return (
                <div className="tc" key={t.id} style={{ '--i': i % 12 }}>
                  <div className="tc-top">
                    <Avatar name={t.name} s={46} />
                    <div className="tc-n">
                      <b>{t.name}</b>
                      <span className="pill">{t.subj}</span>
                    </div>
                    {ld.length > 0 && <span className="crown" title={'Sinf rahbari: ' + ld.join(', ')}><Crown size={16} /> {ld.join(', ')}</span>}
                  </div>
                  <div className="tc-cls">
                    {cs.length ? cs.slice(0, 7).map(c => <span key={c} className="mini">{c}</span>) : <span className="muted small">Sinfga biriktirilmagan</span>}
                    {cs.length > 7 && <span className="mini more">+{cs.length - 7}</span>}
                  </div>
                  <div className="tc-act">
                    <button type="button" className="cred" title="Kirish ma’lumotini nusxalash" onClick={() => copyText(`${t.name}\nFan: ${t.subj}\nParol: ${tPwOf(t)}`, 'Kirish ma’lumoti nusxalandi')}>
                      <KeyRound size={14} /><span>{tPwOf(t)}</span><Copy size={13} />
                    </button>
                    <span className="sp" />
                    <button type="button" className="ib" title="Fikr bildirish" aria-label="Fikr bildirish" onClick={() => open({ k: 'feedback', id: t.id })}><MessageSquare size={17} /></button>
                    <button type="button" className="ib" title="Tahrirlash" aria-label="Tahrirlash" onClick={() => open({ k: 'teacher', id: t.id })}><Pencil size={17} /></button>
                    <button type="button" className="ib danger" title="O‘chirish" aria-label="O‘chirish" onClick={() => setDel(t)}><Trash2 size={17} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {S.fb.length > 0 && (
        <div className="card">
          <h3 className="h-ic"><MessageSquare size={19} /> Yuborilgan fikrlar</h3>
          {S.fb.slice(0, 8).map((f, i) => (
            <p key={i} className="fb-item"><span className="pill">{TN(f.t, S.teachers)}</span> <span className="muted">{f.d}</span> — {f.x}</p>
          ))}
        </div>
      )}

      <Confirm open={!!del} title="Ustozni o‘chirish" icon={<Trash2 />}
        text={del ? `${del.name} (${del.subj}) o‘chiriladi. Uning sinflariga shu fandan boshqa ustoz avtomatik biriktiriladi. Keyin “Qaytarish” bilan tiklash mumkin.` : ''}
        onClose={() => setDel(null)} onOk={() => remove(del)} />
    </>
  );
}

function TeacherModal({ S, id, onClose }) {
  const edit = id ? S.teachers.find(t => t.id === id) : null;
  const nid = 't' + (Math.max(0, ...S.teachers.map(t => +t.id.slice(1) || 0)) + 1);
  const [f, setF] = useState(() => edit ? {
    name: edit.name, subj: edit.subj,
    classes: CL.filter(c => S.assign[c]?.[edit.subj] === edit.id),
    lead: CL.filter(c => S.leaders[c] === edit.id),
    pw: tPwOf(edit)
  } : { name: '', subj: S.subjects[0] || '', classes: [], lead: [], pw: 'ustoz' + nid.slice(1) });
  const [er, setEr] = useState('');
  const [done, setDone] = useState(null);
  const set = p => { setF(x => ({ ...x, ...p })); setEr(''); };

  const fallback = (subj, ex, ci) => {
    const l = S.teachers.filter(t => t.subj === subj && t.id !== ex);
    return l.length ? l[ci % l.length].id : '';
  };

  const save = e => {
    const name = f.name.trim();
    if (name.length < 3) return setEr('Ustoz ism familiyasini to‘liq kiriting');
    if (!f.subj) return setEr('Avval fan tanlang');
    if (S.teachers.some(t => nz(t.name) === nz(name) && t.subj === f.subj && t.id !== edit?.id)) return setEr('Bu fan bo‘yicha shunday ustoz allaqachon bor');
    const tid = edit ? edit.id : nid;
    const pw = f.pw.trim() || 'ustoz' + tid.slice(1);
    const t = { id: tid, name, subj: f.subj, pw };
    const teachers = edit ? S.teachers.map(x => x.id === tid ? t : x) : [...S.teachers, t];
    const assign = {};
    CL.forEach((c, ci) => {
      const row = { ...(S.assign[c] || {}) };
      if (edit) Object.keys(row).forEach(sj => {
        if (row[sj] === tid && (sj !== f.subj || !f.classes.includes(c))) row[sj] = fallback(sj, tid, ci);
      });
      if (f.classes.includes(c)) row[f.subj] = tid;
      assign[c] = row;
    });
    const leaders = { ...S.leaders };
    CL.forEach(c => {
      if (leaders[c] === tid && !f.lead.includes(c)) leaders[c] = '';
      if (f.lead.includes(c)) leaders[c] = tid;
    });
    S.setTeachers(teachers); S.setAssign(assign); S.setLeaders(leaders);
    if (edit) { toast(name + ' ma’lumotlari saqlandi'); onClose(); }
    else { setDone({ name, subj: f.subj, pw, nc: f.classes.length, lead: f.lead }); burst(e?.clientX, e?.clientY); }
  };

  const swap = f.classes.filter(c => { const cur = S.assign[c]?.[f.subj]; return cur && cur !== edit?.id; });

  if (done) return (
    <Modal open onClose={onClose} title="Ustoz qo‘shildi!" icon={<PartyPopper />} tone="success"
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Yopish</button>
        <button type="button" className="b" onClick={() => { setDone(null); setF({ name: '', subj: done.subj, classes: [], lead: [], pw: 'ustoz' + nid.slice(1) }); }}><Plus size={18} /> Yana qo‘shish</button>
      </>}>
      <div className="done-card">
        <Avatar name={done.name} s={56} />
        <b>{done.name}</b>
        <span className="pill">{done.subj}</span>
        {done.lead.length > 0 && <span className="crown"><Crown size={15} /> {done.lead.join(', ')} sinf rahbari</span>}
      </div>
      <div className="creds">
        <div><small>Ism familiya</small><b>{done.name}</b></div>
        <div><small>Fan</small><b>{done.subj}</b></div>
        <div><small>Parol</small><b>{done.pw}</b></div>
      </div>
      <p className="muted small center-t">{done.nc ? done.nc + ' ta sinfga biriktirildi. ' : ''}Ustoz “O‘qituvchi” orqali kiradi{done.lead.length ? ' va sinf rahbari bo‘limi ham shu yerda ochiladi' : ''}.</p>
      <button type="button" className="b o full" onClick={() => copyText(`${done.name}\nFan: ${done.subj}\nParol: ${done.pw}`, 'Nusxalandi')}><Copy size={17} /> Kirish ma’lumotini nusxalash</button>
    </Modal>
  );

  return (
    <Modal open wide onClose={onClose} title={edit ? 'Ustozni tahrirlash' : 'Yangi ustoz'} icon={edit ? <Pencil /> : <GraduationCap />}
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Bekor qilish</button>
        <button type="button" className="b" onClick={save}>{edit ? 'Saqlash' : 'Ustozni qo‘shish'}</button>
      </>}>
      <div className="form" onKeyDown={e => e.key === 'Enter' && e.target.tagName === 'INPUT' && save(e)}>
        <div className="step"><i>1</i> Ustoz kim?</div>
        <Field label="Ism familiya">
          <input className="w" placeholder="Masalan: Karimov Aziz" value={f.name} onChange={e => set({ name: e.target.value })} />
        </Field>
        <Field label="Qaysi fandan dars beradi?">
          <Chips o={S.subjects} v={f.subj} f={v => set({ subj: v })} />
        </Field>

        <div className="step"><i>2</i> Qaysi sinflarga dars beradi? <small>(ixtiyoriy)</small></div>
        <div className="mini-act">
          <button type="button" className="link" onClick={() => set({ classes: [...CL] })}>Hammasi</button>
          <button type="button" className="link" onClick={() => set({ classes: [] })}>Tozalash</button>
          <span className="muted small">{f.classes.length} ta tanlandi</span>
        </div>
        <Chips multi o={CL} v={f.classes} f={v => set({ classes: v })} className="sm" />
        {swap.length > 0 && <p className="note"><TriangleAlert size={15} /> {swap.length} ta sinfda hozirgi {f.subj} ustozi shu ustoz bilan almashtiriladi.</p>}

        <div className="step"><i>3</i> Sinf rahbari bo‘ladimi? <small>(ixtiyoriy)</small></div>
        <Chips multi o={CL.map(c => [c, c, S.leaders[c] && S.leaders[c] !== edit?.id ? 'Hozirgi rahbar: ' + TN(S.leaders[c], S.teachers) : 'Rahbar yo‘q'])} v={f.lead} f={v => set({ lead: v })} className="sm gold" />
        <p className="muted small">Sinf rahbari bo‘lsa, ustoz o‘z panelida sinf holati va o‘quvchilar baholarini ham ko‘radi.</p>

        <div className="step"><i>4</i> Kirish paroli</div>
        <Field hint="Ustoz ism familiyasi, fani va shu parol bilan kiradi.">
          <Pw v={f.pw} f={v => set({ pw: v })} />
        </Field>
        {er && <p className="err shake">{er}</p>}
      </div>
    </Modal>
  );
}

function FeedbackModal({ S, id, onClose }) {
  const t = S.teachers.find(x => x.id === id);
  const [tx, setTx] = useState('');
  if (!t) return null;
  const mine = S.fb.filter(f => f.t === id);
  const send = () => {
    if (!tx.trim()) return;
    S.setFb([{ t: id, x: tx.trim(), d: iso(new Date()) }, ...S.fb]);
    toast('Fikr yuborildi');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={'Fikr: ' + t.name} icon={<MessageSquare />}
      foot={<>
        <button type="button" className="b o" onClick={onClose}>Bekor qilish</button>
        <button type="button" className="b" onClick={send} disabled={!tx.trim()}><Send size={17} /> Yuborish</button>
      </>}>
      <textarea placeholder="Fikr yoki ko‘rsatmangizni yozing…" value={tx} onChange={e => setTx(e.target.value)} />
      {mine.slice(0, 4).map((f, i) => <p key={i} className="fb-item"><span className="muted">{f.d}</span> — {f.x}</p>)}
    </Modal>
  );
}

/* ═══════════════ SINFLAR ═══════════════ */
function ClassesTab({ S }) {
  const [c, setC] = useState(CL[0]);
  const st = S.students.filter(s => s.cls === c);
  const avg = mean(st.map(s => S.A[s.id]?.avg).filter(x => x != null));
  const opts = s => [
    ...S.teachers.filter(t => t.subj === s).map(t => [t.id, t.name]),
    ...S.teachers.filter(t => t.subj !== s).map(t => [t.id, t.name + ' · ' + t.subj])
  ];
  const problems = cc => (!S.leaders[cc] ? 1 : 0) + S.subjects.filter(s => !S.assign[cc]?.[s]).length;
  const [add, setAdd] = useState(false);
  const [nm, setNm] = useState('');
  const [del, setDel] = useState(null);
  const create = () => {
    const n = nm.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{N}][\p{L}\p{N} .-]{0,19}$/u.test(n)) return toast('Sinf nomi 1–20 belgi: harf, raqam, probel, nuqta yoki tire.', { tone: 'err' });
    if (CL.some(x => x.toLowerCase() === n.toLowerCase())) return toast('Bunday sinf allaqachon bor.', { tone: 'err' });
    if (!S.subjects.length) return toast('Avval “Fanlar” bo‘limida fan qo‘shing.', { tone: 'err' });
    const load = id => Object.values(S.assign).reduce((a, m) => a + Object.values(m).filter(x => x === id).length, 0);
    const asg = {};
    S.subjects.forEach(sub => { const ts = S.teachers.filter(t => t.subj === sub).sort((a, b) => load(a.id) - load(b.id)); asg[sub] = ts[0] ? ts[0].id : ''; });
    const sch = Array.from({ length: 5 }, (_, d) => Array.from({ length: 7 }, (_, i) => S.subjects[(i + d * 3 + CL.length * 2) % S.subjects.length]));
    S.setClasses([...S.classes, n]);
    S.setSched({ ...S.sched, [n]: sch });
    S.setAssign({ ...S.assign, [n]: asg });
    S.setLeaders({ ...S.leaders, [n]: '' });
    setC(n); setNm(''); setAdd(false);
    toast(n + ' sinfi qo‘shildi. Sinf rahbarini tayinlang.', { ms: 3200 });
  };
  const removeClass = n => {
    const omit = o => Object.fromEntries(Object.entries(o).filter(([k]) => k !== n));
    S.setClasses(S.classes.filter(x => x !== n));
    S.setSched(omit(S.sched)); S.setAssign(omit(S.assign)); S.setLeaders(omit(S.leaders));
    setC(S.classes.find(x => x !== n) || '');
    setDel(null);
    toast(n + ' sinfi o‘chirildi', { tone: 'info' });
  };

  return (
    <div className="card">
      <div className="toolbar">
        <h3 style={{ margin: 0 }}>Sinflar</h3>
        <span className="sp" />
        <button type="button" className="b" onClick={() => setAdd(!add)}><Plus size={17} /> Sinf qo‘shish</button>
      </div>
      {add && (
        <div className="row add-cls">
          <input className="w" autoFocus placeholder="Sinf nomi, masalan: 8-A yoki Matematika-B" value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
          <button type="button" className="b" onClick={create}>Yaratish</button>
        </div>
      )}
      <Confirm open={!!del} title="Sinfni o‘chirish" text={del + ' sinfi va uning dars jadvali o‘chiriladi. Bu sinfda o‘quvchi yo‘q.'} onOk={() => removeClass(del)} onClose={() => setDel(null)} />
      <h3 className="sec">Sinfni tanlang</h3>
      <div className="chips cls-pick">
        {CL.map(x => {
          const p = problems(x);
          return (
            <button key={x} type="button" className={'chip' + (x === c ? ' on' : '')} onClick={() => setC(x)}>
              {x}{p > 0 && <i className="dot" title={p + ' ta kamchilik'} />}
            </button>
          );
        })}
      </div>

      <div className="cls-head" key={c}>
        <ClassLogo cls={c} logos={S.logos} s={44} />
        <div><b>{c}</b><span className="muted"> sinf</span></div>
        <span className="pill">{st.length} o‘quvchi</span>
        {st.length === 0 && CL.length > 1 && <button type="button" className="b o sm" onClick={() => setDel(c)}><Trash2 size={16} /> O‘chirish</button>}
        <span className="pill">o‘rtacha {f1(avg)}</span>
      </div>

      <div className="leader-box">
        <span className="lb-ic"><Crown size={22} /></span>
        <div className="lb-t"><b>Sinf rahbari</b><small>Sinfning ustozi — o‘z panelida sinf holatini ko‘radi</small></div>
        <Sel full ph="Tayinlanmagan" v={S.leaders[c]} o={S.teachers.map(t => [t.id, t.name + ' · ' + t.subj])} f={v => S.setLeaders({ ...S.leaders, [c]: v })} />
      </div>

      <h3 className="sec">Fan ustozlari</h3>
      <div className="subj-rows">
        {S.subjects.map(s => (
          <div className={'subj-row' + (S.assign[c]?.[s] ? '' : ' miss')} key={s}>
            <b>{s}</b>
            <Sel full ph="Ustoz tanlang" v={S.assign[c]?.[s] || ''} o={opts(s)} f={v => S.setAssign({ ...S.assign, [c]: { ...S.assign[c], [s]: v } })} />
          </div>
        ))}
      </div>

      {c && <ClassSettings S={S} c={c} key={c} />}
    </div>
  );
}

function ClassSettings({ S, c }) {
  const others = CL.filter(x => x !== c);
  const [src, setSrc] = useState('');
  const [what, setWhat] = useState(['assign']);
  const [dst, setDst] = useState('');
  const [ask, setAsk] = useState(null);
  const st = S.students.filter(s => s.cls === c);
  const missing = S.subjects.filter(s => !S.assign[c]?.[s]);
  const load = id => Object.values(S.assign).reduce((a, m) => a + Object.values(m).filter(x => x === id).length, 0);
  const WL = { assign: 'fan ustozlari', sched: 'dars jadvali' };

  const autofill = () => {
    const asg = { ...(S.assign[c] || {}) };
    let n = 0;
    missing.forEach(sub => {
      const ts = S.teachers.filter(t => t.subj === sub).sort((a, b) => load(a.id) - load(b.id));
      if (ts[0]) { asg[sub] = ts[0].id; n++; }
    });
    if (!n) return toast('Bo‘sh fanlar uchun mos ustoz topilmadi. Avval “Ustozlar” bo‘limida ustoz qo‘shing.', { tone: 'err', ms: 5200 });
    S.setAssign({ ...S.assign, [c]: asg });
    toast(n + ' ta fanga ustoz tayinlandi', { ms: 3000 });
  };
  const copyFrom = () => {
    if (what.includes('assign')) S.setAssign({ ...S.assign, [c]: { ...S.assign[src] } });
    if (what.includes('sched') && S.sched[src]) S.setSched({ ...S.sched, [c]: S.sched[src].map(d => [...d]) });
    toast(c + ' sinfiga ' + src + ' sinfidan nusxa olindi', { ms: 3200 });
  };
  const moveAll = () => {
    S.setStudents(S.students.map(x => (x.cls === c ? { ...x, cls: dst } : x)));
    toast(st.length + ' o‘quvchi ' + dst + ' sinfiga ko‘chirildi', { ms: 3200 });
    setDst('');
  };

  return (
    <>
      <h3 className="sec h-ic"><Settings2 size={20} /> Sinf sozlamalari</h3>
      <div className="set-list">
        <div className="set-row">
          <div className="set-t">
            <b>Fan ustozlarini avtomatik taqsimlash</b>
            <small>{missing.length ? missing.length + ' ta fanda ustoz yo‘q. Eng kam yuklangan ustoz tanlanadi, mavjud tanlovlar o‘zgarmaydi.' : 'Hamma fanda ustoz tayinlangan.'}</small>
          </div>
          <button type="button" className="b o" disabled={!missing.length} onClick={autofill}><Wand2 size={17} /> Taqsimlash</button>
        </div>

        <div className="set-row col">
          <div className="set-t">
            <b>Boshqa sinfdan nusxa olish</b>
            <small>Tanlangan ma’lumot {c} sinfida almashtiriladi.</small>
          </div>
          <div className="set-ctl">
            <Sel ph="Sinfni tanlang" v={src} o={others} f={setSrc} />
            <Chips multi o={[['assign', 'Fan ustozlari'], ['sched', 'Dars jadvali']]} v={what} f={setWhat} className="sm" />
            <button type="button" className="b" disabled={!src || !what.length} onClick={() => setAsk('copy')}><CopyPlus size={17} /> Nusxa olish</button>
          </div>
        </div>

        <div className="set-row col">
          <div className="set-t">
            <b>O‘quvchilarni boshqa sinfga ko‘chirish</b>
            <small>{st.length ? st.length + ' o‘quvchining hammasi ko‘chadi, baholari saqlanib qoladi.' : 'Bu sinfda o‘quvchi yo‘q.'}</small>
          </div>
          <div className="set-ctl">
            <Sel ph="Qaysi sinfga" v={dst} o={others} f={setDst} />
            <button type="button" className="b" disabled={!dst || !st.length} onClick={() => setAsk('move')}><ArrowRightLeft size={17} /> Ko‘chirish</button>
          </div>
        </div>
      </div>

      <Confirm
        open={!!ask} danger={false}
        title={ask === 'copy' ? 'Nusxa olish' : 'O‘quvchilarni ko‘chirish'}
        text={ask === 'copy'
          ? c + ' sinfining ' + what.map(w => WL[w]).join(' va ') + ' ' + src + ' sinfidagi bilan almashtiriladi.'
          : st.length + ' o‘quvchi ' + c + ' sinfidan ' + dst + ' sinfiga ko‘chiriladi.'}
        ok={ask === 'copy' ? 'Nusxa olish' : 'Ko‘chirish'}
        onOk={ask === 'copy' ? copyFrom : moveAll}
        onClose={() => setAsk(null)}
      />
    </>
  );
}

/* ═══════════════ FANLAR ═══════════════ */
function SubjectsTab({ S, undoable }) {
  const [name, setName] = useState('');
  const [er, setEr] = useState('');
  const [del, setDel] = useState(null);

  const add = n => {
    const nm = (n ?? name).trim();
    if (!nm) return setEr('Fan nomini kiriting');
    if (S.subjects.some(s => nz(s) === nz(nm))) return setEr('Bu fan allaqachon mavjud');
    S.setSubjects([...S.subjects, nm]);
    const na = { ...S.assign };
    CL.forEach(c => { na[c] = { ...na[c], [nm]: '' }; });
    S.setAssign(na);
    setName(''); setEr('');
    toast('Fan qo‘shildi: ' + nm);
  };

  const remove = subj => {
    undoable('Fan o‘chirildi: ' + subj, () => {
      const next = S.subjects.filter(s => s !== subj);
      const gone = new Set(S.teachers.filter(t => t.subj === subj).map(t => t.id));
      S.setSubjects(next);
      S.setTeachers(S.teachers.filter(t => t.subj !== subj));
      const na = {};
      Object.keys(S.assign).forEach(c => { const { [subj]: _, ...rest } = S.assign[c]; na[c] = rest; });
      S.setAssign(na);
      const ns = {};
      Object.keys(S.sched).forEach(c => { ns[c] = S.sched[c].map(day => day.map(s => s === subj ? next[0] : s)); });
      S.setSched(ns);
      const nl = { ...S.leaders };
      Object.keys(nl).forEach(c => { if (gone.has(nl[c])) nl[c] = ''; });
      S.setLeaders(nl);
    });
  };

  const sug = SUGGEST.filter(x => !S.subjects.some(s => nz(s) === nz(x))).slice(0, 8);
  const tCount = s => S.teachers.filter(t => t.subj === s).length;

  return (
    <>
      <div className="card accent">
        <h3 className="h-ic"><BookOpen size={20} /> Yangi fan qo‘shish</h3>
        <div className="toolbar">
          <input className="grow w" placeholder="Fan nomi (masalan: Kimyo)" value={name} onChange={e => { setName(e.target.value); setEr(''); }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button type="button" className="b" onClick={() => add()}><Plus size={18} /> Fan qo‘shish</button>
        </div>
        {er && <p className="err shake">{er}</p>}
        {sug.length > 0 && (
          <div className="sug">
            <span className="muted small">Tez qo‘shish:</span>
            {sug.map(x => <button key={x} type="button" className="chip" onClick={() => add(x)}><Plus size={13} strokeWidth={3} />{x}</button>)}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Mavjud fanlar ({S.subjects.length})</h3>
        <div className="subj-cards">
          {S.subjects.map((s, i) => (
            <div key={s} className="subj-card" style={{ '--i': i }}>
              <span className="sc-ic"><BookOpen size={18} /></span>
              <div><b>{s}</b><small>{tCount(s)} ta ustoz</small></div>
              <button type="button" className="ib danger" title="O‘chirish" aria-label={s + ' fanini o‘chirish'} disabled={S.subjects.length <= 1} onClick={() => setDel(s)}><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      </div>

      <Confirm open={!!del} title="Fanni o‘chirish" icon={<Trash2 />}
        text={del ? `“${del}” fani o‘chiriladi${tCount(del) ? ` va shu fandagi ${tCount(del)} ta ustoz ham ro‘yxatdan chiqariladi` : ''}. Jadvaldagi bu fan darslari boshqa fan bilan almashadi. Xohlasangiz “Qaytarish” bilan tiklaysiz.` : ''}
        onClose={() => setDel(null)} onOk={() => remove(del)} />
    </>
  );
}

/* ═══════════════ DARS JADVALI ═══════════════ */
function ScheduleTab({ S, undoable }) {
  const [c, setC] = useState(CL[0]);
  const [d, setD] = useState(0);
  const [to, setTo] = useState(CL[1]);
  const day = S.sched[c]?.[d] || [];

  const setLesson = (i, v) => S.setSched({ ...S.sched, [c]: S.sched[c].map((r, k) => k === d ? r.map((x, j) => j === i ? v : x) : r) });
  const copyDay = () => undoable(DAYS[d] + ' jadvali barcha kunlarga nusxalandi', () => S.setSched({ ...S.sched, [c]: S.sched[c].map(() => [...day]) }));
  const copyCls = () => undoable(c + ' jadvali ' + to + ' sinfiga nusxalandi', () => S.setSched({ ...S.sched, [to]: S.sched[c].map(r => [...r]) }));

  return (
    <div className="card">
      <div className="toolbar">
        <h3 className="grow" style={{ margin: 0 }}>Jadvalni o‘zgartirish</h3>
        <Sel v={c} o={CL} f={v => { setC(v); setTo(CL.find(x => x !== v)); }} />
      </div>
      <Chips o={DAYS.map((x, i) => [i, x])} v={d} f={setD} className="days" />
      <div className="lessons">
        {SL.map((s, i) => (
          <div className="lesson" key={i} style={{ '--i': i }}>
            <span className="ln">{i + 1}</span>
            <div className="lt"><b>{i + 1}-dars</b><small>{s[0]}–{s[1]}</small></div>
            <Sel full v={day[i] || S.subjects[0]} o={S.subjects} f={v => setLesson(i, v)} />
            <span className="muted lteacher">{TN(S.assign[c]?.[day[i]], S.teachers)}</span>
          </div>
        ))}
      </div>
      <div className="copy-box">
        <button type="button" className="b o" onClick={copyDay}><CopyPlus size={17} /> Shu kunni barcha kunlarga nusxalash</button>
        <span className="sp" />
        <span className="muted small">Butun jadvalni nusxalash:</span>
        <Sel v={to} o={CL.filter(x => x !== c)} f={setTo} />
        <button type="button" className="b o" onClick={copyCls}><CopyPlus size={17} /> Nusxalash</button>
      </div>
    </div>
  );
}
