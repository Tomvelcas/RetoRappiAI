# Calidad, Seguridad y Entrega Continua

## Propósito

Este documento define la base de calidad y seguridad del repositorio para que el proyecto no dependa únicamente de una demo visual, sino también de una disciplina de ingeniería verificable.

## Qué queda automatizado en el repositorio

- `CI`: lint del backend, pruebas del backend con cobertura, type-check del frontend, build de Next.js y smoke tests de API con Newman.
- `Security`: auditoría de dependencias de Python con `pip-audit` y auditoría de dependencias de frontend con `npm audit`.
- `CodeQL`: análisis estático de seguridad sobre Python y TypeScript/JavaScript.
- `Dependency Review`: validación en pull requests para detectar nuevas dependencias de alto riesgo antes de fusionar cambios.
- `Dependabot`: actualización semanal de dependencias de backend, frontend y GitHub Actions.

## Qué aporta cada capa

### CI

- Evita regresiones funcionales.
- Comprueba que el backend sirva respuestas reales sobre la capa `processed/`.
- Valida que el frontend compile contra el contrato actual.
- Ejecuta una batería externa de smoke tests con Newman sobre endpoints críticos.

### Seguridad de dependencias

- Detecta vulnerabilidades conocidas en librerías antes de llevarlas a demo o producción.
- Refuerza una narrativa de supply-chain hygiene.

### CodeQL

- Da una capa de SAST útil sin exigir una plataforma adicional desde el primer día.
- Es especialmente valioso para detectar patrones inseguros o errores de código en backend y frontend.

### Dependency Review

- Hace visible el riesgo de introducir paquetes nuevos o versiones problemáticas en un pull request.

## Calidad específica para AI

La parte diferencial de este repositorio no debe ser solo “usar un LLM”, sino demostrar control sobre su comportamiento.

Por eso el backend incluye pruebas tipo `quality gate` para el chat:

- clasificación semántica de intención;
- rechazo explícito de preguntas que el dato no soporta;
- preservación de `evidence`, `warnings`, `source_tables` y `disclaimer`;
- separación clara entre respuesta determinística y enriquecimiento opcional con LLM.

Esto funciona como una forma inicial de evaluación de un sistema de AI sin caer todavía en un stack pesado de observabilidad o experiment tracking.

## Recomendaciones para GitHub

Además de los workflows incluidos, conviene habilitar en el repositorio:

1. `Dependabot alerts`
2. `Dependabot security updates`
3. `Secret scanning`
4. `Push protection`
5. `Branch protection rules` con status checks obligatorios

## Requisitos exactos para CodeQL y Dependency Review

Los dos errores más comunes no vienen del YAML sino de la configuración del repositorio en GitHub.

Debes revisar esto:

1. `Settings > Security > Advanced Security > Code Security`
2. `Settings > Security > Advanced Security > CodeQL analysis`
3. `Settings > Security > Advanced Security > Dependency Graph`
4. `Settings > Actions > General` y confirmar que GitHub Actions esté habilitado

Qué habilitar:

1. `Code Security`
2. `CodeQL analysis`
3. `Dependency Graph`

Con este repositorio:

- ya existe un workflow propio de CodeQL (`advanced setup` vía GitHub Actions);
- no hace falta activar además `default setup` si quieres conservar este workflow;
- si no tienes licencia de GitHub Code Security / GHAS, deja CodeQL deshabilitado en automático y no lo uses como check requerido;
- el workflow quedó en modo manual para evitar ruido en CI mientras no tengas licencia.

Importante:

- Si el repositorio es `público`, CodeQL y Dependency Review deberían poder funcionar.
- Si el repositorio es `privado`, GitHub exige `GitHub Code Security / GHAS` para estas capacidades en repositorios privados de organización.
- Si el repositorio privado está en una cuenta personal o en una organización sin esa licencia, el workflow seguirá fallando aunque el YAML esté correcto.
- En pull requests desde forks, GitHub restringe capacidades de seguridad; por eso los workflows deben tolerar esos casos y no asumir permisos de escritura.

Qué checks conviene exigir en branch protection:

1. `CI`
2. `Dependency Review`

Si en el futuro habilitas CodeQL con licencia, ahí sí conviene volver a exigir los checks de `analyze`.

## SonarQube / SonarCloud

No es obligatorio para esta prueba.

Recomendación:

- usar la base incluida en este repositorio como estándar mínimo;
- agregar `SonarQube Cloud` solo si quieres una capa extra de visibilidad con dashboard, badge y quality gate externo.

SonarCloud puede mejorar la percepción del proyecto, pero no reemplaza:

- pruebas reales,
- auditoría de dependencias,
- SAST,
- ni evaluaciones del comportamiento del chatbot.

### Configuración mínima para que Sonar lea coverage real

El repositorio ahora deja listos estos reportes:

- `backend/coverage.xml` desde `pytest --cov`
- `frontend/coverage/lcov.info` desde `vitest`
- `newman-report.xml` como evidencia de smoke tests de API

Importante:

- Newman fortalece la validación end-to-end, pero `no cuenta como code coverage` de Python o TypeScript.
- Para que Sonar muestre cobertura de Python, debes usar análisis en CI y no solo `automatic analysis`.
- Este repositorio ya deja fijos:
  1. `SONAR_PROJECT_KEY=Tomvelcas_RetoRappiAI`
  2. `SONAR_ORGANIZATION=tomvelcas`
- En GitHub solo necesitas configurar el secreto `SONAR_TOKEN`.
- El `SONAR_TOKEN` no es arbitrario: debe ser un token real generado en SonarQube Cloud con permiso para ejecutar análisis sobre ese proyecto.

## Qué NO estoy agregando por ahora

- escáneres redundantes que dupliquen señales sin aportar claridad;
- observabilidad MLOps pesada para un backend que aún no sirve un modelo propio;
- RAG evaluation tooling, porque el chatbot actual es analytics-first y no retrieval-first.

## Siguiente nivel si queda tiempo

- reporte de cobertura como badge;
- dashboards de calidad con SonarCloud;
- golden dataset de preguntas para evaluación del chatbot;
- trazabilidad de prompts y respuestas LLM en un entorno separado de desarrollo.
