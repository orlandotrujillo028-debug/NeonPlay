# Evaluación de calidad de NeonPlay

Trabajo final de Calidad de Software, Desarrollo de Software nivel 4, Instituto Superior Tecnológico Quito. Integrantes: Kevin Adrián Quiñonez Rocha, Orlando Eloy Trujillo y Francisco Almeida. Docente: Ing. Sebastián Landázuri G.

## Versiones evaluadas

| Punto | Commit | Fecha | Qué contiene |
|---|---|---|---|
| Baseline (`baseline-calidad-v1`) | `afac785` | 10/10/2026 | Versión inicial del ecommerce. |
| Primera mejora | `f6c1a4c` | 10/10/2026 | Corrige D01 (build en Windows); no cambia reglas de negocio. |
| Segunda mejora | `838aefb` | 15/10/2026 | Corrige D02–D04 (compra y carrito); 52 pruebas. |
| Versión actual | rama `main` | 16/10/2026 | Integración continua, scripts trazables y reevaluación antes/después. |

## Dónde está cada resultado

| Carpeta o archivo | Contenido |
|---|---|
| `comparacion/comparacion.md` (y `.csv`, `.json`) | Matriz antes/después con criterio y conclusión por métrica. |
| `evidence/runs/antes-afac785/` | Medición de la baseline en GitHub Actions: build, pruebas y cobertura, casos de navegador, catálogo (30 y 100 consultas), Lighthouse, npm audit, tamaño del paquete y métricas estáticas. |
| `evidence/runs/despues-<commit>/` | Las mismas mediciones de la versión actual, en la misma máquina. |
| `evidence/runs/cruzado-afac785/` | Las 52 pruebas actuales ejecutadas sobre el código de la baseline. |
| `evidence/baseline`, `regression`, `regression-retry`, `instrumentacion-01`, `*.json`, `*.txt` | Evidencias originales de la primera evaluación (10/10/2026, Windows 11). No se modifican. |
| `matrices/` | CSV de la primera evaluación y registro de defectos D01–D04 y O01. |
| `piloto-O01/` | Protocolo, consentimiento, tareas, cuestionario SUS y calculadora del piloto con participantes nuevos. |
| `deliverables/final/` | Informe vigente (16/10/2026) y presentación del 11/10/2026, que no incluye la reevaluación. |

## Repetir la comparación

### En GitHub Actions (recomendado)

El flujo **Comparación de calidad** se ejecuta en cada PR hacia `main` y también se puede lanzar a mano desde la pestaña **Actions → Comparación de calidad → Run workflow**. Mide la baseline y la versión actual una después de otra en la misma máquina y publica el artefacto `comparacion-calidad` con todas las evidencias. El resumen del flujo muestra la matriz.

Los pasos están en `quality/ci/medir-version.sh` (una versión) y `quality/ci/pruebas-cruzadas.sh` (pruebas actuales sobre la baseline). `quality/compare-versions.mjs` arma la matriz.

### En tu equipo (Windows)

Configura NeonPlay según el README principal. Usa Node 22.12 o superior y PostgreSQL iniciado. Ejecuta desde la raíz:

```powershell
npm.cmd ci
npm.cmd run db:local
npm.cmd run build
node quality/start-evaluation.mjs
```

La última orden mantiene una API y tienda compilada en `http://127.0.0.1:4011` y crea un esquema aleatorio `neonplay_quality_<12 caracteres hexadecimales>`, separado de `public`. Cuentas de ese esquema: `admin@quality.test` y `player@quality.test`, contraseña ficticia `QualityTest!2026`. Nexus empieza con precio 39,99 y stock 2; Void Command con stock 0.

En una segunda terminal instala Playwright y Lighthouse fuera del proyecto y ejecuta las mediciones:

```powershell
npm.cmd install --prefix ..\NeonPlay-QA-tools playwright@1.62.1 lighthouse@12
$env:QUALITY_RUNTIME_MODULES=(Resolve-Path ..\NeonPlay-QA-tools\node_modules).Path
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
node quality/browser-cases.mjs casos
node quality/measure-catalog.mjs 30
node quality/measure-catalog.mjs 100
node quality/lighthouse.mjs
node quality/static-metrics.mjs
node quality/bundle-size.mjs
npm.cmd install --no-save @vitest/coverage-v8@3.2.4
npm.cmd run test:coverage
```

Cada script escribe en `quality/evidence/runs/<commit>/`, con el commit evaluado dentro de cada JSON. Así una medición nueva no sobrescribe la de otra versión. Para guardar en otra carpeta define `QUALITY_OUT`; para ponerle nombre, `QUALITY_LABEL`.

Antes de repetir los casos de navegador sobre el mismo esquema, ejecuta `node quality/reset-evaluation.mjs`; solo restablece sus datos ficticios y exige el prefijo temporal validado. Al terminar, Ctrl+C en la terminal de `start-evaluation.mjs` cierra la API y elimina su esquema. Si una interrupción impidió esa limpieza, ejecuta `node quality/cleanup-evaluation.mjs`. Nunca se elimina `public` ni la base física.

## Primera evaluación (10/10/2026) y trazabilidad

El código de negocio se ejecutó en la baseline antes de la mejora. Con la API abierta, su comando habitual de build reprodujo D01; para preparar esa ejecución se usaron `node node_modules/typescript/bin/tsc -p server/tsconfig.json` y `npm.cmd run build -w client`. Es una alternativa de compilación del mismo código, sin cambiarlo.

`instrumentacion-01` conserva el ensayo inicial del ejecutor, que usó selectores y un nombre de campo incorrectos. No representa fallos funcionales del producto. `baseline/results.json` es la ejecución aceptada después de corregir esa instrumentación. `regression/results.json` conserva 19 Pass y la espera fallida de CP09; `regression-retry/results.json` registra su repetición satisfactoria. En esos tres archivos el campo `baselineCommit` es una constante del script; el commit realmente evaluado está en el campo `versionCommit` de cada caso. Desde la reevaluación, cada archivo registra además `commit` en su encabezado.

Los atributos, umbrales y la escala de severidad están en el informe. Las tasas se calculan con ×100. El rendimiento local y los pilotos no se extrapolan a producción ni constituyen certificación ISO.
