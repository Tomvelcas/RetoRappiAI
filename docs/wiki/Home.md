# Wiki

Esta wiki documenta la solucion de punta a punta del proyecto `ai-powered-dashboard`.

Objetivos:

- explicar que se construyo realmente,
- dejar claro el alcance tecnico y analitico,
- facilitar mantenimiento, demo y evolucion del repositorio,
- evitar que la narrativa del proyecto se separe de lo que el codigo soporta hoy.

## Paginas recomendadas

- [Documentacion Solucion](Documentacion-Solucion)
- [Documentacion Dashboard](Documentacion-Dashboard)
- [Documentacion AI](Documentacion-AI)
- [Gobernanza del Repositorio](Gobernanza-del-Repositorio)

## Lectura rapida

Este proyecto implementa:

- un backend en FastAPI con analitica deterministica sobre `data/processed/`,
- un frontend en Next.js con dashboard interactivo y chat,
- un chatbot semanticamente guiado, grounded sobre metrica agregada,
- dockerizacion para ejecucion local reproducible,
- CI con lint, tests, type-check, build, smoke tests y escaneo opcional con SonarQube Cloud.

## Principio rector

La verdad numerica vive en la capa analitica deterministica. El LLM solo interpreta, redacta y amplifica una evidencia que ya fue calculada y validada fuera del modelo.
