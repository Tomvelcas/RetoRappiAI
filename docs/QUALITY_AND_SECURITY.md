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

## Qué NO estoy agregando por ahora

- escáneres redundantes que dupliquen señales sin aportar claridad;
- observabilidad MLOps pesada para un backend que aún no sirve un modelo propio;
- RAG evaluation tooling, porque el chatbot actual es analytics-first y no retrieval-first.

## Siguiente nivel si queda tiempo

- reporte de cobertura como badge;
- dashboards de calidad con SonarCloud;
- golden dataset de preguntas para evaluación del chatbot;
- trazabilidad de prompts y respuestas LLM en un entorno separado de desarrollo.
