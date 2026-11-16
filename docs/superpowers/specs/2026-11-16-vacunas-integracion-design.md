# Integración SISALUD + MySQL — Diseño

## Intención

Conectar el prototipo estático `registro-vacunacion` (hoy con localStorage) con la base `db_vacunas` y los modelos Node ya creados en `Documentos/ProyectoNodejs`, sin reconstruir la interfaz.

## Objetivos

- Alinear el esquema con los campos y roles que la interfaz ya usa.
- Servir el prototipo desde Express en `/vacunacion`.
- Exponer una API JSON en `/api` para login, catálogos, registros, validación y usuarios.
- Mantener el CRUD de tienda existente sin cambios de comportamiento.
- Probar la API contra MariaDB real y dejar evidencia reproducible.

## No objetivos

- Producción: no se implementa almacén de sesiones distribuido, CSRF ni despliegue.
- No se agregan vistas nuevas ni se reescribe el HTML/CSS.
- No se implementan exámenes ni certificados en la interfaz (el esquema los conserva).
- No se hace CRUD de catálogos desde la UI; se cargan por semilla.

## Estado actual

- `Documentos/ProyectoNodejs`: Express 4 + EJS + `mysql` 2.17. Tiene modelos de vacunas y una conexión aparte `conexion_vacunas.js`.
- `/home/yisus/registro-vacunacion/public/`: prototipo estático con `index.html` (acceso), `app.html` (registro/validación/usuarios), `auth.js`, `app.js`, `datos.js` y CSS.
- El prototipo guarda usuarios, sesión y registros en localStorage.

## Decisiones

- **Frontend estático + API**: se copia el prototipo a `public/vacunacion` y se sirve con Express. El JS existente cambia sus funciones de almacenamiento por `fetch` same-origin.
- **Roles**: `centro`, `revisor`, `master`. Estados de usuario: `pendiente`, `aprobado`, `rechazado`, `suspendido`.
- **Registros**: una persona puede recibir varias dosis. Se guarda `etiqueta_dosis` (“1.ª dosis”, “Refuerzo”) y `numero_dosis` como orden.
- **Representante**: la API recibe `representante: { nombre, apellido, cedula, telefono }`; crea o reutiliza una fila de `personas` y la enlaza con `id_representante`. La UI cambia el campo libre por nombre/apellido/cédula.
- **Validación**: `dosis.validado`, `id_validador`, `fecha_validacion`. Solo revisor/master validan.
- **Contraseñas**: `crypto.scrypt` de Node, formato autodescriptivo en `password_hash`. No se agrega bcrypt.
- **Sesión**: `express-session` en memoria con cookie `httpOnly` y `sameSite=lax`. Suficiente para el proyecto; se documenta la limitación.
- **Catálogos**: se siembran 11 centros, sus ubicaciones, 5 vacunas y sus etiquetas de dosis desde `datos.js`.
- **Compatibilidad de la API**: las respuestas imitan las formas que ya usa el prototipo (`centroId` como código, `nombres`, `vacunaNombre`, `dosis`, `validadoPor`, etc.) para reducir cambios en `app.js`.

## Restricciones

- MariaDB 11.8 (probado); `mysql` 2.17 con callbacks.
- SQL siempre parametrizado.
- Fechas como `YYYY-MM-DD`; timestamps como ISO en las respuestas.
- Errores JSON `{ error, codigo }` con 400/401/403/404/409/500.
- No tocar las rutas ni los modelos de tienda.
- Tests contra `db_vacunas_test`; nunca contra `db_vacunas`.

## Riesgos y decisiones abiertas

- `datos.js` sigue siendo la fuente visual de catálogos; la semilla SQL debe mantenerse igual. Una fase futura puede cargar catálogos desde `/api/catalogos`.
- Sesión en memoria se pierde al reiniciar el servidor; aceptable para el alcance.
- El certificado no se usa en la UI actual; queda modelado para una fase posterior.
