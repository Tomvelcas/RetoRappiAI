# Documentacion AI

## 1. Que es el componente AI de este proyecto

La capa AI de este repositorio no reemplaza la analitica. La envuelve.

Es un chatbot semantico grounded que usa un planner conversacional para traducir preguntas humanas en consultas deterministicas sobre un dataset procesado.

## 2. Principio rector

La verdad numerica sale de la capa analitica.
El LLM, cuando se usa, solo:

- reformula,
- resume,
- explica con mejor lenguaje,
- agrega hipotesis tentativas si el operador lo habilita,
- separa explicitamente el contexto externo del dato observado.

## 3. Como funciona por detras

Flujo actual:

1. El frontend envia la pregunta a `POST /api/v1/chat/query`.
2. `ChatBrain` detecta:
   - intencion,
   - rango temporal,
   - tipo de salida: `answer`, `chart`, `report`, `conclusions`.
3. Si es un follow-up referencial, puede reutilizar memoria conversacional en SQLite.
4. El backend ejecuta la consulta deterministica sobre `data/processed`.
5. El composer arma:
   - respuesta,
   - evidencia,
   - warnings,
   - follow-up questions,
   - artefactos visuales.
6. Si `use_llm=true`, la respuesta puede enriquecerse con OpenAI sin alterar la evidencia numerica base.

## 4. Capacidades soportadas hoy

- resumen de tendencia,
- comparacion de periodos,
- patron intradiario,
- lookup horario de menor o mayor cobertura,
- perfil horario del rango,
- perfil diario del rango,
- revision de anomalias,
- estado de calidad del dato,
- dias con menor o mayor cobertura,
- briefing de una fecha especifica,
- comparacion entre semana vs fin de semana,
- reporte de fines de semana,
- definicion prudente de la metrica,
- rechazo de preguntas fuera de alcance.

## 5. Memoria conversacional

El chatbot guarda contexto minimo por `conversation_id`:

- familia de analisis,
- rango efectivo,
- fechas referenciadas,
- ultimo prompt.

Esto permite preguntas como:

- `Ahora conviertalo en conclusiones claras.`
- `Muestremelo como grafico.`

sin volver a especificar todo el contexto.

## 6. Guardrails

El chatbot esta restringido para no inventar capacidades.

No debe:

- responder por tienda,
- responder por merchant,
- asumir causalidad confirmada,
- inventar una nueva metrica,
- extrapolar fuera del rango observado.

## 7. Modo LLM opcional

La capa LLM es opcional y controlada por configuracion.

Puede usarse para:

- mejorar redaccion,
- agregar hipotesis tentativas,
- agregar contexto web separado cuando se habilita explicitamente.

Si falla la llamada al proveedor:

- la respuesta vuelve a modo grounded,
- el sistema conserva evidencia,
- se agrega advertencia de fallback.

## 8. Preguntas buenas para probar el chatbot

### Lectura base

- `¿Que paso el 2026-02-10?`
- `How is the signal behaving overall?`

### Comparacion

- `Compare 2026-02-10 vs 2026-02-11.`
- `Entregueme conclusiones claras sobre como se comporta entre semana vs fines de semana la cobertura.`

### Horario

- `¿Que horas suelen ser mas altas?`
- `¿Cual fue la hora con menor cobertura el 11 de febrero?`

### Calidad y anomalias

- `How complete is the dataset between 2026-02-10 and 2026-02-10?`
- `Revise las anomalias horarias del rango.`

### Grafico + tablero

- `Genereme un grafico de barras para mostrar como se comportan los horarios a lo largo del mes de febrero y su cobertura.`
- `Podria entregarme un grafico que compare la cobertura total de todos los dias que tenemos en febrero.`

### Limites

- `Which store had the worst availability?`

Esta ultima sirve para demostrar que el sistema se niega a inventar granularidad inexistente.

## 9. Como explicar el valor AI en demo

Mensajes recomendados:

- `No use AI para inventar analitica; la use para hacer accesible una analitica confiable.`
- `El bot sabe responder, pero tambien sabe decir que no.`
- `La evidencia sigue siendo deterministica incluso cuando mejoramos la narrativa con LLM.`
