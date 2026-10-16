// Calcula eficacia, eficiencia y satisfacción del piloto O01 a partir de
// registro.csv y sus.csv.  Uso: node quality/piloto-O01/calcular.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

function parseCsv(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

const yes = (v) => /^(s[ií]|si|yes|true|1|x)$/i.test(v);
const registro = parseCsv('registro.csv');
const sus = parseCsv('sus.csv');
if (!registro.length) throw new Error('registro.csv no tiene filas. Registra primero las sesiones.');

const attempted = registro.filter((r) => yes(r.intento));
const withoutHelp = attempted.filter((r) => yes(r.sin_ayuda));
const withHelp = attempted.filter((r) => !yes(r.sin_ayuda) && yes(r.completada_con_ayuda));
const participants = [...new Set(registro.map((r) => r.participante))];
const byTask = {};
for (const r of attempted) {
  const t = (byTask[r.tarea] ||= { tarea: r.tarea, intentos: 0, sinAyuda: 0, tiempos: [], errores: 0, ayudas: [] });
  t.intentos++;
  if (yes(r.sin_ayuda)) t.sinAyuda++;
  if (r.tiempo_s) t.tiempos.push(Number(r.tiempo_s));
  t.errores += Number(r.errores || 0);
  if (r.donde_pidio_ayuda) t.ayudas.push(`${r.participante}: ${r.donde_pidio_ayuda}`);
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const susScores = sus.map((r) => {
  const answers = Array.from({ length: 10 }, (_, i) => Number(r[`q${i + 1}`]));
  if (answers.some((a) => !(a >= 1 && a <= 5))) throw new Error(`Respuestas SUS inválidas para ${r.participante}.`);
  const sum = answers.reduce((s, a, i) => s + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return { participante: r.participante, puntaje: sum * 2.5 };
});

const eficacia = (withoutHelp.length / attempted.length) * 100;
const result = {
  fecha: new Date().toISOString(),
  participantes: participants.length,
  tareasIntentadas: attempted.length,
  sinAyuda: withoutHelp.length,
  completadasConAyuda: withHelp.length,
  eficaciaPorcentaje: Number(eficacia.toFixed(1)),
  criterio: 80,
  cumple: eficacia >= 80,
  tiempoMedioPorTareaS: Number((mean(attempted.filter((r) => r.tiempo_s).map((r) => Number(r.tiempo_s))) ?? 0).toFixed(1)),
  erroresPorTarea: Number((attempted.reduce((s, r) => s + Number(r.errores || 0), 0) / attempted.length).toFixed(2)),
  susMedio: susScores.length ? Number(mean(susScores.map((s) => s.puntaje)).toFixed(1)) : null,
  susReferencia: 68,
  porTarea: Object.values(byTask).map((t) => ({ ...t, tiempoMedioS: mean(t.tiempos), tiempos: undefined })),
  sus: susScores,
};
fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(result, null, 2));
const md = [
  '# Resultado del piloto O01',
  '',
  `- Participantes: ${result.participantes}`,
  `- Eficacia: ${result.sinAyuda}/${result.tareasIntentadas} tareas sin ayuda = ${result.eficaciaPorcentaje} % (criterio ≥ 80 %: ${result.cumple ? 'cumple' : 'no cumple'})`,
  `- Completadas con ayuda: ${result.completadasConAyuda}`,
  `- Tiempo medio por tarea: ${result.tiempoMedioPorTareaS} s; errores por tarea: ${result.erroresPorTarea}`,
  `- SUS medio: ${result.susMedio ?? 'sin respuestas'} (referencia 68)`,
  '',
  '| Tarea | Intentos | Sin ayuda | Tiempo medio (s) | Errores | Dónde se pidió ayuda |',
  '|---|---|---|---|---|---|',
  ...result.porTarea.map((t) => `| ${t.tarea} | ${t.intentos} | ${t.sinAyuda} | ${t.tiempoMedioS?.toFixed(1) ?? 'n/d'} | ${t.errores} | ${t.ayudas.join('; ') || '—'} |`),
];
fs.writeFileSync(path.join(dir, 'resultado.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
