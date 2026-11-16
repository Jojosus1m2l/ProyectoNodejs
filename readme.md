# MySQL y Node · SISALUD Guárico

Proyecto Express + MySQL con dos partes:

- **Tienda**: el CRUD original (`/productos`, `/clientes`, `/proveedor`).
- **Vacunación**: API JSON (`/api`) y la interfaz del prototipo servida en `/vacunacion`, conectada a MySQL con roles `centro`, `revisor` y `master`.

## Instalar dependencias

```bash
npm install
```

## Base de datos

- Tienda: crea la base `tienda` e importa `esquema.sql`.
- Vacunación: crea la base `db_vacunas` e importa `db_vacunas.sql`. La conexión se configura con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` (por defecto `db_vacunas`).
- Datos de catálogos y usuarios demo: `node scripts/seed_demo.js` (revisa el script para ver las credenciales de prueba).

## Ejecutar

```bash
npm start
```

- Tienda: http://localhost:3000/productos
- Interfaz de vacunación: http://localhost:3000/vacunacion
- API: http://localhost:3000/api

## Pruebas

```bash
npm test
```

Usa `db_vacunas_test` y se ejecuta con un solo hilo para no interferir entre suites.
