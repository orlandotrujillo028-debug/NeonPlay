import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'server', '.env');
if (!existsSync(envPath)) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    envPath,
    `DATABASE_URL=postgresql://neonplay:${password}@127.0.0.1:55432/neonplay?schema=public\nJWT_SECRET=${randomBytes(48).toString('hex')}\nPORT=4000\nCLIENT_URL=http://localhost:5173\nNODE_ENV=development\nSEED_ADMIN_EMAIL=admin@neonplay.local\nSEED_ADMIN_PASSWORD=${randomBytes(12).toString('base64url')}Aa1!\nSEED_CUSTOMER_EMAIL=player@neonplay.local\nSEED_CUSTOMER_PASSWORD=${randomBytes(12).toString('base64url')}Aa1!\n`,
  );
  console.log('Configuración y contraseñas aleatorias creadas en server/.env.');
}
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ['scripts/local-postgres.mjs', 'start']);
for (const script of ['db:generate', 'db:migrate', 'db:seed'])
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script]);
console.log(
  `\nNeonPlay está listo. Ejecuta ${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev. Las cuentas de demostración y sus claves están en server/.env.`,
);
