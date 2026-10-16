// Mide la consulta del catálogo en la instancia aislada de evaluación.
// Uso: node quality/measure-catalog.mjs [muestras]   (por defecto 30)
// El resultado se guarda en la carpeta de la versión evaluada como
// performance-<muestras>.json; nunca sobrescribe la evidencia de otra versión.
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runDir, versionInfo } from './run-context.mjs';

const count = Number(process.argv[2] || process.env.QUALITY_SAMPLES || 30);
if (!Number.isInteger(count) || count < 10) throw new Error('Indica al menos 10 muestras.');
const env = JSON.parse(await fs.readFile(path.join(runDir, 'environment.json'), 'utf8'));
if (env.baseUrl !== 'http://127.0.0.1:4011') throw new Error('Solo se permite la instancia local de evaluación.');
const endpoint = '/api/games?limit=12&sort=price-asc';

async function sample(i) {
  const start = performance.now();
  try {
    const response = await fetch(env.baseUrl + endpoint);
    const body = await response.json();
    const correct =
      response.status === 200 &&
      body.total === 8 &&
      body.games.length === 8 &&
      body.games.every((g, j) => !j || Number(g.price) >= Number(body.games[j - 1].price));
    return { sample: i, ms: Number((performance.now() - start).toFixed(3)), status: response.status, correct };
  } catch (e) {
    return { sample: i, ms: Number((performance.now() - start).toFixed(3)), status: 0, correct: false, error: e.message };
  }
}

for (let i = 0; i < 5; i++) await sample(0);
const samples = [];
for (let i = 1; i <= count; i++) {
  samples.push(await sample(i));
  await new Promise((r) => setTimeout(r, 250));
}
const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
// Percentil por rango más próximo: elemento ceil(p × n), igual que en la primera evaluación.
const rank = (p) => sorted[Math.ceil(p * count) - 1];
const mean = sorted.reduce((a, b) => a + b, 0) / count;
const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (count - 1));
const median = count % 2 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
const result = {
  date: new Date().toISOString(),
  ...versionInfo,
  endpoint,
  method: 'HTTP secuencial, incluye lectura y validación JSON',
  warmup: 5,
  intervalMs: 250,
  sampleCount: count,
  meanMs: Number(mean.toFixed(3)),
  sdMs: Number(sd.toFixed(3)),
  medianMs: Number(median.toFixed(3)),
  p95Ms: rank(0.95),
  p99Ms: rank(0.99),
  minMs: sorted[0],
  maxMs: sorted[count - 1],
  correct: samples.filter((s) => s.correct).length,
  criterion: { medianMaxMs: 300, p95MaxMs: 500, correctRequired: count },
  samples,
};
await fs.writeFile(path.join(runDir, `performance-${count}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, samples: undefined }, null, 2));
