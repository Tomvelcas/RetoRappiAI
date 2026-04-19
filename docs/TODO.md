# Plan de Ejecución

## Objetivo

Entregar en 3 días una solución demostrable, técnicamente sólida y coherente con la granularidad real del dataset.

## Día 1: Entender y procesar el dato

### Bloques de trabajo

1. Completar notebook de profiling y sanitización.
2. Definir reglas de parseo temporal, deduplicación y marcado de ventanas incompletas.
3. Generar primer set de artefactos en `data/processed/`.
4. Cerrar diccionario de datos y lista de preguntas soportadas.

### Hitos verificables

- tabla canónica `timestamp -> valor agregado`,
- reporte de calidad del dato,
- identificación explícita de duplicados y gaps,
- 3 a 5 insights preliminares defendibles.

## Día 2: Backend analytics-first + chat grounded

### Bloques de trabajo

1. Implementar lector de processed data.
2. Construir endpoints de dashboard agregado.
3. Construir router inicial del chat por intención.
4. Implementar respuesta grounded con evidencia.
5. Agregar tests de lógica analítica y API.

### Hitos verificables

- endpoint de overview confiable,
- endpoint de serie temporal,
- endpoint de calidad del dato,
- endpoint de chat con fallback “no soportado”,
- tests pasando.

## Día 3: Frontend, demo y calidad

### Bloques de trabajo

1. Conectar dashboard al backend real.
2. Integrar panel de chat con evidencia visible.
3. Pulir visualización y narrativa de hallazgos.
4. Ajustar CI y revisar calidad final.
5. Ensayar demo de 5 a 7 minutos.

### Hitos verificables

- flujo local completo con Docker,
- dashboard usable y claro,
- chat mostrando respuestas trazables,
- script de demo consistente,
- repo limpio y defendible.

## Orden recomendado

1. Dataset y procesamiento
2. Métricas determinísticas
3. Chat grounded
4. Frontend conectado
5. Demo y polish

No invertir este orden.

Si el procesamiento no está bien, todo lo demás se vuelve frágil.

## Qué construir primero

- profiling del dataset,
- tabla procesada larga,
- métricas agregadas útiles,
- contrato de evidencia del chat.

## Qué dejar fuera si falta tiempo

- SonarCloud,
- visualizaciones muy sofisticadas,
- memoria conversacional,
- recomendaciones generativas complejas,
- filtros avanzados que no cambien la historia principal,
- cualquier feature por tienda o por geografía.

## Riesgos de ejecución

- perder tiempo intentando “salvar” granularidad por tienda inexistente,
- sobreinvertir en UI antes de cerrar la capa analítica,
- usar LLM demasiado pronto sin evidence contract,
- dispersarse en tooling no esencial.

## Criterio de priorización

Cuando haya trade-offs, priorizar en este orden:

1. honestidad analítica,
2. trazabilidad,
3. funcionalidad demoable,
4. claridad visual,
5. features extra.
