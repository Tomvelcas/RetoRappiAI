# Diccionario de Datos

## 1. Resumen ejecutivo

El dataset observado en `data/raw/` no corresponde a una tabla transaccional ni a un histórico por tienda. Corresponde a una **serie temporal agregada exportada en formato ancho**, repartida en múltiples ventanas de tiempo.

## 2. Inventario observado

- `201` archivos CSV en `data/raw/`
- `0` artefactos reales aún en `data/processed/`
- `0` muestras reales aún en `data/samples/`

Patrones de nombre de archivo observados:

- `100` archivos con sufijo tipo copia numerada: `AVAILABILITY-data (N).csv`
- `100` archivos con timestamp en el nombre: `AVAILABILITY-data - 2026-...csv`
- `1` archivo base: `AVAILABILITY-data.csv`

Conclusión:

- los nombres de archivo parecen artefactos de exportación,
- no deben usarse como dimensión de negocio.

## 3. Formato real de los CSV

Cada archivo contiene:

- una sola fila de datos,
- cuatro columnas iniciales de metadatos,
- múltiples columnas temporales con timestamps como header.

### Columnas de metadatos observadas

| Campo | Observación | Interpretación prudente |
| --- | --- | --- |
| `Plot name` | Siempre `NOW` | Etiqueta de visualización/exportación, no entidad de negocio |
| `metric (sf_metric)` | Siempre `synthetic_monitoring_visible_stores` | Identificador de la métrica observada |
| `Value Prefix` | Siempre vacío | Metadato de formateo no usado |
| `Value Suffix` | Siempre vacío | Metadato de formateo no usado |

### Columnas temporales

Los headers temporales siguen este patrón:

`Sun Feb 01 2026 06:11:20 GMT-0500 (hora estándar de Colombia)`

Observaciones:

- zona horaria explícita `GMT-0500`,
- texto localizado al final entre paréntesis,
- granularidad observada de `10 segundos`.

## 4. Estructura y cobertura temporal observadas

### Cobertura global

- inicio observado: `2026-02-01 06:11:20 -05:00`
- fin observado: `2026-02-11 15:00:00 -05:00`

### Patrón dominante por archivo

- la mayoría de archivos tiene `367` columnas totales,
- de ellas, `4` son metadatos y `363` son timestamps,
- esa longitud equivale a `~60m 20s` por ventana,
- el archivo siguiente suele arrancar una hora después del anterior con `20s` de solape.

### Irregularidades observadas

- primer archivo más corto: `293` timestamps (`06:11:20` a `07:00:00`)
- varias ventanas de cierre de día de `~400-410s`
- algunas ventanas intermedias truncadas o desplazadas
- `4` ventanas exactas duplicadas
- gaps nocturnos recurrentes de aproximadamente `6h 05m`

## 5. Tipo de valores observados

- todos los valores temporales son numéricos enteros serializados como texto,
- no se observaron vacíos,
- no se observaron negativos,
- rango observado: `0` a `6,198,472`.

Importante:

- los valores oscilan dentro de cada ventana,
- no son estrictamente monótonos,
- no debe asumirse semántica de conteo simple sin validación adicional.

## 6. Nivel de agregación observado

### Lo que sí está soportado

- una métrica temporal agregada,
- observación a nivel timestamp,
- comparación entre momentos, horas, días y ventanas,
- análisis de tendencia, volatilidad, cobertura y calidad del dato.

### Lo que no está soportado por evidencia

- ID de tienda,
- nombre de tienda,
- ciudad o geografía,
- categoría, brand o segmento,
- eventos individuales por entidad,
- joins con dimensiones maestras.

## 7. Interpretación prudente del campo métrico

El identificador observado es:

`synthetic_monitoring_visible_stores`

Hipótesis razonable:

- la serie representa una señal agregada relacionada con monitoreo sintético y visibilidad/disponibilidad.

Lo que **no** se debe afirmar todavía:

- que cada valor sea literalmente el número exacto de tiendas online,
- que exista descomposición por tienda,
- que cualquier pico o caída tenga causa de negocio identificable.

## 8. Supuestos explícitos

1. La unidad analítica correcta para esta versión es `timestamp -> valor agregado`.
2. Los archivos duplicados deben deduplicarse por ventana exacta antes de generar agregados.
3. Las ventanas truncadas deben marcarse como incompletas para no sesgar comparaciones.
4. Los nombres de archivo no tienen valor semántico de negocio.
5. La transformación principal requerida es de formato ancho a formato largo.

## 9. Limitaciones analíticas

- No es posible construir rankings de tiendas.
- No es posible explicar incidentes por tienda.
- No es posible segmentar por geografía o brand.
- No es posible inferir causalidad solo con esta serie.
- El texto del nombre de la métrica no basta para fijar definición de negocio completa.

## 10. Preguntas que sí se pueden responder

- ¿Cómo cambia la métrica a lo largo del tiempo?
- ¿Qué horas o días muestran mayor nivel o mayor volatilidad?
- ¿Hay ventanas anómalas o caídas abruptas?
- ¿Qué tan completo y limpio es el histórico?
- ¿Cómo se compara un período contra otro?
- ¿Qué limitaciones tiene el dataset y cómo afectan la interpretación?

## 11. Preguntas que no se deben prometer

- ¿Qué tienda tuvo peor disponibilidad?
- ¿Qué tiendas estuvieron offline más tiempo?
- ¿Qué ciudad tuvo más incidentes?
- ¿Cuál fue la causa exacta de una caída?
- ¿Qué merchant específico explica una anomalía?

## 12. Implicación de producto

La solución debe pivotar de “dashboard de tiendas” a:

- **dashboard de serie temporal agregada**,
- **chatbot semanticamente útil pero acotado por el dato**,
- **narrativa fuerte de honestidad analítica**.

Eso no debilita la demo. La fortalece, porque muestra criterio técnico y respeto por la evidencia.
