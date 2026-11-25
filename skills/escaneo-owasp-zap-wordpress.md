---
name: escaneo-owasp-zap-wordpress
description: Actividad práctica de pruebas automatizadas de seguridad con OWASP ZAP sobre WordPress (VulnHub): Spider, Active Scan, informe e interpretación de alertas. Usar al ejecutar o reportar un escaneo ZAP.
---

# Desarrollo y ejecución de pruebas automatizadas: OWASP ZAP

Fuente: Actividad 3.2.2 (ISY1102, EA3, IL3.2, 45 min, individual).

Objetivo de la actividad: comprender CI/CD y aplicarlo conceptualmente, incluyendo controles de seguridad automatizados en las etapas más apropiadas según el software.

Idioma de salida por defecto: español.

## Práctica: escaneo con OWASP ZAP (Actividad 3.2.2)

Escenario: aplicación WordPress en una máquina VulnHub. Objetivo: ejecutar pruebas, generar informe y interpretarlo.

### 2.1 Configuración
1. Abrir ZAP → **Quick Start**.
2. URL objetivo: IP de la máquina VulnHub (ej. `http://192.168.1.XX/`).
3. Modo de ataque: **Standard** o **Protected** (si ya se definió el contexto).

### 2.2 Ejecución
| Paso | Acción en ZAP | Objetivo |
|---|---|---|
| A. Spider | Clic derecho en la URL del árbol de sitios → Attack → **Spider** | Mapear WordPress: archivos ocultos, `/wp-content/`, `/wp-includes/`, formularios |
| B. Active Scan | Terminado el Spider: clic derecho en URL → Attack → **Active Scan** | Atacar activamente buscando vulnerabilidades conocidas |

El Active Scan prueba: **SQL Injection** (buscador de WordPress), **XSS** (comentarios, login), **cabeceras** faltantes (ej. `X-Frame-Options` contra Clickjacking).

### 2.3 Informe de ejecución
- Menú **Report** → **Generate Report**.
- Formato: **HTML** (anexo del proyecto, visual) o **JSON/XML** (análisis técnico/procesable).
- Incluir: *Summary of Alerts* (por severidad) y *Alert Detail* (descripción técnica, URL afectada, solución sugerida).

### 2.4 Interpretación (no pegar solo el reporte)
Tabla de análisis para el informe semestral: `Alerta | Severidad | Impacto en la calidad | Estado`.

Ejemplos de la actividad:

| Alerta | Severidad | Impacto en la calidad | Estado |
|---|---|---|---|
| Absence of Anti-CSRF Tokens | Media | Un atacante podría forzar acciones del admin | Alta |
| X-Content-Type-Options Header Missing | Baja | Riesgo de interpretación errónea de archivos | Crítica |
| Vulnerable JS Libraries | Alta | Ejecución de código por plugins viejos | Pass |

> Nota: en el documento original la columna *Estado* es inconsistente con la severidad (ej. severidad Baja con estado "Crítica"; Alta con "Pass"). Al usarla como plantilla, mantener coherencia: Estado = prioridad de remediación / resultado del control, y no contradecir la severidad.

### 2.5 Recomendación técnica típica para WordPress
Es común ver muchas alertas *Missing Security Headers*. Recomendación modelo para el Informe de Certificación:

> "Se recomienda la instalación y configuración de un plugin de seguridad (como Wordfence) o la edición del archivo `.htaccess` para implementar cabeceras de seguridad y tokens Anti-CSRF, mitigando el 60 % de las alertas de severidad media reportadas por OWASP ZAP."

(El 60 % es la cifra del texto de ejemplo; en un informe real usar el porcentaje medido en el escaneo.)

Ejemplo ilustrativo de cabeceras en `.htaccess` (no está en las fuentes; apoyo práctico):
```apache
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
</IfModule>
```

---


---

## Instrucciones para el agente

1. Seguir el flujo Spider → Active Scan → Report.
2. Entregar tabla `Alerta | Severidad | Impacto | Estado` coherente, sin pegar solo el reporte crudo.
3. Dar una recomendación técnica concreta y usar el porcentaje real medido, no el 60 % del ejemplo.
4. Escanear solo entornos propios o de laboratorio autorizados.
