const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prepareDatabase, close, query } = require("./helpers/db");
const { startServer, createClient } = require("./helpers/http");
const { seedDemo } = require("../scripts/seed_demo");
const usuarios = require("../models/usuarios");
const centros = require("../models/centros");
const { hashPassword } = require("../utils/password");

let server;
let base;
let centro;
let revisor;
let centro2;

function fechaLocal(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function payload(overrides = {}) {
  return {
    centroId: "hospital-san-juan",
    primerNombre: "Ana",
    segundoNombre: "María",
    primerApellido: "Pérez",
    segundoApellido: "Gómez",
    cedula: "V-30000001",
    fechaNacimiento: "2018-05-12",
    sexo: "Femenino",
    telefono: "0414-0000002",
    correo: "ana@test.com",
    representante: {
      nombre: "Carlos",
      apellido: "Pérez",
      cedula: "V-11111111",
      telefono: "0414-0000001"
    },
    vacuna: "penta",
    dosis: "1.ª dosis",
    fechaAplicacion: fechaLocal(),
    lote: "LOTE-A",
    observaciones: "Sin novedad.",
    ...overrides
  };
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

  const calabozo = await centros.obtenerPorCodigo("hospital-calabozo");
  await usuarios.insertar(
    "centro2@test.com", "Centro Calabozo",
    await hashPassword("Centro2-2026"), calabozo.id, "centro", "aprobado"
  );

  const app = require("../app");
  const started = await startServer(app);
  server = started.server;
  base = started.base;

  centro = await login("centro@sisalud.gob.ve", "Centro2026");
  revisor = await login("revisor@sisalud.gob.ve", "Revisor2026");
  centro2 = await login("centro2@test.com", "Centro2-2026");
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await close();
});

test("sin sesion no se puede registrar ni listar", async () => {
  const client = createClient(base);
  assert.equal((await client.request("GET", "/api/registros")).status, 401);
  assert.equal((await client.request("POST", "/api/registros", payload())).status, 401);
});

test("el centro crea un registro y lo ve en el listado", async () => {
  const creado = await centro.request("POST", "/api/registros", payload());
  assert.equal(creado.status, 201);
  assert.equal(creado.body.nombres, "Ana María Pérez Gómez");
  assert.equal(creado.body.primerNombre, "Ana");
  assert.equal(creado.body.segundoNombre, "María");
  assert.equal(creado.body.primerApellido, "Pérez");
  assert.equal(creado.body.segundoApellido, "Gómez");
  assert.equal(creado.body.cedula, "V-30000001");
  assert.equal(creado.body.vacuna, "penta");
  assert.equal(creado.body.vacunaNombre, "Pentavalente (DPT + Hib + HB)");
  assert.equal(creado.body.dosis, "1.ª dosis");
  assert.equal(creado.body.numeroDosis, 1);
  assert.equal(creado.body.centroId, "hospital-san-juan");
  assert.equal(creado.body.centro, "Hospital Central de San Juan de los Morros");
  assert.equal(creado.body.estado, "Guárico");
  assert.equal(creado.body.municipio, "Juan Germán Roscio");
  assert.equal(creado.body.parroquia, "San Juan de los Morros");
  assert.equal(creado.body.representante, "Carlos Pérez");
  assert.equal(creado.body.fechaAplicacion, fechaLocal());
  assert.equal(creado.body.lote, "LOTE-A");
  assert.equal(creado.body.observaciones, "Sin novedad.");
  assert.equal(creado.body.validado, false);
  assert.equal(creado.body.validadoPor, "");
  assert.equal(creado.body.creadoPor, "centro@sisalud.gob.ve");
  assert.equal(creado.body.creadoPorNombre, "Personal Hospital San Juan");

  const listado = await centro.request("GET", "/api/registros?buscar=V-30000001");
  assert.equal(listado.status, 200);
  assert.equal(listado.body.length, 1);
  assert.equal(listado.body[0].id, creado.body.id);

  const detalle = await centro.request("GET", `/api/registros/${creado.body.id}`);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.cedula, "V-30000001");
});

test("una dosis duplicada devuelve 409", async () => {
  const data = payload({ cedula: "V-30000002" });
  assert.equal((await centro.request("POST", "/api/registros", data)).status, 201);
  const repetida = await centro.request("POST", "/api/registros", data);
  assert.equal(repetida.status, 409);
});

test("vacuna o etiqueta de dosis inexistente devuelve 400", async () => {
  const vacunaMala = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000003", vacuna: "no-existe"
  }));
  assert.equal(vacunaMala.status, 400);

  const dosisMala = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000003", dosis: "4.ª dosis"
  }));
  assert.equal(dosisMala.status, 400);
});

test("fechas invalidas devuelven 400", async () => {
  const futura = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000004", fechaAplicacion: fechaLocal(2)
  }));
  assert.equal(futura.status, 400);

  const antesDeNacer = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000004", fechaAplicacion: "2017-01-01"
  }));
  assert.equal(antesDeNacer.status, 400);

  const formatoMalo = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000004", fechaNacimiento: "12/05/2018"
  }));
  assert.equal(formatoMalo.status, 400);

  const sinLote = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000004", lote: ""
  }));
  assert.equal(sinLote.status, 400);
});

test("un centro solo registra y ve el suyo", async () => {
  const creado = await centro2.request("POST", "/api/registros", payload({
    centroId: "hospital-san-juan",
    cedula: "V-30000005"
  }));
  assert.equal(creado.status, 201);
  assert.equal(creado.body.centroId, "hospital-calabozo");

  const comoCentro1 = await centro.request("GET", "/api/registros?buscar=V-30000005");
  assert.equal(comoCentro1.body.length, 0);

  const comoRevisor = await revisor.request("GET", "/api/registros?buscar=V-30000005");
  assert.equal(comoRevisor.body.length, 1);
});

test("solo revisor o master validan, y una sola vez", async () => {
  const creado = await centro.request("POST", "/api/registros", payload({ cedula: "V-30000006" }));
  assert.equal(creado.status, 201);

  const porCentro = await centro.request("PATCH", `/api/registros/${creado.body.id}/validar`);
  assert.equal(porCentro.status, 403);

  const porRevisor = await revisor.request("PATCH", `/api/registros/${creado.body.id}/validar`);
  assert.equal(porRevisor.status, 200);
  assert.equal(porRevisor.body.validado, true);
  assert.equal(porRevisor.body.validadoPor, "Revisión SISALUD");
  assert.ok(porRevisor.body.validadoEn);

  const otraVez = await revisor.request("PATCH", `/api/registros/${creado.body.id}/validar`);
  assert.equal(otraVez.status, 409);

  const pendientes = await revisor.request("GET", "/api/registros?validado=0");
  assert.ok(pendientes.body.every((r) => r.validado === false));
  const validados = await revisor.request("GET", "/api/registros?validado=1");
  assert.ok(validados.body.some((r) => r.id === creado.body.id));
});

test("una persona existente recibe otra dosis sin duplicarse", async () => {
  const [antes] = await query("select count(*) as total from personas");

  const primera = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000007", dosis: "1.ª dosis"
  }));
  assert.equal(primera.status, 201);

  const segunda = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000007", dosis: "2.ª dosis"
  }));
  assert.equal(segunda.status, 201);
  assert.equal(segunda.body.numeroDosis, 2);

  const [despues] = await query("select count(*) as total from personas");
  assert.equal(despues.total - antes.total, 1, "solo el paciente nuevo; el representante ya existía");

  const historial = await centro.request("GET", "/api/registros?buscar=V-30000007");
  assert.equal(historial.body.length, 2);
  assert.deepEqual(
    historial.body.map((r) => r.dosis).sort(),
    ["1.ª dosis", "2.ª dosis"]
  );
});

test("el representante sin cedula se reutiliza por nombre", async () => {
  const [antes] = await query("select count(*) as total from personas");
  const representante = { nombre: "Lucía", apellido: "Mendoza", cedula: "", telefono: "0414-0000009" };

  const uno = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000008", representante
  }));
  assert.equal(uno.status, 201);
  assert.equal(uno.body.representante, "Lucía Mendoza");

  const dos = await centro.request("POST", "/api/registros", payload({
    cedula: "V-30000009", representante
  }));
  assert.equal(dos.status, 201);
  assert.equal(dos.body.representante, "Lucía Mendoza");

  const [despues] = await query("select count(*) as total from personas");
  assert.equal(despues.total - antes.total, 3, "representante + dos pacientes");
});
