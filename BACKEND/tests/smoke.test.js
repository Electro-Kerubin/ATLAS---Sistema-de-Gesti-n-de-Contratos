// Pruebas de humo (base de la pirámide de testing). Sin base de datos:
// solo ejercitan rutas que no consultan Postgres. Se ejecutan con `node --test`.
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

const app = require("../src/app");

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("GET / responde estado ok", async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { name: "Atlas", status: "ok" });
});

test("GET /openapi.json expone la especificación", async () => {
  const res = await fetch(`${baseUrl}/openapi.json`);
  assert.strictEqual(res.status, 200);
  const spec = await res.json();
  assert.ok(spec.paths, "la especificación debe incluir paths");
});

test("GET /usuarios sin token responde 401", async () => {
  const res = await fetch(`${baseUrl}/usuarios`);
  assert.strictEqual(res.status, 401);
});
