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

Regla rapida:

- deje `Hipotesis` y `Web` apagados por defecto,
- active `Hipotesis` si quiere causas tentativas,
- active `Web` solo si quiere clima, eventos o contexto externo.

### Lectura base

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `¿Que paso el 2026-02-10?` | No | No |
| `¿Que dias tuvieron la menor cobertura?` | No | No |
| `¿Que dia tuvo la mayor cobertura dentro del rango activo?` | No | No |

### Comparacion

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `Compáreme 2026-02-10 vs 2026-02-11.` | No | No |
| `Entregueme conclusiones claras sobre como se comporta entre semana vs fines de semana la cobertura.` | No | No |
| `Cree un reporte detallado de como fue fluctuando la cobertura en fines de semana.` | No | No |

### Horario

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `¿Que horas suelen ser mas altas?` | No | No |
| `¿Cual fue la hora con menor cobertura el 11 de febrero?` | No | No |
| `Revise si la hora mas baja coincide con anomalias del rango.` | No | No |

### Calidad y anomalias

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `¿Que tan completo esta el dataset entre 2026-02-10 y 2026-02-10?` | No | No |
| `Revise las anomalias horarias del rango.` | No | No |
| `¿La anomalia mas fuerte del rango coincide con baja cobertura?` | No | No |

### Grafico + tablero

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `Genereme un grafico de barras para mostrar como se comportan los horarios a lo largo del mes de febrero y su cobertura.` | No | No |
| `Podria entregarme un grafico que compare la cobertura total de todos los dias que tenemos en febrero.` | No | No |
| `¿Podria generarme ahora una grafica que compare el dia de menor cobertura con el promedio de los demas? Asi puedo saber que tan desfasados estan los datos.` | No | No |
| `¿Podria generarme ahora una grafica que compare el dia de mayor cobertura con el promedio de los demas?` | No | No |

### Hipotesis y contexto externo

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `El 11 de febrero es el dia con menor cobertura. ¿Podria revisar y darme posibles razones externas a los datos de por que ese dia en Latinoamerica la cobertura fue baja? ¿Podriamos ver si llovio y si esa puede ser una buena razon?` | Si | Si |
| `¿Podria darme hipotesis tentativas de por que la cobertura cae mas en fines de semana?` | Si | No |

### Limites

| Pregunta | Hipotesis | Web |
| --- | --- | --- |
| `¿Que tienda tiene la peor disponibilidad?` | No | No |
| `¿Que merchant o ciudad explica la caida del 11 de febrero?` | No | No |

Las dos ultimas sirven para demostrar que el sistema se niega a inventar granularidad inexistente.

## 9. Como explicar el valor AI en demo

Mensajes recomendados:

- `No use AI para inventar analitica; la use para hacer accesible una analitica confiable.`
- `El bot sabe responder, pero tambien sabe decir que no.`
- `La evidencia sigue siendo deterministica incluso cuando mejoramos la narrativa con LLM.`
