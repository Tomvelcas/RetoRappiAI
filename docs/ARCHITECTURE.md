# Arquitectura

## 1. Visión general del sistema

La arquitectura correcta para este repositorio es:

- **monorepo dockerizado**,
- **backend en Python + FastAPI**,
- **frontend en Next.js**,
- **notebooks como primera capa de entendimiento y preparación del dato**,
- **chatbot grounded sobre analítica determinística**.

Principio rector:

> La verdad numérica vive en la capa analítica determinística. El LLM solo interpreta, explica y formatea.

## 2. Estructura del monorepo

```text
ai-powered-dashboard/
├── docs/                  # Fuente de verdad del producto y la arquitectura
├── notebooks/             # Entendimiento, limpieza y validación analítica
├── data/
│   ├── raw/               # CSVs originales exportados
│   ├── processed/         # Tablas canónicas y agregados derivados
│   └── samples/           # Muestras pequeñas para pruebas o demo
├── backend/
│   ├── app/api/           # Endpoints HTTP
│   ├── app/services/      # Orquestación de casos de uso
│   ├── app/analytics/     # Métricas y lógica determinística
│   ├── app/chat/          # Router semántico y formateo del chat
│   ├── app/schemas/       # Contratos typed
│   └── app/core/          # Configuración, logging y utilidades
├── frontend/
│   └── src/               # Dashboard, chat UI y cliente API
└── .github/workflows/     # CI
```

## 3. Flujo de datos

### Flujo objetivo

`raw CSV wide` -> `notebooks de profiling/sanitización` -> `processed long + agregados` -> `backend analytics API` -> `frontend dashboard` -> `chat grounded`

### Detalle

1. **Raw**
   Los CSV originales se conservan intactos en `data/raw/`.

2. **Notebook layer**
   Los notebooks `01`, `02` y `03` validan esquema, parsean timestamps, identifican duplicados, convierten el formato ancho a tabla larga y aterrizan qué producto sí tiene sentido construir.
   El script `scripts/process_availability_data.py` materializa esa lógica en una ruta reproducible para `data/processed/`.

3. **Processed layer**
   Las salidas actuales de `data/processed/` ya son el contrato base para aplicación y demo:
   - `availability_long_canonical.csv`: una fila por timestamp observado
   - `availability_window_metadata.csv`: una fila por ventana exportada
   - `availability_hourly.csv`: agregados por hora con baseline y z-score por hora
   - `availability_daily.csv`: agregados por día con cobertura observada
   - `availability_quality_report.json`: duplicados, truncamientos, gaps y cobertura global
   - `availability_hourly_anomalies.csv`: horas candidatas a anomalía
   - `availability_step_changes.csv`: saltos relevantes a 10 segundos
   - `availability_overview_summary.json`: resumen ligero útil para inspección o demo

   En esta iteración se materializan como CSV/JSON para maximizar portabilidad local y simplicidad de ejecución. Si más adelante se justifica, pueden migrarse a Parquet sin cambiar el contrato analítico.

4. **Backend**
   El backend nunca debería leer directamente cientos de CSV crudos en tiempo de request. Debe leer tablas procesadas, cachearlas en memoria si hace falta y producir payloads acotados.

5. **Frontend**
   El frontend consume endpoints ya preparados para visualización y para respuesta semántica.

6. **Chat**
   El chat consulta primero la capa analítica. Solo después usa LLM para explicar.

## 4. Componentes del backend

### `app/api/`

- define rutas públicas,
- valida inputs,
- devuelve contratos typed,
- evita lógica analítica compleja inline.

### `app/services/`

- coordina casos de uso,
- orquesta lectura de processed data,
- compone respuestas para dashboard y chat.

### `app/analytics/`

- contiene funciones determinísticas,
- define agregaciones, comparaciones y detección de anomalías,
- es la capa fuente de verdad para el producto.

### `app/chat/`

- clasifica intención,
- selecciona consulta permitida,
- empaqueta evidencia,
- invoca el LLM solo para redacción o explicación.

### `app/schemas/`

- request/response models,
- contratos compartidos con frontend,
- estructuras de evidencia para el chat.

### `app/core/`

- config,
- logging,
- manejo de errores,
- utilidades de parsing y trazabilidad.

## 5. Contrato inicial del backend

El backend MVP ya puede implementarse con suficiente claridad a partir de `data/processed/`.

### Endpoints mínimos

- `GET /health`
- `GET /api/v1/metrics/overview`
- `POST /api/v1/chat/query`

### `GET /api/v1/metrics/overview`

Debe leer como mínimo:

- `availability_daily.csv`
- `availability_hourly.csv`
- `availability_quality_report.json`
- `availability_hourly_anomalies.csv`

Debe devolver un payload centrado en producto y no en supuestos por tienda:

- rango observado,
- KPIs del período,
- tendencia diaria,
- resumen intradiario,
- resumen de calidad del dato,
- highlights de anomalías con advertencias.

Vocabulario recomendado:

- `nivel medio de señal`,
- `cobertura`,
- `baseline horario`,
- `desviación`,
- `anomalía`,
- `confidence flag`.

Vocabulario a retirar del scaffold actual:

- `Availability Rate`,
- `Affected Stores`,
- `Incident Hours`.

### `POST /api/v1/chat/query`

Debe seguir este patrón:

1. clasificar intención,
2. validar si la intención está soportada,
3. ejecutar consulta determinística sobre `processed/`,
4. construir objeto de evidencia compacto,
5. responder con template o LLM acotado.

Intenciones iniciales recomendadas:

- `trend_summary`
- `period_comparison`
- `intraday_pattern`
- `anomaly_review`
- `data_quality_status`
- `metric_definition`
- `unsupported_request`

La primera versión no necesita embeddings ni vector DB.

## 6. Componentes del frontend

### Dashboard

Debe pivotar a visualización agregada temporal, no por tienda:

- KPIs principales del período,
- curva temporal principal,
- comparación entre períodos,
- panel de calidad del dato,
- bloque de hallazgos/anomalías.

### Chat UI

- input simple,
- historial corto,
- respuesta con evidencia y advertencias,
- idealmente un panel “data behind the answer” para reforzar trazabilidad.

### Estado y modularidad

- filtros temporales y selecciones deben modelarse como estado estructurado,
- la UI debe ser componible por secciones,
- el cliente API debe centralizar contratos con backend.

## 7. Estrategia del chatbot

El chatbot recomendado no es un RAG puro. Es un **semantic interface sobre analytics determinística**.

### Patrón recomendado

1. Pregunta del usuario
2. Clasificación de intención
3. Normalización de rango temporal o comparación
4. Consulta determinística sobre `processed/`
5. Evidencia estructurada
6. Formateo con LLM o template
7. Respuesta con límites y trazabilidad

### Intenciones iniciales sugeridas

- resumen de tendencia,
- comparación de períodos,
- patrón intradiario,
- explicación de un pico o caída con contexto de baseline,
- preguntas de calidad del dato,
- definición de la métrica,
- consulta no soportada.

## 8. Cómo se evita acoplar el chatbot a supuestos no soportados por el dato

- El chat no tendrá herramientas para consultar tiendas porque el dataset no muestra esa dimensión.
- El catálogo de intenciones se define desde `DATA_DICTIONARY.md`, no desde supuestos de negocio.
- Las respuestas deben incluir una advertencia cuando la pregunta pida granularidad no existente.
- La evidencia enviada al modelo debe contener solo agregados y metadatos validados.
- La capa de chat debe incluir `coverage` o `confidence flags` cuando la evidencia tenga soporte parcial.

## 9. Estrategia de Docker

- `docker-compose.yml` levanta frontend y backend para demo local.
- El backend puede leer processed data desde volumen montado.
- El frontend solo conoce al backend vía `NEXT_PUBLIC_API_BASE_URL`.
- No se necesita base de datos externa en esta fase si los artefactos procesados caben en disco y memoria local.

Recomendación:

- mantener la primera versión sin servicios extra,
- agregar persistencia adicional solo si aparece necesidad real.

## 10. Estrategia de CI/CD

### Base obligatoria

- instalación de dependencias backend y frontend,
- lint backend,
- tests backend,
- type-check y build frontend.

### Stretch goal razonable

- cobertura de tests,
- SonarCloud como señal adicional de calidad si el tiempo y credenciales lo permiten.

Decisión recomendada:

- no bloquear el MVP por SonarCloud,
- sí dejar el pipeline preparado para integrarlo después si conviene.

## 11. Decisiones de modularidad

- Separar profiling del dato de la app runtime.
- Separar analítica determinística de la capa conversacional.
- Diseñar endpoints centrados en casos de uso, no en archivos.
- Mantener el dashboard extensible por secciones sin inventar nuevas dimensiones.
- Definir un contrato explícito de evidencia para el chat.
- Desacoplar nomenclatura del backend de cualquier semántica no validada por el dataset.

## 12. Riesgos arquitectónicos

- Leer raw files en runtime degradaría claridad y performance.
- Introducir embeddings o vector DB para esta serie temporal agregada aumentaría complejidad sin mejorar precisión.
- Modelar “tiendas” en el dominio sin evidencia contaminaría todo el sistema.
- Mantener payloads placeholder con semántica de tienda contaminaría frontend, tests y narrativa de demo.

Conclusión:

La arquitectura correcta es deliberadamente sobria. Demuestra criterio no por complejidad artificial, sino por respetar el dato, controlar al LLM y mantener trazabilidad extremo a extremo.
