# Entrega final de NeonPlay

Trabajo final de Calidad de Software. Integrantes: Kevin Adrián Quiñonez Rocha y Orlando Eloy Trujillo. Carrera: Desarrollo de Software, nivel 4. Docente: Ing. Sebastián Landázuri G. Fecha de entrega: 15/10/2026.

## Archivos para entregar

- `Informe_final_NeonPlay_redaccion_revisada.docx`: informe editable de 32 páginas. Incluye índice con páginas comprobadas, objetivos, metodología, criterios, resultados, discusión, plan de mejora, conclusiones, bibliografía y anexos con veinte casos y seis capturas.
- `Presentacion_final_NeonPlay.pptx`: veinte diapositivas editables basadas en la plantilla institucional. Las notas del orador contienen el guion de dieciocho minutos y dos minutos para preguntas. En PowerPoint, abre Vista → Página de notas o usa la vista Moderador para consultarlas.
- `Anexos_finales_NeonPlay.zip`: seis matrices CSV, capturas y registros originales, scripts de reproducción e instrucciones. No incluye datos físicos de PostgreSQL.
- `matrices`: copia de los CSV sin comprimir. En Excel, usa Datos → Desde texto/CSV, codificación UTF-8 y delimitador coma.

Esta entrega conserva los logotipos, fondos, cabecera, pie, márgenes y formato institucional de las plantillas suministradas. Los archivos originales de las plantillas permanecen intactos. El informe usa Arial 12 negro; la presentación mantiene sus fuentes institucionales y contiene tablas y un gráfico nativos.

La redacción del informe se revisó el 11/10/2026. Se conservaron la plantilla y los resultados de la evaluación del 10/10/2026.

## Lectura de los resultados

Los veinte casos funcionales de la baseline obtuvieron Pass. La regresión conserva veinte resultados finales Pass y el intento previo de CP09. Las veintiséis pruebas complementarias son un conjunto separado. Las treinta consultas correctas del catálogo tuvieron mediana de 3,60 ms y p95 de 4,45 ms en el entorno local.

El piloto P01 es un autorreporte de cinco tareas intentadas: tres sin ayuda y dos con ayuda, equivalente a 60%. La finalización posterior de las tareas asistidas no se confirmó. La observación O01 continúa abierta; el defecto de compilación D01 quedó cerrado con una corrección verificada. Estas diferencias se explican en el informe y en el guion.

## Código, versiones y evidencias

Repositorio: https://github.com/orlandotrujillo028-debug/NeonPlay

Rama de entrega: `codex/calidad-evaluacion`. En el repositorio, los archivos definitivos están en `quality/deliverables/final`; las matrices y evidencias están en `quality/matrices` y `quality/evidence`.

- Baseline: tag `baseline-calidad-v1`, commit `afac785407c041abc13f9b8651e70293aae488d4`.
- Mejora verificada: `f6c1a4c1db8af32cbd3311ec4c6fe2d20d9caa14`.

El repositorio es privado; el docente necesita acceso para consultarlo. El README principal explica cómo configurar NeonPlay y `quality/README.md` detalla cómo repetir la evaluación. El ZIP conserva los registros brutos y un manifiesto SHA-256 para comprobar que sus archivos no cambiaron.

La primera entrega se mantiene en la carpeta anterior como referencia. Para la presentación y evaluación final, utiliza los archivos que llevan `final` en el nombre.
