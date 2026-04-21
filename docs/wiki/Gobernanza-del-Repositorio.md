# Gobernanza del Repositorio

## 1. Objetivo

Esta pagina resume como conviene operar el repositorio si se vuelve publico.

## 2. Politica recomendada

- Repositorio publico para visibilidad y wiki.
- Edicion de wiki restringida a colaboradores.
- Push directo bloqueado en `main`.
- Todo cambio entra por pull request.
- Checks obligatorios antes de merge.

## 3. Branch protection recomendada

Para `main`:

- requerir pull request antes de merge,
- requerir CI exitoso,
- requerir Dependency Review,
- opcionalmente requerir SonarQube Cloud si lo va a usar como quality gate real,
- bloquear force-push,
- bloquear branch deletion,
- opcionalmente exigir approval.

## 4. Colaboracion

En cuenta personal:

- solo el owner y los colaboradores pueden hacer push,
- si necesita permisos mas granulares, conviene mover el repo a una organizacion.

En organizacion:

- puede separar `read`, `triage`, `write`, `maintain`, `admin`,
- puede gestionar equipos,
- puede limitar quien puede cambiar visibilidad del repo.

## 5. Riesgos de volverlo publico

- el codigo queda visible para cualquiera,
- cualquiera puede forkear,
- el historial y logs de GitHub Actions quedan visibles,
- se vuelve critico no exponer secretos ni datos sensibles en codigo, issues ni workflows.

## 6. SonarQube Cloud

Si el proyecto de SonarQube Cloud queda publico:

- cualquiera podra ver resultados del analisis,
- eso no rompe el escaneo,
- pero si cambia la visibilidad de los hallazgos.

## 7. Checklist previo a publicar

- confirmar que `.env` no este trackeado,
- revisar que no haya secretos en codigo,
- revisar Actions logs historicos,
- activar branch protection,
- revisar si el proyecto de Sonar debe quedar publico o privado,
- dejar README y wiki consistentes con el estado real del repo.
