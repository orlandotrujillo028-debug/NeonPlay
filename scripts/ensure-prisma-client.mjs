import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse only a complete client generated for the current schema and version.
// Generating the same Windows DLL while an API is using it causes EPERM.
const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../server');
const require = createRequire(path.join(server, 'package.json'));
// Prisma formats the copied schema. Ignore formatting and comments, while
// retaining quoted values and every meaningful token for change detection.
const normalize = text => (text.match(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[^\s]/g) || [])
  .filter(token => !token.startsWith('//') && !token.startsWith('/*')).join('');
let current = false;
try {
  const clientEntry = require.resolve('@prisma/client');
  const clientRequire = createRequire(clientEntry);
  const generated = path.dirname(clientRequire.resolve('.prisma/client/default'));
  const sourceSchema = readFileSync(path.join(server, 'prisma/schema.prisma'), 'utf8');
  const generatedSchema = readFileSync(path.join(generated, 'schema.prisma'), 'utf8');
  const version = require('@prisma/client/package.json').version;
  const { Prisma, PrismaClient } = require('@prisma/client');
  const nativeEngine = readdirSync(generated).some(file => process.platform === 'win32'
    ? file === 'query_engine-windows.dll.node'
    : /^(lib)?query_engine.*\.(node|so|dylib)$/.test(file));
  current = normalize(sourceSchema) === normalize(generatedSchema)
    && Prisma.prismaVersion.client === version && nativeEngine;
  if (current) new PrismaClient(); // Constructor must also be usable; no DB query.
} catch { current = false; }

if (current) {
  console.log('Cliente Prisma vigente; se reutiliza sin reemplazar su motor.');
} else {
  const cli = require.resolve('prisma/build/index.js');
  if (!existsSync(cli)) throw new Error('Instala las dependencias con npm.cmd ci.');
  const result = spawnSync(process.execPath, [cli, 'generate'], {
    cwd: server, stdio: 'inherit', windowsHide: true,
  });
  if (result.status !== 0) {
    console.error('No se pudo generar Prisma. Si cambió el esquema y la API está abierta, detén la API y ejecuta npm.cmd run db:generate.');
    process.exitCode = result.status || 1;
  }
}
