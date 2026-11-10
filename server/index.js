import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { openDb } from './db.js';
import { createApp, loadSecret, seedGeneral, seedTestStaff } from './app.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DSD_DATA || join(root, 'data');
const db = openDb(process.env.DSD_DB || join(dataDir, 'dasada.db'));
const custom = !!process.env.GENERAL_PASSWORD;
if (seedGeneral(db, { login: process.env.GENERAL_LOGIN, pw: process.env.GENERAL_PASSWORD, N: custom ? 16384 : 1024 }))
  console.log(custom ? 'General admin yaratildi.' : 'DEMO general admin yaratildi: login "general", parol "general123" (haqiqiy foydalanishda GENERAL_LOGIN / GENERAL_PASSWORD bering!)');
/* Bo‘sh bazada sinov uchun ishchilar avtomatik yaratiladi (o‘chirish: DSD_NO_TEST=1). */
if (!process.env.DSD_NO_TEST && db.prepare('SELECT COUNT(*) n FROM staff').get().n <= 1) {
  const n = seedTestStaff(db).length; if (n) console.log(`${n} ta test ishchi yaratildi (login: tex1, dasturchi1 …; parol: test1234).`);
}
const port = +process.env.PORT || 4000;
createApp(db, { secret: loadSecret(join(dataDir, '.secret')), staticDir: join(root, 'public') }).listen(port, () => {
  console.log(`DASADA General admin: http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`  tarmoqda:          http://${n.address}:${port}`);
});
