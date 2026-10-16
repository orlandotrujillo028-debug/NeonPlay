# Seguimiento de O01: piloto de interacción

Materiales para aplicar el protocolo del Anexo F con participantes nuevos y cerrar o confirmar O01 con datos medidos. La primera medición (P01) fue un autorreporte de una persona que conocía el proyecto: 3 de 5 tareas sin ayuda (60 %). Este piloto la reemplaza con observación directa.

## Qué se necesita

- Cinco personas o más que no conozcan NeonPlay ni el proyecto. Se identifican como P02, P03, … sin nombres ni datos personales.
- La tienda de la versión que se evalúa abierta en `http://localhost:5173` con los datos de demostración (`npm.cmd run setup` y `npm.cmd run dev`).
- Un observador con cronómetro que no intervenga salvo que el participante pida ayuda.
- [consentimiento.md](consentimiento.md), [tareas.md](tareas.md) y [sus.md](sus.md) impresos o en pantalla.

## Procedimiento

1. Leer el consentimiento y obtener la aceptación verbal o escrita. Si la persona no acepta, no participa.
2. Entregar la hoja de tareas. No explicar dónde están las opciones.
3. Para cada tarea, anotar en `registro.csv`: si la intentó, si la completó sin ayuda, si la completó con ayuda, el tiempo en segundos, el número de errores o retrocesos y en qué pantalla pidió ayuda.
4. Al terminar, el participante responde el cuestionario SUS; anotar sus respuestas (1 a 5) en `sus.csv`.
5. Calcular los resultados:

```powershell
node quality/piloto-O01/calcular.mjs
```

El script escribe `resultado.json` y `resultado.md` en esta carpeta.

## Medidas (ISO 9241-11)

| Dimensión | Medida | Criterio |
|---|---|---|
| Eficacia | Tareas completadas sin ayuda / tareas intentadas × 100 | ≥ 80 % (criterio de la Tabla 10) |
| Eficacia | Tareas completadas con ayuda (se informa aparte) | Descriptiva |
| Eficiencia | Tiempo medio por tarea y errores por tarea | Línea base, sin umbral |
| Satisfacción | Puntaje SUS medio (0 a 100) | ≥ 68 (promedio de referencia de SUS) |

## Cierre de O01

O01 se cierra cuando el piloto con participantes nuevos alcanza al menos 80 % de tareas sin ayuda y las causas de cada ayuda quedan registradas. Si no se alcanza, la observación se convierte en un defecto de interacción con su causa, se corrige la interfaz y se repite el piloto; después se ejecutan CP05, CP15 y CP17 para comprobar que la corrección no rompió sesión, compra ni administración.
