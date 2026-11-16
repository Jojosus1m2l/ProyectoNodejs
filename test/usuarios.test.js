const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prepareDatabase, close } = require("./helpers/db");
const { startServer, createClient } = require("./helpers/http");
const { seedDemo } = require("../scripts/seed_demo");

let server;
let base;
let master;
let revisor;
let centro;

async function login(correo, password) {
  const client = createClient(base);
  const response = await client.request("POST", "/api/auth/login", { correo, password });
  assert.equal(response.status, 200, `login ${correo}`);
  return client;
}

async function solicitud(datos) {
  const client = createClient(base);
  const response = await client.request("POST", "/api/auth/solicitud", {
    password: "ClaveSegura123",
    ...datos
  });
  assert.equal(response.status, 201, `solicitud ${datos.correo}`);
  return response.body;
}

before(async () => {
  await prepareDatabase();
  await seedDemo();
  const app = require("../app");
  const started = await startServer(app);
  server = started.server;
  base = started.base;

  master = await login("master@sisalud.gob.ve", "Master2026");
  revisor = await login("revisor@sisalud.gob.ve", "Revisor2026");
  centro = await login("centro@sisalud.gob.ve", "Centro2026");
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await close();
});

test("solo el master lista usuarios", async () => {
  const listado = await master.request("GET", "/api/usuarios");
  assert.equal(listado.status, 200);
  assert.ok(listado.body.length >= 3);
  assert.ok(listado.body.every((u) => u.password_hash === undefined));

  assert.equal((await revisor.request("GET", "/api/usuarios")).status, 403);
  assert.equal((await centro.request("GET", "/api/usuarios")).status, 403);
  assert.equal((await createClient(base).request("GET", "/api/usuarios")).status, 401);
});

test("el master aprueba una solicitud y el usuario puede entrar", async () => {
  const pendiente = await solicitud({
    nombre: "Nuevo Revisor",
    correo: "nuevo.revisor@test.com",
    rol: "revisor"
  });

  const pendientes = await master.request("GET", "/api/usuarios?estado=pendiente");
  assert.ok(pendientes.body.some((u) => u.id === pendiente.id));

  const aprobado = await master.request("PATCH", `/api/usuarios/${pendiente.id}/aprobar`, {
    rol: "revisor"
  });
  assert.equal(aprobado.status, 200);
  assert.equal(aprobado.body.estado, "aprobado");
  assert.equal(aprobado.body.rol, "revisor");
  assert.equal(aprobado.body.centroId, null);
  assert.equal(aprobado.body.aprobadoPor, "master@sisalud.gob.ve");

  const cliente = await login("nuevo.revisor@test.com", "ClaveSegura123");
  assert.equal((await cliente.request("GET", "/api/auth/me")).status, 200);
});

test("aprobar como centro exige un centro valido", async () => {
  const pendiente = await solicitud({
    nombre: "Nuevo Centro",
    correo: "nuevo.centro@test.com",
    rol: "centro",
    centroId: "hospital-san-juan"
  });

  const sinCentro = await master.request("PATCH", `/api/usuarios/${pendiente.id}/aprobar`, {
    rol: "centro"
  });
  assert.equal(sinCentro.status, 400);

  const centroMalo = await master.request("PATCH", `/api/usuarios/${pendiente.id}/aprobar`, {
    rol: "centro",
    centroId: "no-existe"
  });
  assert.equal(centroMalo.status, 400);

  const rolMalo = await master.request("PATCH", `/api/usuarios/${pendiente.id}/aprobar`, {
    rol: "master"
  });
  assert.equal(rolMalo.status, 400);

  const aprobado = await master.request("PATCH", `/api/usuarios/${pendiente.id}/aprobar`, {
    rol: "centro",
    centroId: "hospital-calabozo"
  });
  assert.equal(aprobado.status, 200);
  assert.equal(aprobado.body.centroId, "hospital-calabozo");
});

test("el master no puede modificarse a si mismo", async () => {
  const yo = await master.request("GET", "/api/auth/me");
  const respuesta = await master.request("PATCH", `/api/usuarios/${yo.body.id}/suspender`);
  assert.equal(respuesta.status, 409);
});

test("rechazar, reactivar y suspender cambian el acceso", async () => {
  const pendiente = await solicitud({
    nombre: "Ciclo de Vida",
    correo: "ciclo@test.com",
    rol: "centro",
    centroId: "ambulatorio-zaraza"
  });

  const rechazado = await master.request("PATCH", `/api/usuarios/${pendiente.id}/rechazar`);
  assert.equal(rechazado.status, 200);
  assert.equal(rechazado.body.estado, "rechazado");

  const cliente = createClient(base);
  assert.equal((await cliente.request("POST", "/api/auth/login", {
    correo: "ciclo@test.com", password: "ClaveSegura123"
  })).status, 403);

  const reactivado = await master.request("PATCH", `/api/usuarios/${pendiente.id}/reactivar`);
  assert.equal(reactivado.status, 200);
  assert.equal(reactivado.body.estado, "aprobado");
  assert.equal(reactivado.body.rol, "centro");
  assert.equal(reactivado.body.centroId, "ambulatorio-zaraza");

  assert.equal((await cliente.request("POST", "/api/auth/login", {
    correo: "ciclo@test.com", password: "ClaveSegura123"
  })).status, 200);

  const suspendido = await master.request("PATCH", `/api/usuarios/${pendiente.id}/suspender`);
  assert.equal(suspendido.status, 200);
  assert.equal(suspendido.body.estado, "suspendido");

  const negado = await cliente.request("POST", "/api/auth/login", {
    correo: "ciclo@test.com", password: "ClaveSegura123"
  });
  assert.equal(negado.status, 403);
});
