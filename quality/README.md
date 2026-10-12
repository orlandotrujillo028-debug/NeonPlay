# Evaluación de calidad de NeonPlay

Actividad de Calidad de Software, Desarrollo de Software nivel 4. Integrantes: Kevin Adrián Quiñonez Rocha y Orlando Eloy Trujillo. Docente: Ing. Sebastián Landázuri G. Entrega: 15/10/2026. Evaluación ejecutada el 10/10/2026.

## Versiones y resultados

- Baseline `baseline-calidad-v1`: `afac785407c041abc13f9b8651e70293aae488d4`.
- Mejora comprobada: `f6c1a4c1db8af32cbd3311ec4c6fe2d20d9caa14`.
- Rama de entrega: `codex/calidad-evaluacion`.
- 20 casos de caja negra Pass en la baseline; regresión final de 20 casos Pass, con repetición documentada de CP09.
- 26 pruebas complementarias Pass: 20 de API sobre PostgreSQL real y 6 de carrito/fechas.
- 30 consultas HTTP correctas; mediana 3,60 ms y p95 4,45 ms en loopback.
- Piloto P01 por autorreporte: cinco tareas intentadas, tres sin ayuda (60%). Necesitó ayuda en compra e historial. No se confirmaron tiempos ni finalización de las tareas asistidas.
- D01, build con motor Prisma bloqueado en Windows: cerrado. O01, interacción de compra e historial: pendiente de investigar.

La entrega definitiva está en `deliverables/final`: informe Word de 32 páginas y presentación de 20 diapositivas. El informe vigente es `Informe_final_NeonPlay_redaccion_revisada.docx`, revisado el 11/10/2026. Las notas del PowerPoint incluyen el guion de 18 minutos y dos minutos para preguntas. Los archivos de la primera versión se conservan en `deliverables` como referencia; para entregar usa los de `final`. `matrices` conserva los CSV UTF-8 con BOM, legibles en Excel; `evidence` contiene los resultados y capturas originales. Las credenciales de prueba son exclusivamente ficticias, sin relación con las cuentas habituales.

## Repetir la evaluación de la versión mejorada

Configura NeonPlay según el README principal. Usa Node 22.12 o superior y PostgreSQL iniciado. Los scripts se ejecutan desde la raíz de NeonPlay.

```powershell
npm.cmd ci
npm.cmd run db:local
npm.cmd run build
node quality/start-evaluation.mjs
```

La última orden mantiene una API y tienda compilada en `http://127.0.0.1:4011` y crea un esquema aleatorio `neonplay_quality_<12 caracteres hexadecimales>`, separado de `public`. Cuentas de ese esquema: `admin@quality.test` y `player@quality.test`, contraseña ficticia `QualityTest!2026`. Nexus empieza con precio 39,99 y stock 2; Void Command con stock 0.

Para ejecutar el navegador se utilizó Playwright 1.62.1 y Google Chrome instalado. Puedes instalar el ejecutor en una carpeta separada del proyecto. En una segunda terminal:

```powershell
npm.cmd install --prefix ..\NeonPlay-QA-tools playwright@1.62.1
$env:QUALITY_RUNTIME_MODULES=(Resolve-Path ..\NeonPlay-QA-tools\node_modules).Path
# Opcional: cambia QUALITY_BROWSER si Chrome está en otra ruta.
node quality/browser-cases.mjs nueva-ejecucion
node quality/measure-catalog.mjs
npm.cmd test
```

Las capturas y JSON se escriben en `quality/evidence/<fase>`. Usa un nombre de fase nuevo para conservar ejecuciones anteriores. La medición sobrescribe `performance.json`: guarda una copia si comparas otra versión. Antes de repetir la suite sobre el mismo esquema, ejecuta `node quality/reset-evaluation.mjs`; solo restablece sus datos ficticios y exige el prefijo temporal validado. Para repetir únicamente el filtro usa una fase nueva y `CP09` como tercer argumento del ejecutor.

Al terminar, Ctrl+C en la terminal de `start-evaluation.mjs` cierra la API y elimina su esquema. Si una interrupción abrupta impidió esa limpieza, detén primero esa instancia y ejecuta `node quality/cleanup-evaluation.mjs`. Nunca se elimina `public` ni la base física.

## Baseline y trazabilidad

El código de negocio se ejecutó en la baseline antes de la mejora. Con la API abierta, su comando habitual de build reprodujo D01; para preparar esa ejecución se usaron `node node_modules/typescript/bin/tsc -p server/tsconfig.json` y `npm.cmd run build -w client`. Es una alternativa de compilación del mismo código, sin cambiarlo. Para investigar la baseline utiliza otro checkout del tag, conservando el ejecutor como herramienta de prueba separada, y configura su entorno según el README.

`instrumentacion-01` conserva el ensayo inicial del ejecutor, que usó selectores y un nombre de campo incorrectos. No representa fallos funcionales del producto. `baseline/results.json` es la ejecución aceptada después de corregir esa instrumentación. `regression/results.json` conserva 19 Pass y la espera fallida de CP09; `regression-retry/results.json` registra su repetición satisfactoria después de esperar la navegación. La matriz de regresión usa el último resultado y mantiene la ruta a ese intento. Los archivos brutos se conservan para revisar la secuencia.

Los cuatro atributos y umbrales están en el informe. Las tasas se calculan con ×100, corrigiendo explícitamente el ×10 impreso en la consigna. El rendimiento local y la muestra de un participante no se extrapolan a producción ni constituyen certificación ISO.
