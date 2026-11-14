import 'dotenv/config';
import { loadConfig } from '../server/src/config.js';
import { migrate, openDatabase } from '../server/src/db/index.js';
import { seedPackages } from '../server/src/db/seed.js';
import { runDemoSeed } from '../server/src/seed/demo.js';

async function main() {
  const config = loadConfig();
  const db = openDatabase(config.databasePath);
  migrate(db);
  seedPackages(db);
  const result = await runDemoSeed({ db, config });
  db.close();
  console.log('Demo yayıncı:', result.email);
  console.log('Demo şifre  :', result.password);
  console.log('Oyun linki  :', result.slug ? `${config.webOrigin}/live/${result.slug}` : '(zaten vardı)');
  console.log('Yeni kayıt  :', result.created);
}

void main();
