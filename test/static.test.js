const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./helpers/http");

let server;
let base;

before(async () => {
  const app = require("../app");
  const started = await startServer(app);
  server = started.server;
  base = started.base;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  const conexion = require("../conexion_vacunas");
  await new Promise((resolve, reject) => conexion.end((err) => (err ? reject(err) : resolve())));
});

test("sirve el prototipo en /vacunacion", async () => {
  const casos = [
    ["/vacunacion/index.html", "text/html"],
    ["/vacunacion/app.html", "text/html"],
    ["/vacunacion/css/app.css", "text/css"],
    ["/vacunacion/js/app.js", "javascript"],
    ["/vacunacion/js/datos.js", "javascript"],
    ["/vacunacion/vendor/tailwind-3.4.17.js", "javascript"]
  ];

  for (const [ruta, tipo] of casos) {
    const response = await fetch(base + ruta);
    assert.equal(response.status, 200, ruta);
    assert.ok(response.headers.get("content-type").includes(tipo), `${ruta} content-type`);
    assert.ok((await response.text()).length > 0, `${ruta} no vacío`);
  }
});

test("redirige /vacunacion al index del prototipo", async () => {
  const response = await fetch(base + "/vacunacion", { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/vacunacion/index.html");
});
