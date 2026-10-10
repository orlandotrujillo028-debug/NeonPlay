import { existsSync, mkdirSync, writeFileSync, unlinkSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'server/.env'), quiet: true });
const dataDir = path.join(root, 'server/.local-data');
const action = process.argv[2] || 'start';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const suffix = process.platform === 'win32' ? '.exe' : '';
const candidates = [
  process.env.POSTGRES_BIN,
  ...[18, 17, 16, 15].map((v) => `C:/Program Files/PostgreSQL/${v}/bin`),
].filter(Boolean);
const binDir = candidates.find((dir) => existsSync(path.join(dir, `pg_ctl${suffix}`)));
const binary = (name) => (binDir ? path.join(binDir, name + suffix) : name);
function execute(name, args, silent = false) {
  const result = spawnSync(binary(name), args, {
    encoding: 'utf8',
    windowsHide: true,
    stdio: silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (!silent) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error)
    throw new Error(
      `No se pudo ejecutar ${name}. Instala PostgreSQL o define POSTGRES_BIN con la carpeta bin.`,
    );
  return result;
}
try {
  if (!['start', 'stop', 'status'].includes(action))
    throw new Error('Acción desconocida. Utiliza start, stop o status.');
  if (action === 'stop') {
    if (existsSync(path.join(dataDir, 'PG_VERSION'))) {
      const status = execute('pg_ctl', ['-D', dataDir, 'status'], true);
      if (
        status.status === 0 &&
        execute('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']).status !== 0
      )
        process.exit(1);
    }
    process.exit(0);
  }
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/neonplay')
    throw new Error(
      'db:local solo administra la base local neonplay. Para una base externa utiliza db:migrate.',
    );
  const user = decodeURIComponent(url.username),
    password = decodeURIComponent(url.password),
    port = url.port || '55432';
  if (!user || !password)
    throw new Error(`Configura DATABASE_URL en server/.env o ejecuta ${npmCommand} run setup.`);
  if (action === 'status') {
    if (!existsSync(path.join(dataDir, 'PG_VERSION')))
      throw new Error(`PostgreSQL local no está configurado. Ejecuta ${npmCommand} run setup.`);
    const status = execute('pg_ctl', ['-D', dataDir, 'status'], true);
    if (status.status !== 0)
      throw new Error(`PostgreSQL local está detenido. Ejecuta ${npmCommand} run db:local.`);
    const ready = execute('pg_isready', ['-h', '127.0.0.1', '-p', port], true);
    if (ready.status !== 0)
      throw new Error(
        'El proceso de PostgreSQL está activo, pero aún no acepta conexiones. Consulta server/postgres-local.log.',
      );
    console.log(`PostgreSQL local sigue encendido y acepta conexiones en 127.0.0.1:${port}.`);
    process.exit(0);
  }
  if (!existsSync(path.join(dataDir, 'PG_VERSION'))) {
    mkdirSync(dataDir, { recursive: true });
    const passwordFile = path.join(root, 'server/.pg-password');
    writeFileSync(passwordFile, password, { mode: 0o600 });
    try {
      const result = execute('initdb', [
        '-D',
        dataDir,
        '-U',
        user,
        '--encoding=UTF8',
        '--locale=C',
        '--auth=scram-sha-256',
        `--pwfile=${passwordFile}`,
      ]);
      if (result.status !== 0) throw new Error('No se pudo inicializar el clúster local.');
    } finally {
      unlinkSync(passwordFile);
    }
  }
  // On Windows log handles inside PGDATA interfere with crash recovery.
  const legacyLog = path.join(dataDir, 'postgres.log');
  if (existsSync(legacyLog)) {
    const running = execute('pg_ctl', ['-D', dataDir, 'status'], true);
    if (
      running.status === 0 &&
      execute('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']).status !== 0
    )
      throw new Error('No se pudo detener el clúster local para reubicar su log.');
    renameSync(legacyLog, path.join(root, 'server', 'postgres-legacy-' + Date.now() + '.log'));
  }
  const status = execute('pg_ctl', ['-D', dataDir, 'status'], true);
  if (status.status !== 0) {
    const start = execute('pg_ctl', [
      '-D',
      dataDir,
      '-l',
      path.join(root, 'server/postgres-local.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ]);
    if (start.status !== 0)
      throw new Error('No se pudo iniciar PostgreSQL. Consulta server/postgres-local.log.');
  }
  const oldPassword = process.env.PGPASSWORD;
  process.env.PGPASSWORD = password;
  try {
    const args = [
      '-h',
      '127.0.0.1',
      '-p',
      port,
      '-U',
      user,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ];
    const check = execute(
      'psql',
      [...args, '-tAc', "SELECT 1 FROM pg_database WHERE datname = 'neonplay'"],
      true,
    );
    if (check.status !== 0) throw new Error('No se pudo conectar al clúster local.');
    if (
      check.stdout.trim() !== '1' &&
      execute('psql', [...args, '-c', 'CREATE DATABASE neonplay']).status !== 0
    )
      throw new Error('No se pudo crear la base neonplay.');
  } finally {
    if (oldPassword === undefined) delete process.env.PGPASSWORD;
    else process.env.PGPASSWORD = oldPassword;
  }
  console.log(`PostgreSQL local disponible en 127.0.0.1:${port}, funcionando en segundo plano.`);
  console.log(
    'Es normal que este comando termine y vuelva a aparecer el indicador de PowerShell o de tu terminal.',
  );
  console.log(
    `Comprueba su estado con ${npmCommand} run db:status e inicia la tienda con ${npmCommand} run dev.`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
