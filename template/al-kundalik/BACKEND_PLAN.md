# Al-Kundalik — Backend rejasi

## Qarorlar
- **Stack:** faqat Node.js o‘zining ichki modullari (`node:http`, `node:sqlite`, `node:crypto`). `npm install` kerak emas, **Node 22.13+** (LTS) yetadi.
- **Baza:** SQLite (bitta fayl: `server/data/kundalik.db`). Maktab hajmi uchun yetarli, zaxira nusxa = faylni nusxalash.
- **Parol:** `scrypt` bilan hash. Admin ko‘rsin deb boshlang‘ich parol `pw_hint` ustunida alohida saqlanadi (2-bosqichda olib tashlanadi).
- **Token:** HMAC bilan imzolangan, 12 soatlik. Maxfiy kalit `server/data/.secret` (birinchi ishga tushishda yaratiladi).
- **Frontend bilan aloqa:** frontend holati (state) saqlanib qoladi; server `/api/state` bilan rolga mos snapshot beradi, o‘zgarishlar `/api/sync` orqali (delta) yuboriladi.

## Bosqichlar
1. **Baza sxemasi** — subjects, teachers, classes, students, schedule, assignments, records, homework, feedback, messages, admin, audit.
2. **Autentifikatsiya** — admin (telefon+parol), ustoz (ism [+fan]+parol), o‘quvchi (ism+telefon+parol). Urinishlar cheklovi (15 daqiqada 10 ta xato).
3. **Ruxsatlar (RBAC)**
   - Admin: hammasi.
   - Ustoz: faqat o‘z fani va o‘ziga biriktirilgan sinflar uchun baho, uyga vazifa va ota-onaga xabar.
   - O‘quvchi: faqat o‘qish, faqat o‘z sinfi.
4. **Seed** — frontenddagi `data.js` generatoridan demo ma’lumot (baza bo‘sh bo‘lsa).
5. **Test** — `npm test`: login, ruxsatlar, ma’lumot yozish.
6. **Frontend ulash** — `src/kundalik/api.js`, App/Login serverga ulanadi.
7. **Keyingi bosqich (hali qilinmagan):** ota-onalar paneli, parolni o‘zgartirish, reytingni serverda hisoblash (o‘quvchiga sinfdoshlarning baholari yuborilmasligi uchun), HTTPS/hosting, avtomatik zaxira, bir vaqtda tahrirlashda to‘qnashuvlarni hal qilish.
