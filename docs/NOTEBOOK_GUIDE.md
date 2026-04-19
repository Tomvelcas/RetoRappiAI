# Guía de Notebooks

## 1. Propósito

Los notebooks no son un accesorio. Son la primera capa de credibilidad del proyecto.

Su función es:

- entender el dato antes de diseñar producto o chat,
- convertir una exportación ancha y fragmentada en una base analítica consistente,
- dejar evidencia reproducible de decisiones y supuestos.

## 2. Secuencia recomendada

### Notebook 01: Entendimiento y profiling del dato

Objetivo:

- inventariar archivos,
- confirmar estructura real,
- parsear timestamps,
- describir cobertura temporal,
- detectar duplicados y truncamientos.

Preguntas que debe responder:

- ¿Cuántos archivos hay y qué patrón siguen?
- ¿Cuántas filas y columnas tiene cada archivo?
- ¿Cuál es la cadencia temporal real?
- ¿Qué ventanas están duplicadas o incompletas?
- ¿Qué cobertura diaria existe?

### Notebook 02: Sanitización y construcción de métricas

Objetivo:

- convertir wide -> long,
- deduplicar,
- etiquetar calidad,
- construir agregados base reutilizables.

Preguntas que debe responder:

- ¿Cómo queda la tabla canónica por timestamp?
- ¿Qué reglas de deduplicación se usarán?
- ¿Qué ventanas deben excluirse de ciertas métricas?
- ¿Qué agregados resumen son útiles para dashboard y chat?

### Notebook 03: Insights y validación

Objetivo:

- producir insights defendibles para demo,
- validar patrones temporales,
- definir el set inicial de preguntas soportadas por el chat.

Preguntas que debe responder:

- ¿Qué tendencias son estables y cuáles son anómalas?
- ¿Qué comparaciones temporales agregadas son más útiles?
- ¿Qué claims son defendibles y cuáles no?
- ¿Qué evidencias se deben mostrar en la demo?

## 3. Estándar narrativo de los notebooks

Cada notebook debe leerse como el razonamiento de una persona que está tomando decisiones, no como una secuencia muda de celdas.

Por eso, cada bloque importante debería dejar explícito:

- qué estoy intentando validar,
- por qué decidí correr ese análisis,
- cómo debo interpretar el output,
- qué conclusión considero defendible,
- qué impacto tiene eso sobre dashboard, backend o chatbot.

El tono recomendado es deliberadamente personal y analítico. Ejemplos:

- "Hice esta validación porque todavía no tengo evidencia para asumir continuidad perfecta."
- "Aquí me di cuenta de que la cobertura cambia por día y eso afecta cómo debo contar la historia."
- "No quiero mostrar este hallazgo como insight principal hasta revisar su soporte."

Ese estilo no es decorativo. Ayuda a demostrar criterio, trazabilidad y disciplina de AI engineering.

## 4. Controles de calidad obligatorios

Antes de derivar métricas:

- validar encoding y lectura uniforme de CSV,
- parsear timestamps como timezone-aware,
- verificar cadencia de 10 segundos,
- identificar ventanas duplicadas exactas,
- marcar ventanas truncadas,
- cuantificar gaps de cobertura,
- confirmar ausencia de vacíos y negativos,
- no asumir ninguna dimensión no observada.

## 5. Outputs esperados para `data/processed/`

Salidas objetivo recomendadas:

- `availability_long_canonical.csv`
  Columnas sugeridas: `timestamp`, `metric_value`, `source_file`, `window_start`, `window_end`, `is_duplicate_window`, `is_incomplete_window`
- `availability_window_metadata.csv`
- `availability_hourly.csv`
- `availability_daily.csv`
- `availability_quality_report.json`
- `availability_hourly_anomalies.csv`
- `availability_step_changes.csv`

En esta iteración se usa CSV/JSON para evitar dependencias adicionales y mantener el flujo completamente reproducible en local. Si luego se requiere optimización de almacenamiento, estos mismos artefactos pueden migrarse a Parquet.

Más importante que el formato:

- una tabla canónica por timestamp,
- una capa de agregados,
- un reporte explícito de calidad.

## 6. Preguntas analíticas mínimas que deben quedar respondidas

- ¿Cuál es la cobertura efectiva del histórico?
- ¿Qué tanto ruido o volatilidad tiene la señal?
- ¿Existen franjas horarias distintivas?
- ¿Qué anomalías merecen ser mostradas?
- ¿Cómo cambia la historia si se excluyen ventanas incompletas?

## 7. Cómo traducir análisis a decisiones de producto

Cada notebook debería cerrar con una bajada concreta hacia producto:

- qué métricas sí valen la pena llevar al dashboard,
- qué preguntas sí debería contestar el bot,
- qué límites deben mostrarse en UI o en respuestas,
- qué artefactos procesados necesita consumir el backend.

La expectativa no es terminar con "insights interesantes", sino con una frontera clara entre:

- lo que ya puedo servir de forma confiable,
- lo que requiere más validación,
- lo que no debo prometer.

## 8. Cómo evitar análisis superficial o sesgado

- No presentar un gráfico sin explicar cómo se trató la duplicidad o truncamiento.
- No convertir el nombre de la métrica en definición de negocio cerrada sin evidencia.
- No seleccionar solo las ventanas “llamativas”; contrastar con baseline.
- No asumir monotonicidad ni causalidad.
- Diferenciar siempre entre observación comprobada, hipótesis razonable y claim no sustentado.

## 9. Relación con dashboard y chat

El notebook define qué preguntas son seguras para el producto.

Si una pregunta no puede responderse con una consulta limpia sobre `processed/`, entonces:

- no debe entrar al dashboard como insight principal,
- no debe entrar al chat como capacidad prometida.

## 10. Resultado esperado

Al terminar la fase de notebooks, el proyecto debe tener:

- un entendimiento claro del dataset,
- una base procesada estable,
- un set acotado de métricas confiables,
- una narrativa analítica defendible para demo.
