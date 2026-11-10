# DASADA — General admin paneli

Barcha maktablarni boshqaradigan **alohida sayt** (Al-Kundalik dan mustaqil server va baza).

## Ishga tushirish
```
cd dasada
GENERAL_LOGIN=general GENERAL_PASSWORD=kuchli-parol npm start        # Linux / Mac
```
Windows PowerShell:
```
$env:GENERAL_LOGIN="general"; $env:GENERAL_PASSWORD="kuchli-parol"; npm start
```
Brauzerda: http://localhost:4000. Talab: Node.js 22.13+ (`npm install` shart emas).
Parol bermasangiz — DEMO hisob: `general` / `general123` (faqat sinov uchun).
Baza: `dasada/data/dasada.db`. Parol faqat **birinchi ishga tushirishda** o‘rnatiladi — o‘zgartirish uchun Sozlamalar bo‘limidan foydalaning
(yoki `data` papkasini o‘chirib, qaytadan boshlang).

## Kirish va parollar
- Panelga faqat **login + parol** bilan kiriladi (12 soatlik sessiya, 10 xatodan keyin 15 daqiqa blok).
- **Bosh admin** (egasi) hamma narsani qila oladi va **Menejerlar** yaratadi: har biriga login, parol va ruxsat berilgan bo‘limlar
  (Maktablar, Muammolar, Foydalanuvchi ma’lumotlari, Maktab adminlari, E’lonlar).
- Xavfli amallar (maktabni o‘chirish, ulanish kodini almashtirish, xodim/adminni o‘chirish) **parolni qayta so‘raydi**.
- Parollar scrypt bilan shifrlanadi; yaratilgan paroldan keyin uni qayta ko‘rib bo‘lmaydi — faqat yangisini yaratish mumkin.

## Imkoniyatlar
- **Bosh sahifa:** raqamlar, 14 kunlik murojaatlar grafigi, holat/turkum/hudud diagrammalari.
- **Maktablar:** qo‘shish (logo + maktab admini: ism, telefon, parol), tahrirlash, bloklash, o‘chirish. Maktab sayti hozircha ochilmaydi — “tez orada”.
- **Maktab sahifasi:** Umumiy · **Foydalanuvchilar** (o‘quvchi, ustoz, sinf, hujjatlar; qidiruv, saralash, CSV) · **Adminlar** (qo‘shish, tahrirlash, yangi parol) · Murojaatlar.
- **Muammolar:** filtr/qidiruv, yozishma, xodimga biriktirish, ichki izohlar (maktab ko‘rmaydi), holatlar.
- **E’lonlar**, **Jurnal** (kim nima qildi), **Sozlamalar** (parol almashtirish), qorong‘i rejim.

## Maktabni ulash (ma’lumot oqimi uchun)
1. Maktablar → **+ Maktab qo‘shish** → chiqqan **ulanish kodini** nusxalang (faqat bir marta ko‘rinadi).
2. Maktabning Al-Kundalik admin panelida **Yordam** bo‘limini oching, kodni joylab **Ulash** ni bosing.
3. Maktab serveri o‘quvchi/ustoz/sinf ro‘yxati va umumiy ko‘rsatkichlarni (**parollarsiz**, faqat ko‘rish uchun) har 10 daqiqada yuboradi.
Ulanmagan maktabda “Foydalanuvchilar” bo‘limi bo‘sh bo‘ladi (sinash uchun “Namuna ma’lumot” tugmasi bor).

## Xavfsizlik eslatmalari
Haqiqiy foydalanishda **HTTPS** (Caddy/Nginx) ishlating. Maktab admini hisoblari hozircha DASADA da saqlanadi — maktab saytlari ularga ulanganida kirish ishlaydi.
`npm test` — 14 ta sinov.

## Yangi (v7): dizayn va qulayliklar
- **Ctrl+K** (yoki `/`) — buyruqlar palitrasi: bo‘lim, maktab, murojaatni tez qidirish va ochish.
- Jonli Toshkent vaqti, tovush effektlari (🔊 tugmasi bilan o‘chiriladi), tepada yuklanish chizig‘i.
- Kirish sahifasida zarrachalar animatsiyasi, aurora fon, kursor nuri, tugmalarda yaltirash effekti.
- Bosh sahifada: o‘rtacha javob vaqti, 24 soatdan oshgan muammolar, haftalik grafik (sparkline), jonli faollik lentasi.
- Murojaatlarda kutish vaqti belgisi (⏱ — 6 soatdan sariq, 24 soatdan qizil).

## Yangi (v8): General admin qo‘shish va jamoa chati
- **Adminlar** bo‘limi: `General admin` (to‘liq huquq) yoki `Menejer` (tanlangan bo‘limlar) qo‘shiladi. Asosiy (birinchi) General adminni o‘zgartirib/o‘chirib bo‘lmaydi; boshqa General adminlarni faqat asosiy admin boshqaradi.
- **Jamoa chati**: barcha General admin va menejerlar o‘zaro yozishadi (har 3 soniyada yangilanadi, yangi xabarda belgi va tovush).

## Yangi (v9): vazifalar, logolar, ruxsat kartochkalari
- **Vazifalar** (kanban): General admin vazifani xodimga biriktiradi → ijrochi **qabul qiladi** (🛠️ Razrabotkada, kim ishlayotgani ko‘rinadi) → **tugatadi**. Agar “tekshirish kerak” yoqilgan bo‘lsa — 🔍 Tekshiruvga o‘tadi; General admin **maqullaydi** (✅ Tayyor) yoki xato izohi bilan **qaytaradi** (yana Razrabotkaga). “Tekshirish kerak” o‘chirilgan bo‘lsa, tugatilganda to‘g‘ridan-to‘g‘ri Tayyorga o‘tadi.
- Menejer faqat o‘ziga biriktirilgan vazifalarni ko‘radi; har bir vazifada harakatlar tarixi va izohlar bor.
- Har bir xodim (General admin va menejer) uchun **logo**: chap pastdagi o‘z rasmingizni bosing yoki Adminlar bo‘limida “Rasm”.

## Yangi (v10): dropdown, kalendar, sozlamalar
- Barcha oddiy `<select>` ro‘yxatlari maxsus chiroyli dropdown bilan, `<input type=date>` esa o‘zbekcha kalendar (Bugun / Ertaga / +7 kun / Tozalash tugmalari) bilan avtomatik almashtiriladi (`public/ui.js`). Klaviatura: ↑↓ Enter Esc, ro‘yxat uzun bo‘lsa qidiruv bor.
- Sozlamalar: profil kartasi (rasm, rol, ruxsatlar), parol kuchi ko‘rsatkichi, mavzu (Avto/Yorug‘/Qorong‘u), tovush tugmasi.

## Yangi (v11): Bo‘limlar, rollar, lichka
- **Bo‘limlar** (DASADA Studios loyihalari): General admin yaratadi (nom, belgi, rang, a’zolar). Har bir bo‘limda: Umumiy (statistika, faollik), **Vazifalar** (kanban + tekshiruv oqimi), **To-do** (tezkor ro‘yxat), **Chat** (faqat bo‘lim a’zolari), **Hujjatlar** (qaydlar, qadash), **A’zolar**.
- Bo‘lim ichidagi rollar: **Rahbar** (vazifa beradi/tekshiradi), **A’zo**, **Kuzatuvchi** (faqat ko‘radi). General adminlar barcha bo‘limlarni ko‘radi; boshqalar faqat a’zo bo‘lganlarini.
- **Lichka**: istalgan xodim istalgan xodimga shaxsiy yoza oladi (o‘qildi belgisi ✓✓, yangi xabar belgisi va tovush).
- **Lavozimlar**: General admin, Tex admin, Kurator admin, Dasturchi, Dizayner, Tester (QA), Qo‘llab-quvvatlash, Moliyachi, Menejer, Kuzatuvchi — har biri uchun tayyor ruxsatlar to‘plami (keyin o‘zgartirsa bo‘ladi).

## Yangi (v12): DASADA Studios logotipi va yangi bosh sahifa
- Logotip (`public/logo-full.png`, `logo-icon.png`, `favicon.png`) kirish sahifasi, yon menyu, bosh sahifa va brauzer belgisida.
- Bosh sahifa to‘liq loyihalar bo‘yicha: faol loyihalar, razrabotkada/tekshiruvda/tayyor vazifalar, to-do (qilingan/qilinmagan), 14 kunlik bajarilgan ishlar, ketayotgan loyihalar, hozir ishlanayotgan vazifalar, mening vazifalarim, jonli faollik.
- “Vazifalar” alohida menyudan olib tashlandi — vazifalar har bir bo‘lim ichida. “Maktablar” (maktablar, muammolar, e’lonlar) endi “Bo‘limlar” ichidagi alohida asosiy bo‘lim.

## v13: moslashuvchan dizayn
- Telefon (<=640px): Adminlar jadvallari karta ko‘rinishida; planshet va telefon uchun gorizontal siljish yo‘q (17 sahifa x 5 ekran tekshirildi).

## v14
- To-do olib tashlandi (hammasi vazifalar orqali).
- Bo‘limga logo (yaratish/tahrirlash oynasida).
- Bo‘limlar ichida “Arxiv” kartasi: #/archive — yopilgan bo‘limlar, bajarilgan vazifalar (qidiruv, bo‘lim va oy filtri), statistika.
- Adminlar → “Test ishchilar”: har yo‘nalishga 2 tadan (tex1, tex2, kurator1 … mehmon2), parol test1234.

## v15: Katta bo‘lim (guruh)
- Bo‘limlar → “Katta bo‘lim” tugmasi: masalan “Kofe sayt”; ichida “12-ko‘cha”, “13-ko‘cha” bo‘limlari. Logo, rang, belgi bor.
- Arxiv kartasi “Yopilganlar” deb qayta nomlandi.

## v16: Ishchilar bo‘limi va logo ko‘proq joylarda
- Yon menyuda yangi **Ishchilar** sahifasi: barcha jamoa a’zolari kartochkada (rasm, lavozim, bo‘limlari, jarayonda/tekshiruvda/tayyor vazifalar soni), qidiruv va lavozim bo‘yicha filtr, **Lichka** tugmasi.
- General admin: **+ Ishchi qo‘shish** (ism, lavozim, login, parol, rasm va darhol bo‘limlarga biriktirish) hamda kartochkadan **+ Bo‘limga qo‘shish** (bo‘limdagi roli bilan).
- Oddiy xodim faqat o‘zi a’zo bo‘lgan bo‘limlarni va loginsiz ro‘yxatni ko‘radi.
- Logo yangi joylarda: yuklanish ekrani (splash) va yuklanish animatsiyasi, kirish formasi (tepada va pastda), yon menyu pastki qismi, har sahifa orqa foni (xira belgi) va pastki qatori, bo‘lim banneri, oynalar (modal), Ctrl+K qidiruv oynasi, bo‘sh holat (empty) kartochkalari, xabarlar (toast), brauzer havolasi (og:image).
- `/api/g/workers` — yangi API; `npm test` — 18 ta sinov.

## v16b
- "Adminlar" bo‘limi olib tashlandi — hammasi **Ishchilar** sahifasida: qo‘shish, tahrirlash (lavozim, ruxsatlar), rasm, yangi parol, o‘chirish, General admin qo‘shish.
- Yangi dizayn: "Yangi ishchi" oynasi (lavozim kartochkalari, dumaloq rasm tanlash, bo‘lim chiplari).
- 🧪 Test ishchilar: har yo‘nalishga **5 tadan** (tex1…tex5, dasturchi1…dasturchi5 …), parol `test1234`.
- Server ishga tushganda baza bo‘sh bo‘lsa (faqat General admin bor) 45 ta test ishchi **avtomatik** yaratiladi. O‘chirish: `DSD_NO_TEST=1`.

## v16f
- "Test ishchilar" tugmasi, "Qo‘llab-quvvatlash" va "Kuzatuvchi" lavozimlari olib tashlandi. Avtomatik test ishchilar: 7 yo‘nalish × 5 = 35 ta. Bazadagi eski support1–5 / mehmon1–5 hisoblari o‘chiriladi, boshqa shu lavozimdagilar Menejerga o‘tadi.

## v17: lavozim chat xonalari va lichkada ish bo‘limlari
- **Jamoa chati** endi har bir lavozim uchun alohida xona: Dizaynerlar, Tex adminlar, Kurator, Dasturchilar, Testerlar, Moliyachilar, Menejerlar va General adminlar. Oddiy xodim **faqat o‘z lavozimi xonasini** ko‘radi va yoza oladi; **barcha xonalarga faqat General admin** kira oladi (server tomonida ham tekshiriladi: boshqa xonaga so‘rov 403 qaytaradi).
- Eski umumiy chat xabarlari “General adminlar” xonasiga ko‘chirildi. Yangi: `GET /api/g/chat/rooms`, `GET|POST /api/g/chat?room=<lavozim>`.
- **Lichka**: chap tomonda “Oxirgi suhbatlar” va “Ish bo‘limlari” kartochkalari (Dizaynerlar, Tex adminlar …). Bo‘limni bosing → ichidagi odamlar ro‘yxati → odamni tanlang → yozing. Ism bo‘yicha qidiruv barcha bo‘limlardan topadi. O‘qilmagan xabarlar soni bo‘lim kartochkasida ko‘rinadi.
- `npm test` — 19 ta sinov.
#   d a s a d a _ 2  
 