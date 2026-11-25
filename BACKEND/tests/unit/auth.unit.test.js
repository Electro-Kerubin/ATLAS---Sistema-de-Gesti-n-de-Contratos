const test = require("node:test");
const assert = require("node:assert");
const h = require("./helpers");

let app;
test.before(async () => {
  app = await h.iniciarApp();
});
test.after(() => app.cerrar());
test.beforeEach(() => h.resetDb());

const USUARIO = { id: 1, nombre_usuario: "user1", contrasena_hash: "Pass1234" };

test("POST /autenticacion/login con credenciales correctas devuelve un JWT válido", async () => {
  h.respuestas({ rows: [USUARIO] }, { rows: [{ id: 3, empresa_id: 5 }] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "Pass1234" },
  });

  assert.strictEqual(r.status, 200);
  const payload = h.jwt.verify(r.json.token, h.JWT_SECRET);
  assert.strictEqual(payload.usuarioId, 1);
  assert.strictEqual(payload.nombreUsuario, "user1");
  assert.strictEqual(payload.empresaId, 5);
  assert.strictEqual(payload.empresaUsuarioId, 3);
});

test("login exitoso registra el evento en auditoría", async () => {
  h.respuestas({ rows: [USUARIO] }, { rows: [{ id: 3, empresa_id: 5 }] }, { rows: [] });

  await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "Pass1234" },
  });

  assert.strictEqual(h.totalConsultas(), 3);
  assert.match(h.sqlDe(2), /INSERT INTO auditoria/);
  assert.deepStrictEqual(h.paramsDe(2), ["user1", "LOGIN: usuario inició sesión"]);
});

test("login con usuario inexistente responde 401 y no emite token", async () => {
  h.respuestas({ rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "fantasma", password: "x" },
  });

  assert.strictEqual(r.status, 401);
  assert.strictEqual(r.json.error, "Credenciales inválidas");
  assert.strictEqual(r.json.token, undefined);
});

test("login con contraseña incorrecta responde 401 sin consultar empresa ni auditar", async () => {
  h.respuestas({ rows: [USUARIO] });

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "incorrecta" },
  });

  assert.strictEqual(r.status, 401);
  assert.strictEqual(h.totalConsultas(), 1);
});

test("login de un usuario sin empresa asociada genera token con empresaId nulo", async () => {
  h.respuestas({ rows: [USUARIO] }, { rows: [] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "Pass1234" },
  });

  const payload = h.jwt.verify(r.json.token, h.JWT_SECRET);
  assert.strictEqual(payload.empresaId, null);
  assert.strictEqual(payload.empresaUsuarioId, null);
});

test("el token del login expira en 2 horas", async () => {
  h.respuestas({ rows: [USUARIO] }, { rows: [{ id: 3, empresa_id: 5 }] }, { rows: [] });

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "Pass1234" },
  });

  const { iat, exp } = h.jwt.verify(r.json.token, h.JWT_SECRET);
  assert.strictEqual(exp - iat, 2 * 60 * 60);
});

test("login con inyección SQL viaja como parámetro y no autentica", async () => {
  h.respuestas({ rows: [] });
  const payloadSqli = "' OR '1'='1' --";

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: payloadSqli, password: payloadSqli },
  });

  assert.strictEqual(r.status, 401);
  assert.doesNotMatch(h.sqlDe(0), /OR '1'='1/);
  assert.deepStrictEqual(h.paramsDe(0), [payloadSqli]);
});

test("login responde 500 con glosa cuando la base de datos falla", async () => {
  h.respuestas(new Error("conexión rechazada"));

  const r = await h.llamar(app.baseUrl, "POST", "/autenticacion/login", {
    body: { nombre_usuario: "user1", password: "Pass1234" },
  });

  assert.strictEqual(r.status, 500);
  assert.strictEqual(r.json.error, "Error en login");
  assert.strictEqual(r.json.glosa, "conexión rechazada");
});
