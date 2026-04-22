# Guía del Chatbot

## 1. Qué hace hoy

El chatbot actual no consulta el raw ni responde libremente. Funciona como un copiloto analítico sobre `data/processed/`.

Capacidades vigentes:

- responde resúmenes de tendencia y comparaciones de períodos,
- explica patrón horario, anomalías, cobertura y calidad del dato,
- arma reportes o conclusiones cuando la pregunta lo pide,
- genera artefactos visuales compactos (`bar_chart` y `hourly_coverage_chart`),
- permite fijar esos artefactos en el dashboard como widgets,
- conserva contexto mínimo por conversación para follow-ups referenciales,
- puede enriquecer la redacción con OpenAI y, si se habilita explícitamente, agregar hipótesis tentativas o contexto web separado.

## 2. Cómo funciona por detrás

Flujo real:

1. El frontend envía la pregunta a `POST /api/v1/chat/query`.
2. `ChatBrain` detecta intención, rango temporal y tipo de salida.
3. Si la pregunta es referencial, puede reutilizar el contexto guardado en SQLite.
4. El orquestador ejecuta una consulta determinística sobre `availability_daily.csv`, `availability_hourly.csv`, `availability_hourly_anomalies.csv` y/o `availability_quality_report.json`.
5. El composer arma respuesta, evidencia, warnings, follow-ups y artefactos.
6. Si `use_llm=true`, la salida puede pasar por una capa opcional de OpenAI sin alterar la evidencia numérica base.
7. En frontend, el usuario puede fijar una respuesta o un artefacto en el tablero.

## 3. Alcance real

Sí soporta:

- fechas explícitas como `2026-02-10` o `11 de febrero`,
- comparaciones contra período previo comparable,
- salidas tipo respuesta corta, gráfico, reporte o conclusiones,
- follow-ups del estilo `ahora conviértalo en conclusiones claras`,
- pinning de hallazgos y gráficos en el dashboard.

No soporta:

- preguntas por tienda, merchant, ciudad o causa raíz confirmada,
- granularidad no presente en el dataset,
- un gráfico arbitrario totalmente nuevo desde lenguaje natural.

Importante:

- hoy “conectar un nuevo gráfico al dashboard” significa generar una nueva instancia de artefacto soportado por backend y fijarla en el tablero;
- si se quisiera un tipo de gráfico nuevo, por ejemplo una línea multi-serie o heatmap, habría que ampliar el contrato `ChatArtifact` en backend y su renderer en frontend.

## 4. Intenciones soportadas

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

## 5. Preguntas buenas para demo

Regla rápida:

- deje `Hipótesis` y `Web` apagados por defecto;
- active `Hipótesis` cuando quiera causas tentativas fuera del dataset;
- active `Web` solo cuando quiera contrastar clima, eventos o contexto externo reciente.

### Lectura base

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `¿Qué pasó el 2026-02-10?` | No | No | Briefing diario grounded. |
| `¿Qué días tuvieron la menor cobertura?` | No | No | Ranking de extremos de cobertura. |
| `¿Qué día tuvo la mayor cobertura dentro del rango activo?` | No | No | Extremos altos del rango. |

### Comparación

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `Compáreme 2026-02-10 vs 2026-02-11.` | No | No | Comparación entre fechas. |
| `Entrégueme conclusiones claras sobre cómo se comporta entre semana vs fines de semana la cobertura.` | No | No | Modo conclusiones sobre weekday vs weekend. |
| `Cree un reporte detallado de cómo fue fluctuando la cobertura en fines de semana.` | No | No | Modo reporte con narrativa más amplia. |

### Horario

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `¿Qué horas suelen ser más altas?` | No | No | Patrón horario del rango. |
| `¿Cuál fue la hora con menor cobertura el 11 de febrero?` | No | No | Lookup horario puntual. |
| `Revise si la hora más baja coincide con anomalías del rango.` | No | No | Cruce entre patrón horario y anomalías. |

### Calidad y anomalías

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `¿Qué tan completo está el dataset entre 2026-02-10 y 2026-02-10?` | No | No | Calidad y completitud del dato. |
| `Revise las anomalías horarias del rango.` | No | No | Resumen de anomalías con evidencia. |
| `¿La anomalía más fuerte del rango coincide con baja cobertura?` | No | No | Cruce entre anomalías y calidad. |

### Gráfico + tablero

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `Genéreme un gráfico de barras para mostrar cómo se comportan los horarios a lo largo del mes de febrero y su cobertura.` | No | No | Artefacto horario fijable al tablero. |
| `Podría entregarme un gráfico que compare la cobertura total de todos los días que tenemos en febrero.` | No | No | Artefacto diario fijable al tablero. |
| `¿Podría generarme ahora una gráfica que compare el día de menor cobertura con el promedio de los demás? Así puedo saber qué tan desfasados están los datos.` | No | No | Nueva ruta `coverage_extreme_vs_average` para el día más frágil. |
| `¿Podría generarme ahora una gráfica que compare el día de mayor cobertura con el promedio de los demás?` | No | No | Misma ruta, pero enfocada en el día más fuerte. |

Si quiere contrastar extremos en una demo, hoy luce mejor esta secuencia que pedir “máximo vs mínimo” en una sola instrucción:

1. `Podría entregarme un gráfico que compare la cobertura total de todos los días que tenemos en febrero.`
2. `¿Podría generarme ahora una gráfica que compare el día de mayor cobertura con el promedio de los demás?`
3. `¿Podría generarme ahora una gráfica que compare el día de menor cobertura con el promedio de los demás?`

### Hipótesis y contexto externo

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `El 11 de febrero es el día con menor cobertura. ¿Podría revisar y darme posibles razones externas a los datos de por qué ese día en Latinoamérica la cobertura fue baja? ¿Podríamos ver si llovió y si esa puede ser una buena razón?` | Sí | Sí | Capa opcional de hipótesis + contexto externo. |
| `¿Podría darme hipótesis tentativas de por qué la cobertura cae más en fines de semana?` | Sí | No | Hipótesis tentativas sin salir del contexto local. |
| `Revise el 11 de febrero y explíqueme si vale la pena buscar una causa externa o si primero debería leerlo como un problema de calidad del dato.` | Sí | No | Buen ejemplo de guardrails con lenguaje operativo. |

### Métrica y límites

| Pregunta | Hipótesis | Web | Qué demuestra |
| --- | --- | --- | --- |
| `¿Qué significa synthetic_monitoring_visible_stores?` | No | No | Definición de métrica. |
| `¿Qué tienda tiene la peor disponibilidad?` | No | No | Rechazo explícito por falta de granularidad. |
| `¿Qué merchant o ciudad explica la caída del 11 de febrero?` | No | No | Otro límite útil para demostrar guardrails. |

Las dos últimas son útiles para demostrar que el sistema rechaza granularidad inexistente en vez de inventarla.

## 6. Cómo lucir el flujo de “nuevo gráfico al dashboard”

Secuencia recomendada en demo:

1. Pregunte: `Genéreme un gráfico de barras para mostrar cómo se comportan los horarios a lo largo del mes de febrero y su cobertura.`
2. Espere a que el chat devuelva el artefacto visual.
3. Haga clic en `Fijar en tablero`.
4. Abra `/dashboard` y muestre el widget fijado junto a los módulos base.

Alternativa:

1. Pregunte: `Podría entregarme un gráfico que compare la cobertura total de todos los días que tenemos en febrero.`
2. Fije el gráfico diario.
3. Explique que el tablero puede convivir con widgets nativos y widgets originados desde chat.

Otra secuencia que hoy luce muy bien:

1. Pregunte: `Podría entregarme un gráfico que compare la cobertura total de todos los días que tenemos en febrero.`
2. Pregunte después: `¿Podría generarme ahora una gráfica que compare el día de menor cobertura con el promedio de los demás?`
3. Fije ambos artefactos.
4. Abra `/dashboard` y muestre cómo el tablero mezcla módulos nativos con piezas nacidas de una conversación.

## 7. Qué conviene decir en la demo

- `La verdad numérica no la produce el modelo; la produce la capa determinística.`
- `El LLM solo mejora narrativa o agrega hipótesis claramente marcadas cuando lo habilitamos.`
- `El dashboard acepta piezas nuevas desde el chat, pero solo dentro del catálogo de artefactos soportados.`
- `Cuando el dato no soporta una pregunta, el sistema prefiere negarla antes que alucinar.`
