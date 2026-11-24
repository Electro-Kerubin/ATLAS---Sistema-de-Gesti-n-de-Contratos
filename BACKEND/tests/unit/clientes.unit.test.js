const test = require("node:test");
const assert = require("node:assert");
const h = require("./helpers");

let app;
test.before(async () => {
  app = await h.iniciarApp();
});
test.after(() => app.cerrar());
test.beforeEach(() => h.resetDb());

const CLIENTE = { id: 25, nombre: "Cliente Uno", correo: "uno@correo.com", empresa_id: 5 };
const NUEVO = { nombre: "Cliente Uno", correo: "uno@correo.com", telefono: "912341234" };

// ---------- Autenticación: todas las rutas exigen token con empresa ----------
for (const [metodo, ruta] of [
  ["POST", "/clientes"],
  ["GET", "/clientes"],
  ["GET", "/clientes/search"],
  ["GET", "/clientes/25"],
  ["PUT", "/clientes/25"],
  ["DELETE", "/clientes/25"],
]) {
  test(`${metodo} ${ruta} sin token responde 401 y no consulta la base`, async () => {
    const r = await h.llamar(app.baseUrl, metodo, ruta, {
      body: metodo === "POST" || metodo === "PUT" ? NUEVO : undefined,
    });
    assert.strictEqual(r.status, 401);
    assert.strictEqual(h.totalConsultas(), 0);
  });
}

test("GET /clientes con token sin empresaId responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/clientes", { tk: h.token({ empresaId: null }) });
  assert.strictEqual(r.status, 401);
});

// ---------- Crear ----------
test("POST /clientes crea el cliente asociándolo a la empresa del token", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/clientes", {
    tk: h.token({ empresaId: 9 }),
    body: NUEVO,
  });

  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.json, CLIENTE);
  const params = h.paramsDe(0);
  assert.strictEqual(params[0], "Cliente Uno");
  assert.strictEqual(params[1], "uno@correo.com");
  assert.strictEqual(params[params.length - 1], 9, "empresa_id debe venir del token, no del body");
});

test("POST /clientes ignora un empresa_id enviado en el body", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });
  await h.llamar(app.baseUrl, "POST", "/clientes", {
    tk: h.token({ empresaId: 5 }),
    body: { ...NUEVO, empresa_id: 999 },
  });
  const params = h.paramsDe(0);
  assert.strictEqual(params[params.length - 1], 5);
});

test("POST /clientes audita la creación", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });
  await h.llamar(app.baseUrl, "POST", "/clientes", { tk: h.token(), body: NUEVO });
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "CLIENTES_CREAR: creó cliente Cliente Uno"]);
});

test("POST /clientes aplica es_empresa=false por defecto", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });
  await h.llamar(app.baseUrl, "POST", "/clientes", { tk: h.token(), body: NUEVO });
  assert.strictEqual(h.paramsDe(0)[4], false);
});

test("POST /clientes con correo duplicado responde 500 con la glosa", async () => {
  h.respuestas(new Error('duplicate key value violates unique constraint "clientes_correo_key"'));
  const r = await h.llamar(app.baseUrl, "POST", "/clientes", { tk: h.token(), body: NUEVO });
  assert.strictEqual(r.status, 500);
  assert.match(r.json.glosa, /clientes_correo_key/);
});

test("POST /clientes sin nombre ni correo debe responder 400", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/clientes", { tk: h.token(), body: {} });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(h.totalConsultas(), 0, "no debe llegar a la base");
});

// ---------- Listar / obtener ----------
test("GET /clientes devuelve los clientes de la empresa del token", async () => {
  h.respuestas({ rows: [CLIENTE] });
  const r = await h.llamar(app.baseUrl, "GET", "/clientes", { tk: h.token({ empresaId: 9 }) });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, [CLIENTE]);
  assert.ok(h.paramsDe(0).includes(9));
});

test("GET /clientes/:id filtra por id y por empresa del token", async () => {
  h.respuestas({ rows: [CLIENTE] });
  const r = await h.llamar(app.baseUrl, "GET", "/clientes/25", { tk: h.token({ empresaId: 5 }) });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(h.paramsDe(0), ["25", 5]);
});

test("GET /clientes/:id responde 404 si el cliente no pertenece a la empresa", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/clientes/25", { tk: h.token({ empresaId: 77 }) });
  assert.strictEqual(r.status, 404);
});

// ---------- Eliminar ----------
test("DELETE /clientes/:id elimina validando la empresa y audita", async () => {
  h.respuestas({ rows: [CLIENTE] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "DELETE", "/clientes/25", { tk: h.token({ empresaId: 5 }) });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { deleted: true });
  assert.deepStrictEqual(h.paramsDe(0), ["25", 5]);
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "CLIENTES_ELIMINAR: eliminó cliente ID 25"]);
});

test("DELETE /clientes/:id de otra empresa responde 404 y no audita", async () => {
  const r = await h.llamar(app.baseUrl, "DELETE", "/clientes/25", { tk: h.token({ empresaId: 77 }) });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(h.totalConsultas(), 1);
});

test("DELETE /clientes/:id con contratos asociados responde 500 con la glosa", async () => {
  h.respuestas(new Error('violates foreign key constraint "contratos_cliente_id_fkey"'));
  const r = await h.llamar(app.baseUrl, "DELETE", "/clientes/25", { tk: h.token() });
  assert.strictEqual(r.status, 500);
  assert.match(r.json.glosa, /foreign key/);
});
