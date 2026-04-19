# AGENTS

## Visión del repo

Monorepo para una prueba de AI engineering orientada a dashboard + chat grounded sobre una serie temporal agregada.

## Antes de construir nada

Leer en este orden:

1. `docs/DATA_DICTIONARY.md`
2. `docs/LECTURA_EJECUTIVA_DEL_DATO.md`
3. `docs/NOTEBOOK_GUIDE.md`
4. `docs/PRD.md`
5. `docs/ARCHITECTURE.md`
6. `docs/AI_STRATEGY.md`
7. `docs/TODO.md`
8. `docs/DECISIONS.md`

## Prioridades de ingeniería

- No inventar granularidad por tienda.
- Mantener la verdad numérica en la capa analítica.
- Usar el LLM solo para interpretación y explicación.
- Optimizar trazabilidad, costo de tokens y calidad técnica.
- No usar vocabulario placeholder no soportado por el dataset.

## Principios del proyecto

- analytics-first,
- grounded chat,
- honestidad analítica,
- modularidad,
- demo readiness.

## Rutas y comandos útiles

- `data/raw/`: fuente original
- `data/processed/`: artefactos para app
- `notebooks/`: profiling y sanitización
- `backend/`: APIs y lógica analítica
- `frontend/`: dashboard y chat UI
- `scripts/process_availability_data.py`: pipeline reproducible raw -> processed
- `docker compose up --build`
- `make test`
- `make lint`
- `make build`

## Estado actual

- `data/processed/` ya existe y es la fuente correcta para implementar el backend MVP.
- El siguiente paso recomendado es reemplazar los mocks del backend por analytics reales sobre `daily`, `hourly`, `quality` y `anomalies`.
