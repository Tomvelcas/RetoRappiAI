# AI-Powered Dashboard

Monorepo analytics-first para un dashboard y un chatbot grounded sobre una serie temporal agregada de disponibilidad observada.

El repositorio ya incluye backend determinístico, dashboard operativo, planner conversacional, memoria liviana y una capa opcional de OpenAI para enriquecer redacción o aportar hipótesis tentativas sin mover la verdad numérica fuera de la analítica.

## Architecture Intent

- Deterministic analytics remains the source of business truth.
- The chatbot layer is reserved for semantic interpretation, response composition, and controlled optional enrichment.
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

- Frontend: `http://localhost:3418`
- Backend: `http://localhost:8418`
- API docs: `http://localhost:8418/docs`

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

Important: the backend reads environment variables from `ai-powered-dashboard/.env`. A `.env`
file placed outside the repository root will not be picked up by the application settings.

## Common Commands

```bash
make install        # Install backend and frontend dependencies
make test           # Run backend tests
make coverage       # Run backend tests with coverage output
make lint           # Run backend lint checks
make typecheck      # Run frontend TypeScript checks
make build          # Build the frontend
make api-smoke      # Run Newman smoke tests against a running backend
make docker-up      # Start both services with Docker Compose
make docker-down    # Stop Docker Compose services
```

## What Is Included

- FastAPI backend with deterministic metrics endpoints and grounded chat orchestration
- Next.js App Router frontend with dashboard, chat workspace, and pin-to-dashboard flow
- Tailwind CSS styling and a small API client layer
- Placeholder notebooks and documentation
- Dockerfiles and `docker-compose.yml`
- Practical CI for install, lint, coverage, API smoke tests, type-checking, and build
- Security automation via dependency audits, CodeQL, Dependency Review, and Dependabot
- Chat artifacts that can be fixed into the dashboard as ad-hoc widgets
- Optional LLM enrichment with explicit guardrails, caveats, and isolated web-context support

## Quality and Security

- Main CI workflow: `.github/workflows/ci.yml`
- Security workflow: `.github/workflows/security.yml`
- Static analysis: `.github/workflows/codeql.yml`
- Dependency review on PRs: `.github/workflows/dependency-review.yml`
- Additional guidance: [docs/QUALITY_AND_SECURITY.md](docs/QUALITY_AND_SECURITY.md)

## Chatbot Guide

- Guía funcional del copiloto: [docs/CHATBOT_GUIDE.md](docs/CHATBOT_GUIDE.md)
- Estrategia AI y guardrails: [docs/AI_STRATEGY.md](docs/AI_STRATEGY.md)
- Arquitectura general: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Next Development Steps

- Expand artifact types beyond the current bar-style chart payloads
- Add richer dashboard-to-chat cross-filtering beyond the current pinning workflow
- Harden evaluation datasets for chat routing, guardrails, and LLM fallbacks
- Keep documentation aligned with the grounded analytics contract as new intents are added
