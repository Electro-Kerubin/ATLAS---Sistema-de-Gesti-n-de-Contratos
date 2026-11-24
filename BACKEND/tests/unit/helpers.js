// Utilidades para pruebas unitarias del backend.
// La base de datos se reemplaza por un mock de `pool.query`, así que NO se necesita Postgres.
// Debe requerirse ANTES que `src/app` (reemplaza el módulo `src/db` en la caché de require).
const http = require("node:http");
const { mock } = require("node:test");
const jwt = require("jsonwebtoken");

// Sin latencias artificiales: el login usa LOGIN_DELAY_MS y el resto un delay fijo de 4000 ms.
process.env.LOGIN_DELAY_MS = "0";
const realSetTimeout = global.setTimeout;
global.setTimeout = (fn, ms, ...args) =>
  realSetTimeout(fn, ms === 4000 ? 0 : ms, ...args);

// Mock del pool de Postgres
const query = mock.fn(async () => ({ rows: [] }));
const pool = { query };
const dbPath = require.resolve("../../src/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { pool },
};

const JWT_SECRET = "inseguro"; // mismo valor por defecto que usan las rutas

/** Restablece el mock: sin llamadas registradas y devolviendo filas vacías. */
function resetDb() {
  query.mock.resetCalls();
  query.mock.mockImplementation(async () => ({ rows: [] }));
}

/**
 * Define las respuestas sucesivas de pool.query. Cada elemento puede ser
 * `{ rows: [...] }` o un `Error` (la consulta lanza). La última respuesta se repite.
 */
function respuestas(...resultados) {
  let i = 0;
  query.mock.mockImplementation(async () => {
    const r = resultados[Math.min(i++, resultados.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  });
}

/** Parámetros con que se llamó a la consulta número `n` (0 = primera). */
function paramsDe(n) {
  return query.mock.calls[n].arguments[1];
}
function sqlDe(n) {
  return query.mock.calls[n].arguments[0];
}
function totalConsultas() {
  return query.mock.calls.length;
}

/** Genera un token JWT válido (por defecto de user1, empresa 5). */
function token(payload = {}, opciones = {}, secret = JWT_SECRET) {
  return jwt.sign(
    {
      usuarioId: 1,
      nombreUsuario: "user1",
      empresaUsuarioId: 3,
      empresaId: 5,
      ...payload,
    },
    secret,
    { expiresIn: "1h", ...opciones }
  );
}

/** Levanta la app en un puerto libre. Devuelve { baseUrl, cerrar }. */
async function iniciarApp() {
  const app = require("../../src/app");
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    cerrar: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Atajo para llamar a la API. `body` se envía como JSON; `form` como multipart. */
async function llamar(baseUrl, metodo, ruta, { tk, body, form } = {}) {
  const headers = {};
  if (tk) headers.Authorization = `Bearer ${tk}`;
  const init = { method: metodo, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  } else if (form) {
    init.body = form;
  }
  const res = await fetch(`${baseUrl}${ruta}`, init);
  const texto = await res.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* respuesta no JSON */
  }
  return { status: res.status, json, texto, headers: res.headers };
}

module.exports = {
  resetDb,
  respuestas,
  paramsDe,
  sqlDe,
  totalConsultas,
  token,
  iniciarApp,
  llamar,
  jwt,
  JWT_SECRET,
};
