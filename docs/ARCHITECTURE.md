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
   Los notebooks validan esquema, parsean timestamps, identifican duplicados y convierten el formato ancho a una tabla larga.

3. **Processed layer**
   Las salidas objetivo de `data/processed/` deben ser artefactos estables para aplicación y demo, por ejemplo:
   - `availability_long_canonical.csv`: una fila por timestamp observado
   - `availability_window_metadata.csv`: una fila por ventana exportada
   - `availability_hourly.csv`: agregados por hora
   - `availability_daily.csv`: agregados por día
   - `quality_report.json`: duplicados, truncamientos, gaps, cobertura
   - `availability_hourly_anomalies.csv`: horas candidatas a anomalía

   En esta iteración se materializan como CSV/JSON para maximizar portabilidad local y simplicidad de ejecución. Si más adelante se justifica, pueden migrarse a Parquet sin cambiar el contrato analítico.

4. **Backend**
   El backend nunca debería leer directamente cientos de CSV crudos en tiempo de request. Debe leer tablas procesadas y producir payloads acotados.

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

## 5. Componentes del frontend

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

## 6. Estrategia del chatbot

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
- explicación de un pico o caída,
- preguntas de calidad del dato,
- definición de la métrica,
- consulta no soportada.

## 7. Cómo se evita acoplar el chatbot a supuestos no soportados por el dato

- El chat no tendrá herramientas para consultar tiendas porque el dataset no muestra esa dimensión.
- El catálogo de intenciones se define desde `DATA_DICTIONARY.md`, no desde supuestos de negocio.
- Las respuestas deben incluir una advertencia cuando la pregunta pida granularidad no existente.
- La evidencia enviada al modelo debe contener solo agregados y metadatos validados.

## 8. Estrategia de Docker

- `docker-compose.yml` levanta frontend y backend para demo local.
- El backend puede leer processed data desde volumen montado.
- El frontend solo conoce al backend vía `NEXT_PUBLIC_API_BASE_URL`.
- No se necesita base de datos externa en esta fase si los artefactos procesados caben en disco y memoria local.

Recomendación:

- mantener la primera versión sin servicios extra,
- agregar persistencia adicional solo si aparece necesidad real.

## 9. Estrategia de CI/CD

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

## 10. Decisiones de modularidad

- Separar profiling del dato de la app runtime.
- Separar analítica determinística de la capa conversacional.
- Diseñar endpoints centrados en casos de uso, no en archivos.
- Mantener el dashboard extensible por secciones sin inventar nuevas dimensiones.
- Definir un contrato explícito de evidencia para el chat.

## 11. Riesgos arquitectónicos

- Leer raw files en runtime degradaría claridad y performance.
- Introducir embeddings o vector DB para esta serie temporal agregada aumentaría complejidad sin mejorar precisión.
- Modelar “tiendas” en el dominio sin evidencia contaminaría todo el sistema.

Conclusión:

La arquitectura correcta es deliberadamente sobria. Demuestra criterio no por complejidad artificial, sino por respetar el dato, controlar al LLM y mantener trazabilidad extremo a extremo.
