# Guion de Demo

## Objetivo

Contar una historia breve, técnica y convincente en 5 a 7 minutos.

La demo no debe vender “una app bonita”. Debe vender criterio.

## Narrativa recomendada

### 1. Apertura: problema y enfoque

“Partí de una premisa simple: antes de construir dashboard y chatbot, había que validar qué soportaba realmente el dataset. Mi objetivo fue evitar una demo vistosa pero conceptualmente incorrecta.”

### 2. Entendimiento del dato

Mostrar en 30 a 45 segundos:

- que había 201 CSVs,
- que cada archivo tenía una sola fila,
- que la estructura era ancha por timestamps,
- que no había IDs de tienda ni dimensiones por entidad,
- que había duplicados y ventanas truncadas.

Mensaje clave:

“Eso me obligó a pivotar la solución hacia analítica temporal agregada, que es lo que el dato sí soporta con honestidad.”

### 3. Dashboard

Recorrer:

- KPIs del período,
- curva temporal principal,
- hallazgo de volatilidad o anomalía,
- panel de calidad del dato.

Mensaje clave:

“El dashboard no solo muestra valores; incorpora contexto de calidad y cobertura para que la lectura sea confiable.”

### 4. Chatbot

Mostrar 2 o 3 preguntas:

- una soportada: resumen de tendencia,
- una comparación temporal,
- una no soportada por tienda.

Mensaje clave:

“El chat no inventa. Clasifica la pregunta, consulta analítica determinística y luego formatea la respuesta con evidencia. Si la pregunta excede el dataset, lo dice.”

## Cómo explicar el uso de AI

Mensaje recomendado:

“Usé AI estratégicamente, no decorativamente. La capa de analítica produce la verdad numérica; el LLM se usa para interpretar y explicar esa verdad en lenguaje natural.”

Puntos a defender:

- no se usó RAG puro porque el dato es estructurado y agregado,
- se priorizó grounding y ahorro de tokens,
- se diseñaron límites explícitos para evitar alucinaciones.

## Qué decisiones defender

- analytics-first en lugar de chatbot-first,
- FastAPI + Next.js por velocidad y claridad del stack,
- notebooks como evidencia de entendimiento del dato,
- exclusión de features por tienda por falta de soporte,
- CI base y arquitectura modular como señal de calidad.

## Cómo explicar el desajuste entre negocio y granularidad del dataset

No decir:

- “El dataset venía incompleto y me tocó bajar ambición.”

Sí decir:

- “La consigna habla de disponibilidad de tiendas, pero el dataset entregado expone una métrica agregada. En lugar de inventar una granularidad inexistente, diseñé una solución fiel al dato y explícita en sus límites.”

Ese framing convierte una aparente debilidad en evidencia de rigor.

## Cierre sugerido

“Mi foco no fue solo entregar una app. Fue demostrar que sé inspeccionar datos, ajustar arquitectura al contexto real y usar AI donde suma valor sin comprometer precisión.”

## Estructura temporal sugerida

- 0:00 - 0:45: problema y criterio rector
- 0:45 - 1:45: entendimiento del dataset
- 1:45 - 3:30: dashboard y hallazgos
- 3:30 - 5:15: chatbot grounded
- 5:15 - 6:15: decisiones de AI engineering
- 6:15 - 7:00: cierre y trade-offs
