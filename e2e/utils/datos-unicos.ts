// Sufijo corto y distinto en cada llamada: tiempo en base 36 + 3 caracteres aleatorios.
function sufijoUnico(): string {
  const tiempo = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 5);
  return `${tiempo}${azar}`;
}

/** Devuelve un correo distinto en cada llamada, p. ej. "correotest-lq3k9x2abc@correo.com". */
export function generarCorreoUnico(prefijo = 'correotest', dominio = 'correo.com'): string {
  return `${prefijo}-${sufijoUnico()}@${dominio}`;
}

/** Devuelve un nombre de usuario distinto en cada llamada, p. ej. "usuarionuevo-lq3k9x2abc". */
export function generarNombreUsuarioUnico(prefijo = 'usuarionuevo'): string {
  return `${prefijo}-${sufijoUnico()}`;
}

/**
 * Datos de registro que la base exige únicos (usuarios.correo, usuarios.nombre_usuario
 * y empresas.correo), para poder repetir la prueba sin chocar con registros anteriores.
 */
export function generarDatosRegistroUnicos() {
  return {
    nombreUsuario: generarNombreUsuarioUnico(),
    correo: generarCorreoUnico('correotest', 'correo.com'),
    correoEmpresa: generarCorreoUnico('corpoemail', 'corpo.com'),
  };
}
