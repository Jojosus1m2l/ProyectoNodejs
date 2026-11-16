const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword } = require("../utils/password");

test("hashPassword genera un formato scrypt autodescriptivo", async () => {
  const hash = await hashPassword("ClaveSegura123");
  assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
});

test("verifyPassword acepta la clave correcta y rechaza la incorrecta", async () => {
  const hash = await hashPassword("ClaveSegura123");
  assert.equal(await verifyPassword("ClaveSegura123", hash), true);
  assert.equal(await verifyPassword("OtraClave", hash), false);
});

test("dos hashes de la misma clave son distintos por el salt", async () => {
  const a = await hashPassword("ClaveSegura123");
  const b = await hashPassword("ClaveSegura123");
  assert.notEqual(a, b);
});

test("un hash malformado devuelve false sin lanzar", async () => {
  assert.equal(await verifyPassword("x", "no-es-un-hash"), false);
  assert.equal(await verifyPassword("x", "scrypt$x$y$z$aa$bb"), false);
  assert.equal(await verifyPassword("x", null), false);
});
