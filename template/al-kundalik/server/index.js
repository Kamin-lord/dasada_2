import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seedIfEmpty } from './seed.js';
import { createApp, loadSecret } from './app.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.KD_DATA || join(root, 'server', 'data');
const db = openDb(process.env.DB_FILE || join(dataDir, 'kundalik.db'));
if (seedIfEmpty(db, { adminPhone: process.env.ADMIN_PHONE, adminPw: process.env.ADMIN_PASSWORD, fastHash: !process.env.ADMIN_PASSWORD })) console.log('Demo ma’lumotlar yaratildi.');
const demo = process.env.DEMO !== '0';
const port = +process.env.PORT || 3001;
createApp(db, { secret: loadSecret(join(dataDir, '.secret')), staticDir: join(root, 'dist'), demo })
  .listen(port, () => console.log(`Al-Kundalik API: http://localhost:${port}${demo ? '  (DEMO rejimi: DEMO=0 bilan o‘chiring)' : ''}`));
