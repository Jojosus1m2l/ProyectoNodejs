# SISALUD Guárico · Registro de vacunación

Sistema de vacunación con Express, MySQL y una interfaz estática servida por el propio servidor. Incluye API JSON, modelos por tabla y control de acceso por roles (`centro`, `revisor`, `master`).

## Instalar dependencias

```bash
npm install
```

## Base de datos

Crea la base `db_vacunas` e importa `db_vacunas.sql`. La conexión se configura con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` (por defecto `db_vacunas`).

Para cargar catálogos y usuarios de prueba: `node scripts/seed_demo.js` (revisa el script para ver las credenciales demo).

## Ejecutar

```bash
npm start
```

- Interfaz: http://localhost:3000/vacunacion (la raíz `/` redirige aquí)
- API: http://localhost:3000/api

## Pruebas

```bash
npm test
```

Usa `db_vacunas_test` y se ejecuta con un solo hilo para no interferir entre suites.
