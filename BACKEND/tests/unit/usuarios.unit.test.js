const test = require("node:test");
const assert = require("node:assert");
const h = require("./helpers");

let app;
test.before(async () => {
  app = await h.iniciarApp();
});
test.after(() => app.cerrar());
test.beforeEach(() => h.resetDb());

const FILA = { id: 7, nombre_usuario: "ana", correo: "ana@correo.com", created_at: "2026-01-01" };

// ---------- GET /usuarios (listado por empresa del token) ----------
test("GET /usuarios sin token responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios");
  assert.strictEqual(r.status, 401);
  assert.strictEqual(h.totalConsultas(), 0);
});

test("GET /usuarios con token sin empresaId responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios", {
    tk: h.token({ empresaId: null }),
  });
  assert.strictEqual(r.status, 401);
});

test("GET /usuarios con token firmado con otra clave responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios", {
    tk: h.token({}, {}, "otra-clave"),
  });
  assert.strictEqual(r.status, 401);
});

test("GET /usuarios con token expirado responde 401", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios", {
    tk: h.token({}, { expiresIn: -10 }),
  });
  assert.strictEqual(r.status, 401);
});

test("GET /usuarios lista solo los usuarios de la empresa del token", async () => {
  h.respuestas({ rows: [FILA] });

  const r = await h.llamar(app.baseUrl, "GET", "/usuarios", {
    tk: h.token({ empresaId: 9 }),
  });

  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, [FILA]);
  assert.deepStrictEqual(h.paramsDe(0), [9]);
});

// ---------- GET /usuarios/:id ----------
test("GET /usuarios/:id devuelve el usuario cuando existe", async () => {
  h.respuestas({ rows: [FILA] });
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios/7");
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, FILA);
  assert.deepStrictEqual(h.paramsDe(0), ["7"]);
});

test("GET /usuarios/:id responde 404 cuando no existe", async () => {
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios/999");
  assert.strictEqual(r.status, 404);
});

test("GET /usuarios/:id no expone la contraseña", async () => {
  h.respuestas({ rows: [FILA] });
  await h.llamar(app.baseUrl, "GET", "/usuarios/7");
  assert.doesNotMatch(h.sqlDe(0), /contrasena/i);
});

test("GET /usuarios/:id responde 500 si la base falla", async () => {
  h.respuestas(new Error("boom"));
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios/7");
  assert.strictEqual(r.status, 500);
  assert.strictEqual(r.json.glosa, "boom");
});

// ---------- POST /usuarios ----------
test("POST /usuarios crea el usuario y responde 201", async () => {
  h.respuestas({ rows: [FILA] });
  const r = await h.llamar(app.baseUrl, "POST", "/usuarios", {
    body: { nombre_usuario: "ana", contrasena_hash: "Pass1234", correo: "ana@correo.com" },
  });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(h.paramsDe(0), ["ana", "Pass1234", "ana@correo.com"]);
  assert.strictEqual(r.json.contrasena_hash, undefined);
});

test("POST /usuarios con nombre duplicado responde 500 con la glosa de la base", async () => {
  h.respuestas(new Error('duplicate key value violates unique constraint "usuarios_nombre_usuario_key"'));
  const r = await h.llamar(app.baseUrl, "POST", "/usuarios", {
    body: { nombre_usuario: "user1", contrasena_hash: "x", correo: "a@a.com" },
  });
  assert.strictEqual(r.status, 500);
  assert.match(r.json.glosa, /duplicate key/);
});

// ---------- PUT /usuarios/:id ----------
test("PUT /usuarios/:id actualiza y audita con el usuario del token", async () => {
  h.respuestas({ rows: [FILA] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "PUT", "/usuarios/7", {
    tk: h.token(),
    body: { nombre_usuario: "ana", contrasena_hash: "Nueva1234", correo: "nueva@correo.com" },
  });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(h.paramsDe(0), ["ana", "Nueva1234", "nueva@correo.com", "7"]);
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "USUARIOS_ACTUALIZAR: actualizó usuario ID 7"]);
});

test("PUT /usuarios/:id responde 404 si el usuario no existe", async () => {
  const r = await h.llamar(app.baseUrl, "PUT", "/usuarios/999", {
    tk: h.token(),
    body: { nombre_usuario: "x", contrasena_hash: "x", correo: "x@x.com" },
  });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(h.totalConsultas(), 1);
});

test("PUT /usuarios/:id sin nombre_usuario debe responder 4xx (validación)", async () => {
  // La UI de "editar usuario" no envía nombre_usuario: la base lanza NOT NULL y responde 500.
  h.respuestas(new Error('null value in column "nombre_usuario" violates not-null constraint'));
  const r = await h.llamar(app.baseUrl, "PUT", "/usuarios/7", {
    tk: h.token(),
    body: { correo: "nueva@correo.com" },
  });
  assert.ok(r.status >= 400 && r.status < 500, `se esperaba 4xx y fue ${r.status}`);
});

// ---------- DELETE /usuarios/:id ----------
test("DELETE /usuarios/:id elimina y audita", async () => {
  h.respuestas({ rows: [FILA] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "DELETE", "/usuarios/7", { tk: h.token() });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json, { deleted: true });
  assert.deepStrictEqual(h.paramsDe(1), ["user1", "USUARIOS_ELIMINAR: eliminó usuario ID 7"]);
});

test("DELETE /usuarios/:id responde 404 si no existe y no audita", async () => {
  const r = await h.llamar(app.baseUrl, "DELETE", "/usuarios/999", { tk: h.token() });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(h.totalConsultas(), 1);
});

test("DELETE /usuarios/:id con llave foránea debe responder 409 (no 500)", async () => {
  h.respuestas(new Error('violates foreign key constraint "empresa_usuarios_usuario_id_fkey"'));
  const r = await h.llamar(app.baseUrl, "DELETE", "/usuarios/7", { tk: h.token() });
  assert.strictEqual(r.status, 409);
});

// ---------- Seguridad: acciones destructivas sin autenticación ----------
test("[SEGURIDAD] PUT /usuarios/:id sin token debe responder 401", async () => {
  h.respuestas({ rows: [FILA] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "PUT", "/usuarios/7", {
    body: { nombre_usuario: "ana", contrasena_hash: "hack", correo: "a@a.com" },
  });
  assert.strictEqual(r.status, 401);
});

test("[SEGURIDAD] DELETE /usuarios/:id sin token debe responder 401", async () => {
  h.respuestas({ rows: [FILA] }, { rows: [] });
  const r = await h.llamar(app.baseUrl, "DELETE", "/usuarios/7");
  assert.strictEqual(r.status, 401);
});

test("[SEGURIDAD] GET /usuarios/:id sin token debe responder 401", async () => {
  h.respuestas({ rows: [FILA] });
  const r = await h.llamar(app.baseUrl, "GET", "/usuarios/7");
  assert.strictEqual(r.status, 401);
});
