// Genera la matriz antes/después a partir de dos mediciones hechas con los mismos
// instrumentos (quality/ci/medir-version.sh) y de las pruebas cruzadas.
// Uso: node quality/compare-versions.mjs <dir-antes> <dir-después> <dir-cruzado> <dir-salida>
import fs from 'node:fs';
import path from 'node:path';

const [antesDir, despuesDir, cruzadoDir, outDir] = process.argv.slice(2);
if (!outDir) throw new Error('Uso: node quality/compare-versions.mjs <antes> <después> <cruzado> <salida>');
fs.mkdirSync(outDir, { recursive: true });

const read = (dir, file) => {
  const p = path.join(dir, file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
};
const load = (dir) => ({
  dir,
  build: read(dir, 'build.json'),
  server: read(dir, 'pruebas-server.json'),
  client: read(dir, 'pruebas-client.json'),
  covServer: read(dir, 'cobertura-server/coverage-summary.json'),
  covClient: read(dir, 'cobertura-client/coverage-summary.json'),
  stat: read(dir, 'static-metrics.json'),
  bundle: read(dir, 'bundle.json'),
  audit: read(dir, 'npm-audit.json'),
  cases: read(dir, 'casos/results.json'),
  perf30: read(dir, 'performance-30.json'),
  perf100: read(dir, 'performance-100.json'),
  lh: read(dir, 'lighthouse.json'),
  env: read(dir, 'environment.json'),
});
const A = load(antesDir);
const D = load(despuesDir);
const C = { server: read(cruzadoDir, 'pruebas-server.json'), client: read(cruzadoDir, 'pruebas-client.json'), info: read(cruzadoDir, 'descripcion.json') };

const fmt = (n, d = 2) => (n === null || n === undefined || Number.isNaN(n) ? 'n/d' : Number(n).toLocaleString('es-EC', { minimumFractionDigits: d, maximumFractionDigits: d }));
const int = (n) => (n === null || n === undefined ? 'n/d' : Number(n).toLocaleString('es-EC'));
const pctv = (v) => (v === null || v === undefined ? 'n/d' : fmt(v, 1) + '%');
const pct = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : 'n/d');

function tests(json) {
  if (!json) return null;
  const all = json.testResults.flatMap((f) => f.assertionResults.map((t) => ({ ...t, file: f.name })));
  return {
    total: json.numTotalTests,
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    suitesNotLoaded: json.testResults.filter((f) => f.status === 'failed' && f.assertionResults.length === 0).map((f) => path.basename(f.name)),
    all,
  };
}
const ts = { A: [tests(A.server), tests(A.client)], D: [tests(D.server), tests(D.client)], C: [tests(C.server), tests(C.client)] };
const sumT = (pair, key) => pair.reduce((s, t) => s + (t ? t[key] : 0), 0);
const expectedCurrent = sumT(ts.D, 'total');

// Escenarios de los defectos D02–D04 dentro de las pruebas cruzadas.
const groups = {
  D02: (t) => /reutilizar una clave|reconoce el mismo carrito|misma clave y carritos distintos/.test(t.title),
  D03: (t) => t.ancestorTitles?.includes('reintentos de compra'),
  D04: (t) => t.ancestorTitles?.includes('actualización del carrito'),
};
function defectScenario(pair, id, expected) {
  const list = pair.flatMap((t) => (t ? t.all : [])).filter(groups[id]);
  const passed = list.filter((t) => t.status === 'passed').length;
  return { passed, executed: list.length, expected };
}
const scen = Object.fromEntries(
  Object.entries({ D02: 6, D03: 14, D04: 6 }).map(([id, n]) => [id, { antes: defectScenario(ts.C, id, n), despues: defectScenario(ts.D, id, n) }]),
);

const cov = (s, k) => (s ? s.total[k].pct : null);
const casesPass = (c) => (c ? c.cases.filter((x) => x.status === 'Pass').length : null);
const casesTotal = (c) => (c ? c.cases.length : null);
const vulns = (a) => (a?.metadata?.vulnerabilities ? a.metadata.vulnerabilities : null);
const highCrit = (a) => (vulns(a) ? vulns(a).high + vulns(a).critical : null);

// Defectos D01–D04: estado al cierre de cada versión con la información actual.
const defects = [
  { id: 'D01', severidad: 'Media', titulo: 'Build falla en Windows con la API abierta', detectado: '2026-10-10', corregido: '2026-10-10', commit: 'f6c1a4c', detectadoPor: 'Compilación habitual (npm run build)' },
  { id: 'D02', severidad: 'Crítica', titulo: 'Se confirma el pedido de otro carrito al reutilizar la clave', detectado: '2026-10-15', corregido: '2026-10-15', commit: '838aefb', detectadoPor: 'Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales' },
  { id: 'D03', severidad: 'Crítica', titulo: 'Clave de compra perdida en un reintento (compra duplicada)', detectado: '2026-10-15', corregido: '2026-10-15', commit: '838aefb', detectadoPor: 'Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales' },
  { id: 'D04', severidad: 'Media', titulo: 'Actualización de precios sobre un carrito antiguo', detectado: '2026-10-15', corregido: '2026-10-15', commit: '838aefb', detectadoPor: 'Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales' },
];
const kslocA = A.stat ? A.stat.productionSloc / 1000 : null;
const critA = defects.filter((d) => d.severidad === 'Crítica').length;

const rows = [];
const add = (car, metrica, antes, despues, criterio, conclusion) => rows.push({ car, metrica, antes, despues, criterio, conclusion });
const meets = (ok) => (ok === null ? 'Sin dato' : ok ? 'Cumple' : 'No cumple');

// Adecuación funcional
const cpA = casesPass(A.cases), cpD = casesPass(D.cases);
add('Adecuación funcional', 'Casos de navegador CP01–CP20 aprobados', `${int(cpA)}/${int(casesTotal(A.cases))}`, `${int(cpD)}/${int(casesTotal(D.cases))}`, '≥ 95%',
  `Antes: ${meets(cpA !== null && cpA / casesTotal(A.cases) >= 0.95)}; después: ${meets(cpD !== null && cpD / casesTotal(D.cases) >= 0.95)}`);
const cA = sumT(ts.C, 'passed'), cRun = sumT(ts.C, 'total'), notRun = expectedCurrent - cRun;
add('Adecuación funcional', `Las ${expectedCurrent} pruebas actuales ejecutadas sobre el código`, `${int(cA)}/${expectedCurrent} (${pct(cA, expectedCurrent)}); ${int(sumT(ts.C, 'failed'))} fallan y ${int(notRun)} no ejecutables`,
  `${int(sumT(ts.D, 'passed'))}/${expectedCurrent} (${pct(sumT(ts.D, 'passed'), expectedCurrent)})`, '100%', `Antes: ${meets(cA === expectedCurrent)}; después: ${meets(sumT(ts.D, 'passed') === expectedCurrent)}`);
const scenText = (x, n) => `${x.passed}/${n}${x.executed ? '' : ' (la lógica no existía como módulo verificable)'}`;
add('Adecuación funcional', 'Conciliación del carrito correcta (D04, 6 escenarios)', scenText(scen.D04.antes, 6), `${scen.D04.despues.passed}/6`, '6/6', `Antes: ${meets(scen.D04.antes.passed === 6)}; después: ${meets(scen.D04.despues.passed === 6)}`);
add('Adecuación funcional', 'Defectos críticos abiertos (escala de la Tabla 19)', `${critA} (D02, D03)`, '0', '0', `Antes: No cumple; después: Cumple`);
add('Adecuación funcional', 'Defectos conocidos abiertos (D01–D04)', '4 (1 detectado el 10/10 y 3 latentes)', '0', '0', 'Antes: No cumple; después: Cumple');
add('Adecuación funcional', 'Densidad de defectos', `${fmt(defects.length / kslocA, 2)} por KSLOC (4 / ${fmt(kslocA, 3)})`, '0 conocidos abiertos', 'Tendencia descendente', 'Mejora');

// Fiabilidad
add('Fiabilidad', 'Reintentos con la misma clave resueltos correctamente (D02, 6 escenarios de API)', `${scen.D02.antes.passed}/6`, `${scen.D02.despues.passed}/6`, '6/6', `Antes: ${meets(scen.D02.antes.passed === 6)}; después: ${meets(scen.D02.despues.passed === 6)}`);
add('Fiabilidad', 'Clave de compra conservada ante recargas y reintentos (D03, 14 escenarios)', scenText(scen.D03.antes, 14), `${scen.D03.despues.passed}/14`, '14/14', `Antes: ${meets(scen.D03.antes.passed === 14)}; después: ${meets(scen.D03.despues.passed === 14)}`);
for (const [n, pa, pd] of [[30, A.perf30, D.perf30], [100, A.perf100, D.perf100]])
  add('Fiabilidad', `Respuestas correctas del catálogo (${n} consultas)`, `${int(pa?.correct)}/${n}`, `${int(pd?.correct)}/${n}`, `${n}/${n}`, `Antes: ${meets(pa ? pa.correct === n : null)}; después: ${meets(pd ? pd.correct === n : null)}`);

// Eficiencia de desempeño
add('Eficiencia de desempeño', 'Catálogo: mediana / p95 (100 consultas, ms)', `${fmt(A.perf100?.medianMs)} / ${fmt(A.perf100?.p95Ms)}`, `${fmt(D.perf100?.medianMs)} / ${fmt(D.perf100?.p95Ms)}`, '≤ 300 / ≤ 500 ms',
  `Antes: ${meets(A.perf100 ? A.perf100.medianMs <= 300 && A.perf100.p95Ms <= 500 : null)}; después: ${meets(D.perf100 ? D.perf100.medianMs <= 300 && D.perf100.p95Ms <= 500 : null)}`);
add('Eficiencia de desempeño', 'Lighthouse: rendimiento (promedio de 4 páginas)', int(A.lh?.average.performance), int(D.lh?.average.performance), '≥ 90 (banda verde de Lighthouse)', `Antes: ${meets(A.lh ? A.lh.average.performance >= 90 : null)}; después: ${meets(D.lh ? D.lh.average.performance >= 90 : null)}`);
const lcp = (lh) => (lh ? Math.max(...Object.values(lh.pages).map((p) => p.metrics['largest-contentful-paint'])) : null);
add('Eficiencia de desempeño', 'Lighthouse: LCP de la página más lenta (ms)', int(lcp(A.lh)), int(lcp(D.lh)), '≤ 2.500 ms', `Antes: ${meets(A.lh ? lcp(A.lh) <= 2500 : null)}; después: ${meets(D.lh ? lcp(D.lh) <= 2500 : null)}`);
add('Eficiencia de desempeño', 'JavaScript del cliente (kB, sin comprimir / gzip)', `${fmt(A.bundle?.jsBytes / 1000)} / ${fmt(A.bundle?.jsGzipBytes / 1000)}`, `${fmt(D.bundle?.jsBytes / 1000)} / ${fmt(D.bundle?.jsGzipBytes / 1000)}`, 'Archivo ≤ 500 kB (aviso de Vite)', `Antes: ${meets(A.bundle ? !A.bundle.viteWarningOver500Kb : null)}; después: ${meets(D.bundle ? !D.bundle.viteWarningOver500Kb : null)}`);

// Capacidad de interacción
add('Capacidad de interacción', 'Lighthouse: accesibilidad (promedio de 4 páginas)', int(A.lh?.average.accessibility), int(D.lh?.average.accessibility), '≥ 90', `Antes: ${meets(A.lh ? A.lh.average.accessibility >= 90 : null)}; después: ${meets(D.lh ? D.lh.average.accessibility >= 90 : null)}`);
add('Capacidad de interacción', 'Tareas sin ayuda en el piloto (O01)', '3/5 = 60% (P01, autorreporte)', 'Pendiente: protocolo del Anexo F con participantes nuevos', '≥ 80%', 'Antes: No cumple; después: sin medir');

// Seguridad
add('Seguridad', 'Vulnerabilidades altas o críticas en dependencias (npm audit)', int(highCrit(A.audit)), int(highCrit(D.audit)), '0', `Antes: ${meets(highCrit(A.audit) === null ? null : highCrit(A.audit) === 0)}; después: ${meets(highCrit(D.audit) === null ? null : highCrit(D.audit) === 0)}`);
add('Seguridad', 'Vulnerabilidades totales en dependencias (npm audit)', int(vulns(A.audit)?.total), int(vulns(D.audit)?.total), 'Tendencia', 'Mismas dependencias en ambas versiones');
add('Seguridad', 'Lighthouse: buenas prácticas (promedio)', int(A.lh?.average['best-practices']), int(D.lh?.average['best-practices']), '≥ 90', `Antes: ${meets(A.lh ? A.lh.average['best-practices'] >= 90 : null)}; después: ${meets(D.lh ? D.lh.average['best-practices'] >= 90 : null)}`);

// Mantenibilidad
add('Mantenibilidad', 'Pruebas automatizadas propias de la versión (aprobadas/total)', `${int(sumT(ts.A, 'passed'))}/${int(sumT(ts.A, 'total'))}`, `${int(sumT(ts.D, 'passed'))}/${int(sumT(ts.D, 'total'))}`, '100% aprobadas', `Antes: ${meets(sumT(ts.A, 'passed') === sumT(ts.A, 'total'))}; después: ${meets(sumT(ts.D, 'passed') === sumT(ts.D, 'total'))}`);
add('Mantenibilidad', 'Cobertura de líneas del servidor', pctv(cov(A.covServer, 'lines')), pctv(cov(D.covServer, 'lines')), 'Tendencia ascendente', '');
add('Mantenibilidad', 'Cobertura de ramas del servidor', pctv(cov(A.covServer, 'branches')), pctv(cov(D.covServer, 'branches')), 'Tendencia ascendente', '');
add('Mantenibilidad', 'Cobertura de líneas del cliente', pctv(cov(A.covClient, 'lines')), pctv(cov(D.covClient, 'lines')), 'Tendencia ascendente', '');
add('Mantenibilidad', 'Líneas de código de producción (SLOC)', int(A.stat?.productionSloc), int(D.stat?.productionSloc), 'Descriptiva', '');
add('Mantenibilidad', 'Relación líneas de prueba / producción', fmt(A.stat?.testToCodeRatio, 3), fmt(D.stat?.testToCodeRatio, 3), 'Tendencia ascendente', '');
add('Mantenibilidad', 'Complejidad ciclomática media / máxima por función', `${fmt(A.stat?.complexityMean)} / ${int(A.stat?.complexityMax)}`, `${fmt(D.stat?.complexityMean)} / ${int(D.stat?.complexityMax)}`, 'Máxima ≤ 10 (umbral de McCabe)', `Antes: ${meets(A.stat ? A.stat.complexityMax <= 10 : null)}; después: ${meets(D.stat ? D.stat.complexityMax <= 10 : null)}`);
add('Mantenibilidad', 'Funciones con complejidad > 10', int(A.stat?.functionsOver10), int(D.stat?.functionsOver10), '0', `Antes: ${meets(A.stat ? A.stat.functionsOver10 === 0 : null)}; después: ${meets(D.stat ? D.stat.functionsOver10 === 0 : null)}`);
add('Mantenibilidad', 'Compilación en el entorno de CI (Linux)', A.build ? (A.build.exitCode === 0 ? 'Correcta' : `Falla (${A.build.exitCode})`) : 'n/d', D.build ? (D.build.exitCode === 0 ? 'Correcta' : `Falla (${D.build.exitCode})`) : 'n/d', 'Código 0', 'D01 solo se reproduce en Windows con la API abierta');

const date = new Date().toISOString();
const header = ['Característica', 'Métrica', 'Antes (afac785)', `Después (${D.stat?.shortCommit || D.env?.sourceCommit?.slice(0, 7) || 'actual'})`, 'Criterio', 'Conclusión'];
const md = [
  '# Matriz de comparación antes/después',
  '',
  `Generada el ${date} por \`quality/compare-versions.mjs\`. Ambas versiones se midieron en la misma máquina de GitHub Actions, una después de otra, con los mismos scripts y datos ficticios.`,
  '',
  `- Antes: \`${A.stat?.commit || 'afac785'}\` (tag baseline-calidad-v1).`,
  `- Después: \`${D.stat?.commit || 'n/d'}\`.`,
  `- Entorno: ${D.build?.os || 'n/d'}, Node ${D.build?.node || 'n/d'}, ${A.cases?.browser ? 'Chrome ' + A.cases.browser : 'Chrome'}.`,
  `- Pruebas cruzadas: ${C.info?.metodo || 'n/d'}`,
  '',
  '| ' + header.join(' | ') + ' |',
  '|' + header.map(() => '---').join('|') + '|',
  ...rows.map((r) => `| ${r.car} | ${r.metrica} | ${r.antes} | ${r.despues} | ${r.criterio} | ${r.conclusion} |`),
  '',
  '## Defectos y momento de detección',
  '',
  '| Defecto | Severidad | Descripción | Detectado | Corregido | Commit | Cómo se detectó |',
  '|---|---|---|---|---|---|---|',
  ...defects.map((d) => `| ${d.id} | ${d.severidad} | ${d.titulo} | ${d.detectado} | ${d.corregido} | ${d.commit} | ${d.detectadoPor} |`),
  '',
  'Eficacia de detección de la suite inicial: CP01–CP20 y las 26 pruebas de la baseline detectaron 0 de los 3 defectos funcionales (D02–D04).',
  '',
  `Pruebas actuales no ejecutables sobre la baseline: ${[...(ts.C[0]?.suitesNotLoaded || []), ...(ts.C[1]?.suitesNotLoaded || [])].join(', ') || 'ninguna'}.`,
  '',
];
fs.writeFileSync(path.join(outDir, 'comparacion.md'), md.join('\n'));
const csv = [header, ...rows.map((r) => [r.car, r.metrica, r.antes, r.despues, r.criterio, r.conclusion])]
  .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
  .join('\r\n');
fs.writeFileSync(path.join(outDir, 'comparacion.csv'), '﻿' + csv);
fs.writeFileSync(
  path.join(outDir, 'comparacion.json'),
  JSON.stringify({ date, antes: A.stat?.commit, despues: D.stat?.commit, rows, defects, escenarios: scen,
    pruebas: { antes: { passed: sumT(ts.A, 'passed'), total: sumT(ts.A, 'total') }, despues: { passed: sumT(ts.D, 'passed'), total: sumT(ts.D, 'total') }, cruzado: { passed: cA, executed: cRun, expected: expectedCurrent, failed: sumT(ts.C, 'failed') } },
    lighthouse: { antes: A.lh?.pages, despues: D.lh?.pages },
    cobertura: { antes: { server: A.covServer?.total, client: A.covClient?.total }, despues: { server: D.covServer?.total, client: D.covClient?.total } },
    catalogo: { antes: { 30: A.perf30 && { ...A.perf30, samples: undefined }, 100: A.perf100 && { ...A.perf100, samples: undefined } }, despues: { 30: D.perf30 && { ...D.perf30, samples: undefined }, 100: D.perf100 && { ...D.perf100, samples: undefined } } },
    audit: { antes: vulns(A.audit), despues: vulns(D.audit) },
    estatica: { antes: A.stat && { ...A.stat, files: undefined, testFilesDetail: undefined }, despues: D.stat && { ...D.stat, files: undefined, testFilesDetail: undefined } },
  }, null, 2),
);
console.log(md.join('\n'));
