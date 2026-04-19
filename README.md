# AI-Powered Dashboard

Production-like monorepo scaffold for an analytics-first dashboard and chatbot focused on historical store availability data.

The current scaffold intentionally keeps business logic minimal. It sets up the repository shape, local developer workflow, Dockerized services, CI, and placeholder analytics/chat contracts so future implementation can focus on real data and product logic.

## Architecture Intent

- Deterministic analytics remains the source of business truth.
- The chatbot layer is reserved for semantic interpretation and grounded response formatting.
- Guardrails, traceability, and token efficiency are first-class concerns for later iterations.

## Repository Structure

```text
ai-powered-dashboard/
├── docs/               # Product, architecture, and delivery notes
├── notebooks/          # Data understanding and validation notebooks
├── data/               # Raw, processed, and sample datasets
├── backend/            # FastAPI analytics and chat orchestration service
├── frontend/           # Next.js dashboard and chat UI
└── .github/workflows/  # CI automation
```

## Local Setup

### Option 1: Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Option 2: Native Development

Backend requires Python 3.11+.

```bash
cp .env.example .env
python3.11 -m venv .venv
source .venv/bin/activate
make install
make backend-dev
make frontend-dev
```

Run `make backend-dev` and `make frontend-dev` in separate terminals.

## Common Commands

```bash
make install        # Install backend and frontend dependencies
make test           # Run backend tests
make lint           # Run backend lint checks
make typecheck      # Run frontend TypeScript checks
make build          # Build the frontend
make docker-up      # Start both services with Docker Compose
make docker-down    # Stop Docker Compose services
```

## What Is Included

- FastAPI backend with health, metrics, and chat placeholder endpoints
- Next.js App Router frontend with a minimal dashboard shell
- Tailwind CSS styling and a small API client layer
- Placeholder notebooks and documentation
- Dockerfiles and `docker-compose.yml`
- Practical CI for install, lint, tests, type-checking, and build

## Next Development Steps

- Add PRD details and architecture decisions under `docs/`
- Load real datasets into `data/`
- Implement deterministic analytics in `backend/app/analytics`
- Replace mocked chat behavior with grounded orchestration and guardrails
