# Entrega final de NeonPlay

Trabajo final de Calidad de Software. Integrantes: Kevin Adrián Quiñonez Rocha, Orlando Eloy Trujillo y Francisco Almeida. Carrera: Desarrollo de Software, nivel 4. Docente: Ing. Sebastián Landázuri G.

## Archivos

- `NeonPlay_Trabajo_Final_Calidad_Software.docx`: informe vigente, actualizado el 16/10/2026. Incluye la matriz de comparación antes y después medida en GitHub Actions (Tabla 27), la reinterpretación de la baseline con D02 y D03 como defectos críticos, las observaciones O02 a O04 y el plan de mejora actualizado. Al abrirlo, Word pide actualizar los campos: acepta para refrescar el índice. Exporta el PDF desde Word (Archivo → Exportar) para conservar la paginación institucional.
- `Presentacion_NeonPlay_formato_institucional.pptx`: presentación del 11/10/2026. Está desactualizada respecto del informe: no incluye D02–D04 ni la reevaluación.

## Resultados vigentes

Medición del 16/10/2026 en la misma máquina de GitHub Actions para ambas versiones (`quality/comparacion/comparacion.md`):

- Las 52 pruebas actuales: 27 de 52 sobre el código de la baseline y 52 de 52 sobre la versión actual.
- Defectos críticos abiertos: 2 (D02, D03) → 0. Defectos conocidos abiertos: 4 → 0.
- Casos de navegador CP01–CP20: 20 de 20 en ambas versiones.
- Cobertura del servidor: 88,8 % → 89,0 % de líneas y 78,8 % → 81,8 % de ramas.
- Sin cambio y registrados como observaciones: LCP del catálogo de 12,2 s por imágenes de 3 MB (O02), accesibilidad 94/100 con fallos de contraste (O03) y 13 vulnerabilidades altas o críticas en dependencias (O04).
- O01 (interacción) sigue abierta: el piloto con participantes nuevos está preparado en `quality/piloto-O01`.

## Código, versiones y evidencias

Repositorio público: https://github.com/orlandotrujillo028-debug/NeonPlay — rama `main`.

- Baseline: tag `baseline-calidad-v1`, commit `afac785`.
- Primera mejora (D01): `f6c1a4c`. Segunda mejora (D02–D04): `838aefb`.
- Reevaluación, integración continua y registro de hallazgos: pull request #10.
- Hallazgos: Issues #2 a #9 (D01–D04 cerrados, O01–O04 abiertos).

`quality/README.md` explica cómo repetir la evaluación en GitHub Actions o en Windows.
