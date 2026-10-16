# Matriz de comparación antes/después

Generada el 2026-10-16T22:31:29.094Z por `quality/compare-versions.mjs`. Ambas versiones se midieron en la misma máquina de GitHub Actions, una después de otra, con los mismos scripts y datos ficticios.

- Antes: `afac785407c041abc13f9b8651e70293aae488d4` (tag baseline-calidad-v1).
- Después: `e2c9924d812c5a089eb46aeb8d026a5c25013a3d`.
- Entorno: Linux 6.17.0-1022-azure, Node v22.23.3, Chrome 155.0.8059.39.
- Pruebas cruzadas: Archivos de prueba de la versión actual copiados sobre el código de la baseline, sin modificar el código de producción.

| Característica | Métrica | Antes (afac785) | Después (e2c9924) | Criterio | Conclusión |
|---|---|---|---|---|---|
| Adecuación funcional | Casos de navegador CP01–CP20 aprobados | 19/20 | 19/20 | ≥ 95% | Antes: Cumple; después: Cumple |
| Adecuación funcional | Las 52 pruebas actuales ejecutadas sobre el código | 27/52 (51,9%); 5 fallan y 20 no ejecutables | 52/52 (100,0%) | 100% | Antes: No cumple; después: Cumple |
| Adecuación funcional | Conciliación del carrito correcta (D04, 6 escenarios) | 0/6 (la lógica no existía como módulo verificable) | 6/6 | 6/6 | Antes: No cumple; después: Cumple |
| Adecuación funcional | Defectos críticos abiertos (escala de la Tabla 19) | 2 (D02, D03) | 0 | 0 | Antes: No cumple; después: Cumple |
| Adecuación funcional | Defectos conocidos abiertos (D01–D04) | 4 (1 detectado el 10/10 y 3 latentes) | 0 | 0 | Antes: No cumple; después: Cumple |
| Adecuación funcional | Densidad de defectos | 1,11 por KSLOC (4 / 3,607) | 0 conocidos abiertos | Tendencia descendente | Mejora |
| Fiabilidad | Reintentos con la misma clave resueltos correctamente (D02, 6 escenarios de API) | 1/6 | 6/6 | 6/6 | Antes: No cumple; después: Cumple |
| Fiabilidad | Clave de compra conservada ante recargas y reintentos (D03, 14 escenarios) | 0/14 (la lógica no existía como módulo verificable) | 14/14 | 14/14 | Antes: No cumple; después: Cumple |
| Fiabilidad | Respuestas correctas del catálogo (30 consultas) | 30/30 | 30/30 | 30/30 | Antes: Cumple; después: Cumple |
| Fiabilidad | Respuestas correctas del catálogo (100 consultas) | 100/100 | 100/100 | 100/100 | Antes: Cumple; después: Cumple |
| Eficiencia de desempeño | Catálogo: mediana / p95 (100 consultas, ms) | 5,12 / 6,02 | 5,08 / 5,89 | ≤ 300 / ≤ 500 ms | Antes: Cumple; después: Cumple |
| Eficiencia de desempeño | Lighthouse: rendimiento (promedio de 4 páginas) | n/d | 85 | ≥ 90 (banda verde de Lighthouse) | Antes: Sin dato; después: No cumple |
| Eficiencia de desempeño | Lighthouse: LCP de la página más lenta (ms) | n/d | 12.219 | ≤ 2.500 ms | Antes: Sin dato; después: No cumple |
| Eficiencia de desempeño | JavaScript del cliente (kB, sin comprimir / gzip) | 573,88 / 145,09 | 575,89 / 145,67 | Archivo ≤ 500 kB (aviso de Vite) | Antes: No cumple; después: No cumple |
| Capacidad de interacción | Lighthouse: accesibilidad (promedio de 4 páginas) | n/d | 94 | ≥ 90 | Antes: Sin dato; después: Cumple |
| Capacidad de interacción | Tareas sin ayuda en el piloto (O01) | 3/5 = 60% (P01, autorreporte) | Pendiente: protocolo del Anexo F con participantes nuevos | ≥ 80% | Antes: No cumple; después: sin medir |
| Seguridad | Vulnerabilidades altas o críticas en dependencias (npm audit) | 13 | 13 | 0 | Antes: No cumple; después: No cumple |
| Seguridad | Vulnerabilidades totales en dependencias (npm audit) | 14 | 14 | Tendencia | Mismas dependencias en ambas versiones |
| Seguridad | Lighthouse: buenas prácticas (promedio) | n/d | 96 | ≥ 90 | Antes: Sin dato; después: Cumple |
| Mantenibilidad | Pruebas automatizadas propias de la versión (aprobadas/total) | 26/26 | 52/52 | 100% aprobadas | Antes: Cumple; después: Cumple |
| Mantenibilidad | Cobertura de líneas del servidor | 88,8% | 89,0% | Tendencia ascendente |  |
| Mantenibilidad | Cobertura de ramas del servidor | 78,8% | 81,8% | Tendencia ascendente |  |
| Mantenibilidad | Cobertura de líneas del cliente | 2,0% | 4,7% | Tendencia ascendente |  |
| Mantenibilidad | Líneas de código de producción (SLOC) | 3.607 | 3.715 | Descriptiva |  |
| Mantenibilidad | Relación líneas de prueba / producción | 0,096 | 0,156 | Tendencia ascendente |  |
| Mantenibilidad | Complejidad ciclomática media / máxima por función | 2,35 / 29 | 2,38 / 29 | Máxima ≤ 10 (umbral de McCabe) | Antes: No cumple; después: No cumple |
| Mantenibilidad | Funciones con complejidad > 10 | 10 | 10 | 0 | Antes: No cumple; después: No cumple |
| Mantenibilidad | Compilación en el entorno de CI (Linux) | Correcta | Correcta | Código 0 | D01 solo se reproduce en Windows con la API abierta |

## Defectos y momento de detección

| Defecto | Severidad | Descripción | Detectado | Corregido | Commit | Cómo se detectó |
|---|---|---|---|---|---|---|
| D01 | Media | Build falla en Windows con la API abierta | 2026-10-10 | 2026-10-10 | f6c1a4c | Compilación habitual (npm run build) |
| D02 | Crítica | Se confirma el pedido de otro carrito al reutilizar la clave | 2026-10-15 | 2026-10-15 | 838aefb | Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales |
| D03 | Crítica | Clave de compra perdida en un reintento (compra duplicada) | 2026-10-15 | 2026-10-15 | 838aefb | Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales |
| D04 | Media | Actualización de precios sobre un carrito antiguo | 2026-10-15 | 2026-10-15 | 838aefb | Segunda ronda; no lo detectaron CP01–CP20 ni las 26 pruebas iniciales |

Eficacia de detección de la suite inicial: CP01–CP20 y las 26 pruebas de la baseline detectaron 0 de los 3 defectos funcionales (D02–D04).

Pruebas actuales no ejecutables sobre la baseline: cart.test.ts, checkout.test.ts.
