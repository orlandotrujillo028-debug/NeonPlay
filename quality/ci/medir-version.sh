#!/usr/bin/env bash
# Mide una versión de NeonPlay con los mismos instrumentos y en el mismo entorno.
# Uso: quality/ci/medir-version.sh <carpeta-del-código> <etiqueta> <carpeta-de-salida>
# Requiere: PostgreSQL accesible en DATABASE_URL, JWT_SECRET, Chrome en CHROME_PATH
# y Playwright + Lighthouse instalados en QUALITY_RUNTIME_MODULES.
# Las pruebas fallidas no detienen la medición: cada resultado se registra.
set -uo pipefail

SRC=$(cd "$1" && pwd)
LABEL=$2
mkdir -p "$3"
OUT=$(cd "$3" && pwd)
export QUALITY_OUT="$OUT" QUALITY_LABEL="$LABEL"
export QUALITY_BROWSER="${QUALITY_BROWSER:-$CHROME_PATH}"
cd "$SRC"
group() { echo "::group::$LABEL · $1"; }
endgroup() { echo "::endgroup::"; }
ms() { date +%s%3N; }

group "Dependencias"
npm ci --no-audit --no-fund
npm install --no-save --no-audit --no-fund @vitest/coverage-v8@3.2.4
npm run db:generate
endgroup

group "Compilación"
t0=$(ms)
npm run build >"$OUT/build.log" 2>&1
build=$?
echo "{\"exitCode\": $build, \"durationMs\": $(($(ms) - t0)), \"os\": \"$(uname -sr)\", \"node\": \"$(node -v)\"}" >"$OUT/build.json"
tail -20 "$OUT/build.log"
endgroup

group "Pruebas automatizadas con cobertura"
(cd server && npx vitest run --reporter=default --reporter=json --outputFile.json="$OUT/pruebas-server.json" \
  --coverage.enabled --coverage.provider=v8 --coverage.include='src/**' \
  --coverage.reporter=json-summary --coverage.reporter=text-summary --coverage.reportsDirectory="$OUT/cobertura-server") \
  >"$OUT/pruebas-server.log" 2>&1
echo "servidor: código $?"; tail -25 "$OUT/pruebas-server.log"
(cd client && npx vitest run --reporter=default --reporter=json --outputFile.json="$OUT/pruebas-client.json" \
  --coverage.enabled --coverage.provider=v8 --coverage.include='src/**/*.{ts,tsx}' \
  --coverage.reporter=json-summary --coverage.reporter=text-summary --coverage.reportsDirectory="$OUT/cobertura-client") \
  >"$OUT/pruebas-client.log" 2>&1
echo "cliente: código $?"; tail -25 "$OUT/pruebas-client.log"
endgroup

group "Métricas estáticas, paquete y dependencias"
node quality/static-metrics.mjs >/dev/null && echo "static-metrics.json listo"
[ "$build" -eq 0 ] && node quality/bundle-size.mjs
npm audit --json >"$OUT/npm-audit.json" 2>/dev/null
echo "npm audit: código $?"
endgroup

group "Instancia aislada: casos de navegador, catálogo y Lighthouse"
node quality/start-evaluation.mjs >"$OUT/servidor.log" 2>&1 &
server=$!
for _ in $(seq 1 60); do
  curl -sf http://127.0.0.1:4011/api/health >/dev/null && break
  sleep 1
done
node quality/browser-cases.mjs casos 2>&1 | tee "$OUT/casos.log"
node quality/measure-catalog.mjs 30 >/dev/null && echo "catálogo 30 listo"
node quality/measure-catalog.mjs 100 >/dev/null && echo "catálogo 100 listo"
node quality/lighthouse.mjs 2>&1 | tee "$OUT/lighthouse.log"
kill -TERM "$server"
wait "$server"
cat "$OUT/servidor.log"
endgroup

# Los informes HTML de cobertura no se generan; solo se conservan los resúmenes.
exit 0
