/**
 * Prepara el usuario de pruebas (user1 / Pass1234, administrador) vía API.
 *
 * La base de datos de un entorno recién levantado (por ejemplo, CI) solo trae admin y
 * editor; user1 existía únicamente en la base local de quien escribió las pruebas.
 * El registro es idempotente para este fin: si user1 ya existe el backend responde error
 * (clave duplicada) y se ignora.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4450';

export default async function globalSetup() {
  try {
    const res = await fetch(`${API_URL}/empresas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: { nombre_usuario: 'user1', contrasena_hash: 'Pass1234', correo: 'user1@atlasfake.com' },
        empresa: {
          nombre: 'Empresa Pruebas E2E',
          direccion: 'Calle 1, Santiago, RM',
          telefono: '912341234',
          correo: 'empresa.e2e@atlasfake.com',
        },
      }),
    });
    console.log(`[global-setup] registro de user1: HTTP ${res.status} (201 = creado, 500 = ya existía)`);
  } catch (e) {
    console.warn(`[global-setup] no se pudo contactar el backend en ${API_URL}: ${e}`);
  }
}
