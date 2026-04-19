# PRD

## 1. Contexto del problema

La prueba técnica pide construir una aplicación web con dos componentes:

- un dashboard de visualización,
- un chatbot semántico capaz de responder preguntas sobre los datos.

El reto no es solo construir una interfaz funcional. La evaluación premia criterio de AI engineering, claridad técnica, calidad del código y capacidad de explicar decisiones frente a audiencia técnica y ejecutiva.

Tras inspeccionar `data/raw/`, el dataset disponible no soporta de forma comprobable un análisis por tienda. Lo que sí se observa es una serie temporal agregada, exportada en múltiples CSV anchos, con una única fila por archivo y columnas temporales cada 10 segundos. Por eso, el producto debe redefinirse como una solución **analytics-first sobre una métrica temporal agregada**, no como una plataforma de observabilidad por entidad individual.

Los notebooks y el pipeline ya cerraron la validación mínima necesaria para empezar backend:

- `201` CSVs raw,
- `67,141` timestamps únicos en la serie canónica,
- `4` grupos de ventanas duplicadas exactas,
- `27` ventanas incompletas,
- `1,963` timestamps solapados sin conflictos de valor,
- `25.04%` de puntos faltantes frente al rango continuo ideal.

Conclusión operativa:

- sí hay suficiente base para construir un backend defendible,
- no hay base para construir una narrativa por tienda o por entidad individual.

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
2. Mostrar al menos estos KPIs con vocabulario honesto:
   `nivel medio de señal del período`, `cobertura efectiva del rango`, `hora típica de mayor señal`, `horas anómalas fuertes detectadas`.
3. Permitir explorar tendencia diaria del nivel de señal por rango de tiempo.
4. Mostrar patrón intradiario agregado y desviación contra baseline por hora.
5. Mostrar métricas de calidad del dato: cobertura, duplicados, ventanas truncadas y gaps relevantes.
6. Mostrar horas o ventanas anómalas con `confidence flags` o advertencias de cobertura.

### Chat

7. Aceptar preguntas en lenguaje natural sobre la serie temporal y sus métricas derivadas.
8. Clasificar intención antes de responder.
9. Resolver preguntas numéricas mediante consultas determinísticas al dataset procesado.
10. Soportar inicialmente estas familias de intención:
    `trend_summary`, `period_comparison`, `intraday_pattern`, `anomaly_review`, `data_quality_status`, `metric_definition`, `unsupported_request`.
11. Responder con evidencia explícita: período consultado, métricas usadas, tablas fuente y advertencias.
12. Rechazar o redirigir preguntas que no estén soportadas por la granularidad real del dato.

### Ingeniería y operación

13. Ejecutarse localmente vía Docker Compose.
14. Mantener frontend y backend desacoplados mediante contratos claros.
15. Dejar trazabilidad suficiente para explicar cómo se obtuvo cada insight principal.

### Backend MVP

16. Exponer `GET /health`.
17. Exponer `GET /api/v1/metrics/overview` basado en `data/processed/`, no en mocks de disponibilidad por tienda.
18. Exponer `POST /api/v1/chat/query` con catálogo cerrado de intenciones y respuesta grounded.
19. Hacer que `overview` consuma como mínimo `availability_daily.csv`, `availability_hourly.csv`, `availability_quality_report.json` y `availability_hourly_anomalies.csv`.
20. Evitar labels como `Availability Rate`, `Affected Stores` o `Incident Hours` mientras no exista evidencia que los sustente.

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
- La serie canónica procesada deja `67,141` timestamps únicos.
- Hay `1,963` timestamps solapados entre ventanas y `0` conflictos de valor.
- Hay `4` grupos de ventanas exactas duplicadas y `27` ventanas incompletas.
- Faltan `22,432` puntos frente al rango continuo ideal, equivalente a `25.04%` del rango completo.
- No se observaron IDs de tienda, nombres de tienda ni dimensiones por entidad.
- No se observaron valores vacíos ni negativos.
- Ya existen artefactos procesados suficientes para backend MVP en `data/processed/`.

Implicación de producto:

- No se debe prometer analítica por tienda.
- El dashboard y el chat deben construirse sobre una **serie temporal agregada de una sola métrica observada**.
- La semántica exacta de la métrica debe presentarse con cautela hasta validación de negocio.
- El backend puede arrancar ya sobre el contrato `processed/`, aunque la semántica exacta de negocio siga siendo prudente.

## 8. Criterios de éxito

La solución será exitosa si:

- comunica con honestidad qué soporta y qué no soporta el dataset,
- convierte los CSV anchos en una capa analítica consistente,
- entrega un dashboard agregado útil y claro,
- el chatbot responde con grounding, límites y evidencia,
- el backend deja de usar vocabulario placeholder no soportado por el dato,
- la arquitectura demuestra criterio de AI engineering,
- el repositorio es ordenado, ejecutable y fácil de explicar.

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Sobreinterpretar la métrica como “disponibilidad por tienda” | Alto | Fijar la narrativa en serie temporal agregada y documentar explícitamente la restricción |
| Semántica ambigua de `synthetic_monitoring_visible_stores` | Alto | Tratar el campo como proxy observada hasta validación; evitar claims causales o de negocio demasiado específicos |
| Ventanas duplicadas o truncadas contaminan métricas | Alto | Deduplicar por ventana temporal exacta y etiquetar ventanas incompletas antes de cualquier agregación |
| El chatbot inventa explicaciones o granularidad inexistente | Alto | Intent taxonomy cerrada, consultas determinísticas, guardrails y respuesta “no soportado” |
| El backend hereda labels placeholder que implican capacidades no soportadas | Medio | Usar vocabulario neutral: señal, cobertura, baseline, desvío, anomalía |
| Uso excesivo de tokens | Medio | Preagregaciones, rutas sin LLM para preguntas simples y contexto compacto |
| Falta de tiempo para polish | Medio | Priorizar pipeline analítico, backend y demo sobre features cosméticas |
| Integrar tooling adicional tipo SonarCloud consume tiempo de entrega | Medio | Mantenerlo como stretch goal después de CI base funcional |
