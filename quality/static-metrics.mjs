// Métricas estáticas del código de producción y de prueba de la versión evaluada:
// tamaño (líneas sin comentarios ni blancos), funciones y complejidad ciclomática
// de McCabe aproximada (1 + if, ?:, case, bucles, catch, &&, || y ??).
// Uso: node quality/static-metrics.mjs   → <carpeta de la versión>/static-metrics.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { root, runDir, versionInfo } from './run-context.mjs';

const ts = createRequire(path.join(root, 'package.json'))('typescript');
const sources = ['client/src', 'server/src', 'server/tests'];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

function sloc(text) {
  let inBlock = false;
  let n = 0;
  for (const raw of text.split('\n')) {
    let l = raw.trim();
    if (inBlock) {
      if (!l.includes('*/')) continue;
      inBlock = false;
      l = l.slice(l.indexOf('*/') + 2).trim();
    }
    if (l.startsWith('/*')) {
      if (!l.includes('*/')) inBlock = true;
      continue;
    }
    if (l && !l.startsWith('//')) n++;
  }
  return n;
}

const K = ts.SyntaxKind;
const fnKinds = new Set([K.FunctionDeclaration, K.FunctionExpression, K.ArrowFunction, K.MethodDeclaration, K.Constructor, K.GetAccessor, K.SetAccessor]);
const decisions = new Set([K.IfStatement, K.ConditionalExpression, K.CaseClause, K.ForStatement, K.ForInStatement, K.ForOfStatement, K.WhileStatement, K.DoStatement, K.CatchClause]);
const logical = new Set([K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken]);

function complexity(fn) {
  let cc = 1;
  (function visit(n) {
    if (n !== fn && fnKinds.has(n.kind)) return; // cada función anidada se mide por separado
    if (decisions.has(n.kind)) cc++;
    else if (n.kind === K.BinaryExpression && logical.has(n.operatorToken.kind)) cc++;
    ts.forEachChild(n, visit);
  })(fn);
  return cc;
}

function name(n, sf) {
  if (n.name) return n.name.getText(sf);
  const p = n.parent;
  if (p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p))) return p.name.getText(sf);
  return `anónima (línea ${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1})`;
}

const prod = { files: [], fns: [] };
const tests = { files: [] };
for (const dir of sources) {
  for (const file of walk(path.join(root, dir))) {
    const rel = path.relative(root, file).replaceAll('\\', '/');
    const text = fs.readFileSync(file, 'utf8');
    if (/\.test\.tsx?$/.test(file) || rel.startsWith('server/tests/')) {
      tests.files.push({ file: rel, sloc: sloc(text) });
      continue;
    }
    prod.files.push({ file: rel, sloc: sloc(text) });
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    (function visit(n) {
      if (fnKinds.has(n.kind)) prod.fns.push({ file: rel, name: name(n, sf), cc: complexity(n) });
      ts.forEachChild(n, visit);
    })(sf);
  }
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const ccs = prod.fns.map((f) => f.cc);
const prodSloc = sum(prod.files.map((f) => f.sloc));
const testSloc = sum(tests.files.map((f) => f.sloc));
const result = {
  date: new Date().toISOString(),
  ...versionInfo,
  method: 'TypeScript compiler API; SLOC sin líneas vacías ni comentarios; complejidad de McCabe por función',
  productionFiles: prod.files.length,
  productionSloc: prodSloc,
  testFiles: tests.files.length,
  testSloc,
  testToCodeRatio: Number((testSloc / prodSloc).toFixed(3)),
  functions: prod.fns.length,
  complexityTotal: sum(ccs),
  complexityMean: Number((sum(ccs) / ccs.length).toFixed(2)),
  complexityMax: Math.max(...ccs),
  functionsOver10: ccs.filter((c) => c > 10).length,
  functionsOver20: ccs.filter((c) => c > 20).length,
  largestFiles: [...prod.files].sort((a, b) => b.sloc - a.sloc).slice(0, 5),
  mostComplex: [...prod.fns].sort((a, b) => b.cc - a.cc).slice(0, 10),
  files: prod.files,
  testFilesDetail: tests.files,
};
fs.writeFileSync(path.join(runDir, 'static-metrics.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, files: undefined, testFilesDetail: undefined, mostComplex: result.mostComplex.slice(0, 5) }, null, 2));
