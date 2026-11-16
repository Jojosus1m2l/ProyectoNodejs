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

test("login master, me y logout", async () => {
  const client = createClient(base);

  const login = await client.request("POST", "/api/auth/login", {
    correo: "master@sisalud.gob.ve",
    password: "Master2026"
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.rol, "master");
  assert.equal(login.body.estado, "aprobado");
  assert.equal(login.body.centroId, null);

  const me = await client.request("GET", "/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.correo, "master@sisalud.gob.ve");

  const logout = await client.request("POST", "/api/auth/logout");
  assert.equal(logout.status, 204);

  const meAgain = await client.request("GET", "/api/auth/me");
  assert.equal(meAgain.status, 401);
});

test("login con clave incorrecta devuelve 401", async () => {
  const client = createClient(base);
  const response = await client.request("POST", "/api/auth/login", {
    correo: "master@sisalud.gob.ve",
    password: "incorrecta"
  });
  assert.equal(response.status, 401);
});

test("solicitud queda pendiente y no puede iniciar sesion", async () => {
  const client = createClient(base);
  const correo = `pendiente${Date.now()}@test.com`;

  const solicitud = await client.request("POST", "/api/auth/solicitud", {
    nombre: "Solicitante Prueba",
    correo,
    password: "ClaveSegura123",
    rol: "centro",
    centroId: "hospital-san-juan"
  });
  assert.equal(solicitud.status, 201);
  assert.equal(solicitud.body.estado, "pendiente");
  assert.equal(solicitud.body.rol, "centro");
  assert.equal(solicitud.body.centroId, "hospital-san-juan");

  const login = await client.request("POST", "/api/auth/login", {
    correo,
    password: "ClaveSegura123"
  });
  assert.equal(login.status, 403);
});

test("solicitud duplicada devuelve 409", async () => {
  const client = createClient(base);
  const correo = `duplicado${Date.now()}@test.com`;
  const payload = {
    nombre: "Duplicado Prueba",
    correo,
    password: "ClaveSegura123",
    rol: "revisor"
  };

  assert.equal((await client.request("POST", "/api/auth/solicitud", payload)).status, 201);
  assert.equal((await client.request("POST", "/api/auth/solicitud", payload)).status, 409);
});

test("roles y centros invalidos devuelven 400", async () => {  const client = createClient(base);

  const master = await client.request("POST", "/api/auth/solicitud", {
    nombre: "Master Solicitado",
    correo: `master${Date.now()}@test.com`,
    password: "ClaveSegura123",
    rol: "master"
  });
  assert.equal(master.status, 400);

  const centroSinCentro = await client.request("POST", "/api/auth/solicitud", {
    nombre: "Centro Sin Centro",
    correo: `centro${Date.now()}@test.com`,
    password: "ClaveSegura123",
    rol: "centro"
  });
  assert.equal(centroSinCentro.status, 400);
});

test("recordar sesion emite una cookie persistente", async () => {
  const normal = createClient(base);
  const sinRecordar = await normal.request("POST", "/api/auth/login", {
    correo: "master@sisalud.gob.ve",
    password: "Master2026"
  });
  assert.equal(sinRecordar.status, 200);
  assert.ok(!/expires=/i.test(sinRecordar.headers.get("set-cookie") || ""), "sin recordar no lleva Expires");

  const persistente = createClient(base);
  const conRecordar = await persistente.request("POST", "/api/auth/login", {
    correo: "master@sisalud.gob.ve",
    password: "Master2026",
    recordar: true
  });
  assert.equal(conRecordar.status, 200);
  assert.ok(/expires=/i.test(conRecordar.headers.get("set-cookie") || ""), "con recordar lleva Expires");
});
