# Correcciones de compra y carrito — 15/10/2026

## Problemas corregidos

1. **Confirmación de un pedido que correspondía a otro carrito.** La API devolvía el pedido anterior cuando se reutilizaba su clave de idempotencia, incluso si cambiaban juego, plataforma, cantidad o precio. También ocurría con solicitudes simultáneas. Ahora se comparan las líneas normalizadas con los precios históricos antes de devolver un pedido existente. Un carrito diferente obtiene HTTP 409 sin modificar el inventario. Reordenar las líneas o dividir una cantidad entre líneas equivalentes sigue permitiendo un reintento correcto.
2. **Identificador de compra perdido durante un reintento.** El componente generaba una clave nueva al montarse y cada vez que cambiaba el objeto del carrito. Si el servidor registraba una compra y se perdía su respuesta, una recarga o actualización podía enviar una segunda compra. Ahora el intento se guarda antes de enviar la solicitud, se conserva entre pantallas y recargas de la misma pestaña y solo se retira tras recibir una respuesta satisfactoria. El identificador depende de la cuenta y del contenido comprado; los cambios de presentación o stock no lo reemplazan. Si `sessionStorage` está bloqueado, existe un respaldo en memoria durante la vida del componente; no se garantiza conservarlo después de recargar en ese caso.
3. **Actualización de precios basada en un carrito antiguo.** La consulta aplicaba una copia capturada antes de esperar las respuestas. Ahora combina los resultados con el carrito vigente, conserva las cantidades recientes y no restaura artículos eliminados ni descarta juegos añadidos mientras se esperaba. Además actualiza el nombre de la plataforma. Las consultas pendientes se cancelan al abandonar la pantalla, y todas las operaciones del almacén comparten la misma referencia actual del carrito.

## Validación

- Se añadieron seis regresiones de API. Antes de corregir la implementación fallaron las cuatro variantes de reutilización incorrecta y el caso concurrente; el caso de líneas equivalentes ya era correcto.
- Se añadieron catorce pruebas de reintentos: recuperación del intento guardado, cambios del contenido, cambios de cuenta, orden y metadatos, limpieza después de confirmar, almacenamiento inválido y almacenamiento bloqueado.
- Se añadieron seis pruebas de conciliación del carrito: metadatos y plataforma, juegos añadidos, artículos eliminados, cantidades modificadas y productos o plataformas retirados.
- Resultado final: **52 pruebas correctas** — 26 de API y 26 de frontend. Compilación de TypeScript y Vite correcta.
- Las pruebas de API usan un esquema PostgreSQL temporal y separado. No requieren migraciones nuevas ni cambios en los datos habituales de la tienda.

Para reproducir desde la raíz de NeonPlay:

```powershell
npm.cmd run db:local
npm.cmd run test
npm.cmd run build
```

Las capturas y cifras del informe académico anterior documentan aquella versión y no se sobrescriben con esta corrección.
