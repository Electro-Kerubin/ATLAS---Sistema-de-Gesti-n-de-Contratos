# Pipeline CI/CD con controles de seguridad — ATLAS

Workflow: [`.github/workflows/devsecops.yml`](../../.github/workflows/devsecops.yml) (GitHub Actions).
Se ejecuta en `push` y `pull_request` hacia `main` y `qa`, y manualmente (`workflow_dispatch`).

## Etapas y controles

Flujo: Source → Build/Test → Análisis de seguridad → Deploy staging → DAST → Deploy.

| Etapa | Job | Control | Por qué en esta etapa |
|---|---|---|---|
| Source | `secrets` | Gitleaks (secretos en el historial) | Es el control más rápido; si hay credenciales expuestas no tiene sentido seguir (fail fast). |
| Build + Test | `backend` | `npm ci`, chequeo de sintaxis, pruebas de humo con cobertura (`node --test`) | Base de la pirámide: rápido y barato. |
| Build + Test | `frontend` | `npm ci`, ESLint, `vite build` | Detecta errores de calidad y de compilación antes del análisis profundo. |
| Análisis de seguridad | `sast` | SonarCloud (código de BACKEND y FRONTEND + cobertura) | SAST: no necesita ejecutar la app; corre tras Build/Test para recibir la cobertura. |
| Análisis de seguridad | `sca` | Snyk (dependencias de BACKEND y FRONTEND, matriz) | SCA: lee `package-lock.json`; corre en paralelo con SAST. |
| Deploy staging | `staging-dast` | `docker compose up` (Postgres + API + web) y pruebas E2E de humo | Entorno efímero dentro del runner. |
| DAST | `staging-dast` | OWASP ZAP: Full Scan al frontend (Spider → Active Scan) y API Scan al backend (OpenAPI) | Requiere la app en ejecución. Solo se ataca el staging efímero propio. |
| Deploy | `deploy` | Publica imágenes en GHCR (solo `main`, environment `production`) | Solo si pasó todo lo anterior. |

Los reportes (Gitleaks, Snyk, cobertura, ZAP) quedan como *artifacts* de cada ejecución.

## Interruptor de bloqueo: `SECURITY_GATE`

El proyecto es intencionalmente vulnerable, así que los controles de seguridad **reportan pero no bloquean** por defecto.
Para convertirlos en compuertas reales (el pipeline falla si hay hallazgos), crear la variable de repositorio
`SECURITY_GATE = true`. Afecta a: Gitleaks, Snyk, SonarCloud (quality gate), ZAP y el lint del frontend.

## Secretos y variables a configurar en GitHub

Repositorio → Settings → Secrets and variables → Actions.

| Tipo | Nombre | Qué es |
|---|---|---|
| Secret | `SONAR_TOKEN` | Token de SonarCloud (My Account → Security → Generate Tokens) |
| Secret | `SNYK_TOKEN` | Token de API de Snyk (Account settings → Auth Token) |
| Variable | `SONAR_ORGANIZATION` | Clave de la organización en SonarCloud |
| Variable | `SONAR_PROJECT_KEY` | Clave del proyecto en SonarCloud |
| Variable (opcional) | `SECURITY_GATE` | `true` para bloquear ante hallazgos |
| Variable (opcional) | `PRODUCTION_API_URL` | URL pública de la API con la que se construye la imagen del frontend (por defecto `http://localhost:4450`) |

Las credenciales locales del archivo `.credenciales` (ignorado por git) deben copiarse a esos secretos/variables;
**nunca** se escriben en el workflow ni se versionan. Si falta un token, el job correspondiente se omite con un aviso
en lugar de fallar.

En SonarCloud, desactivar el *Automatic Analysis* del proyecto: no puede convivir con el análisis desde CI.

## Notas del entorno actual

- `BACKEND/Dockerfile` hace `COPY uploads/` y ese directorio no está versionado; el workflow lo crea antes de construir
  (`mkdir -p BACKEND/uploads`) en lugar de modificar el Dockerfile.
- Los archivos `.env` están versionados a propósito; Gitleaks los reportará (ver informe de hallazgos).
- No hay pruebas unitarias en el frontend; solo hay pruebas de humo en el backend (`BACKEND/tests/smoke.test.js`).
- El lint del frontend tiene errores preexistentes (`no-unused-vars`); se reportan sin bloquear.

## Métricas objetivo (referencia de la clase)

| Métrica | Objetivo | Cómo se mide aquí |
|---|---|---|
| Tiempo de build | 15 min | `timeout-minutes: 15` en los jobs de build; duración en la pestaña Actions |
| Tasa de éxito | 95 % | Historial de ejecuciones de Actions |
| Cobertura de código | 80 % | `lcov` del backend en SonarCloud (hoy ~18 %, solo pruebas de humo) |
| MTTR | 2 h | Tiempo entre un run fallido y el siguiente exitoso |
