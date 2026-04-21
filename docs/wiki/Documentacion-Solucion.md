# Documentacion Solucion

## 1. Resumen ejecutivo

La solucion construida no parte de una interfaz bonita ni de un chatbot generico. Parte del dato disponible y de su granularidad real.

El resultado final es un producto analytics-first con cinco bloques acoplados de forma intencional:

- entendimiento y saneamiento del dato,
- materializacion de artefactos procesados,
- backend deterministico,
- frontend de dashboard,
- chatbot semantico grounded.

## 2. Flujo end to end

El flujo completo del sistema es:

`CSV raw` -> `profiling y limpieza en notebooks/scripts` -> `data/processed` -> `FastAPI` -> `dashboard y chat en Next.js`

### Raw y procesamiento

- Los archivos fuente viven en `data/raw/`.
- Los notebooks validan esquema, timestamps, duplicados y limites del dataset.
- El script `scripts/process_availability_data.py` materializa la logica reproducible.
- El backend no consulta cientos de CSV crudos por request; consume solo artefactos procesados.

### Artefactos procesados principales

- `availability_daily.csv`
- `availability_hourly.csv`
- `availability_hourly_anomalies.csv`
- `availability_quality_report.json`
- `availability_step_changes.csv`

Estos artefactos son el contrato real de la aplicacion.

## 3. Backend

El backend esta implementado en FastAPI y separado en capas:

- `app/api`: rutas HTTP,
- `app/services`: orquestacion de casos de uso,
- `app/analytics`: verdad deterministica,
- `app/chat`: planner, composer, memoria y enriquecimiento opcional,
- `app/schemas`: contratos typed compartidos.

### Endpoints principales

- `GET /health`
- `GET /api/v1/metrics/overview`
- `GET /api/v1/metrics/day-briefing`
- `GET /api/v1/metrics/coverage-extremes`
- `POST /api/v1/chat/query`

## 4. Frontend

El frontend usa Next.js App Router y se divide en dos experiencias:

- dashboard para exploracion operativa,
- chat para consulta semantica grounded.

El dashboard no intenta inventar dimensiones por tienda. Se concentra en:

- KPIs del periodo,
- serie diaria,
- patron horario,
- anomalias,
- calidad del dato,
- widgets fijados desde el chat.

## 5. Chatbot

El chatbot actual:

- clasifica la pregunta,
- resuelve rango temporal,
- valida si la pregunta esta soportada,
- ejecuta la consulta deterministica,
- devuelve respuesta, evidencia, warnings y follow-ups,
- puede producir artefactos visuales que luego se fijan en el tablero.

## 6. Dockerizacion

El proyecto puede ejecutarse localmente con `docker compose up --build`.

Objetivos de la dockerizacion:

- reproducibilidad,
- entorno consistente para demo,
- simplificacion del setup para revisores,
- aislar backend y frontend sin complejidad extra.

## 7. Calidad y testing

La solucion no depende solo de narrativa. Tiene validacion automatizada:

- lint del backend,
- tests backend con coverage,
- tests frontend,
- type-check del frontend,
- build de Next.js,
- smoke tests de API con Newman,
- auditoria de dependencias,
- CodeQL manual,
- SonarQube Cloud opcional.

## 8. CI/CD

El repositorio incluye workflows en `.github/workflows/` para:

- CI principal,
- seguridad de dependencias,
- dependency review,
- CodeQL manual.

En CI se ejecutan pruebas, build, smoke tests y, si existe `SONAR_TOKEN`, tambien el escaneo de SonarQube Cloud.

## 9. Decisiones de producto y arquitectura

Decisiones clave:

- no se uso RAG puro porque el dataset es estructurado y agregado,
- no se implemento analitica por tienda porque el dato no soporta esa dimension,
- el LLM no calcula numeros,
- se prefirio honestidad analitica sobre amplitud ficticia de features.

## 10. Alcance real

La solucion actual sirve para:

- explicar la senal observada,
- comparar periodos,
- revisar cobertura y calidad,
- identificar dias u horas debiles,
- fijar insights del chat en el dashboard.

No sirve para:

- responder por tienda, merchant o ciudad,
- afirmar causas raiz confirmadas,
- inventar nuevas dimensiones de negocio no presentes en el dato.
