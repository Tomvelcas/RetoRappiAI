# Backend

FastAPI service for deterministic analytics and grounded chatbot orchestration.

Current scope:

- deterministic endpoints for overview, daily trend, intraday profile, anomalies, quality, coverage extremes, and day briefing,
- `POST /api/v1/chat/query` with intent planning, date normalization, supported-scope validation, and structured evidence,
- sqlite-backed conversation memory for referential follow-ups,
- optional OpenAI enrichment for redaction, tentative hypotheses, and isolated web context when explicitly enabled.
