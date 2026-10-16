// Auditoría Lighthouse de la tienda compilada en la instancia aislada (puerto 4011).
// Mide rendimiento, accesibilidad, buenas prácticas y SEO en cuatro páginas,
// tres ejecuciones por página; se informa la mediana de cada categoría.
// Requisitos: Lighthouse instalado en QUALITY_RUNTIME_MODULES y Chrome en CHROME_PATH.
// Uso: node quality/lighthouse.mjs  → <carpeta de la versión>/lighthouse.json y lighthouse/*.html
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runDir, versionInfo } from './run-context.mjs';

const runtime = process.env.QUALITY_RUNTIME_MODULES;
if (!runtime) throw new Error('Define QUALITY_RUNTIME_MODULES con la carpeta donde instalaste lighthouse.');
const cli = path.join(runtime, 'lighthouse/cli/index.js');
const env = JSON.parse(fs.readFileSync(path.join(runDir, 'environment.json'), 'utf8'));
const runs = Number(process.env.QUALITY_LIGHTHOUSE_RUNS || 3);
const pages = [
  ['inicio', '/'],
  ['catalogo', '/catalog'],
  ['detalle', '/game/nexus-beyond-the-void'],
  ['carrito', '/cart'],
];
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const audits = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'total-byte-weight'];
const out = path.join(runDir, 'lighthouse');
fs.mkdirSync(out, { recursive: true });
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const result = { date: new Date().toISOString(), ...versionInfo, preset: 'desktop', runsPerPage: runs, pages: {} };
for (const [id, url] of pages) {
  const reports = [];
  for (let i = 1; i <= runs; i++) {
    const file = path.join(out, `${id}-${i}`);
    const r = spawnSync(
      process.execPath,
      [cli, env.baseUrl + url, '--preset=desktop', '--quiet', '--output=json', '--output=html', `--output-path=${file}`,
        `--only-categories=${categories.join(',')}`, '--chrome-flags=--headless=new --no-sandbox --disable-gpu'],
      { encoding: 'utf8', windowsHide: true },
    );
    if (r.status !== 0) throw new Error(`Lighthouse falló en ${url}: ${r.stderr}`);
    reports.push(JSON.parse(fs.readFileSync(`${file}.report.json`, 'utf8')));
    fs.rmSync(`${file}.report.json`);
    if (i > 1) fs.rmSync(`${file}.report.html`); // se conserva un informe HTML por página
  }
  const page = { url, scores: {}, metrics: {} };
  for (const c of categories) page.scores[c] = Math.round(median(reports.map((r) => r.categories[c].score)) * 100);
  for (const a of audits) page.metrics[a] = Number(median(reports.map((r) => r.audits[a].numericValue)).toFixed(a === 'cumulative-layout-shift' ? 3 : 0));
  page.failedAccessibilityAudits = Object.values(reports[0].audits)
    .filter((a) => a.score === 0 && reports[0].categories.accessibility.auditRefs.some((ref) => ref.id === a.id))
    .map((a) => a.id);
  result.pages[id] = page;
  console.log(id, JSON.stringify(page.scores));
}
result.average = Object.fromEntries(
  categories.map((c) => [c, Math.round(Object.values(result.pages).reduce((s, p) => s + p.scores[c], 0) / pages.length)]),
);
fs.writeFileSync(path.join(runDir, 'lighthouse.json'), JSON.stringify(result, null, 2));
console.log('Promedio', JSON.stringify(result.average));
