# Integración SISALUD + MySQL — Plan de implementación

> **Para ejecutar:** usar `superpowers:subagent-driven-development` o `superpowers:executing-plans`, tarea por tarea. Cada tarea termina con una prueba que se puede correr sola.

**Goal:** conectar el prototipo SISALUD (hoy localStorage) con `db_vacunas` mediante una API JSON, sin rehacer las vistas.

**Architecture:** Express sirve el prototipo estático en `/vacunacion` y una API en `/api`. Los controladores usan los modelos existentes; la sesión vive en `express-session`. MariaDB es la única fuente de verdad. El JS del prototipo cambia almacenamiento local por `fetch`.

**Tech Stack:** Node 26, Express 4.16, EJS, `mysql` 2.17 (callbacks), MariaDB 11.8, `express-session`, `node:test`, `supertest`.

**Spec:** `docs/superpowers/specs/2026-11-16-vacunas-integracion-design.md`

## Restricciones globales

- Base de pruebas: `db_vacunas_test`; nunca tocar `db_vacunas`.
- MariaDB en `localhost:3306`, usuario `root` sin clave (contenedor de prueba).
- SQL parametrizado; nada de concatenar valores.
- Respuestas de error JSON: `{ error, codigo }` con 400/401/403/404/409/500.
- Fechas de entrada `YYYY-MM-DD`; timestamps de salida ISO.
- No modificar rutas, vistas ni modelos de tienda.
- Un modelo por tabla; los modelos nuevos siguen el patrón Promise + callback.
- Roles: `centro`, `revisor`, `master`. Estados: `pendiente`, `aprobado`, `rechazado`, `suspendido`.

## Review Focus

- Persona ya registrada por cédula que recibe otra dosis: debe reutilizarse, no duplicarse.
- Usuario `centro` intentando registrar o leer otro centro: debe quedar limitado al suyo.
- Dosis repetida (misma persona, vacuna y etiqueta): 409, no fila duplicada.
- Fechas inválidas (aplicación antes del nacimiento o futura): 400.
- Sesión ausente/expirada: 401 y el frontend vuelve al acceso.
- Escalada de rol: `centro` no valida ni administra usuarios.
- Representante con cédula repetida: se reutiliza; sin cédula, se busca por nombre normalizado.
- Catálogos `datos.js` vs semilla SQL: mismos códigos y etiquetas.

---

### Task 1: Esquema alineado, semilla y modelos

**Files:**
- Modify: `db_vacunas.sql`, `conexion_vacunas.js`
- Modify: `models/usuarios.js`, `models/centros.js`, `models/vacunas.js`, `models/personas.js`, `models/dosis.js`
- Create: `models/vacunas_dosis.js`
- Create: `test/helpers/db.js`, `test/schema.test.js`
- Modify: `package.json` (`"test": "DB_NAME=db_vacunas_test node --test"`)

**Interfaces:**
- `usuarios.insertar(correo, nombre, passwordHash, idCentro, rol, estado)` → id
- `usuarios.actualizarEstado(id, estado, idAprobador)` → void
- `centros.insertar(codigo, nombre, idUbicacion)`; `centros.obtenerPorCodigo(codigo)` → fila
- `vacunas.insertar(codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas)`; `vacunas.obtenerPorCodigo(codigo)`
- `vacunas_dosis.insertar(idVacuna, etiqueta, orden)`; `vacunas_dosis.obtenerPorVacuna(idVacuna)`
- `personas.insertar(..., sexo, ..., idRepresentante)`; `personas.obtenerPorCedula(cedula)`
- `dosis.insertar(idPersona, idVacuna, idCentro, idUsuario, numeroDosis, etiquetaDosis, lote, fecha, observaciones)`; `dosis.validar(id, idValidador)`; `dosis.obtenerConFiltros({ idCentro, validado, buscar })`

**Schema changes:**
- `usuarios`: `rol ENUM('centro','revisor','master') DEFAULT 'centro'`; `estado ENUM('pendiente','aprobado','rechazado','suspendido') DEFAULT 'pendiente'`; `id_aprobador INT NULL` (FK a usuarios, SET NULL); `fecha_aprobacion DATETIME NULL`; eliminar `activo`.
- `centros`: `codigo VARCHAR(50) NOT NULL UNIQUE`.
- `vacunas`: `codigo VARCHAR(20) NOT NULL UNIQUE`, `esquema VARCHAR(255)`.
- Nueva `vacunas_dosis`: `id`, `id_vacuna`, `etiqueta VARCHAR(50)`, `orden TINYINT UNSIGNED`, `UNIQUE(id_vacuna, etiqueta)`, FK CASCADE.
- `personas`: `sexo ENUM('Femenino','Masculino','Otro') NULL`.
- `dosis`: `etiqueta_dosis VARCHAR(50) NOT NULL`, `observaciones TEXT`, `validado TINYINT(1) NOT NULL DEFAULT 0`, `id_validador INT NULL` (FK usuarios SET NULL), `fecha_validacion DATETIME NULL`; `UNIQUE(id_persona, id_vacuna, etiqueta_dosis)`.
- Semilla idempotente: 11 centros con códigos de `datos.js`, sus ubicaciones, 5 vacunas (`bcg`, `hepb`, `penta`, `polio`, `srp`) y 16 etiquetas de dosis.
- `conexion_vacunas.js`: `database: process.env.DB_NAME || "db_vacunas"`.

- [ ] **Step 1: Crear `test/helpers/db.js` y `test/schema.test.js`**

`test/helpers/db.js` exporta `prepareDatabase()` (lee `db_vacunas.sql`, reemplaza `db_vacunas` por `db_vacunas_test`, ejecuta con `multipleStatements: true`), `truncateAll()`, `query()` y `close()`.

`test/schema.test.js` afirma: 9 tablas; columnas nuevas en `usuarios`, `centros`, `vacunas`, `personas`, `dosis`; `vacunas_dosis` existe; 11 centros, 5 vacunas, 16 etiquetas; `UNIQUE` de dosis usa `etiqueta_dosis`.

- [ ] **Step 2: Correr y ver fallar**

`DB_NAME=db_vacunas_test node --test test/schema.test.js` → falla por columnas/tabla faltantes.

- [ ] **Step 3: Implementar esquema, semilla y modelos**

Actualizar `db_vacunas.sql` y los modelos con las firmas de arriba. Mantener el patrón Promise/callback.

- [ ] **Step 4: Correr y ver pasar**

`DB_NAME=db_vacunas_test node --test test/schema.test.js` → PASS.

- [ ] **Step 5: Commit (si el proyecto ya es repo git)**

---

### Task 2: Contraseñas y middleware de sesión

**Files:**
- Create: `utils/password.js`, `middleware/auth.js`, `test/password.test.js`

**Interfaces:**
- `hashPassword(password) → Promise<string>` formato `scrypt$16384$8$1$<saltHex>$<hashHex>`
- `verifyPassword(password, stored) → Promise<boolean>`
- `requireAuth(req,res,next)`, `requireRole(...roles)`, `sessionUser(req)`

- [ ] **Step 1: Escribir `test/password.test.js`**

Afirma: el hash empieza con `scrypt$`; `verifyPassword` true con la clave correcta y false con otra; hash distinto para la misma clave (salt); hash malformado devuelve false sin lanzar.

- [ ] **Step 2: Ejecutar y ver fallar** (`node --test test/password.test.js`)

- [ ] **Step 3: Implementar `utils/password.js` y `middleware/auth.js`**

`crypto.scrypt` con N=16384, r=8, p=1, keylen=64, salt de 16 bytes; comparación con `timingSafeEqual`. Middleware responde 401/403 JSON.

- [ ] **Step 4: Ejecutar y ver pasar**

- [ ] **Step 5: Commit**

---

### Task 3: API de autenticación y usuarios demo

**Files:**
- Create: `controllers/api/auth.js`, `scripts/seed_demo.js`, `test/auth.test.js`
- Modify: `app.js` (montar `/api/auth`, sesión y manejador de errores JSON)

**Interfaces:**
- `POST /api/auth/solicitud` body `{nombre, correo, password, rol, centroId}` → 201 usuario público, estado `pendiente`
- `POST /api/auth/login` body `{correo, password}` → 200 usuario + cookie de sesión
- `POST /api/auth/logout` → 204
- `GET /api/auth/me` → 200 usuario o 401
- Mapper público: `{id, nombre, correo, rol, centroId (código), estado, creadoEn, aprobadoEn, aprobadoPor}`

- [ ] **Step 1: Escribir `test/auth.test.js`**

Con `supertest.agent(app)`: login master demo OK; clave mala 401; usuario pendiente 403; `me` devuelve el usuario; logout luego `me` 401; solicitud duplicada 409; rol `master` no solicitable 400; rol `centro` sin centro 400.

- [ ] **Step 2: Ejecutar y ver fallar**

- [ ] **Step 3: Implementar controlador, semilla demo y montaje**

`scripts/seed_demo.js` crea idempotentemente: `master@sisalud.gob.ve` / `Master2026` (master), `centro@sisalud.gob.ve` / `Centro2026` (centro, `hospital-san-juan`), `revisor@sisalud.gob.ve` / `Revisor2026` (revisor), todos `aprobado` y con hash scrypt.

- [ ] **Step 4: Ejecutar y ver pasar**

- [ ] **Step 5: Commit**

---

### Task 4: API de catálogos y registros

**Files:**
- Create: `controllers/api/catalogos.js`, `controllers/api/registros.js`, `test/catalogos.test.js`, `test/registros.test.js`
- Modify: `models/dosis.js`, `models/personas.js`, `app.js`

**Interfaces:**
- `GET /api/catalogos` → `{centros:[{id:código,nombre,estado,municipio,parroquia}], vacunas:{bcg:{nombre,esquema,dosis:[]},...}, roles:{...}}`
- `POST /api/registros` body:
  `{centroId, primerNombre, segundoNombre, primerApellido, segundoApellido, cedula, fechaNacimiento, sexo, telefono, correo, representante:{nombre,apellido,cedula,telefono}|null, vacuna, dosis, fechaAplicacion, lote, observaciones}`
  → 201 registro mapeado al formato del prototipo (`nombres`, `vacunaNombre`, `dosis`, `centro`, `estado`, `municipio`, `parroquia`, `validado`, etc.)
- `GET /api/registros?validado=0|1&buscar=` → array; `centro` solo ve su centro
- `GET /api/registros/:id` → registro o 404
- `PATCH /api/registros/:id/validar` → registro validado; solo revisor/master; 409 si ya estaba validado

**Reglas:**
- Reutilizar persona por cédula; si no existe, crearla.
- Representante: buscar por cédula; si no, por nombre+apellido normalizados; si no, crear persona con `sexo NULL`.
- Vacuna y etiqueta deben existir en `vacunas`/`vacunas_dosis`; `numero_dosis` = `orden`.
- Usuario `centro` fuerza su propio `id_centro`; no puede leer otro.
- Validar nombre1/apellido1/cédula/sexo/vacuna/dosis/fecha/lote; fechaAplicacion ≥ fechaNacimiento y ≤ hoy.
- Dosis duplicada → 409.

- [ ] **Step 1: Escribir tests**

`test/catalogos.test.js`: 11 centros, 5 vacunas, etiquetas correctas.
`test/registros.test.js`: crear registro; aparece en listado; duplicado 409; vacuna/etiqueta inválida 400; fecha inválida 400; centro A no ve registros de B; centro no puede validar (403); revisor valida (200) y segundo intento 409; persona existente recibe segunda dosis sin duplicarse.

- [ ] **Step 2: Ejecutar y ver fallar**

- [ ] **Step 3: Implementar modelos, controladores y montaje**

- [ ] **Step 4: Ejecutar y ver pasar**

- [ ] **Step 5: Commit**

---

### Task 5: API de usuarios (solo master)

**Files:**
- Create: `controllers/api/usuarios.js`, `test/usuarios.test.js`
- Modify: `models/usuarios.js`, `app.js`

**Interfaces:**
- `GET /api/usuarios?estado=` → lista pública
- `PATCH /api/usuarios/:id/aprobar` body `{rol, centroId}` → usuario aprobado
- `PATCH /api/usuarios/:id/rechazar` → rechazado
- `PATCH /api/usuarios/:id/suspender` → suspendido
- `PATCH /api/usuarios/:id/reactivar` → aprobado

- [ ] **Step 1: Escribir `test/usuarios.test.js`**

Master lista y aprueba una solicitud; revisor/centro reciben 403; aprobar con rol `centro` sin centro 400; no puede modificarse a sí mismo 409.

- [ ] **Step 2: Ejecutar y ver fallar**

- [ ] **Step 3: Implementar controlador y montaje**

- [ ] **Step 4: Ejecutar y ver pasar**

- [ ] **Step 5: Commit**

---

### Task 6: Copiar y servir el prototipo

**Files:**
- Create: `public/vacunacion/` (copia de `/home/yisus/registro-vacunacion/public/`)
- Modify: `app.js` (static `/vacunacion`, redirección `/vacunacion` → `/vacunacion/index.html`)
- Create: `test/static.test.js`

- [ ] **Step 1: Escribir `test/static.test.js`**

GET `/vacunacion/index.html`, `/vacunacion/app.html`, un CSS y un JS → 200 y content-type correcto.

- [ ] **Step 2: Ejecutar y ver fallar**

- [ ] **Step 3: Copiar archivos y montar static**

No modificar HTML/CSS todavía.

- [ ] **Step 4: Ejecutar y ver pasar**

- [ ] **Step 5: Commit**

---

### Task 7: Cliente `auth.js` contra la API

**Files:**
- Modify: `public/vacunacion/js/auth.js`

**Interfaces (misma API pública que usa `app.js`):**
- `init() → Promise<usuario|null>` (GET `/api/auth/me`)
- `login(correo, clave, recordar) → Promise<usuario>`
- `registrarSolicitud({nombre, correo, clave, rol, centroId}) → Promise<usuario>`
- `logout() → Promise<void>`
- `requireSession()`, `getSession()`, `getUsuarios()`, `cargarUsuarios()`
- `aprobarUsuario(id,{rol,centroId})`, `rechazarUsuario(id)`, `cambiarEstadoUsuario(id,estado)`
- `contarPendientes()`, `etiquetaRol(rol)`, `centroPorId(codigo)`
- Cache de sesión y usuarios en localStorage solo para pintar; la cookie de sesión manda.

- [ ] **Step 1: Reescribir `auth.js`**

Usar `fetch('/api/...', {credentials:'same-origin'})`. En 401 limpiar cache y redirigir. Mantener los nombres y eventos (`sisalud:usuarios`, `sisalud:sesion`) que usa `app.js`.

- [ ] **Step 2: Verificar sintaxis** (`node --check public/vacunacion/js/auth.js`)

- [ ] **Step 3: Prueba manual con servidor**

Login master/centro/revisor; recarga mantiene sesión; logout vuelve a `index.html`.

- [ ] **Step 4: Commit**

---

### Task 8: Adaptar `app.js` y el formulario

**Files:**
- Modify: `public/vacunacion/js/app.js`, `public/vacunacion/app.html`

**Cambios:**
- `cargarRegistros()` → `async`, GET `/api/registros`; `iniciar()` lo espera.
- `confirmarRegistro()` → `async`, POST `/api/registros`; usa el registro devuelto.
- `validarRegistro()` → `async`, PATCH `/api/registros/:id/validar`.
- Acciones de usuarios → `async`, esperan `S.aprobarUsuario`/`rechazar`/`cambiarEstado`.
- Eliminar siembra demo/localStorage de registros; mantener cache solo para sesión/usuarios.
- `app.html`: reemplazar el input único `representante` por `representanteNombre`, `representanteApellido` y `representanteCedula` (opcional); ajustar el submit para enviar `representante` como objeto o `null` si están vacíos.
- Mantener el resto de la UI y los nombres de campos existentes.

- [ ] **Step 1: Aplicar cambios de `app.html`**

- [ ] **Step 2: Adaptar `app.js` a `fetch`**

- [ ] **Step 3: Verificar sintaxis** (`node --check`)

- [ ] **Step 4: Prueba manual del flujo completo**

Centro registra → revisor valida → master ve usuarios; recargar conserva datos; borrar cookies redirige al acceso.

- [ ] **Step 5: Commit**

---

### Task 9: Smoke test de extremo a extremo

**Files:**
- Create: `test/e2e.test.js`

- [ ] **Step 1: Escribir el test**

Con `supertest`: login master; crear registro; login revisor; validar; verificar `validado=1`; login centro; intentar validar → 403; GET `/vacunacion/app.html` → 200.

- [ ] **Step 2: Ejecutar toda la suite**

`DB_NAME=db_vacunas_test npm test` → todos los tests PASS.

- [ ] **Step 3: Verificación final**

Arrancar MariaDB de prueba y el servidor; comprobar manualmente login, registro, listado, validación y logout. Guardar evidencia en la bitácora.

- [ ] **Step 4: Commit**

---

## Notas de ejecución

- MariaDB de prueba: `docker run -d --rm --name vacunas-test -e MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1 -p 3306:3306 mariadb:11`.
- Si el puerto 3306 está ocupado, usar otro y exportar `DB_PORT`.
- `conexion_vacunas.js` debe leer `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- La suite usa `db_vacunas_test`; el helper reimporta el esquema en cada archivo de test para aislar.
- Los tests de frontend se limitan a sintaxis y smoke HTTP; la lógica de UI se valida manualmente en el paso indicado.
