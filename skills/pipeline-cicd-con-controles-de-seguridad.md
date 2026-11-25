---
name: pipeline-cicd-con-controles-de-seguridad
description: Diseño de pipelines CI/CD con controles DevSecOps: etapas, Shift-Left, SAST, DAST, dependencias, secretos, pirámide de testing, métricas y buenas prácticas. Usar al diseñar o revisar un pipeline.
---

# Diseño de un Pipeline CI/CD con Controles de Seguridad

Fuente: PPT 3.2.1 «Diseño de un Pipeline CI/CD con Controles de Seguridad».

Idioma de salida por defecto: español.

## Pipelines CI/CD con controles de seguridad

### 3.1 Por qué automatizar
- **Testing manual**: consume tiempo, introduce inconsistencias, retrasa la detección de errores y no escala con la complejidad.
- **Automatización**: velocidad (minutos, validación por commit), consistencia/precisión (misma ejecución siempre), escalabilidad (miles de pruebas en paralelo).
- Automatizar pruebas e integrar seguridad es el estándar para mantener calidad sin sacrificar velocidad.

### 3.2 Definición
Pipeline = conjunto de pasos automatizados que llevan el código desde su creación hasta la entrega al usuario; es el "motor" de CI/CD (Integración Continua y Entrega/Despliegue Continuo). Elimina tareas manuales repetitivas y errores humanos.

### 3.3 Componentes (etapas)
1. **Source** – control de versiones (Git, Bitbucket); cada commit dispara el proceso.
2. **Build** – compilar y empaquetar artefactos (binarios, imágenes de contenedor).
3. **Test** – unitarias, integración y funcionales antes de fusionar.
4. **Análisis de seguridad** – escaneo de vulnerabilidades, dependencias de terceros, políticas (DevSecOps).
5. **Deploy** – envío automático a staging/producción tras pasar todas las revisiones.

### 3.4 Shift-Left Security
Integrar seguridad desde las etapas más tempranas del ciclo de desarrollo.
- **Detección temprana**: antes de producción.
- **Reducción de costos**: corregir pronto es mucho más barato que tras un incidente.
- **Minimización de riesgos**: menor superficie de ataque.
- **Integración en el pipeline**: automatizado, no manual ni aislado.

Controles DevSecOps recomendados:
| Control | Qué hace | Etapa sugerida |
|---|---|---|
| **SAST** (análisis estático) | Escanea código fuente buscando patrones inseguros, sin ejecutar | Tras commit / junto a Build |
| **Gestión de dependencias (SCA)** | Detecta vulnerabilidades en librerías de terceros | Build |
| **Validación de secretos** | Evita exponer credenciales/claves en el código | Pre-commit / Source |
| **DAST** (análisis dinámico) | Pruebas de seguridad sobre la app en ejecución (ej. OWASP ZAP) | Staging, tras Deploy |

(La asignación de etapas es la lógica de aplicación conceptual de la actividad: el alumno decide dónde ubicar cada control según las necesidades del software.)

### 3.5 Estrategia de calidad: Pirámide de testing
- **Base ancha: unitarias** – rápidas y económicas, feedback inmediato.
- **Medio: integración** – interacción entre componentes.
- **Vértice: E2E** – validación exhaustiva del sistema completo, menos numerosas.
- **Fail Fast**: el pipeline se detiene ante el primer fallo; ejecutar pruebas rápidas primero.

### 3.6 Herramientas CI/CD
- **Jenkins** – open source, extensible con plugins, ideal para pipelines complejos/personalizados.
- **GitLab CI/CD** – integra control de versiones y CI/CD en una plataforma.
- **GitHub Actions** – nativo de GitHub, workflows y actions reutilizables.

### 3.7 Métricas (valores objetivo de la presentación)
| Métrica | Objetivo | Significado |
|---|---|---|
| Tiempo de build | 15 min | Duración commit → artefacto desplegable |
| Tasa de éxito | 95 % | Builds sin fallos |
| Cobertura de código | 80 % | Código validado por pruebas automatizadas |
| MTTR | 2 h | Tiempo medio de recuperación/resolución de fallos |

### 3.8 Buenas prácticas
- **Builds rápidos**: paralelizar pruebas, cachear dependencias, optimizar compilación.
- **Fail fast**: pruebas rápidas primero, detener al primer fallo, feedback inmediato.
- **Infraestructura como Código (IaC)**: versionar la configuración del pipeline, herramientas declarativas, reproducibilidad.

### 3.9 Requisitos organizacionales
Compromiso con la automatización, inversión en herramientas y capacitación, cultura de mejora continua, monitoreo constante de métricas. El cambio real es **cultural**, no solo instalar herramientas.

### 3.10 Plantilla ilustrativa (no está en las fuentes)
Esqueleto de Jenkinsfile declarativo que refleja las etapas 3.3–3.5; adaptar herramientas y comandos al proyecto.
```groovy
pipeline {
  agent any
  options { timeout(time: 15, unit: 'MINUTES') }   // meta: build ≤ 15 min
  stages {
    stage('Source')   { steps { checkout scm } }
    stage('Secrets')  { steps { sh 'echo "escaneo de secretos (ej. gitleaks)"' } }
    stage('Build')    { steps { sh 'mvn -B -DskipTests package' } }
    stage('Unit')     { steps { sh 'mvn -B test' } }                       // base de la pirámide
    stage('SAST + SCA') {
      parallel {
        stage('SAST') { steps { sh 'echo "análisis estático (ej. SonarQube)"' } }
        stage('SCA')  { steps { sh 'echo "dependencias (ej. OWASP Dependency-Check)"' } }
      }
    }
    stage('Integration') { steps { sh 'mvn -B verify' } }
    stage('Deploy staging') { steps { sh 'echo "deploy a staging"' } }
    stage('DAST')     { steps { sh 'echo "OWASP ZAP baseline contra staging"' } }
    stage('E2E')      { steps { sh 'echo "pruebas E2E"' } }
    stage('Deploy prod') {
      when { branch 'main' }
      steps { sh 'echo "deploy a producción"' }
    }
  }
  post { failure { echo 'Fail fast: pipeline detenido en la primera falla' } }
}
```

---


---

## Instrucciones para el agente

1. Proponer etapas Source → Build → Test → Seguridad → Deploy.
2. Indicar en qué etapa y por qué va cada control (SAST, SCA, secretos, DAST).
3. Aplicar fail fast y pirámide de testing.
4. Cerrar con las métricas objetivo (3.7) y buenas prácticas.
5. Distinguir contenido de la fuente de ejemplos ilustrativos.
