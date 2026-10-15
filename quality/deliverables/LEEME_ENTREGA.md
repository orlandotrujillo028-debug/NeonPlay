# Entrega académica de NeonPlay

Informe y presentación de Calidad de Software, elaborados con las plantillas institucionales suministradas.

- Integrantes: Kevin Adrián Quiñonez Rocha y Orlando Eloy Trujillo.
- Carrera: Desarrollo de Software, nivel 4.
- Docente: Ing. Sebastián Landázuri G.
- Fecha de entrega: 15/10/2026. Evaluación: 10/10/2026.

## Archivos

- `Informe_calidad_NeonPlay.docx`: informe editable de 24 páginas, con metodología, resultados, referencias y anexos.
- `Presentacion_calidad_NeonPlay.pptx`: 18 diapositivas editables. Las notas del orador contienen el guion para 18 minutos; quedan dos minutos para preguntas.
- `Anexos_y_evidencias_NeonPlay.zip`: seis matrices CSV, capturas, resultados brutos, registros de compilación y pruebas, y scripts de reproducción.
- `matrices`: los mismos CSV fuera del ZIP. En Excel, usa Datos → Desde texto/CSV y elige UTF-8 y delimitador coma si tu configuración regional no separa las columnas automáticamente.

En GitHub, el informe y la presentación están en `quality/deliverables`; los anexos se conservan descomprimidos en `quality/evidence` y `quality/matrices`. El ZIP se entrega por separado para facilitar su descarga.

## Resultados que deben explicarse en la defensa

Se aprobaron 20 casos funcionales de la baseline y 20 resultados finales de regresión. La repetición de CP09 y los ajustes del ejecutor se conservan. La suite complementaria pasó 26 pruebas. El piloto de interacción registró 3/5 tareas sin ayuda (60%): compra e historial necesitaron ayuda; esa observación sigue abierta. El build que fallaba con la API abierta fue corregido y verificado. Los resultados son locales y corresponden al alcance de demostración.

## Código y reproducción

Repositorio: https://github.com/orlandotrujillo028-debug/NeonPlay
Rama: `codex/calidad-evaluacion`; tag de la baseline: `baseline-calidad-v1`.
Baseline: `afac785407c041abc13f9b8651e70293aae488d4`.
Mejora verificada: `f6c1a4c1db8af32cbd3311ec4c6fe2d20d9caa14`.

El repositorio es privado: el docente necesitará acceso para revisar el código. No se incluyen credenciales reales ni datos físicos de PostgreSQL. Las cuentas en los scripts y resultados son ficticias. Consulta `quality/README.md` dentro del ZIP o del repositorio para repetir la evaluación, y el README principal para configurar NeonPlay.
