# Al-Kundalik — Al-Xorazmiy maktabi

Frontend: Vite + React. Backend: Node.js (tashqi kutubxonasiz) + SQLite. Reja: `BACKEND_PLAN.md`.

## Talab
Node.js **22.13 yoki yangi** (LTS) — https://nodejs.org

## Ishga tushirish (2 ta terminal)
```
npm install

# 1-terminal: backend (http://localhost:3001)
npm run api

# 2-terminal: frontend (http://localhost:5173)
npm run dev
```
Birinchi ishga tushishda baza (`server/data/kundalik.db`) demo ma’lumot bilan avtomatik yaratiladi.
Kirish sahifasidagi **“Demo ma’lumotni to‘ldirish”** tugmasi login ma’lumotlarini o‘zi kiritadi.

## Bitta jarayon (tayyor versiya)
```
npm start        # frontendni build qiladi va :3001 da hammasini beradi
```

## Haqiqiy foydalanish uchun (MUHIM)
```
ADMIN_PHONE=9XXXXXXXX ADMIN_PASSWORD=kuchli-parol DEMO=0 npm start
```
- `DEMO=0` — demo parollarni ko‘rsatuvchi `/api/demo` ni o‘chiradi.
- Birinchi marta ishga tushirishdan oldin `server/data/` papkasini o‘chirib, yangi admin parolini bering.
- Zaxira nusxa: `server/data/` papkasini nusxalang.

## Qoidalar
- **Baholash hafta kunlari bo‘yicha:** ustoz Dushanba–Juma kunini tanlaydi; faqat shu sinfda o‘z fani dars jadvalida bor kunlarga baho qo‘yiladi.
- **Qulf:** baho/izoh 7 kun ichida o‘zgartirilishi mumkin (bugun va oldingi 6 kun). Undan keyin qulflanadi, faqat administrator tuzata oladi. Qoida serverda ham tekshiriladi.
- **Choraklar** (Admin → Choraklar): chorak bahosi = chorak ichidagi dars baholari o‘rtachasi, butun songa yaxlitlanadi. Chorak sanalarini administrator o‘zgartiradi.
- **Sinflar:** Admin → Sinflar → “Sinf qo‘shish”. O‘quvchisi yo‘q sinfni o‘chirish mumkin.
- **Sinf logosi:** faqat sinf rahbari (Sinfim bo‘limi) qo‘yadi/olib tashlaydi.
- **Ovoz:** yuqoridagi tugma bilan o‘chirib-yoqiladi (past ovozli, brauzer xotirasida saqlanadi).

- **Til:** yuqoridagi UZ / RU / EN tugmalari (asosiy interfeys tarjima qilingan; lug‘at `src/kundalik/i18n.js` da — yangi tarjima qo‘shish uchun `ROWS` ga qator qo‘shing).
- **Soat:** Farg‘ona (O‘zbekiston, UTC+5) vaqti hamma panelda; soat ostida hozirgi holat (dars / tanaffus / ovqat vaqti). Admin bosh sahifasida “hozir qaysi sinfda qaysi dars”. Dars boshlanganda/tugaganda yumshoq qo‘ng‘iroq (ovozni o‘chirish mumkin).
- **Hujjatlar:** ro‘yxat `src/kundalik/data.js` dagi `DOC_TYPES` da (lex.uz asosida). Hujjatlarni faqat sinf rahbari belgilaydi; admin “Hujjatlar” bo‘limida kimda nima yetishmasligini ko‘radi; o‘quvchi o‘zinikini ko‘radi.

## Test
`npm test` — login, rollar bo‘yicha ruxsatlar va ma’lumot yozish tekshiruvlari (10 ta).
