# Lectura Ejecutiva del Dato

## Propósito de este documento

Este documento resume, en lenguaje natural, qué nos entregó realmente el dataset, qué aprendimos al inspeccionarlo y qué tipo de producto justifica construir a partir de él.

No sustituye al `DATA_DICTIONARY.md` ni a los notebooks. Su función es traducir la evidencia técnica a una lectura clara, defendible y útil para toma de decisiones.

## Qué nos entregaron realmente

La consigna de la prueba habla de disponibilidad de tiendas y de un dashboard con chatbot semántico. Sin embargo, el dato entregado no se comporta como un histórico por tienda.

Lo que recibimos en `data/raw/` es otra cosa:

- `201` archivos CSV,
- `1` fila por archivo,
- `4` columnas de metadatos fijas,
- cientos de columnas temporales por archivo,
- una sola métrica observada: `synthetic_monitoring_visible_stores`.

En otras palabras, el dataset se parece más a una serie temporal agregada exportada por ventanas que a una tabla relacional o transaccional.

## Qué significa eso en términos prácticos

La primera implicación importante es conceptual:

- no tenemos evidencia de IDs de tienda,
- no tenemos nombres de tienda,
- no tenemos ciudades, categorías ni dimensiones de segmentación,
- no tenemos eventos individuales por entidad.

Por eso, sería un error presentar la solución como si pudiéramos responder preguntas tipo:

- “¿Qué tienda tuvo peor disponibilidad?”
- “¿Qué grupo de tiendas se comportó peor?”
- “¿Qué merchant causó esta caída?”

Ese tipo de preguntas no está soportado por el dato observado.

## Qué sí soporta el dataset

Sí soporta una lectura seria de una métrica agregada a lo largo del tiempo.

Eso nos permite construir con honestidad:

- una historia de evolución temporal,
- comparaciones entre períodos,
- perfil intradiario,
- detección de anomalías o desvíos frente a un baseline,
- indicadores de calidad del dato,
- un chatbot grounded sobre analítica determinística.

La solución correcta no es “forzar un dashboard por tienda”. La solución correcta es diseñar una interfaz muy clara para una serie temporal agregada.

## Qué encontramos al procesarlo

Después de normalizar y deduplicar el raw:

- la serie canónica cubre desde `2026-02-01 06:11:20 -05:00` hasta `2026-02-11 15:00:00 -05:00`,
- quedan `67,141` timestamps únicos,
- la cadencia dominante es de `10 segundos`,
- aparecen `1,963` timestamps solapados entre ventanas,
- esos solapes no tienen conflictos de valor,
- existen `4` grupos de ventanas duplicadas exactas,
- existen `27` ventanas incompletas,
- existen gaps estructurales recurrentes, varios de ellos cercanos a `~6.1 horas`,
- frente a un rango continuo ideal, faltan `22,432` puntos, equivalente a `25.04%` del rango completo.

Este punto es clave:

el dataset no está roto, pero tampoco es perfectamente continuo. Tiene estructura suficiente para construir un producto serio, siempre que la calidad del dato se haga visible y no se esconda.

También es importante distinguir dos cosas:

- **cobertura estructural del rango completo**, que es incompleta,
- **consistencia dentro de la cobertura observada**, que sí es suficientemente buena como para construir una serie canónica estable.

Eso significa que el problema principal no es inconsistencia interna del valor, sino cobertura parcial del histórico.

## Qué narrativa cuenta la serie

Sin forzar semántica no verificada, la señal parece describir una magnitud agregada con comportamiento intradiario fuerte:

- valores muy bajos al inicio de la mañana,
- crecimiento progresivo durante la mañana,
- niveles más altos entre tarde y primeras horas de la noche,
- descenso posterior hacia el cierre del día.

Eso sugiere que la métrica no es ruido aleatorio. Tiene patrón operativo.

También aparecen momentos que merecen atención:

- el `2026-02-10` entre las `15:00` y `16:00` cae claramente por debajo de su baseline horario,
- el `2026-02-02` muestra varias horas sistemáticamente por debajo de su perfil esperado,
- el `2026-02-08` presenta cobertura más baja que otros días,
- hay cambios bruscos asociados a resets o reinicios de ventana, especialmente cerca del inicio de algunas franjas.

La conclusión importante no es “descubrimos la causa”. La conclusión correcta es:

> sí tenemos suficiente señal para construir exploración temporal y detección de comportamientos atípicos, pero no suficiente contexto para atribuir causalidad de negocio.

## Qué producto tiene sentido construir con esta realidad

### Dashboard

El dashboard debe responder a esta forma del dato, no a la forma imaginada inicialmente.

Lo correcto es mostrar:

- KPIs del período seleccionado,
- curva principal de la serie temporal,
- perfil intradiario,
- comparación entre días o ventanas relevantes,
- panel de calidad del dato,
- bloque de anomalías destacadas,
- señales explícitas de confianza o cobertura cuando corresponda.

Eso permite una demo fuerte porque muestra criterio: el producto nace del dato, no de una plantilla genérica.

### Chatbot

El chatbot debe ser una capa semántica sobre una base analítica ya calculada.

Debe poder responder preguntas como:

- “¿Cómo se comportó la métrica entre el 9 y el 10 de febrero?”
- “¿Qué horas del día suelen concentrar valores más altos?”
- “¿Qué períodos se desviaron más de su comportamiento esperado?”
- “¿Qué limitaciones tiene el dataset?”

Y debe negarse con claridad ante preguntas como:

- “¿Qué tienda estuvo más tiempo offline?”
- “¿Qué merchant explica la caída?”

Eso no es una debilidad. Es exactamente la señal de madurez que debería mostrar un AI engineer.

Además, el chat no debería responder todas las anomalías con el mismo nivel de certeza. Si una ventana o una hora tiene muy pocos puntos, debe explicarlo o bajar su confianza.

## Qué demuestra esto desde el rol de AI engineer

Este proyecto puede demostrar mucho más que capacidad de armar una app bonita.

Puede demostrar:

- lectura crítica del dataset antes de construir,
- separación entre verdad numérica y capa conversacional,
- control de alucinaciones,
- diseño de guardrails,
- economía de tokens,
- trazabilidad entre dato, analítica y respuesta final.

La demostración fuerte no es “usar AI por usarla”. Es usarla donde aporta valor real:

- para interpretar,
- para explicar,
- para mejorar experiencia de consulta,
- sin delegarle el cálculo ni la verdad del sistema.

## Qué no debemos hacer

Para mantener el proyecto defendible, conviene evitar:

- storytelling por tienda sin evidencia,
- claims causales fuertes,
- RAG puro sobre CSVs numéricos,
- vector DB innecesaria,
- dashboards con filtros inventados,
- respuestas del chat basadas en improvisación del LLM,
- nombres de KPI que impliquen semántica no validada, como si ya supiéramos “availability rate” o “incident hours”.

Si hacemos eso, la demo se vuelve vistosa pero frágil.

## Qué sí debemos hacer a partir de aquí

La secuencia correcta es:

1. consolidar los notebooks como evidencia reproducible,
2. mantener `data/processed/` como fuente estable para la app,
3. conectar backend a agregados determinísticos reales,
4. construir frontend alrededor de una métrica agregada temporal,
5. montar un chat grounded con catálogo cerrado de intenciones,
6. usar la calidad del dato como parte de la narrativa, no como nota al pie,
7. introducir `confidence flags` para anomalías, comparaciones y respuestas semánticas cuando la cobertura o el número de puntos sea bajo.

## Mensaje final

La realidad del dataset no limita el proyecto; lo enfoca.

No tenemos una plataforma de observabilidad por tienda. Tenemos una serie temporal agregada con suficiente estructura para construir una solución muy defendible, si se hace con honestidad analítica y criterio de AI engineering.

Ese es precisamente el ángulo fuerte de esta prueba:

> demostrar que sabemos leer el dato antes de prometer producto, y que sabemos usar AI para amplificar comprensión sin inventar verdad.
