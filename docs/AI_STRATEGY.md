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
2. Clasificación de intención
3. Validación de soporte por dataset
4. Normalización de filtros temporales
5. Consulta determinística
6. Construcción de objeto de evidencia
7. Formateo con LLM o template
8. Respuesta con advertencias y trazabilidad

### Intenciones sugeridas

- `trend_summary`
- `period_comparison`
- `anomaly_question`
- `metric_definition`
- `data_quality_question`
- `unsupported_request`

### Objeto de evidencia sugerido

```json
{
  "intent": "period_comparison",
  "time_window": "2026-02-10 06:00 - 12:00",
  "comparison_window": "2026-02-09 06:00 - 12:00",
  "metrics": {
    "avg_value": 123.0,
    "max_value": 150.0,
    "pct_change": 4.2
  },
  "warnings": ["Ventanas truncadas excluidas"],
  "source_tables": ["availability_long", "availability_hourly"]
}
```

## 6. Estrategias para economizar tokens

- No enviar series completas al modelo.
- Precalcular agregados útiles en `processed/`.
- Enviar solo evidencia compacta y acotada.
- Mantener un catálogo cerrado de intents.
- Resolver preguntas simples con templates sin llamar al LLM.
- Usar un modelo pequeño para clasificación y uno mayor solo si realmente aporta.
- Persistir estado conversacional como filtros estructurados, no como historial largo.
- Cachear respuestas por combinación `intent + rango temporal + hash de evidencia`.

## 7. Estrategias anti-alucinación

- El modelo no accede al raw dataset.
- Toda respuesta numérica nace de una consulta determinística.
- Toda respuesta debe incluir límites o warnings cuando aplique.
- Si la pregunta pide granularidad no soportada, la respuesta debe negarlo explícitamente.
- Se debe restringir el chat a una taxonomía conocida de preguntas.
- Los números citados por el LLM deben estar presentes en el objeto de evidencia.
- Si hay ambigüedad en la métrica, el sistema debe decirlo.

## 8. Guardrails del chatbot

- No hablar de tiendas específicas.
- No hablar de causas raíz no observadas.
- No extrapolar fuera del rango temporal disponible.
- No inventar métricas nuevas.
- No responder “con seguridad” cuando solo existe hipótesis.
- Preferir “no soportado por el dataset” sobre una respuesta especulativa.

## 9. Cómo demostrar dominio real de AI engineering en la demo

La fortaleza no está en decir “usé muchos modelos”. Está en mostrar control.

### Señales de madurez que conviene demostrar

- Se inspeccionó el dataset antes de diseñar el producto.
- Se evitó una solución llamativa pero incorrecta como RAG puro.
- Se separó verdad numérica de explicación semántica.
- Se diseñaron límites explícitos para el chat.
- Se pensó en costo de tokens y trazabilidad.
- Se dejó CI y tests básicos para sostener la solución.

### Mensajes que conviene defender

- “No usé AI para inventar analítica; la usé para hacer la interfaz sobre analítica confiable.”
- “Elegí una arquitectura sobria porque el dataset no justifica complejidad extra.”
- “La solución demuestra criterio, no solo velocidad de prototipado.”

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
