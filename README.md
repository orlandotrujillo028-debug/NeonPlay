# NeonPlay

Ecommerce de videojuegos con React, TypeScript, Vite y Tailwind CSS, una API Express y PostgreSQL real mediante Prisma. Incluye tienda, autenticación, carrito, compras de demostración, historial y administración con CRUD.

## Abrir y ejecutar en Visual Studio Code

Abre **NeonPlay.code-workspace** con Visual Studio Code. Abre una terminal integrada en la carpeta raíz del proyecto.

En PowerShell usa `npm.cmd`, como en los ejemplos de esta guía. Así evitas el bloqueo de `npm.ps1` sin cambiar la política de ejecución de scripts. En Linux y macOS utiliza `npm` en lugar de `npm.cmd`.

La primera vez en un equipo nuevo sigue **Instalación en otro equipo** (más abajo): instala dependencias, crea `server/.env` con contraseñas aleatorias, prepara PostgreSQL y carga ocho videojuegos de demostración.

Una vez configurado, para trabajar:

```powershell
npm.cmd run db:local
npm.cmd run dev
```

`db:local` inicia PostgreSQL en segundo plano y termina. Que vuelva a aparecer `PS ...>` **no significa que la base se haya detenido**. Para comprobarlo ejecuta `npm.cmd run db:status`; debe indicar que sigue encendido y acepta conexiones. Después ejecuta `npm.cmd run dev` y mantén esa terminal abierta mientras usas la tienda. Para detener PostgreSQL utiliza `npm.cmd run db:stop`.

El backend genera automáticamente el cliente de Prisma antes de iniciar, compilar o ejecutar sus pruebas. Si reinstalas dependencias con `npm.cmd ci` mientras la tienda está abierta, detén `dev` con **Ctrl+C** y vuelve a iniciarlo. También puedes generar el cliente manualmente con `npm.cmd run db:generate`. La primera generación puede necesitar Internet para descargar los motores oficiales de Prisma. Generar el cliente no modifica los datos de PostgreSQL.

Abre [http://localhost:5173](http://localhost:5173). La API utiliza el puerto 4000 y el PostgreSQL independiente del proyecto el puerto 55432. En desarrollo también funciona la dirección `http://127.0.0.1:5173` que imprime Vite.

En VS Code también puedes usar **Terminal → Ejecutar tarea → NeonPlay: iniciar**; esta tarea inicia primero PostgreSQL. Las tareas de configuración, compilación y pruebas están en `.vscode/tasks.json` y utilizan `npm.cmd` en Windows.

## Instalación en otro equipo

Requisitos: Node.js 22.12 o superior, npm y PostgreSQL 15–18 instalado. En Windows se detecta la carpeta `C:/Program Files/PostgreSQL/<versión>/bin`. En otros sistemas los ejecutables deben estar en PATH; también puedes definir `POSTGRES_BIN` con la carpeta de binarios.

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run dev
```

`setup` genera `server/.env` solo si no existe, crea contraseñas aleatorias, inicializa un clúster PostgreSQL **propio del proyecto** en `server/.local-data`, crea la base `neonplay`, genera Prisma, aplica migraciones y carga datos. No modifica los servicios de PostgreSQL ni las bases de otros proyectos. Guarda el log fuera de la carpeta de datos para evitar bloqueos de archivos en Windows.

Si tu instalación de npm solicita aprobar scripts de instalación, revisa y aprueba los de `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild` y `@tailwindcss/oxide`. Son necesarios para sus motores y herramientas de compilación.

Para utilizar una base existente en vez del clúster del proyecto:

1. Crea una base exclusiva para NeonPlay y un usuario con permisos de migración.
2. Copia `server/.env.example` a `server/.env` y completa `DATABASE_URL`, `JWT_SECRET` y las cuentas del seed. Usa un secreto aleatorio de al menos 32 caracteres y contraseñas de al menos 8 caracteres.
3. Ejecuta estos comandos desde la raíz:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

`DATABASE_URL` acepta conexiones PostgreSQL estándar. `db:local` administra exclusivamente la base local `neonplay`; para una base externa usa los comandos de migración y seed directamente.

## Cuentas y acceso al panel

Las cuentas iniciales son:

| Rol           | Correo                  | Contraseña                                         |
| ------------- | ----------------------- | -------------------------------------------------- |
| Administrador | `admin@neonplay.local`  | Valor de `SEED_ADMIN_PASSWORD` en `server/.env`    |
| Cliente       | `player@neonplay.local` | Valor de `SEED_CUSTOMER_PASSWORD` en `server/.env` |

Entra desde **Ingresar**. La cuenta administrativa muestra el enlace **Administración** en su perfil y en el pie de página. También puedes abrir `/admin`.

Las contraseñas de demostración son distintas en cada instalación. No están escritas en el código ni en `.env.example`. El registro público siempre crea clientes, incluso si una solicitud intenta enviar un rol administrativo. El seed conserva los registros existentes, sus precios, su stock y sus credenciales al ejecutarse nuevamente.

## Funcionalidades

- Inicio con arte original, destacados, novedades, ofertas y acceso por género.
- Catálogo con búsqueda, categorías, plataformas, precios y paginación.
- Detalle con plataforma seleccionable, disponibilidad y fecha de lanzamiento.
- Registro, inicio y cierre de sesión, perfil editable y roles.
- Carrito persistido en el navegador, cantidades y actualización de precios y disponibilidad.
- Checkout de demostración sin cobro ni entrega de claves digitales.
- Historial del cliente con precios conservados al momento de comprar.
- Dashboard calculado desde PostgreSQL: juegos, usuarios activos, pedidos, ventas completadas y stock bajo.
- CRUD de juegos, categorías y plataformas; creación, edición y desactivación de usuarios.
- Consulta y gestión de estado de pedidos, con restitución de stock al cancelar.
- Estados de carga, errores, listas vacías, confirmaciones y notificaciones.
- Diseño adaptable, navegación por teclado, foco visible, formularios etiquetados y diálogos nativos.

Los videojuegos, descripciones y valoraciones del seed son ficticios. Los precios están en USD. El catálogo no representa licencias o productos reales a la venta.

## Cómo funciona el CRUD

Desde el panel, **Nuevo** envía una solicitud `POST` y crea un registro. Las tablas consultan `GET`. El botón del lápiz abre un formulario y guarda con `PUT`. El botón de eliminar solicita confirmación y envía `DELETE`.

- Un juego sin pedidos puede eliminarse; sus relaciones con plataformas se eliminan en cascada.
- Un juego con pedidos se **archiva**, desaparece del catálogo y conserva su historial. El botón de restaurar lo devuelve a la tienda.
- Una categoría o plataforma asociada no se elimina; la API responde con un mensaje de conflicto.
- Los usuarios se **desactivan** para conservar pedidos; sus sesiones se revocan. La edición permite reactivarlos.
- No puedes desactivar ni quitar el rol a tu propia cuenta administrativa. Se protege la existencia de al menos un administrador activo.
- Los pedidos se conservan: un pedido pendiente puede completarse o cancelarse; un pedido completado puede cancelarse; un pedido cancelado no se reactiva.

Las rutas de administración comprueban tanto la sesión como el rol en el servidor. Ocultar botones en el frontend es solo una mejora de experiencia.

## Compras, inventario y sesiones

El servidor recalcula el importe con `Decimal` usando los precios de PostgreSQL, valida la plataforma y compara los precios que el cliente vio. Si cambió un precio, solicita actualizar el carrito.

La compra utiliza una transacción serializable con reintentos ante conflictos. Agrupa cantidades del mismo juego entre plataformas y descuenta stock mediante una actualización condicional. Si una línea falla, se revierte toda la transacción. Una clave de idempotencia única por cliente evita duplicar pedidos al repetir una solicitud. La API comprueba que la clave corresponda a los mismos juegos, plataformas, cantidades y precios; si el carrito es diferente, responde con HTTP 409. Cancelar devuelve stock una sola vez.

El navegador conserva el intento pendiente en `sessionStorage` hasta recibir la confirmación. Recargar la página, cambiar de pantalla o actualizar nombres, imágenes o stock no genera otra solicitud de compra si el contenido sigue siendo el mismo. Cambiar de cuenta o modificar juegos, plataformas, cantidades o precios inicia otro intento. Si el navegador bloquea el almacenamiento, los reintentos conservan la clave en memoria mientras la página siga abierta; en ese caso una recarga pierde ese respaldo. Las consultas de precios se cancelan al abandonar el carrito y combinan sus resultados con el estado actual para respetar artículos añadidos, eliminados o modificados durante la consulta.

Cada línea del pedido guarda nombre, imagen, plataforma y precio de compra. Las modificaciones del catálogo no alteran ese historial. PostgreSQL también tiene restricciones para impedir stock negativo, importes inválidos y cantidades fuera del rango permitido.

Las contraseñas se almacenan como hashes bcrypt. La sesión usa JWT en una cookie `HttpOnly`, `SameSite=Strict`, con expiración y un registro revocable en PostgreSQL. El rol y el estado de la cuenta se consultan al autorizar cada solicitud. La API valida JSON con Zod, restringe el origen de las mutaciones y aplica límites de solicitudes.

## Comandos y estructura

| Comando                   | Función                                                  |
| ------------------------- | -------------------------------------------------------- |
| `npm.cmd run setup`       | Preparar configuración, clúster local, migración y seed  |
| `npm.cmd run db:local`    | Iniciar el PostgreSQL del proyecto                       |
| `npm.cmd run db:status`   | Comprobar que PostgreSQL siga activo y acepte conexiones |
| `npm.cmd run db:stop`     | Detener solo el PostgreSQL del proyecto                  |
| `npm.cmd run dev`         | Iniciar API y frontend                                   |
| `npm.cmd run db:generate` | Generar el cliente Prisma                                |
| `npm.cmd run db:migrate`  | Aplicar migraciones versionadas                          |
| `npm.cmd run db:seed`     | Cargar datos sin sobrescribir registros existentes       |
| `npm.cmd run build`       | Verificar TypeScript y compilar ambas aplicaciones       |
| `npm.cmd run test`        | Ejecutar las pruebas de API y carrito                    |
| `npm.cmd start`           | Servir la API y el frontend compilado en el puerto 4000  |

```text
NeonPlay/
├── client/
│   ├── public/assets/        Portadas originales y fallback
│   └── src/
│       ├── pages/            Tienda, cuenta, carrito y administración
│       ├── store.tsx         Sesión, carrito y notificaciones
│       ├── lib.ts            API, moneda, fechas y carrito
│       └── styles.css        Tailwind y componentes visuales
├── server/
│   ├── prisma/
│   │   ├── schema.prisma     Modelo relacional
│   │   ├── migrations/       SQL versionado y restricciones
│   │   └── seed.ts           Datos de demostración
│   ├── src/routes/           Autenticación, catálogo, pedidos y CRUD
│   └── tests/                Pruebas sobre PostgreSQL real
├── scripts/                  Configuración y PostgreSQL local
├── docs/                     Arquitectura, arte y capturas verificadas
└── NeonPlay.code-workspace   Espacio de trabajo de VS Code
```

## Verificación

[![CI](https://github.com/orlandotrujillo028-debug/NeonPlay/actions/workflows/ci.yml/badge.svg)](https://github.com/orlandotrujillo028-debug/NeonPlay/actions/workflows/ci.yml)

GitHub Actions compila el proyecto y ejecuta las pruebas en cada cambio (`.github/workflows/ci.yml`). Se verifican la compilación de frontend y backend y **52 pruebas automáticas**: 26 de API sobre PostgreSQL real y 26 de carrito, reintentos y fechas. Las pruebas de API crean un esquema aleatorio `neonplay_test_<identificador>` y eliminan únicamente ese esquema al terminar. Necesitan la base iniciada y permisos para crear esquemas. No alteran el catálogo de `public`. Las correcciones y regresiones añadidas el 15/10/2026 están documentadas en `docs/CORRECCIONES_2026-10-15.md`; las evidencias de la evaluación académica anterior se conservan con sus resultados originales.

En navegador se verificaron login de cliente y administrador, añadir al carrito, cantidades, checkout, historial, dashboard, edición administrativa, filtros, orden por precio, menú móvil, carga de las imágenes y ausencia de desbordamiento horizontal en las pantallas revisadas. Se revisaron los tamaños 1440×1000 y 390×844. Las capturas están en `docs/`.

## Ejecución compilada y ampliaciones

Después de `npm.cmd run build`, `npm.cmd start` sirve la tienda y la API desde [http://localhost:4000](http://localhost:4000). Para ese modo configura `CLIENT_URL=http://localhost:4000` antes de iniciar. En desarrollo se mantiene `NODE_ENV=development` para las cookies HTTP locales. Un despliegue con `NODE_ENV=production` requiere HTTPS y el `CLIENT_URL` del dominio real; las cookies usan `Secure` y el secreto y la base deben configurarse en el entorno del servidor.

Esta entrega está preparada para desarrollo local en VS Code. Pasarela de pago, entrega de claves, recuperación de contraseñas por correo y alojamiento público son ampliaciones futuras. El formulario de productos admite imágenes locales o HTTPS; no incluye subida de archivos.

Referencias oficiales de implementación: [Vite](https://vite.dev/guide/), [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite), [transacciones de Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions).

Consulta `docs/ARQUITECTURA.md` para el modelo de datos y las rutas, y `docs/ARTE.md` para las imágenes y sus prompts.

## Evaluación académica de calidad

Trabajo final de Calidad de Software (Desarrollo de Software, nivel 4, ITQ). Integrantes: Kevin Adrián Quiñonez Rocha, Orlando Eloy Trujillo y Francisco Almeida. Docente: Ing. Sebastián Landázuri G.

- **Baseline:** tag `baseline-calidad-v1`, commit `afac785407c041abc13f9b8651e70293aae488d4` (10/10/2026).
- **Versión actual:** rama `main`. Incluye la corrección de D01 (`f6c1a4c`), la de D02–D04 (`838aefb`), la integración continua y la reevaluación de ambas versiones.
- **Comparación antes/después:** `quality/comparacion/comparacion.md`. La genera el flujo **Comparación de calidad** (`.github/workflows/calidad.yml`), que mide la baseline y la versión actual en la misma máquina con los mismos scripts.
- **Hallazgos:** D01–D04 cerrados y O01–O04 abiertos, registrados como Issues #2 a #9.
- **Informe:** `quality/deliverables/final/NeonPlay_Trabajo_Final_Calidad_Software.docx` (16/10/2026).

Consulta `quality/README.md` para reproducir la evaluación con cuentas ficticias y un esquema separado.

Los comandos de desarrollo, compilación y pruebas comprueban si el cliente Prisma ya corresponde al esquema y a la versión instalada. Cuando está vigente, lo reutilizan: esto permite compilar con la API abierta en Windows sin reemplazar un motor bloqueado. Si cambias `schema.prisma`, detén la API antes de ejecutar `npm.cmd run db:generate`; después aplica las migraciones necesarias.
