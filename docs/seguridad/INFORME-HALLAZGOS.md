# Informe de seguridad — ATLAS (revisión White Box)

Fecha: 2026-11-01 · Rama: `qa`

> Proyecto académico (ISY1102) **intencionalmente vulnerable**. Este informe documenta los hallazgos; **no se corrigió nada**.
> Todas las pruebas se realizan solo sobre este repositorio y sobre entornos propios/de laboratorio.

## 1. Resumen ejecutivo

La revisión de código (BACKEND Express/PostgreSQL y FRONTEND React/Vite) muestra un nivel de riesgo **CRÍTICO**.
Las consultas SQL están parametrizadas (no se encontró SQL Injection), pero el sistema carece de controles
básicos de autenticación, autorización y protección de datos:

- Contraseñas almacenadas y comparadas en texto plano.
- Gran parte de la API no exige token, y no hay control de roles en el servidor.
- Secretos (JWT, credenciales de BD) versionados en el repositorio y con valores por defecto inseguros.

Recomendación estratégica (no aplicada): hash de contraseñas, middleware de autenticación/autorización común,
gestión de secretos fuera del repositorio y cabeceras de seguridad.

## 2. Metodología

Enfoque **White Box** (acceso completo al código). Se siguió el orden de la metodología de 6 fases, con el alcance
indicado:

| Fase | Estado |
|---|---|
| 1. Reconocimiento | Hecho: estructura del repo, `docker-compose.yml`, `openapi.json` (19 rutas), puertos 4450 / 3350 / 15432 |
| 2. Escaneo y análisis | Revisión manual de código. SAST (SonarCloud), SCA (Snyk) y secretos (Gitleaks) se ejecutan en el pipeline |
| 3. Enumeración | Endpoints y sus controles de acceso (sección 3) |
| 4. Explotación | **No realizada** |
| 5. Post-explotación | **No realizada** |
| 6. Documentación | Este informe |

Herramientas: lectura de código; en el pipeline: Gitleaks, SonarCloud, Snyk y OWASP ZAP.
Los resultados de esas herramientas se agregan en la sección 5 cuando exista una ejecución.

## 3. Hallazgos técnicos

Criticidad: CRÍTICO > ALTO > MEDIO > BAJO > INFORMATIVO.

### Backend

| ID | Criticidad | Hallazgo | Evidencia |
|---|---|---|---|
| B-01 | CRÍTICO | Contraseñas en texto plano: el login compara `contrasena_hash !== password` y la columna guarda lo que envía el cliente | `BACKEND/src/routes/auth.js:26`, `routes/users.js:23-27` |
| B-02 | CRÍTICO | Broken Access Control: rutas sin validación de token. Cualquiera puede crear/editar/eliminar usuarios, empresas, roles y vínculos, leer toda la auditoría y descargar/eliminar contratos | `users.js:22,74,93,123` · `empresas.js:93-189` · `roles.js:20-98` · `audit.js:20,37` · `empresa_usuarios.js:133,152,182` · `contracts.js:29,275,413,435` |
| B-03 | CRÍTICO | Secreto JWT con valor por defecto `"inseguro"` en los 9 archivos de rutas; además el secreto real está versionado | `auth.js:7`, `users.js:6`, `contracts.js:9`, ... · `docker-compose.yml:35` |
| B-04 | ALTO | IDOR / multi-tenant roto: `GET /contratos/:id` y `GET /contratos/:id/file` no filtran por empresa; `POST /contratos` no valida que `cliente_id` sea de la empresa; `PUT /empresa-usuarios/:id` permite cambiar `empresa_id`, `usuario_id` y `rol_id` | `contracts.js:29,275,413` · `empresa_usuarios.js:152` |
| B-05 | ALTO | No hay autorización por rol en el servidor: el JWT no incluye rol y ninguna ruta lo verifica | `auth.js:42-51` |
| B-06 | ALTO | CORS abierto a cualquier origen | `app.js:22` |
| B-07 | ALTO | Credenciales de BD por defecto y puerto de Postgres publicado en el host | `db.js:6` · `docker-compose.yml:6-10` |
| B-08 | MEDIO | Fuga de información: se devuelve `err.message` al cliente en todos los `catch` (`glosa`) | todas las rutas, p. ej. `auth.js:64` |
| B-09 | MEDIO | Sin límite de intentos en login (fuerza bruta). El retardo artificial de 4 s mantiene conexiones abiertas (vector de DoS) | `auth.js:17` · `contracts.js:75` · `clients.js:131` · `metricas.js:39` |
| B-10 | MEDIO | Subida de archivos sin validar tipo ni tamaño, en memoria (`multer.memoryStorage()` sin límites); se sirve siempre como PDF | `contracts.js:14-15,422` |
| B-11 | MEDIO | Sin cabeceras de seguridad (no hay `helmet`); Swagger `/docs`, `/openapi.json` y `/files/contracts` expuestos | `app.js:40-45` |
| B-12 | MEDIO | Auditoría falsificable/inyectable: `POST /auditoria` es público y el texto de acciones incluye datos del usuario sin sanear | `audit.js:20-29` |
| B-13 | MEDIO | Dependencia `multer@1.x` con vulnerabilidades conocidas (advertencia de npm) | `BACKEND/package.json` |
| B-14 | BAJO | Se imprime el payload del JWT en consola | `users.js:43` · `clients.js:142` |
| B-15 | BAJO | `jwt.verify` sin restringir algoritmos; sin revocación de tokens (2 h) | todas las rutas |
| B-16 | BAJO | Dockerfile: `node:18-alpine` (fin de vida), ejecuta como root, `EXPOSE 3000` pero la app usa 4000 | `BACKEND/Dockerfile` |

### Frontend

| ID | Criticidad | Hallazgo | Evidencia |
|---|---|---|---|
| F-01 | ALTO | El rol se lee de `localStorage` con valor por defecto `"administrador"`; el control de acceso es solo visual y se evade editando el navegador | `AuthContext.jsx:14-16,52` · `RoleGuard.jsx:11-14` |
| F-02 | ALTO | JWT guardado en `localStorage` (accesible por cualquier XSS) | `AuthContext.jsx:32` · `lib/api.jsx:21` |
| F-03 | MEDIO | nginx sin cabeceras de seguridad (CSP, `X-Frame-Options`, `X-Content-Type-Options`) ni `server_tokens off`; ZAP lo reportará | `FRONTEND/nginx.conf` |
| F-04 | MEDIO | El campo `glosa` del backend se muestra en toasts, exponiendo mensajes internos al usuario | `lib/api.jsx:53-58` |
| F-05 | MEDIO | La contraseña viaja en claro en el campo `contrasena_hash` (y sobre HTTP en el despliegue por defecto) | `Register.jsx:46` · `UsuarioForm.jsx:82` |
| F-06 | BAJO | Build no reproducible: el Dockerfile borra `package-lock.json` y reinstala | `FRONTEND/Dockerfile:14` |
| F-07 | BAJO | Imagen final nginx sin usuario no root; imagen base `node:20` sin versión fija | `FRONTEND/Dockerfile` |
| F-08 | BAJO | 8 errores de ESLint (`no-unused-vars`) y 3 advertencias | `npm run lint` |

### Repositorio / configuración

| ID | Criticidad | Hallazgo | Evidencia |
|---|---|---|---|
| R-01 | ALTO | Archivos `.env` versionados (raíz, BACKEND, FRONTEND) con el secreto JWT. *Decisión del proyecto: no se agregan al `.gitignore`.* | `.env`, `BACKEND/.env`, `FRONTEND/.env` |
| R-02 | ALTO | `README.md` publica el secreto JWT y las credenciales de la BD | `README.md:30,41-45` |
| R-03 | INFORMATIVO | Positivo: consultas parametrizadas; el actualizador dinámico de contratos solo usa nombres de columna fijos | `contracts.js:329-380` |
| R-04 | INFORMATIVO | Positivo: `.credenciales` está en `.gitignore` y no está versionado | `.gitignore` |

Mapeo con OWASP Top 10: B-02/B-04/B-05/F-01 → A01 Broken Access Control; B-01/B-03/F-02/R-01/R-02 → A02 Cryptographic Failures
y A07 Identification and Authentication Failures; B-08/B-11/F-03 → A05 Security Misconfiguration; B-13/F-06 → A06 Vulnerable
and Outdated Components.

## 4. Recomendaciones (priorizadas; NO aplicadas)

| Prioridad | Acción | Hallazgos |
|---|---|---|
| 1 | Hash de contraseñas (bcrypt/argon2) y nunca compararlas en claro | B-01, F-05 |
| 1 | Middleware único de autenticación + autorización por rol y por empresa en todas las rutas | B-02, B-04, B-05, F-01 |
| 1 | Sacar secretos del repositorio y rotar el JWT; eliminar valores por defecto | B-03, B-07, R-01, R-02 |
| 2 | `helmet`, CORS restringido, rate limiting en login, errores genéricos | B-06, B-08, B-09, B-11 |
| 2 | Cabeceras en nginx (CSP, `X-Frame-Options`, `X-Content-Type-Options`); token en cookie `HttpOnly` | F-02, F-03 |
| 3 | Validar y limitar subidas; actualizar `multer` a 2.x; imágenes base vigentes y usuario no root | B-10, B-13, B-16, F-06, F-07 |
| 3 | Aumentar cobertura de pruebas hacia el 80 % | — |

## 5. Resultados del escaneo automatizado (OWASP ZAP) — pendiente

El pipeline ejecuta Spider → Active Scan (frontend) y API Scan (backend). Al completar la primera ejecución,
interpretar el reporte (no pegar solo el reporte crudo) con esta tabla. El porcentaje de mitigación debe ser el
medido en el escaneo real.

| Alerta | Severidad | Impacto en la calidad | Estado (prioridad de remediación) |
|---|---|---|---|
| _(pendiente de ejecución)_ | | | |

Alertas esperables según la revisión de código: *Missing Anti-clickjacking Header*, *X-Content-Type-Options Header Missing*,
*Content Security Policy Header Not Set* (F-03), *Server Leaks Version Information* y *Application Error Disclosure* (B-08).
