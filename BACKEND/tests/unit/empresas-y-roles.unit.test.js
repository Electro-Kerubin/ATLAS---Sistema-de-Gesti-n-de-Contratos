const test = require("node:test");
const assert = require("node:assert");
const h = require("./helpers");

let app;
test.before(async () => {
  app = await h.iniciarApp();
});
test.after(() => app.cerrar());
test.beforeEach(() => h.resetDb());

// ================= Empresas (registro) =================
const REGISTRO = {
  usuario: { nombre_usuario: "nuevo", contrasena_hash: "Pass1234", correo: "nuevo@correo.com" },
  empresa: { nombre: "Empresa Nueva", direccion: "Calle 1, Santiago, RM", telefono: "912341234", correo: "emp@correo.com" },
};

test("POST /empresas (registro) crea usuario, empresa y vínculo con rol administrador", async () => {
  h.respuestas(
    { rows: [{ id: 60, nombre_usuario: "nuevo" }] },
    { rows: [{ id: 12, nombre: "Empresa Nueva" }] },
    { rows: [] }
  );

  const r = await h.llamar(app.baseUrl, "POST", "/empresas", { body: REGISTRO });

  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.json.usuario.id, 60);
  assert.strictEqual(r.json.empresa.id, 12);
  assert.strictEqual(h.totalConsultas(), 3);
  assert.match(h.sqlDe(2), /INSERT INTO empresa_usuarios/);
  assert.deepStrictEqual(h.paramsDe(2), [12, 60, 1], "el primer usuario debe quedar con rol 1 (administrador)");
});

test("POST /empresas (registro) con usuario duplicado responde 500 y no crea la empresa", async () => {
  h.respuestas(new Error('duplicate key value violates unique constraint "usuarios_nombre_usuario_key"'));
  const r = await h.llamar(app.baseUrl, "POST", "/empresas", { body: REGISTRO });
  assert.strictEqual(r.status, 500);
  assert.strictEqual(h.totalConsultas(), 1);
});

test("POST /empresas con formato antiguo crea solo la empresa y audita", async () => {
  h.respuestas({ rows: [{ id: 12, nombre: "Solo Empresa" }] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/empresas", {
    tk: h.token(),
    body: { nombre: "Solo Empresa", correo: "solo@correo.com" },
  });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(h.paramsDe(0), ["Solo Empresa", null, null, "solo@correo.com"]);
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "EMPRESAS_CREAR: creó empresa Solo Empresa"]);
});

test("GET /empresas/:id responde 404 si no existe", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/empresas/999");
  assert.strictEqual(r.status, 404);
});

test("DELETE /empresas/:id responde 404 si no existe", async () => {
  const r = await h.llamar(app.baseUrl, "DELETE", "/empresas/999", { tk: h.token() });
  assert.strictEqual(r.status, 404);
});

// ================= Empresa-usuarios =================
test("POST /empresa-usuarios sin token responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "POST", "/empresa-usuarios", { body: { usuario_id: 1, rol_id: 2 } });
  assert.strictEqual(r.status, 401);
});

test("POST /empresa-usuarios sin usuario_id ni datos del usuario responde 400", async () => {
  const r = await h.llamar(app.baseUrl, "POST", "/empresa-usuarios", { tk: h.token(), body: { rol_id: 2 } });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, "Datos inválidos");
});

test("POST /empresa-usuarios sin rol_id responde 400", async () => {
  const r = await h.llamar(app.baseUrl, "POST", "/empresa-usuarios", { tk: h.token(), body: { usuario_id: 8 } });
  assert.strictEqual(r.status, 400);
  assert.match(r.json.glosa, /rol_id/);
});

test("POST /empresa-usuarios con usuario_id vincula el usuario a la empresa del token", async () => {
  h.respuestas({ rows: [{ id: 30, empresa_id: 9, usuario_id: 8, rol_id: 2 }] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/empresa-usuarios", {
    tk: h.token({ empresaId: 9 }),
    body: { usuario_id: 8, rol_id: 2 },
  });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(h.paramsDe(0), [9, 8, 2]);
});

test("POST /empresa-usuarios con datos de usuario crea primero el usuario", async () => {
  h.respuestas({ rows: [{ id: 61 }] }, { rows: [{ id: 31, usuario_id: 61 }] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/empresa-usuarios", {
    tk: h.token(),
    body: { nombre_usuario: "otro", contrasena_hash: "Pass1234", correo: "otro@correo.com", rol_id: 2 },
  });
  assert.strictEqual(r.status, 201);
  assert.match(h.sqlDe(0), /INSERT INTO usuarios/);
  assert.deepStrictEqual(h.paramsDe(1), [5, 61, 2]);
});

test("GET /empresa-usuarios sin token responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/empresa-usuarios");
  assert.strictEqual(r.status, 401);
});

// ================= Roles =================
test("GET /roles lista los roles", async () => {
  h.respuestas({ rows: [{ id: 2, nombre: "editor" }, { id: 1, nombre: "administrador" }] });
  const r = await h.llamar(app.baseUrl, "GET", "/roles");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.length, 2);
});

test("POST /roles crea el rol y audita", async () => {
  h.respuestas({ rows: [{ id: 3, nombre: "auditor" }] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "POST", "/roles", { tk: h.token(), body: { nombre: "auditor" } });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "ROLES_CREAR: creó rol auditor"]);
});

test("GET /roles/:id responde 404 si no existe", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/roles/999");
  assert.strictEqual(r.status, 404);
});

// ================= Auditoría =================
test("POST /auditoria registra la acción con el usuario del token", async () => {
  h.respuestas({ rows: [{ id: 1, accion: "LOGIN" }] });
  const r = await h.llamar(app.baseUrl, "POST", "/auditoria", { tk: h.token(), body: { accion: "LOGIN" } });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(h.paramsDe(0), ["user1", "LOGIN"]);
});

test("POST /auditoria concatena los detalles a la acción", async () => {
  h.respuestas({ rows: [{ id: 1 }] });
  await h.llamar(app.baseUrl, "POST", "/auditoria", { tk: h.token(), body: { accion: "EXPORTAR", detalles: "contratos" } });
  assert.deepStrictEqual(h.paramsDe(0), ["user1", "EXPORTAR: contratos"]);
});

test("POST /auditoria sin token registra el usuario como nulo", async () => {
  h.respuestas({ rows: [{ id: 1 }] });
  await h.llamar(app.baseUrl, "POST", "/auditoria", { body: { accion: "ANONIMO" } });
  assert.deepStrictEqual(h.paramsDe(0), [null, "ANONIMO"]);
});

test("GET /auditoria lista los registros", async () => {
  h.respuestas({ rows: [{ id: 2 }, { id: 1 }] });
  const r = await h.llamar(app.baseUrl, "GET", "/auditoria");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.length, 2);
});

test("GET /auditoria responde 500 si la base falla", async () => {
  h.respuestas(new Error("sin conexión"));
  const r = await h.llamar(app.baseUrl, "GET", "/auditoria");
  assert.strictEqual(r.status, 500);
  assert.strictEqual(r.json.glosa, "sin conexión");
});

test("[SEGURIDAD] GET /auditoria sin token debe responder 401", async () => {
  h.respuestas({ rows: [{ id: 1, accion: "LOGIN" }] });
  const r = await h.llamar(app.baseUrl, "GET", "/auditoria");
  assert.strictEqual(r.status, 401);
});

// ================= Métricas =================
test("GET /metricas sin token responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/metricas");
  assert.strictEqual(r.status, 401);
  assert.strictEqual(h.totalConsultas(), 0);
});
