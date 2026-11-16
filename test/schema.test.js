const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prepareDatabase, truncateAll, query, close } = require("./helpers/db");

before(async () => {
  await prepareDatabase();
});

after(async () => {
  await close();
});

async function columns(table) {
  const rows = await query(
    `select column_name from information_schema.columns
     where table_schema = database() and table_name = ?
     order by ordinal_position`,
    [table]
  );
  return rows.map((row) => row.column_name);
}

test("existen las 9 tablas del dominio", async () => {
  const rows = await query(
    `select table_name from information_schema.tables
     where table_schema = database() order by table_name`
  );
  assert.deepEqual(
    rows.map((row) => row.table_name),
    ["centros", "certificados", "dosis", "examenes", "personas", "ubicaciones", "usuarios", "vacunas", "vacunas_dosis"]
  );
});

test("usuarios usa roles y estados del prototipo", async () => {
  const cols = await columns("usuarios");
  for (const col of ["rol", "estado", "id_aprobador", "fecha_aprobacion"]) {
    assert.ok(cols.includes(col), `falta usuarios.${col}`);
  }
  assert.ok(!cols.includes("activo"), "usuarios.activo ya no debe existir");
});

test("catalogos tienen codigo y esquema", async () => {
  assert.ok((await columns("centros")).includes("codigo"));
  assert.ok((await columns("vacunas")).includes("codigo"));
  assert.ok((await columns("vacunas")).includes("esquema"));
});

test("personas y dosis tienen los campos de la interfaz", async () => {
  assert.ok((await columns("personas")).includes("sexo"));
  const cols = await columns("dosis");
  for (const col of ["etiqueta_dosis", "observaciones", "validado", "id_validador", "fecha_validacion"]) {
    assert.ok(cols.includes(col), `falta dosis.${col}`);
  }
});

test("la unicidad de dosis usa persona, vacuna y etiqueta", async () => {
  const rows = await query(
    `select column_name from information_schema.statistics
     where table_schema = database() and table_name = 'dosis'
       and index_name = 'uq_dosis'
     order by seq_in_index`
  );
  assert.deepEqual(rows.map((row) => row.column_name), ["id_persona", "id_vacuna", "etiqueta_dosis"]);
});

test("la semilla carga 11 centros, 5 vacunas y 16 etiquetas", async () => {
  const [centros] = await query("select count(*) as total from centros");
  const [vacunas] = await query("select count(*) as total from vacunas");
  const [etiquetas] = await query("select count(*) as total from vacunas_dosis");
  assert.equal(centros.total, 11);
  assert.equal(vacunas.total, 5);
  assert.equal(etiquetas.total, 16);
});
