const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prepareDatabase, close } = require("./helpers/db");
const { startServer, createClient } = require("./helpers/http");
const { seedDemo } = require("../scripts/seed_demo");

let server;
let base;

before(async () => {
  await prepareDatabase();
  await seedDemo();
  const app = require("../app");
  const started = await startServer(app);
  server = started.server;
  base = started.base;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await close();
});

test("el catalogo trae los 11 centros y las 5 vacunas del prototipo", async () => {
  const client = createClient(base);
  const response = await client.request("GET", "/api/catalogos");

  assert.equal(response.status, 200);
  assert.equal(response.body.centros.length, 11);

  const sanJuan = response.body.centros.find((c) => c.id === "hospital-san-juan");
  assert.equal(sanJuan.nombre, "Hospital Central de San Juan de los Morros");
  assert.equal(sanJuan.estado, "Guárico");
  assert.equal(sanJuan.municipio, "Juan Germán Roscio");
  assert.equal(sanJuan.parroquia, "San Juan de los Morros");

  assert.deepEqual(Object.keys(response.body.vacunas).sort(), ["bcg", "hepb", "penta", "polio", "srp"]);
  assert.equal(response.body.vacunas.penta.nombre, "Pentavalente (DPT + Hib + HB)");
  assert.equal(response.body.vacunas.penta.esquema, "2, 4 y 6 meses");
  assert.deepEqual(response.body.vacunas.penta.dosis, ["1.ª dosis", "2.ª dosis", "3.ª dosis", "Refuerzo"]);
  assert.deepEqual(response.body.vacunas.bcg.dosis, ["Dosis única"]);

  assert.equal(response.body.roles.centro, "Centro de salud");
  assert.equal(response.body.roles.revisor, "Revisión");
  assert.equal(response.body.roles.master, "Coordinación");
});
