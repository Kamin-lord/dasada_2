// Til almashtirgich: O‘zbekcha (asosiy), Русский, English.
// Interfeys matnlari o‘zbekcha yoziladi; shu yerdagi lug‘at ular uchun tarjimani beradi.
// Lug‘atda bo‘lmagan matn o‘zbekcha qoladi. Yangi tarjima qo‘shish: ROWS ga [uz, ru, en] qator qo‘shing.
import { useEffect, useState } from 'react';
import { DAYS, wdIdx, weekOffset, weekName } from './data';

const KEY = 'kd-lang';
let lang = 'uz';
try { lang = localStorage.getItem(KEY) || 'uz'; } catch { /* ignore */ }
if (!['uz', 'ru', 'en'].includes(lang)) lang = 'uz';
const subs = new Set();
export const LANGS = [['uz', 'UZ', 'O‘zbekcha'], ['ru', 'RU', 'Русский'], ['en', 'EN', 'English']];
export const getLang = () => lang;

const ROWS = [
  // — umumiy
  ['Al-Xorazmiy maktabi', 'Школа Аль-Хорезми', 'Al-Khwarizmi School'],
  ['elektron kundalik. Davomat, dars baholari va uyga vazifalar — bir joyda.', 'электронный дневник. Посещаемость, оценки и домашние задания — в одном месте.', 'electronic diary. Attendance, grades and homework in one place.'],
  ['Al-Xorazmiy maktabining elektron kundaligi. Davomat, dars baholari va uyga vazifalar — bir joyda.', 'Электронный дневник школы Аль-Хорезми. Посещаемость, оценки и домашние задания — в одном месте.', 'The electronic diary of Al-Khwarizmi School. Attendance, grades and homework in one place.'],
  ['Kirish', 'Вход', 'Sign in'], ['Chiqish', 'Выход', 'Log out'], ['Orqaga', 'Назад', 'Back'],
  ['Administrator', 'Администратор', 'Administrator'], ['O‘qituvchi', 'Учитель', 'Teacher'], ['O‘quvchi', 'Ученик', 'Student'],
  ['Sinf rahbari', 'Классный руководитель', 'Class teacher'],
  ['Hisobingizga kiring', 'Войдите в свой аккаунт', 'Sign in to your account'],
  ['Maktab boshqaruvi: o‘quvchi, ustoz, sinf va jadvallar', 'Управление школой: ученики, учителя, классы и расписание', 'School management: students, teachers, classes and schedules'],
  ['Ustoz va sinf rahbari — baholash, xabarlar, sinf holati', 'Учитель и классный руководитель — оценки, сообщения, состояние класса', 'Teacher and class teacher — grading, messages, class status'],
  ['Baholar, davomat, dars jadvali va uyga vazifa', 'Оценки, посещаемость, расписание и домашние задания', 'Grades, attendance, timetable and homework'],
  ['Telefon raqam', 'Номер телефона', 'Phone number'], ['Parol', 'Пароль', 'Password'], ['Ism familiya', 'Имя и фамилия', 'Full name'],
  ['Demo ma’lumotni to‘ldirish', 'Заполнить демо-данные', 'Fill in demo data'],
  ['Bu ism bilan bir nechta ustoz bor — fanni tanlang', 'С таким именем несколько учителей — выберите предмет', 'Several teachers share this name — choose the subject'],
  ['Hammasi', 'Все', 'All'], ['Yuborish', 'Отправить', 'Send'], ['Yopish', 'Закрыть', 'Close'], ['Bekor qilish', 'Отмена', 'Cancel'],
  ['Tahrirlash', 'Изменить', 'Edit'], ['O‘chirish', 'Удалить', 'Delete'], ['Nusxalash', 'Копировать', 'Copy'], ['Yaratish', 'Создать', 'Create'],
  ['Saqlash', 'Сохранить', 'Save'], ['Tozalash', 'Очистить', 'Clear'], ['Qaytarish', 'Вернуть', 'Undo'], ['Olib tashlash', 'Убрать', 'Remove'],
  ['Hozir', 'Сейчас', 'Now'], ['Sinf', 'Класс', 'Class'], ['Fan', 'Предмет', 'Subject'], ['Sana', 'Дата', 'Date'], ['Izoh', 'Комментарий', 'Comment'],
  ['Umumiy', 'Обзор', 'Overview'], ['O‘rtacha', 'Средний балл', 'Average'], ['Reputatsiya', 'Репутация', 'Reputation'],
  // — yorliqlar (tab)
  ['Baholarim', 'Мои оценки', 'My grades'], ['Dars jadvali', 'Расписание', 'Timetable'], ['Uyga vazifa', 'Домашнее задание', 'Homework'],
  ['Izohlar', 'Комментарии', 'Comments'], ['Hujjatlarim', 'Мои документы', 'My documents'], ['Bugun', 'Сегодня', 'Today'],
  ['Baholash', 'Оценивание', 'Grading'], ['Xabarlar', 'Сообщения', 'Messages'], ['Sinfim', 'Мой класс', 'My class'],
  ['Hujjatlar', 'Документы', 'Documents'], ['Sinf baholari', 'Оценки класса', 'Class grades'], ['O‘quvchilar', 'Ученики', 'Students'],
  ['Ustozlar', 'Учителя', 'Teachers'], ['Sinflar', 'Классы', 'Classes'], ['Fanlar', 'Предметы', 'Subjects'], ['Choraklar', 'Четверти', 'Quarters'],
  // — hafta kunlari, fanlar
  ['Dushanba', 'Понедельник', 'Monday'], ['Seshanba', 'Вторник', 'Tuesday'], ['Chorshanba', 'Среда', 'Wednesday'], ['Payshanba', 'Четверг', 'Thursday'], ['Juma', 'Пятница', 'Friday'],
  ['Matematika', 'Математика', 'Mathematics'], ['Ona tili', 'Родной язык', 'Native language'], ['Ingliz tili', 'Английский язык', 'English'], ['Fizika', 'Физика', 'Physics'],
  ['Tarix', 'История', 'History'], ['Biologiya', 'Биология', 'Biology'], ['Informatika', 'Информатика', 'Computer science'], ['Jismoniy tarbiya', 'Физкультура', 'Physical education'],
  // — baholash
  ['Davomat', 'Посещаемость', 'Attendance'], ['Faollik', 'Активность', 'Activity'], ['Tarbiya', 'Поведение', 'Conduct'],
  ['Uyga vazifa %', 'ДЗ, %', 'Homework %'], ['Dars bahosi', 'Оценка за урок', 'Lesson grade'], ['Darsda', 'На уроке', 'Present'], ['Kelmadi', 'Отсутствует', 'Absent'],
  ['Kelmagan', 'Отсутствуют', 'Absent'], ['Hamma darsda', 'Все на уроке', 'All present'], ['Hammaga 5 baho', 'Всем «5»', 'Give everyone 5'],
  ['Tezkor:', 'Быстро:', 'Quick:'], ['Shu hafta', 'Эта неделя', 'This week'], ['O‘tgan hafta', 'Прошлая неделя', 'Last week'],
  ['Oldingi hafta', 'Предыдущая неделя', 'Previous week'], ['Keyingi hafta', 'Следующая неделя', 'Next week'],
  ['dars yo‘q', 'нет урока', 'no lesson'], ['qulflangan', 'заблокировано', 'locked'], ['hali kelmagan', 'ещё не наступил', 'not yet'],
  ['Bu kunning baholari qulflangan: 7 kundan oshgan, o‘zgartirib bo‘lmaydi. Faqat administrator tuzata oladi.', 'Оценки за этот день заблокированы: прошло более 7 дней, изменить нельзя. Исправить может только администратор.', 'Grades for this day are locked: more than 7 days have passed. Only the administrator can correct them.'],
  ['Avval davomatni belgilang', 'Сначала отметьте посещаемость', 'Mark attendance first'],
  ['Topshiriq matni (o‘quvchilar ko‘radi)', 'Текст задания (виден ученикам)', 'Assignment text (visible to students)'],
  ['Baholangan:', 'Оценено:', 'Graded:'], ['Hozircha baho yo‘q', 'Оценок пока нет', 'No grades yet'], ['Hozircha izoh yo‘q', 'Комментариев пока нет', 'No comments yet'],
  // — admin / ustoz / o‘quvchi
  ['Boshqaruv markazi', 'Центр управления', 'Control centre'], ['Tezkor amallar', 'Быстрые действия', 'Quick actions'],
  ['O‘quvchi qo‘shish', 'Добавить ученика', 'Add student'], ['Ustoz qo‘shish', 'Добавить учителя', 'Add teacher'], ['Sinf qo‘shish', 'Добавить класс', 'Add class'],
  ['Fan qo‘shish', 'Добавить предмет', 'Add subject'], ['Sinflar reytingi', 'Рейтинг классов', 'Class ranking'], ['Sinfni tanlang', 'Выберите класс', 'Choose a class'],
  ['Choraklik baholar', 'Четвертные оценки', 'Quarter grades'], ['Hozirgi chorak', 'Текущая четверть', 'Current quarter'], ['Boshlanishi', 'Начало', 'Start'], ['Tugashi', 'Конец', 'End'],
  ['CSV yuklab olish', 'Скачать CSV', 'Download CSV'], ['Telefon (login)', 'Телефон (логин)', 'Phone (login)'], ['Fikr bildirish', 'Оставить отзыв', 'Give feedback'],
  ['Fanlar bo‘yicha darajam', 'Мой уровень по предметам', 'My level by subject'], ['Haftalik jadvalim', 'Моё расписание на неделю', 'My weekly timetable'],
  ['Bugungi darslarim', 'Мои уроки сегодня', 'My lessons today'], ['Ustozlar izohlari', 'Комментарии учителей', 'Teachers’ comments'],
  ['Natijalaringiz bir joyda — davom eting!', 'Все ваши результаты в одном месте — так держать!', 'All your results in one place — keep going!'],
  ['Muammoli o‘quvchilar', 'Проблемные ученики', 'Students needing attention'], ['Eng faol', 'Самый активный', 'Most active'], ['Eng tarbiyali', 'Самый воспитанный', 'Best conduct'],
  ['Uyga vazifada eng yaxshi', 'Лучшие по домашним заданиям', 'Best at homework'], ['Ota-onaga izoh qoldirish', 'Оставить комментарий родителям', 'Leave a note for parents'],
  ['maktab o‘rtacha bahosi', 'средний балл школы', 'school average'], ['o‘rtacha baho', 'средний балл', 'average grade'], ['davomat', 'посещаемость', 'attendance'],
  ['Logo yuklash', 'Загрузить логотип', 'Upload logo'], ['Ota-ona', 'Родители', 'Parents'],
  // — soat va holat
  ['Farg‘ona vaqti', 'Время Ферганы', 'Fergana time'],
  ['Hozir qaysi sinfda qaysi dars', 'Какой урок идёт в каком классе', 'Which lesson is in which class'],
  ['Hozir {i}-dars: {s} · {t} · yana {m} daqiqa', 'Сейчас {i}-й урок: {s} · {t} · ещё {m} мин', 'Now: lesson {i} — {s} · {t} · {m} min left'],
  ['Hozir {c} sinfida darsingiz bor ({i}-dars) · yana {m} daqiqa', 'Сейчас у вас урок в {c} классе ({i}-й урок) · ещё {m} мин', 'You are teaching class {c} now (lesson {i}) · {m} min left'],
  ['Hozir darsingiz yo‘q · {i}-dars davom etmoqda', 'Сейчас у вас нет урока · идёт {i}-й урок', 'No lesson for you now · lesson {i} is in progress'],
  ['Hozir {i}-dars · {k} ta sinfda dars bormoqda · yana {m} daqiqa', 'Сейчас {i}-й урок · занятия идут в {k} классах · ещё {m} мин', 'Lesson {i} now · {k} classes in session · {m} min left'],
  ['Hozir {i}-dars davom etmoqda · yana {m} daqiqa', 'Сейчас идёт {i}-й урок · ещё {m} мин', 'Lesson {i} is in progress · {m} min left'],
  ['Hozir tanaffus · yana {m} daqiqa', 'Сейчас перемена · ещё {m} мин', 'Break now · {m} min left'],
  ['Hozir ovqat vaqti: {n} · yana {m} daqiqa', 'Сейчас время еды: {n} · ещё {m} мин', 'Meal time now: {n} · {m} min left'],
  ['Darslar hali boshlanmagan · {a} da nonushta', 'Уроки ещё не начались · завтрак в {a}', 'Lessons have not started · breakfast at {a}'],
  ['Bugungi darslar tugadi', 'Уроки на сегодня закончились', 'Today’s lessons are over'],
  ['Bugun dam olish kuni', 'Сегодня выходной', 'Today is a day off'],
  ['Nonushta', 'Завтрак', 'Breakfast'], ['Tushlik', 'Обед', 'Lunch'], ['Choy', 'Полдник (чай)', 'Tea break'], ['Tanaffus', 'Перемена', 'Break'],
  ['{n} hafta oldin', '{n} нед. назад', '{n} weeks ago'],
  // — hujjatlar
  ['Direktor nomiga ariza', 'Заявление на имя директора', 'Application addressed to the principal'],
  ['Tibbiy ma’lumotnoma (bolaning sog‘lig‘i to‘g‘risida)', 'Медицинская справка о состоянии здоровья ребёнка', 'Medical certificate on the child’s health'],
  ['3,5×4,5 sm rangli fotosurat (4 dona)', 'Цветные фото 3,5×4,5 см (4 шт.)', 'Colour photos 3.5×4.5 cm (4 pcs)'],
  ['Tug‘ilganlik haqida guvohnoma (nusxa)', 'Свидетельство о рождении (копия)', 'Birth certificate (copy)'],
  ['Ota-ona yoki vasiy pasporti / ID (nusxa)', 'Паспорт / ID родителя или опекуна (копия)', 'Parent’s or guardian’s passport / ID (copy)'],
  ['Yashash manzili (ro‘yxatdan o‘tish) ma’lumoti', 'Справка о месте жительства (регистрации)', 'Residence (registration) certificate'],
  ['Shaxsiy ish (boshqa maktabdan o‘tganlar uchun)', 'Личное дело (для переведённых из другой школы)', 'Personal file (for transfers from another school)'],
  ['Imtiyozni tasdiqlovchi hujjat (agar mavjud bo‘lsa)', 'Документ, подтверждающий льготу (если есть)', 'Document confirming a benefit (if any)'],
  ['Ariza', 'Заявление', 'Application'], ['Tibbiy', 'Мед. справка', 'Medical'], ['Foto', 'Фото', 'Photos'], ['Guvohnoma', 'Свид-во', 'Birth cert.'],
  ['Ota-ona ID', 'ID родителя', 'Parent ID'], ['Manzil', 'Адрес', 'Address'], ['Shaxsiy ish', 'Личное дело', 'Personal file'], ['Imtiyoz', 'Льгота', 'Benefit'],
  ['Majburiy', 'Обязательный', 'Required'], ['Ixtiyoriy', 'Необязательный', 'Optional'], ['Rasmiy ro‘yxat', 'Официальный список', 'Official list'],
  ['Amalda so‘raladi', 'Обычно запрашивается', 'Commonly requested'], ['To‘liq', 'Полный', 'Complete'], ['Yetishmaydi', 'Не хватает', 'Missing'],
  ['Hujjatlar holati', 'Состояние документов', 'Document status'], ['Jami o‘quvchi', 'Всего учеников', 'Total students'],
  ['Hujjati to‘liq', 'Документы в порядке', 'Documents complete'], ['Hujjati yetishmaydi', 'Не хватает документов', 'Documents missing'],
  ['Hujjatlarni faqat sinf rahbari belgilaydi. Bu yerda faqat ko‘rinadi.', 'Документы отмечает только классный руководитель. Здесь — только просмотр.', 'Only the class teacher marks documents. This view is read-only.'],
  ['Hujjat topshirilgan bo‘lsa, katakchani belgilang. Faqat sinf rahbari o‘zgartira oladi.', 'Отметьте ячейку, если документ сдан. Менять может только классный руководитель.', 'Tick the box if the document has been handed in. Only the class teacher can change this.'],
  ['Hammasi joyida: barcha majburiy hujjatlar topshirilgan.', 'Всё в порядке: сданы все обязательные документы.', 'All good: every required document has been handed in.'],
  ['Hujjatlar ro‘yxati O‘zbekiston maktablariga qabul qoidalariga (lex.uz) asoslangan. Maktabingiz talabiga qarab o‘zgartirishingiz mumkin.', 'Список основан на правилах приёма в школы Узбекистана (lex.uz). Его можно изменить по требованиям вашей школы.', 'The list is based on Uzbekistan’s school admission rules (lex.uz). You can adapt it to your school’s requirements.']
];

const D = { ru: new Map(), en: new Map() };
for (const [u, r, e] of ROWS) { D.ru.set(u, r); D.en.set(u, e); }
const PAT = { ru: [[/^(\d+) ta o‘quvchi$/, '$1 уч.'], [/^(\d+) ta dars$/, '$1 ур.'], [/^(\d+) hafta oldin$/, '$1 нед. назад']], en: [[/^(\d+) ta o‘quvchi$/, '$1 students'], [/^(\d+) ta dars$/, '$1 lessons'], [/^(\d+) hafta oldin$/, '$1 weeks ago']] };

export function tx(s) { return lang === 'uz' || typeof s !== 'string' ? s : (D[lang].get(s) ?? s); }
/** Shablon: tr('Hozir {i}-dars', { i: 3 }) — parametr matn bo‘lsa, u ham tarjima qilinadi. */
export function tr(tpl, p = {}) {
  return tx(tpl).replace(/\{(\w+)\}/g, (_, k) => { const v = p[k]; return typeof v === 'string' ? tx(v) : (v ?? ''); });
}

/* ── DOM tarjimon: React o‘zgartirmaydigan tarzda faqat matn qiymatini almashtiradi ── */
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
const ATTRS = ['placeholder', 'title', 'aria-label'];
function conv(o) {
  if (lang === 'uz') return o;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(o);
  if (!m[2]) return o;
  let r = D[lang].get(m[2]);
  if (r === undefined) for (const [re, rep] of PAT[lang]) if (re.test(m[2])) { r = m[2].replace(re, rep); break; }
  return r === undefined ? o : m[1] + r + m[3];
}
function syncText(n) {
  if (n.parentNode && SKIP.has(n.parentNode.nodeName)) return;
  const o = n.__t !== undefined && n.nodeValue === n.__t ? n.__o : n.nodeValue;
  const t = conv(o);
  n.__o = o;
  if (t !== n.nodeValue) n.nodeValue = t;
  n.__t = t === o ? undefined : t;
}
function syncAttrs(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(a)) continue;
    const st = el.__a || (el.__a = {});
    const cur = el.getAttribute(a);
    const o = st[a] && st[a].t === cur ? st[a].o : cur;
    const t = conv(o);
    if (t !== cur) el.setAttribute(a, t);
    st[a] = { o, t };
  }
}
function walk(root) {
  if (root.nodeType === 3) return syncText(root);
  if (root.nodeType !== 1) return;
  syncAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) syncText(n); else syncAttrs(n); }
}
export function initI18n() {
  document.documentElement.lang = lang;
  new MutationObserver(recs => {
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach(walk);
      else if (r.type === 'characterData') syncText(r.target);
      else syncAttrs(r.target);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  walk(document.body);
}
export function setLang(l) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  walk(document.body);
  subs.forEach(f => f(l));
}
export function useLang() {
  const [l, set] = useState(lang);
  useEffect(() => { subs.add(set); return () => { subs.delete(set); }; }, []);
  return l;
}

/** Hafta kuni (sana o‘rniga): “Payshanba” yoki “Payshanba · O‘tgan hafta” — tanlangan tilda. */
export function dayRelT(date) {
  const w = weekOffset(date);
  return tx(DAYS[wdIdx(date)] || '') + (w === 0 ? '' : ' · ' + tx(weekName(w)));
}
