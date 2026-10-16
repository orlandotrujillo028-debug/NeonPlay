// Tamaño del cliente compilado (client/dist), sin comprimir y con gzip.
// Ejecutar después de npm run build.  → <carpeta de la versión>/bundle.json
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { root, runDir, versionInfo } from './run-context.mjs';

const dist = path.join(root, 'client/dist/assets');
if (!fs.existsSync(dist)) throw new Error('Compila primero el cliente: npm run build.');
const assets = fs
  .readdirSync(dist)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((file) => {
    const data = fs.readFileSync(path.join(dist, file));
    return { file, type: path.extname(file).slice(1), bytes: data.length, gzipBytes: gzipSync(data, { level: 9 }).length };
  });
const total = (type, key) => assets.filter((a) => a.type === type).reduce((s, a) => s + a[key], 0);
const result = {
  date: new Date().toISOString(),
  ...versionInfo,
  jsBytes: total('js', 'bytes'),
  jsGzipBytes: total('js', 'gzipBytes'),
  cssBytes: total('css', 'bytes'),
  cssGzipBytes: total('css', 'gzipBytes'),
  largestJsKb: Number((Math.max(...assets.filter((a) => a.type === 'js').map((a) => a.bytes)) / 1000).toFixed(2)),
  viteWarningOver500Kb: assets.some((a) => a.type === 'js' && a.bytes > 500_000),
  assets,
};
fs.writeFileSync(path.join(runDir, 'bundle.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, assets: undefined }, null, 2));
