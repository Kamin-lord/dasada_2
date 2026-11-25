
export const INITIAL_SUBJ = ['Matematika','Ona tili','Ingliz tili','Fizika','Tarix','Biologiya','Informatika','Jismoniy tarbiya'];
export const DAYS = ['Dushanba','Seshanba','Chorshanba','Payshanba','Juma'];
export const SL = [['8:30','9:30'],['9:40','10:40'],['10:50','11:50'],['12:40','13:40'],['13:50','14:50'],['15:00','16:00'],['16:10','17:10']];
export const TL = [
  {n:'Nonushta',a:'8:00',b:'8:25'},{l:0},
  {n:'Tanaffus',a:'9:30',b:'9:40'},{l:1},
  {n:'Tanaffus',a:'10:40',b:'10:50'},{l:2},
  {n:'Tanaffus',a:'11:50',b:'12:00'},{n:'Tushlik',a:'12:00',b:'12:40'},{l:3},
  {n:'Tanaffus',a:'13:40',b:'13:50'},{l:4},
  {n:'Tanaffus',a:'14:50',b:'15:00'},{l:5},
  {n:'Choy',a:'16:00',b:'16:10'},{l:6}
];

export const INITIAL_T = [
  ['t1','Karimov Aziz','Matematika'],['t2','Yusupova Dilnoza','Matematika'],
  ['t3','Rahimova Malika','Ona tili'],['t4','Sobirova Nodira','Ona tili'],
  ['t5','Tursunov Jasur','Ingliz tili'],['t6','Aliyev Rustam','Ingliz tili'],
  ['t7','Saidov Bobur','Fizika'],['t8','Mirzayev Anvar','Fizika'],
  ['t9','Nazarova Gulnora','Tarix'],['t10','Qosimov Ilhom','Tarix'],
  ['t11','Qodirova Zebo','Biologiya'],['t12','Normatova Laylo','Biologiya'],
  ['t13','Ergashev Sardor','Informatika'],['t14','Abdullayev Timur','Informatika'],
  ['t15','Hamidov Otabek','Jismoniy tarbiya'],['t16','Ismoilov Farhod','Jismoniy tarbiya']
].map(([id,name,subj]) => ({id,name,subj}));

export const TN = (id, teachers = INITIAL_T) => (teachers.find(t => t.id === id) || {}).name || '—';
export const CL = ['1-A','1-B','2-A','2-B','3-A','3-B','4-A','4-B','5-A','6-A','7-A','Iqtisod-A','Iqtisod-B','Oxford-A','Oxford-B','Tehnika'];
export const ABS = 'Yo‘q';
export const POOL = ['Darsda faol qatnashdi','Uyga vazifani sifatli bajargan','Diqqatini jamlashi kerak','Yaxshi natija, davom eting','Darsda xotirjamroq bo‘lsin'];
export const AL = a => a === ABS ? 'Kelmadi' : 'Darsda';
export const nz = a => a.trim().toLowerCase().replace(/ +/g, ' ');
export const ADM = ['901000000','admin123'];
export const tPhone = id => '9010' + id.slice(1).padStart(5,'0');
export const tPw = id => 'ustoz' + id.slice(1);
export const tPhoneOf = t => t.phone || tPhone(t.id);
export const tPwOf = t => t.pw || tPw(t.id);
export const sPhone = id => '90200' + String(id).padStart(4,'0');
export const sPw = id => 'oquvchi' + id;

export const tm = s => { const [h,m] = s.split(':'); return +h*60 + +m; };
export const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
export const rf = s => { let a = s; return () => (a = (a*1664525 + 1013904223) % 4294967296) / 4294967296; };
export const cl = (x,a,b) => Math.max(a, Math.min(b, x));
export const hwG = h => h >= 90 ? 5 : h >= 75 ? 4 : h >= 50 ? 3 : 2;
export const L = r => r.att === ABS ? null : Math.round((r.act + r.beh + hwG(r.hw)) / 3);
export const gc = g => g == null ? '' : g >= 4.5 ? 'g5' : g >= 3.5 ? 'g4' : 'g3';
export const f1 = x => x == null || isNaN(x) ? '—' : String(Math.round(x));
export const mean = a => a.length ? a.reduce((s,x) => s + x, 0) / a.length : null;
export const agg = rs => {
  const p = rs.filter(r => r.att !== ABS);
  return { n: rs.length, avg: mean(p.map(L)), act: mean(p.map(r => r.act)), beh: mean(p.map(r => r.beh)), hw: mean(p.map(r => r.hw)), att: rs.length ? 100 * p.length / rs.length : null };
};
export const rep = a => a.avg == null ? 0 : Math.round(a.avg * 15 + a.att * .25);

// ── Sana yordamchilari (server va frontend uchun umumiy; vaqt zonasi Toshkent) ──
export const TZ = 'Asia/Tashkent';
export const EDIT_DAYS = 7; // baho qo‘yilgandan keyin tahrirlash mumkin bo‘lgan kunlar
export const MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
export const todayIso = (tz = TZ) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const diffDays = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 864e5);
export const wdIdx = s => (new Date(s + 'T00:00:00Z').getUTCDay() + 6) % 7; // 0 = Dushanba … 6 = Yakshanba
export const mondayOf = s => addDays(s, -wdIdx(s));
export const fmtDay = s => +s.slice(8) + '-' + MONTHS[+s.slice(5, 7) - 1];
export const dayLabel = s => fmtDay(s) + (DAYS[wdIdx(s)] ? ', ' + DAYS[wdIdx(s)] : '');
/** 'open' — tahrirlash mumkin, 'locked' — 7 kundan oshgan, 'future' — hali kelmagan */
export const dayState = (date, today = todayIso()) => date > today ? 'future' : diffDays(today, date) > EDIT_DAYS - 1 ? 'locked' : 'open';
export const daysLeft = (date, today = todayIso()) => EDIT_DAYS - 1 - diffDays(today, date);

// Choraklar (o‘quv yili 2026–2027). Admin “Choraklar” bo‘limida o‘zgartira oladi.
export const DEFAULT_Q = [['2026-09-01', '2026-10-31'], ['2026-11-02', '2026-12-30'], ['2027-01-11', '2027-03-14'], ['2027-03-22', '2027-05-25']];

export const DATES = (() => {
  const a = []; let s = todayIso();
  while (a.length < 5) { if (wdIdx(s) < 5) a.push(s); s = addDays(s, -1); }
  return a;
})();

export const wdOf = d => new Date(d + 'T00:00').getDay() - 1;

export const genSched = (subjects = INITIAL_SUBJ) => Object.fromEntries(CL.map((c, ci) => [c, DAYS.map((_, d) => Array.from({ length: 7 }, (_, i) => subjects[(i + d * 3 + ci * 2) % subjects.length]))]));
export const genAssign = (subjects = INITIAL_SUBJ, teachers = INITIAL_T) => Object.fromEntries(CL.map((c, ci) => [c, Object.fromEntries(subjects.map(s => {
  const l = teachers.filter(t => t.subj === s);
  return [s, l.length ? l[ci % l.length].id : (teachers[0] && teachers[0].id) || ''];
}))]));

const FN = ['Aziza','Bekzod','Madina','Sardor','Zilola','Jasur','Nilufar','Otabek','Sevara','Umid','Dilshod','Malika','Shohruh','Feruza','Javohir','Kamola','Bobur','Gulnoza','Shahzod','Laylo','Akbar','Diyora','Rustam','Nodira','Islom','Mohira','Javlon','Sabina','Anvar','Charos','Farhod','Munisa','Temur','Lobar','Oybek','Dildora'];
const LN = ['Qodirov','Tursunov','Rashidov','Ismoilov','Karimov','Abdullayev','Yusupov','Hamidov','Normatov','Saidov','Ergashev','Rahimov','Nazarov','Aliyev','Sobirov','Mirzayev','Qosimov','Xolmatov','Toirov','Jalolov','Begmatov','Sattorov','Usmonov','Fayzullayev','Ganiyev','Haydarov','Ibragimov','Jo‘rayev','Komilov','Latipov'];
const GIRLS = new Set(['Aziza','Madina','Zilola','Nilufar','Sevara','Malika','Feruza','Kamola','Gulnoza','Laylo','Diyora','Nodira','Mohira','Sabina','Charos','Munisa','Lobar','Dildora']);

export const mkS = () => {
  let id = 0;
  const rnd = rf(2026);
  const used = new Set();
  return CL.flatMap((c, ci) => {
    const count = 18 + Math.floor(rnd() * 5);
    return Array.from({ length: count }, (_, k) => {
      id++;
      const f = (id * 5 + k + ci) % FN.length;
      const g = (id * 3 + ci * 7 + k) % LN.length;
      const last = LN[g] + (GIRLS.has(FN[f]) ? 'a' : '');
      let name = FN[f] + ' ' + last;
      if (used.has(name)) name = name + ' ' + (k + 1);
      used.add(name);
      return {
        id, name, cls: c,
        q: rnd() * .6 + .35,
        phone: sPhone(id),
        pw: 'oquvchi' + id
      };
    });
  });
};

export const seed = (S, sc) => {
  const R = {}, r = rf(42);
  S.forEach(s => DATES.forEach(d => sc[s.cls][wdOf(d)].forEach(sub => {
    const x = r();
    R[s.id + '|' + sub + '|' + d] = {
      sid: s.id, subj: sub, date: d,
      att: x > .9 + .08 * s.q ? ABS : 'Bor',
      act: cl(Math.round(2.2 + s.q * 3 + (r() - .5) * 1.6), 2, 5),
      beh: cl(Math.round(2.6 + s.q * 2.6 + (r() - .5) * 1.2), 2, 5),
      hw: cl(Math.round(30 + s.q * 75 + (r() - .5) * 40), 0, 100),
      c: r() > .6 ? POOL[Math.floor(r() * 5)] : ''
    };
  })));
  return R;
};

// ── Hujjatlar: O‘zbekiston maktabiga qabul (lex.uz “1-sinfga qabul” tushuntirishi) ──
// src: 'lex' — rasmiy ro‘yxatda; 'amal' — amalda so‘raladi (maktab talabiga qarab o‘zgartirish mumkin)
export const DOC_TYPES = [
  { code: 'ariza', label: 'Direktor nomiga ariza', short: 'Ariza', need: true, src: 'lex' },
  { code: 'tibbiy', label: 'Tibbiy ma’lumotnoma (bolaning sog‘lig‘i to‘g‘risida)', short: 'Tibbiy', need: true, src: 'lex' },
  { code: 'foto', label: '3,5×4,5 sm rangli fotosurat (4 dona)', short: 'Foto', need: true, src: 'lex' },
  { code: 'metrika', label: 'Tug‘ilganlik haqida guvohnoma (nusxa)', short: 'Guvohnoma', need: true, src: 'amal' },
  { code: 'ota_id', label: 'Ota-ona yoki vasiy pasporti / ID (nusxa)', short: 'Ota-ona ID', need: true, src: 'amal' },
  { code: 'manzil', label: 'Yashash manzili (ro‘yxatdan o‘tish) ma’lumoti', short: 'Manzil', need: true, src: 'amal' },
  { code: 'shaxsiy', label: 'Shaxsiy ish (boshqa maktabdan o‘tganlar uchun)', short: 'Shaxsiy ish', need: false, src: 'amal' },
  { code: 'imtiyoz', label: 'Imtiyozni tasdiqlovchi hujjat (agar mavjud bo‘lsa)', short: 'Imtiyoz', need: false, src: 'lex' }
];
export const REQ_DOCS = DOC_TYPES.filter(d => d.need).map(d => d.code);
export const missingDocs = (have = []) => REQ_DOCS.filter(c => !have.includes(c));

// ── Farg‘ona (O‘zbekiston, UTC+5) vaqti va hozirgi holat ──
export const tzNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  const iso = todayIso();
  return { min: +p.hour * 60 + +p.minute, hms: `${p.hour}:${p.minute}:${p.second}`, iso, wd: wdIdx(iso) };
};
const T2 = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };
/** Kun tartibi: dars / tanaffus / ovqat (nonushta, tushlik, choy) / dars boshlanmagan / tugagan / dam olish kuni */
export const phaseAt = (min, wd) => {
  if (wd > 4) return { kind: 'weekend' };
  const items = TL.map(x => x.l != null
    ? { kind: 'lesson', idx: x.l, a: SL[x.l][0], b: SL[x.l][1] }
    : { kind: x.n === 'Tanaffus' ? 'break' : 'meal', n: x.n, a: x.a, b: x.b });
  if (min < T2(items[0].a)) return { kind: 'before', a: items[0].a, left: T2(items[0].a) - min };
  if (min >= T2(items[items.length - 1].b)) return { kind: 'after' };
  for (let i = 0; i < items.length; i++) {
    const it = items[i], nx = items[i + 1];
    if (min >= T2(it.a) && min < T2(it.b)) return { ...it, left: T2(it.b) - min };
    if (nx && min >= T2(it.b) && min < T2(nx.a)) return { kind: 'break', n: 'Tanaffus', a: it.b, b: nx.a, left: T2(nx.a) - min };
  }
  return { kind: 'after' };
};
export const weekOffset = (s, today = todayIso()) => Math.round(diffDays(mondayOf(s), mondayOf(today)) / 7);
export const weekName = w => (w === 0 ? 'Shu hafta' : w === -1 ? 'O‘tgan hafta' : (-w) + ' hafta oldin');
/** Sana o‘rniga hafta kuni: “Payshanba” yoki “Payshanba · O‘tgan hafta” */
export const dayRel = s => (DAYS[wdIdx(s)] || '') + (weekOffset(s) === 0 ? '' : ' · ' + weekName(weekOffset(s)));
