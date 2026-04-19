# PRD

## 1. Contexto del problema

La prueba técnica pide construir una aplicación web con dos componentes:

- un dashboard de visualización,
- un chatbot semántico capaz de responder preguntas sobre los datos.

El reto no es solo construir una interfaz funcional. La evaluación premia criterio de AI engineering, claridad técnica, calidad del código y capacidad de explicar decisiones frente a audiencia técnica y ejecutiva.

Tras inspeccionar `data/raw/`, el dataset disponible no soporta de forma comprobable un análisis por tienda. Lo que sí se observa es una serie temporal agregada, exportada en múltiples CSV anchos, con una única fila por archivo y columnas temporales cada 10 segundos. Por eso, el producto debe redefinirse como una solución **analytics-first sobre una métrica temporal agregada**, no como una plataforma de observabilidad por entidad individual.

## 2. Objetivo del producto

Construir una aplicación local, dockerizada y demostrable que permita:

- entender la evolución temporal de la métrica observada,
- detectar patrones, anomalías, cobertura y calidad del dato,
- responder preguntas en lenguaje natural de forma grounded y trazable,
- demostrar uso disciplinado de AI sin inflar capacidades no soportadas por el dataset.

## 3. Alcance

### En alcance para el MVP defendible

- pipeline de entendimiento y sanitización del dataset en notebooks,
- normalización de CSV anchos a una tabla temporal canónica,
- capa de métricas determinísticas para dashboard agregado,
- dashboard web con foco en tendencia, variabilidad, cobertura y calidad,
- chatbot semántico grounded sobre consultas determinísticas,
- desarrollo local con Docker,
- CI base con checks de calidad y build reproducible,
- documentación estratégica y técnica suficiente para guiar implementación y demo.

### Fuera de alcance para esta versión

- analítica por tienda, ciudad, brand o segmento no evidenciado en el dato,
- ranking de tiendas,
- root cause analysis causal,
- agentes autónomos en producción,
- vector database o RAG generalista sobre datos numéricos,
- autenticación, multitenancy o despliegue cloud completo,
- memoria conversacional extensa o personalización avanzada del chat.

## 4. Audiencia de demo

- VP Tech o perfil ejecutivo técnico que evaluará criterio de producto e ingeniería.
- Evaluadores técnicos que revisarán estructura, trazabilidad y decisiones de AI.
- Potencial audiencia operativa interesada en entender comportamiento temporal de la métrica agregada.

## 5. Requerimientos funcionales

### Dashboard

1. Mostrar una vista general con KPIs agregados derivados de la serie temporal procesada.
2. Permitir explorar tendencia temporal por rango de tiempo.
3. Mostrar métricas de calidad del dato: cobertura, duplicados, ventanas truncadas y gaps relevantes.
4. Permitir comparar períodos equivalentes de forma agregada.
5. Mostrar ventanas anómalas o comportamientos fuera de patrón con criterio reproducible.

### Chat

6. Aceptar preguntas en lenguaje natural sobre la serie temporal y sus métricas derivadas.
7. Clasificar intención antes de responder.
8. Resolver preguntas numéricas mediante consultas determinísticas al dataset procesado.
9. Responder con evidencia explícita: período consultado, métricas usadas y advertencias.
10. Rechazar o redirigir preguntas que no estén soportadas por la granularidad real del dato.

### Ingeniería y operación

11. Ejecutarse localmente vía Docker Compose.
12. Mantener frontend y backend desacoplados mediante contratos claros.
13. Dejar trazabilidad suficiente para explicar cómo se obtuvo cada insight principal.

## 6. Requerimientos no funcionales

- **Precisión**: ningún número del chat debe surgir de inferencia libre del LLM.
- **Trazabilidad**: cada respuesta debe poder explicarse desde data procesada y lógica determinística.
- **Modularidad**: backend separado entre ingesta lógica, analítica y chat orchestration.
- **Mantenibilidad**: código tipado, testeable y documentado.
- **Costo controlado**: uso de tokens acotado y justificable.
- **Calidad**: lint, tests y build reproducible en CI.
- **Demo readiness**: startup simple, comandos claros y narrativa defendible en 5 a 7 minutos.

## 7. Restricciones derivadas del dataset

Observaciones comprobadas tras inspección:

- Hay `201` archivos CSV en `data/raw/`.
- Cada archivo tiene exactamente `1` fila de datos.
- Los cuatro primeros campos son siempre:
  - `Plot name`
  - `metric (sf_metric)`
  - `Value Prefix`
  - `Value Suffix`
- `Plot name` siempre vale `NOW`.
- `metric (sf_metric)` siempre vale `synthetic_monitoring_visible_stores`.
- El resto de columnas son timestamps serializados como texto, por ejemplo:
  - `Sun Feb 01 2026 06:11:20 GMT-0500 (hora estándar de Colombia)`
- La cadencia observada es de `10 segundos`.
- La cobertura observada va de `2026-02-01 06:11:20 -05:00` a `2026-02-11 15:00:00 -05:00`.
- La mayoría de ventanas cubre `~60m 20s` con solape entre archivos consecutivos.
- Hay ventanas truncadas al inicio/cierre de jornada y 4 ventanas exactas duplicadas.
- No se observaron IDs de tienda, nombres de tienda ni dimensiones por entidad.
- No se observaron valores vacíos ni negativos.

Implicación de producto:

- No se debe prometer analítica por tienda.
- El dashboard y el chat deben construirse sobre una **serie temporal agregada de una sola métrica observada**.
- La semántica exacta de la métrica debe presentarse con cautela hasta validación de negocio.

## 8. Criterios de éxito

La solución será exitosa si:

- comunica con honestidad qué soporta y qué no soporta el dataset,
- convierte los CSV anchos en una capa analítica consistente,
- entrega un dashboard agregado útil y claro,
- el chatbot responde con grounding, límites y evidencia,
- la arquitectura demuestra criterio de AI engineering,
- el repositorio es ordenado, ejecutable y fácil de explicar.

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Sobreinterpretar la métrica como “disponibilidad por tienda” | Alto | Fijar la narrativa en serie temporal agregada y documentar explícitamente la restricción |
| Semántica ambigua de `synthetic_monitoring_visible_stores` | Alto | Tratar el campo como proxy observada hasta validación; evitar claims causales o de negocio demasiado específicos |
| Ventanas duplicadas o truncadas contaminan métricas | Alto | Deduplicar por ventana temporal exacta y etiquetar ventanas incompletas antes de cualquier agregación |
| El chatbot inventa explicaciones o granularidad inexistente | Alto | Intent taxonomy cerrada, consultas determinísticas, guardrails y respuesta “no soportado” |
| Uso excesivo de tokens | Medio | Preagregaciones, rutas sin LLM para preguntas simples y contexto compacto |
| Falta de tiempo para polish | Medio | Priorizar pipeline analítico, backend y demo sobre features cosméticas |
| Integrar tooling adicional tipo SonarCloud consume tiempo de entrega | Medio | Mantenerlo como stretch goal después de CI base funcional |
