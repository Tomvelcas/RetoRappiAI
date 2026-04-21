# Estrategia AI

## 1. Principio base

La AI en este proyecto debe amplificar comprensión y comunicación, no reemplazar verdad numérica.

Regla central:

> El LLM no calcula la métrica. El LLM interpreta una salida determinística ya calculada.

## 2. Dónde usar AI

### Sí usar AI en

- interfaz conversacional sobre insights ya calculados,
- clasificación de intención de preguntas,
- reformulación clara de respuestas para audiencia no técnica,
- sugerencia de follow-up questions,
- apoyo a productividad de ingeniería y documentación durante desarrollo.

### Uso complementario posible

- retrieval ligero sobre documentación interna para preguntas de metodología o definición,
- nunca como sustituto de la capa analítica numérica.

## 3. Dónde no usar AI

- cálculo de KPIs,
- parsing principal de timestamps,
- deduplicación y sanitización,
- agregaciones temporales,
- decisiones de calidad del dato,
- inferencia de granularidad inexistente,
- atribución causal no respaldada por data adicional.

## 4. Por qué no conviene un RAG puro

Este dataset es una serie temporal estructurada y agregada. Un pipeline RAG puro sería mala elección porque:

- embeddings no calculan agregados con precisión,
- los CSV no son conocimiento narrativo sino matrices temporales,
- el costo y complejidad de vectorizar cientos de snapshots no aporta valor real,
- la fuente de verdad debería ser una tabla procesada, no chunks semánticos del raw.

Conclusión:

- **no vector DB como default**,
- **no RAG generalista para preguntas numéricas**,
- **sí analítica determinística + LLM de superficie**.

## 5. Patrón recomendado para el chat

### Pipeline

1. Pregunta del usuario
2. Planner semántico que detecta intención y tipo de salida (`answer`, `chart`, `report`, `conclusions`)
3. Validación de soporte por dataset
4. Normalización de filtros temporales y reutilización opcional de contexto conversacional
5. Consulta determinística
6. Construcción de evidencia y artefactos visuales compactos
7. Formateo con composer determinístico y, si aplica, enriquecimiento opcional con LLM
8. Respuesta con advertencias, trazabilidad y follow-ups

### Intenciones soportadas hoy

- `trend_summary`
- `period_comparison`
- `intraday_pattern`
- `hourly_coverage_lookup`
- `hourly_coverage_profile`
- `daily_coverage_profile`
- `anomaly_review`
- `data_quality_status`
- `coverage_extremes`
- `day_briefing`
- `weekday_weekend_comparison`
- `weekend_coverage_report`
- `metric_definition`
- `unsupported_request`

### Objeto de evidencia sugerido

```json
{
  "intent": "period_comparison",
  "time_window": "2026-02-10 06:00 - 12:00",
  "comparison_window": "2026-02-09 06:00 - 12:00",
  "metrics": {
    "mean_signal": 3209285.93,
    "coverage_ratio": 0.7449,
    "pct_change_vs_previous_period": 4.2
  },
  "warnings": ["Cobertura parcial del período consultado"],
  "source_tables": ["availability_daily.csv", "availability_quality_report.json"]
}
```

Recomendación adicional:

- toda evidencia enviada al LLM debe incluir `coverage_flag` o advertencias de confianza cuando la cobertura sea parcial,
- toda respuesta sobre anomalías debe incluir también `n_points` o una traducción compacta de ese soporte.
- cuando la salida sea visual, el backend debe entregar artefactos compactos y typed en vez de delegar el gráfico al modelo.

## 6. Estrategias para economizar tokens

- No enviar series completas al modelo.
- Precalcular agregados útiles en `processed/`.
- Priorizar `availability_daily.csv`, `availability_hourly.csv` y `availability_quality_report.json` como fuentes de evidencia compacta.
- Enviar solo evidencia compacta y acotada.
- Mantener un catálogo cerrado de intents.
- Resolver preguntas simples con templates sin llamar al LLM.
- Usar un modelo pequeño para clasificación y uno mayor solo si realmente aporta.
- Persistir estado conversacional como filtros estructurados, no como historial largo.
- Cachear respuestas por combinación `intent + rango temporal + hash de evidencia`.
- Mantener el contrato de artefactos reducido y estable para que frontend y dashboard puedan fijarlos sin heurísticas.

## 7. Estrategias anti-alucinación

- El modelo no accede al raw dataset.
- Toda respuesta numérica nace de una consulta determinística.
- Toda respuesta debe incluir límites o warnings cuando aplique.
- Si la pregunta pide granularidad no soportada, la respuesta debe negarlo explícitamente.
- Se debe restringir el chat a una taxonomía conocida de preguntas.
- Los números citados por el LLM deben estar presentes en el objeto de evidencia.
- Si hay ambigüedad en la métrica, el sistema debe decirlo.
- Si la cobertura del rango es baja o parcial, la respuesta debe bajar confianza en lugar de sonar categórica.

## 8. Guardrails del chatbot

- No hablar de tiendas específicas.
- No hablar de causas raíz no observadas.
- No extrapolar fuera del rango temporal disponible.
- No inventar métricas nuevas.
- No responder “con seguridad” cuando solo existe hipótesis.
- Preferir “no soportado por el dataset” sobre una respuesta especulativa.
- No usar labels como `Availability Rate` o `Affected Stores` si el backend no puede justificarlos con el dato actual.

## 9. Cómo demostrar dominio real de AI engineering en la demo

La fortaleza no está en decir “usé muchos modelos”. Está en mostrar control.

### Señales de madurez que conviene demostrar

- Se inspeccionó el dataset antes de diseñar el producto.
- Se evitó una solución llamativa pero incorrecta como RAG puro.
- Se separó verdad numérica de explicación semántica.
- Se diseñaron límites explícitos para el chat.
- Se pensó en costo de tokens y trazabilidad.
- Se incluyeron `confidence flags` y advertencias cuando la cobertura o el soporte de puntos es bajo.
- Se dejó CI y tests básicos para sostener la solución.

### Mensajes que conviene defender

- “No usé AI para inventar analítica; la usé para hacer la interfaz sobre analítica confiable.”
- “Elegí una arquitectura sobria porque el dataset no justifica complejidad extra.”
- “La solución demuestra criterio, no solo velocidad de prototipado.”
- “Mi bot sabe responder y también sabe cuándo decir que el dataset no soporta la pregunta.”

## 10. Uso impecable de Codex y tooling agentic

Uso recomendado durante desarrollo:

- usar agentes para scaffolding, refactor y tests,
- usar inspección programática del dataset antes de tocar producto,
- usar generación asistida para documentación y contratos,
- revisar cada artefacto generado contra `DATA_DICTIONARY.md` y `DECISIONS.md`.

Uso no recomendado:

- pedir código del chatbot antes de cerrar intención, evidencia y límites,
- aceptar features que contradigan la granularidad observada,
- meter tools o servicios solo porque “se ven AI-native”.

## 11. Recomendación final

La mejor demostración de AI engineering aquí es construir un sistema que:

- sabe exactamente qué puede afirmar,
- sabe cuándo callar,
- usa el LLM donde agrega valor real,
- mantiene el costo y el riesgo bajo control.
