# Documentacion Dashboard

## 1. Objetivo del dashboard

El dashboard se diseno para mostrar la mejor lectura posible del dataset real, no del dataset imaginado por el enunciado.

Su funcion es:

- exponer la senal agregada en el tiempo,
- mostrar que tan confiable es esa observacion,
- permitir drill-down rapido sobre fechas relevantes,
- convivir con widgets generados desde el chat.

## 2. Por que estos datos y no otros

La seleccion de modulos responde a la granularidad efectivamente disponible.

### KPI del periodo

Se muestran para responder rapido:

- nivel medio de senal,
- cobertura observada,
- hora tipica mas fuerte,
- numero de anomalias fuertes.

Estos elementos resumen el periodo sin introducir dimensiones inexistentes.

### Serie diaria

La serie diaria permite:

- ver tendencia general,
- detectar dias que rompen patron,
- seleccionar una fecha activa para abrir detalle.

### Spotlight del dia

Una vez se selecciona una fecha, el dashboard resume:

- cobertura del dia,
- hora mas fuerte,
- hora mas debil,
- anomalias mas relevantes,
- cautions del dato.

### Patron horario

Este modulo responde una pregunta central: como se comporta la senal a lo largo del reloj.

Sirve para:

- ver horas estructuralmente fuertes o debiles,
- contextualizar anomalias,
- contrastar contra el resumen del chat.

### Calidad del dato

No es un extra cosmetico. Es un modulo central porque el producto depende de cobertura y completitud observadas.

Mostrar calidad evita sobreinterpretar:

- dias con captura parcial,
- ventanas truncadas,
- duplicados y gaps.

## 3. Por que no hay modulos por tienda

Porque el dataset entregado no expone esa dimension.

Agregar:

- rankings por tienda,
- incidentes por tienda,
- comparativos por merchant,

habria sido enganoso y tecnicamente injustificable.

## 4. Idea plug and play con el chatbot

El dashboard no es un canvas cerrado. Puede recibir piezas nuevas desde el chat.

### Como funciona hoy

1. El usuario hace una pregunta al chatbot.
2. El backend responde con un `ChatArtifact` si la pregunta amerita salida visual.
3. El frontend renderiza ese artefacto en la conversacion.
4. El usuario pulsa `Fijar en tablero`.
5. El widget se guarda localmente y el dashboard lo incorpora como modulo adicional.

### Que aporta este patron

- convierte una consulta conversacional en una pieza reutilizable,
- conecta exploracion semantica y lectura visual,
- permite que el tablero evolucione segun la conversacion,
- mantiene contrato tipado entre backend y frontend.

## 5. Que significa realmente "conectar un nuevo grafico"

Hoy significa una de estas dos cosas:

- generar una nueva instancia de un artefacto ya soportado y fijarlo,
- ampliar el contrato de artefactos para soportar un nuevo tipo visual.

El primer caso ya existe.
El segundo exige cambios coordinados en backend y frontend.

## 6. Artefactos soportados hoy

- `bar_chart`
- `hourly_coverage_chart`

## 7. Futuras extensiones razonables

Siguientes artefactos que tendrian sentido:

- serie temporal simple,
- comparacion de dos periodos en barras lado a lado,
- heatmap horario por fecha,
- modulo ejecutivo de conclusiones fijables.

La condicion para agregarlos debe seguir siendo la misma:

- evidencia clara,
- contrato estable,
- semantica soportada por el dato.
