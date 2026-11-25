// “Yordam”: maktab administratori general adminga (DASADA) muammo yozadi va javobni shu yerda ko‘radi.
import { useState, useEffect, useCallback, useRef } from 'react';
import { LifeBuoy, Plus, Send, ArrowLeft, Inbox } from 'lucide-react';
import { api } from '../api';
import { Chips, Field, Empty, toast } from './UI';

const CATS = [['texnik', 'Texnik nosozlik'], ['hisob', 'Hisob / parol'], ['malumot', 'Ma’lumot'], ['taklif', 'Taklif'], ['boshqa', 'Boshqa']];
const PRIS = [['past', 'Past'], ['oddiy', 'Oddiy'], ['yuqori', 'Yuqori'], ['shoshilinch', 'Shoshilinch']];
const STAT = { yangi: 'Yangi', jarayonda: 'Ko‘rilmoqda', hal: 'Hal qilindi', yopiq: 'Yopilgan' };
const fmt = at => { try { return new Date(at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const err = e => toast(e.message || 'Xatolik yuz berdi.', { tone: 'err', ms: 5000 });

export default function Support() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);   // ticket id
  const [form, setForm] = useState(false);

  const load = useCallback(() => api.support.list().then(j => setList(j.tickets)).catch(e => { setList(l => l || []); if (e.status !== 0) err(e); }), []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (open) return <Thread id={open} onBack={() => { setOpen(null); load(); }} />;
  if (form) return <NewTicket onBack={() => setForm(false)} onSent={id => { setForm(false); setOpen(id); }} />;

  return (
    <>
      <div className="row between">
        <h3 className="h-ic" style={{ margin: 0 }}><LifeBuoy size={20} /> Yordam</h3>
        <button type="button" className="b" onClick={() => setForm(true)}><Plus size={17} /> Muammo yozish</button>
      </div>
      <p className="muted">Muammo yoki savolingizni yozing — u to‘g‘ridan-to‘g‘ri DASADA general adminiga boradi. Javob shu yerda paydo bo‘ladi.</p>
      {list === null ? <p className="muted">Yuklanmoqda…</p>
        : !list.length ? <Empty icon={<Inbox size={30} />} t="Hali murojaat yo‘q" d="Biror muammo bo‘lsa, “Muammo yozish” tugmasini bosing." />
          : list.map(t => (
            <button type="button" key={t.id} className="card plain" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }} onClick={() => setOpen(t.id)}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <b>{t.title}</b>
                <span>{t.unread && <span className="pill warn-p" style={{ marginRight: 6 }}>Yangi javob</span>}<span className="pill">{STAT[t.status] || t.status}</span></span>
              </div>
              <small className="muted">#{t.id} · {fmt(t.updatedAt)}</small>
            </button>
          ))}
    </>
  );
}

function NewTicket({ onBack, onSent }) {
  const [title, setTitle] = useState(''), [text, setText] = useState(''), [category, setCat] = useState('texnik'), [priority, setPri] = useState('oddiy'), [busy, setBusy] = useState(false);
  const ok = title.trim().length >= 3 && text.trim().length >= 3 && !busy;
  const send = async () => {
    setBusy(true);
    try { const j = await api.support.create({ title: title.trim(), text: text.trim(), category, priority }); toast('Murojaat general adminga yuborildi'); onSent(j.id); }
    catch (e) { err(e); setBusy(false); }
  };
  return (
    <>
      <button type="button" className="b o" onClick={onBack}><ArrowLeft size={17} /> Orqaga</button>
      <h3 className="h-ic sec"><LifeBuoy size={20} /> Yangi murojaat</h3>
      <div className="card">
        <Field label="Sarlavha"><input value={title} maxLength={120} placeholder="Qisqacha: nima bo‘ldi?" onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Turkum"><Chips o={CATS} v={category} f={setCat} /></Field>
        <Field label="Muhimlik"><Chips o={PRIS} v={priority} f={setPri} /></Field>
        <Field label="Muammo tavsifi"><textarea value={text} maxLength={4000} placeholder="Nima qildingiz, nima chiqdi? Qaysi bo‘limda?" onChange={e => setText(e.target.value)} /></Field>
        <button type="button" className="b" disabled={!ok} onClick={send}><Send size={17} /> Yuborish</button>
      </div>
    </>
  );
}

function Thread({ id, onBack }) {
  const [d, setD] = useState(null), [tx, setTx] = useState(''), [busy, setBusy] = useState(false), end = useRef(null);
  const load = useCallback(() => api.support.get(id).then(setD).catch(err), [id]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [d?.messages?.length]);
  if (!d) return <><button type="button" className="b o" onClick={onBack}><ArrowLeft size={17} /> Orqaga</button><p className="muted">Yuklanmoqda…</p></>;
  const t = d.ticket, closed = t.status === 'yopiq';
  const send = async () => {
    setBusy(true);
    try { await api.support.reply(id, tx.trim()); setTx(''); await load(); } catch (e) { err(e); }
    setBusy(false);
  };
  return (
    <>
      <button type="button" className="b o" onClick={onBack}><ArrowLeft size={17} /> Orqaga</button>
      <div className="row between sec"><h3 style={{ margin: 0 }}>{t.title}</h3><span className="pill">{STAT[t.status] || t.status}</span></div>
      <div className="card">
        {d.messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.side === 'school' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: 14, background: m.side === 'school' ? 'var(--hl)' : 'var(--g4, #eee)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              <small className="muted" style={{ display: 'block' }}>{m.side === 'school' ? 'Siz' : 'General admin'} · {fmt(m.at)}</small>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={end} />
        {closed ? <p className="muted">Murojaat yopilgan. Yangisini yozish uchun “Orqaga” → “Muammo yozish”.</p> : (
          <>
            <textarea value={tx} maxLength={3000} placeholder="Javob yozing…" onChange={e => setTx(e.target.value)} />
            <button type="button" className="b" style={{ marginTop: 10 }} disabled={busy || !tx.trim()} onClick={send}><Send size={17} /> Yuborish</button>
          </>
        )}
      </div>
    </>
  );
}
