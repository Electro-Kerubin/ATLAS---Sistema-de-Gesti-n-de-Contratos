const test = require("node:test");
const assert = require("node:assert");
const h = require("./helpers");

let app;
test.before(async () => {
  app = await h.iniciarApp();
});
test.after(() => app.cerrar());
test.beforeEach(() => h.resetDb());

const CONTRATO = { id: 13, cliente_id: 25, titulo: "Contrato Uno", fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31" };

function formulario(campos, archivo) {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  if (archivo) form.append("file", new Blob([archivo.contenido], { type: archivo.tipo }), archivo.nombre);
  return form;
}

const CAMPOS = { cliente_id: "25", titulo: "Contrato Uno", fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31" };

// ---------- Autenticación de los listados ----------
for (const ruta of ["/contratos", "/contratos/estados", "/contratos/dashboard"]) {
  test(`GET ${ruta} sin token responde 401`, async () => {
    const r = await h.llamar(app.baseUrl, "GET", ruta);
    assert.strictEqual(r.status, 401);
    assert.strictEqual(h.totalConsultas(), 0);
  });
}

// ---------- Crear ----------
test("POST /contratos sin archivo inserta contrato y auditoría (2 consultas)", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/contratos", {
    tk: h.token(),
    form: formulario(CAMPOS),
  });

  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.json, CONTRATO);
  assert.strictEqual(h.totalConsultas(), 2);
  assert.deepStrictEqual(h.paramsDe(0), [25, "Contrato Uno", null, "2026-01-01", "2026-12-31"]);
});

test("POST /contratos con archivo guarda el documento en documentos_contrato", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/contratos", {
    tk: h.token(),
    form: formulario(CAMPOS, { contenido: "%PDF-1.4 prueba", tipo: "application/pdf", nombre: "contrato.pdf" }),
  });

  assert.strictEqual(r.status, 201);
  assert.strictEqual(h.totalConsultas(), 3);
  assert.match(h.sqlDe(1), /INSERT INTO documentos_contrato/);
  assert.strictEqual(h.paramsDe(1)[0], 13);
  assert.strictEqual(h.paramsDe(1)[1].toString(), "%PDF-1.4 prueba");
});

test("POST /contratos audita la creación con el usuario del token", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] });
  await h.llamar(app.baseUrl, "POST", "/contratos", { tk: h.token(), form: formulario(CAMPOS) });
  assert.deepStrictEqual(h.paramsDe(1), [
    "user1",
    "CONTRATOS_CREAR: creó contrato Contrato Uno para cliente 25",
  ]);
});

test("POST /contratos convierte cliente_id a número", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] });
  await h.llamar(app.baseUrl, "POST", "/contratos", { tk: h.token(), form: formulario(CAMPOS) });
  assert.strictEqual(typeof h.paramsDe(0)[0], "number");
});

test("POST /contratos responde 500 con la glosa si la base falla", async () => {
  h.respuestas(new Error("violates foreign key constraint"));
  const r = await h.llamar(app.baseUrl, "POST", "/contratos", { tk: h.token(), form: formulario(CAMPOS) });
  assert.strictEqual(r.status, 500);
  assert.match(r.json.glosa, /foreign key/);
});

test("POST /contratos con fecha fin anterior a la de inicio debe responder 400", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/contratos", {
    tk: h.token(),
    form: formulario({ ...CAMPOS, fecha_inicio: "2026-12-31", fecha_fin: "2026-01-01" }),
  });
  assert.strictEqual(r.status, 400);
});

test("POST /contratos sin título ni cliente debe responder 400", async () => {
  h.respuestas({ rows: [CONTRATO] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/contratos", { tk: h.token(), form: formulario({}) });
  assert.strictEqual(r.status, 400);
});

// ---------- Obtener ----------
test("GET /contratos/:id devuelve el contrato", async () => {
  h.respuestas({ rows: [CONTRATO] });
  const r = await h.llamar(app.baseUrl, "GET", "/contratos/13");
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, CONTRATO);
});

test("GET /contratos/:id responde 404 si no existe", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/contratos/999");
  assert.strictEqual(r.status, 404);
});

test("GET /contratos/:id/file entrega el PDF con su Content-Type", async () => {
  h.respuestas({ rows: [{ document: Buffer.from("%PDF-1.4 prueba") }] });
  const r = await h.llamar(app.baseUrl, "GET", "/contratos/13/file");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get("content-type"), "application/pdf");
  assert.strictEqual(r.texto, "%PDF-1.4 prueba");
});

test("GET /contratos/:id/file responde 404 si el contrato no tiene documento", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/contratos/13/file");
  assert.strictEqual(r.status, 404);
  assert.strictEqual(r.json.error, "Documento no encontrado");
});

// ---------- Eliminar ----------
test("DELETE /contratos/:id borra primero el documento y luego el contrato", async () => {
  h.respuestas({ rows: [] }, { rows: [CONTRATO] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "DELETE", "/contratos/13", { tk: h.token() });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { deleted: true });
  assert.match(h.sqlDe(0), /DELETE FROM documentos_contrato/);
  assert.match(h.sqlDe(1), /DELETE FROM contratos/);
  assert.deepStrictEqual(h.paramsDe(2), ["user1", "CONTRATOS_ELIMINAR: eliminó contrato ID 13"]);
});

test("DELETE /contratos/:id responde 404 si no existe y no audita", async () => {
  const r = await h.llamar(app.baseUrl, "DELETE", "/contratos/999", { tk: h.token() });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(h.totalConsultas(), 2);
});

test("[SEGURIDAD] DELETE /contratos/:id sin token debe responder 401", async () => {
  h.respuestas({ rows: [] }, { rows: [CONTRATO] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "DELETE", "/contratos/13");
  assert.strictEqual(r.status, 401);
});

test("[SEGURIDAD] GET /contratos/:id/file sin token debe responder 401", async () => {
  h.respuestas({ rows: [{ document: Buffer.from("secreto") }] });
  const r = await h.llamar(app.baseUrl, "GET", "/contratos/13/file");
  assert.strictEqual(r.status, 401);
});
