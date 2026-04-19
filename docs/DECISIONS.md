# Registro de Decisiones

## D-001: Mantener Python + FastAPI

- **Estado**: Aprobada
- **Decisión**: Mantener backend en Python con FastAPI.
- **Por qué**:
  - acelera profiling del dato y lógica analítica,
  - encaja naturalmente con notebooks,
  - permite tipado, tests y APIs limpias sin complejidad excesiva.
- **Alternativa descartada**: Go
- **Motivo del descarte**:
  - mejor para servicios de alto throughput, pero peor trade-off para una prueba orientada a analítica y velocidad de iteración.

## D-002: Analytics-first en vez de RAG puro

- **Estado**: Aprobada
- **Decisión**: La verdad numérica se resuelve con funciones determinísticas sobre data procesada.
- **Por qué**:
  - el dataset es estructurado,
  - embeddings no resuelven agregados,
  - reduce alucinaciones y costo.
- **Alternativa descartada**: chatbot con RAG generalista y vector DB
- **Motivo del descarte**:
  - agregaría complejidad sin justificar precisión adicional.

## D-003: Dashboard agregado temporal en vez de dashboard por tienda

- **Estado**: Aprobada
- **Decisión**: Diseñar el dashboard alrededor de una sola métrica temporal agregada.
- **Por qué**:
  - no se observaron dimensiones por tienda,
  - evita features ficticias,
  - alinea producto con evidencia.
- **Alternativa descartada**: rankings, comparativos o incidentes por tienda
- **Motivo del descarte**:
  - el dataset no lo soporta.

## D-004: Procesar raw antes de servir producto

- **Estado**: Aprobada
- **Decisión**: No consumir cientos de CSV crudos directamente desde el backend runtime.
- **Por qué**:
  - mejora trazabilidad,
  - simplifica APIs,
  - permite deduplicación y calidad del dato previas.

## D-005: LLM solo para interpretación y redacción

- **Estado**: Aprobada
- **Decisión**: El LLM no debe calcular ni inferir métricas.
- **Por qué**:
  - protege precisión,
  - hace la demo defendible,
  - reduce riesgo de alucinación numérica.

## D-006: Documentación de alto valor en `docs/`

- **Estado**: Aprobada
- **Decisión**: Mantener `docs/` como fuente de verdad y `AGENTS.md` como índice operativo.
- **Por qué**:
  - orienta futuros agentes y desarrolladores,
  - reduce deriva de alcance,
  - hace visible el razonamiento detrás del sistema.

## D-007: CI base primero, SonarCloud después

- **Estado**: Aprobada
- **Decisión**: Priorizar GitHub Actions con lint, tests y build. Tratar SonarCloud como extra.
- **Por qué**:
  - maximiza señal de calidad con menor fricción,
  - evita bloquear el MVP por credenciales o setup externo.

## D-008: Honradez analítica por encima de feature breadth

- **Estado**: Aprobada
- **Decisión**: Preferir menos features pero completamente defendibles.
- **Por qué**:
  - la prueba evalúa criterio,
  - una capacidad no soportada daña credibilidad más que una omisión explícita.
