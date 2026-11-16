const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prepareDatabase, close } = require("./helpers/db");
const { startServer, createClient } = require("./helpers/http");
const { seedDemo } = require("../scripts/seed_demo");

let server;
let base;

function fechaLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

async function login(correo, password) {
  const client = createClient(base);
  const response = await client.request("POST", "/api/auth/login", { correo, password });
  assert.equal(response.status, 200, `login ${correo}`);
  return client;
}

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

test("flujo completo: registrar, listar, validar y servir la interfaz", async () => {
  const master = await login("master@sisalud.gob.ve", "Master2026");
  const revisor = await login("revisor@sisalud.gob.ve", "Revisor2026");
  const centro = await login("centro@sisalud.gob.ve", "Centro2026");

  const creado = await master.request("POST", "/api/registros", {
    centroId: "hospital-san-juan",
    primerNombre: "Paciente",
    segundoNombre: "De",
    primerApellido: "Prueba",
    segundoApellido: "Final",
    cedula: "V-39999999",
    fechaNacimiento: "2019-03-14",
    sexo: "Masculino",
    telefono: "0414-3999999",
    correo: "paciente.prueba@test.com",
    representante: {
      nombre: "Representante",
      apellido: "Prueba",
      cedula: "V-18888888",
      telefono: "0414-1888888"
    },
    vacuna: "srp",
    dosis: "1.ª dosis",
    fechaAplicacion: fechaLocal(),
    lote: "SRP-E2E",
    observaciones: "Prueba de extremo a extremo."
  });
  assert.equal(creado.status, 201);
  assert.equal(creado.body.validado, false);

  const enCentro = await centro.request("GET", "/api/registros?buscar=V-39999999");
  assert.equal(enCentro.status, 200);
  assert.equal(enCentro.body.length, 1);
  assert.equal(enCentro.body[0].id, creado.body.id);
  assert.equal(enCentro.body[0].centroId, "hospital-san-juan");

  const validado = await revisor.request("PATCH", `/api/registros/${creado.body.id}/validar`);
  assert.equal(validado.status, 200);
  assert.equal(validado.body.validado, true);
  assert.equal(validado.body.validadoPor, "Revisión SISALUD");

  const negado = await centro.request("PATCH", `/api/registros/${creado.body.id}/validar`);
  assert.equal(negado.status, 403);

  const listado = await revisor.request("GET", "/api/registros?validado=1&buscar=V-39999999");
  assert.equal(listado.body.length, 1);
  assert.equal(listado.body[0].validado, true);

  const html = await fetch(base + "/vacunacion/app.html");
  assert.equal(html.status, 200);
  assert.ok((await html.text()).includes("Registro de vacunación"));
});
