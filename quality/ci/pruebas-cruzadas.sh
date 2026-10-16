#!/usr/bin/env bash
# Ejecuta las pruebas de la versión actual sobre el código de la baseline.
# Muestra cuántas de las 52 pruebas actuales habría aprobado el código inicial:
# las que fallan aquí y pasan en la versión actual corresponden a defectos corregidos.
# Uso: quality/ci/pruebas-cruzadas.sh <código-baseline> <código-actual> <carpeta-de-salida>
# La carpeta de la baseline debe tener sus dependencias instaladas.
set -uo pipefail

BASE=$(cd "$1" && pwd)
CURRENT=$(cd "$2" && pwd)
mkdir -p "$3"
OUT=$(cd "$3" && pwd)

cp "$CURRENT/server/tests/api.test.ts" "$BASE/server/tests/api.test.ts"
for f in "$CURRENT"/client/src/*.test.ts; do cp "$f" "$BASE/client/src/"; done

echo "::group::Pruebas actuales sobre el código de la baseline"
(cd "$BASE/server" && npx vitest run --reporter=default --reporter=json --outputFile.json="$OUT/pruebas-server.json") \
  >"$OUT/pruebas-server.log" 2>&1
echo "servidor: código $?"; tail -40 "$OUT/pruebas-server.log"
(cd "$BASE/client" && npx vitest run --reporter=default --reporter=json --outputFile.json="$OUT/pruebas-client.json") \
  >"$OUT/pruebas-client.log" 2>&1
echo "cliente: código $?"; tail -40 "$OUT/pruebas-client.log"
echo "::endgroup::"

# Restaura la baseline intacta.
git -C "$BASE" checkout -- server/tests client/src
git -C "$BASE" clean -fdq -- client/src
cat >"$OUT/descripcion.json" <<JSON
{
  "codigo": "$(git -C "$BASE" rev-parse HEAD)",
  "pruebas": "$(git -C "$CURRENT" rev-parse HEAD)",
  "fecha": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metodo": "Archivos de prueba de la versión actual copiados sobre el código de la baseline, sin modificar el código de producción."
}
JSON
exit 0
