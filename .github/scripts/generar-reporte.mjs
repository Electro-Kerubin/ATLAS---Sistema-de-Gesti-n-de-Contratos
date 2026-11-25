// Genera un reporte HTML autocontenido (y un resumen en markdown) a partir del
// reporte JUnit de las pruebas unitarias del backend (node --test).
//
// Uso: node generar-reporte.mjs <unitarias-junit.xml> [salida.html]
//
// Sin dependencias externas. Siempre termina con código 0: su único fin es reportar,
// aunque haya pruebas fallidas o falten archivos.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";

const [, , rutaUnitarias, salida = "reporte-unitarias.html"] = process.argv;

const ANSI = /\u001b\[[0-9;]*m/g;

function decodificar(texto = "") {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function escaparHtml(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function atributo(atributos, nombre) {
  const m = atributos.match(new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`));
  return m ? decodificar(m[1]) : "";
}

function limpiar(texto, max = 1500) {
  const limpio = decodificar(texto).replace(ANSI, "").trim();
  return limpio.length > max ? `${limpio.slice(0, max)}…` : limpio;
}

/** Extrae los <testcase> de un XML JUnit (formato de node --test y de Playwright). */
function parsear(ruta) {
  if (!ruta || !existsSync(ruta)) return null;
  const xml = readFileSync(ruta, "utf8");
  const casos = [];
  const re = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const atributos = m[1];
    const cuerpo = m[2] ?? "";
    let estado = "pasada";
    let detalle = "";
    const fallo = cuerpo.match(/<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/);
    if (fallo) {
      estado = "fallida";
      const mensaje = atributo(fallo[2], "message");
      detalle = limpiar([mensaje, fallo[3] ?? ""].filter(Boolean).join("\n"));
    } else if (/<skipped\b/.test(cuerpo)) {
      estado = "omitida";
    }
    casos.push({
      nombre: limpiar(atributo(atributos, "name"), 400),
      archivo: atributo(atributos, "classname"),
      duracion: Number(atributo(atributos, "time")) || 0,
      estado,
      detalle,
    });
  }
  return casos;
}

/** Clasifica la prueba para distinguir los defectos conocidos del resto de fallos. */
function categoria(caso) {
  const texto = `${caso.nombre} ${caso.archivo}`;
  if (/\[SEGURIDAD\]/i.test(texto)) return "Seguridad";
  if (/negativo/i.test(texto)) return "Negativa";
  return "Funcional";
}

function resumir(casos) {
  const total = casos.length;
  const pasadas = casos.filter((c) => c.estado === "pasada").length;
  const fallidas = casos.filter((c) => c.estado === "fallida").length;
  const omitidas = casos.filter((c) => c.estado === "omitida").length;
  const segundos = casos.reduce((acc, c) => acc + c.duracion, 0);
  return { total, pasadas, fallidas, omitidas, segundos };
}

const grupos = [
  { id: "unitarias", titulo: "Pruebas unitarias (backend)", casos: parsear(rutaUnitarias) },
];

const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
const ejecucion = process.env.GITHUB_RUN_ID
  ? `Ejecución #${process.env.GITHUB_RUN_NUMBER ?? ""} · ${process.env.GITHUB_REF_NAME ?? ""} · ${(process.env.GITHUB_SHA ?? "").slice(0, 7)}`
  : "Ejecución local";

// ---------------------------------------------------------------- HTML
function tarjeta(grupo) {
  if (!grupo.casos) {
    return `<section class="card"><h2>${escaparHtml(grupo.titulo)}</h2><p class="muted">Sin datos: no se encontró el reporte JUnit.</p></section>`;
  }
  const r = resumir(grupo.casos);
  const porcentaje = r.total ? Math.round((r.pasadas / r.total) * 100) : 0;
  return `<section class="card">
  <h2>${escaparHtml(grupo.titulo)}</h2>
  <div class="barra" role="img" aria-label="${porcentaje}% aprobadas"><span style="width:${porcentaje}%"></span></div>
  <dl class="cifras">
    <div><dt>Total</dt><dd>${r.total}</dd></div>
    <div><dt>Pasadas</dt><dd class="ok">${r.pasadas}</dd></div>
    <div><dt>Fallidas</dt><dd class="mal">${r.fallidas}</dd></div>
    <div><dt>Omitidas</dt><dd>${r.omitidas}</dd></div>
    <div><dt>Aprobación</dt><dd>${porcentaje}%</dd></div>
    <div><dt>Duración</dt><dd>${r.segundos.toFixed(1)} s</dd></div>
  </dl>
</section>`;
}

function filaFallo(caso) {
  return `<details class="fallo">
  <summary><span class="etiqueta ${categoria(caso).toLowerCase()}">${categoria(caso)}</span> ${escaparHtml(caso.nombre)}</summary>
  <pre>${escaparHtml(caso.detalle || "Sin detalle del error.")}</pre>
</details>`;
}

function tablaCompleta(grupo) {
  if (!grupo.casos || grupo.casos.length === 0) return "";
  const filas = grupo.casos
    .map(
      (c) => `<tr class="${c.estado}">
  <td><span class="estado ${c.estado}">${c.estado}</span></td>
  <td>${escaparHtml(c.nombre)}</td>
  <td>${categoria(c)}</td>
  <td class="num">${c.duracion.toFixed(2)} s</td>
</tr>`
    )
    .join("\n");
  return `<details class="todas">
  <summary>Ver las ${grupo.casos.length} pruebas de «${escaparHtml(grupo.titulo)}»</summary>
  <div class="scroll"><table>
    <thead><tr><th>Estado</th><th>Prueba</th><th>Tipo</th><th class="num">Duración</th></tr></thead>
    <tbody>${filas}</tbody>
  </table></div>
</details>`;
}

function seccionFallos(grupo) {
  const fallidas = (grupo.casos ?? []).filter((c) => c.estado === "fallida");
  if (fallidas.length === 0) return "";
  return `<h3>${escaparHtml(grupo.titulo)}: ${fallidas.length} fallida(s)</h3>\n${fallidas.map(filaFallo).join("\n")}`;
}

const totalFallidas = grupos.reduce(
  (acc, g) => acc + (g.casos ?? []).filter((c) => c.estado === "fallida").length,
  0
);

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de pruebas unitarias ATLAS</title>
<style>
  :root { --fondo:#f6f7f9; --superficie:#fff; --texto:#1c2430; --suave:#5b6675; --borde:#dde1e7;
          --ok:#1b7a3d; --mal:#b3261e; --aviso:#8a5a00; --acento:#1b7576; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fondo:#12161c; --superficie:#1a2028; --texto:#e6eaf0; --suave:#9aa5b4;
          --borde:#2c3541; --ok:#5fcf86; --mal:#ff8a80; --aviso:#ffc766; --acento:#5cc4c5; }
  }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px 16px; background:var(--fondo); color:var(--texto);
         font:15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width:1000px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:1.6rem; }
  h2 { margin:0 0 12px; font-size:1.1rem; }
  h3 { margin:24px 0 8px; font-size:1rem; }
  .muted { color:var(--suave); }
  .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); margin:20px 0; }
  .card { background:var(--superficie); border:1px solid var(--borde); border-radius:10px; padding:16px; }
  .barra { height:8px; background:var(--borde); border-radius:4px; overflow:hidden; margin-bottom:14px; }
  .barra span { display:block; height:100%; background:var(--ok); }
  .cifras { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:0; }
  .cifras dt { font-size:.75rem; color:var(--suave); text-transform:uppercase; letter-spacing:.04em; }
  .cifras dd { margin:0; font-size:1.3rem; font-weight:600; }
  .ok { color:var(--ok); } .mal { color:var(--mal); }
  details { background:var(--superficie); border:1px solid var(--borde); border-radius:8px; margin:8px 0; }
  summary { cursor:pointer; padding:10px 12px; }
  pre { margin:0; padding:12px; border-top:1px solid var(--borde); overflow-x:auto; white-space:pre-wrap;
        word-break:break-word; font:12.5px/1.45 ui-monospace, Consolas, monospace; color:var(--suave); }
  .etiqueta { display:inline-block; font-size:.7rem; padding:1px 7px; border-radius:10px; margin-right:6px;
              border:1px solid var(--borde); color:var(--suave); }
  .etiqueta.seguridad { color:var(--mal); border-color:var(--mal); }
  .etiqueta.negativa { color:var(--aviso); border-color:var(--aviso); }
  .scroll { overflow-x:auto; border-top:1px solid var(--borde); }
  table { width:100%; border-collapse:collapse; font-size:.9rem; }
  th, td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--borde); vertical-align:top; }
  th { color:var(--suave); font-weight:600; }
  .num { text-align:right; white-space:nowrap; }
  .estado { font-weight:600; }
  .estado.pasada { color:var(--ok); } .estado.fallida { color:var(--mal); } .estado.omitida { color:var(--aviso); }
  .nota { font-size:.85rem; color:var(--suave); margin-top:24px; }
</style>
</head>
<body>
<main>
  <h1>Reporte de pruebas unitarias ATLAS</h1>
  <p class="muted">${escaparHtml(ejecucion)} · ${escaparHtml(fecha)}</p>
  <div class="grid">
    ${grupos.map(tarjeta).join("\n    ")}
  </div>
  ${totalFallidas === 0 ? '<p class="ok"><strong>Todas las pruebas pasaron.</strong></p>' : `<h2>Pruebas fallidas (${totalFallidas})</h2>`}
  ${grupos.map(seccionFallos).join("\n")}
  <h2 style="margin-top:28px">Detalle completo</h2>
  ${grupos.map(tablaCompleta).join("\n")}
  <p class="nota">Las pruebas con etiqueta <em>Seguridad</em> o <em>Negativa</em> verifican el comportamiento esperado
  ante entradas inválidas o accesos sin autorización; en este sistema, intencionalmente vulnerable, un fallo suele
  indicar un defecto conocido y no un error de la prueba.</p>
</main>
</body>
</html>
`;

writeFileSync(salida, html, "utf8");

// ---------------------------------------------------------------- Markdown
const lineas = ["## Reporte de pruebas unitarias", "", "| Tipo | Total | Pasadas | Fallidas | Omitidas | Duración |", "|---|---:|---:|---:|---:|---:|"];
for (const g of grupos) {
  if (!g.casos) {
    lineas.push(`| ${g.titulo} | sin datos | | | | |`);
    continue;
  }
  const r = resumir(g.casos);
  lineas.push(`| ${g.titulo} | ${r.total} | ${r.pasadas} | ${r.fallidas} | ${r.omitidas} | ${r.segundos.toFixed(1)} s |`);
}
for (const g of grupos) {
  const fallidas = (g.casos ?? []).filter((c) => c.estado === "fallida");
  if (fallidas.length === 0) continue;
  lineas.push("", `<details><summary>${g.titulo}: ${fallidas.length} fallida(s)</summary>`, "");
  for (const c of fallidas) lineas.push(`- **[${categoria(c)}]** ${c.nombre.replace(/\|/g, "\\|")}`);
  lineas.push("", "</details>");
}
lineas.push("", "El reporte HTML completo está en el artefacto `reporte-unitarias`.");
const markdown = lineas.join("\n");

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
console.log(markdown);
console.log(`\nReporte HTML generado en ${salida}`);
