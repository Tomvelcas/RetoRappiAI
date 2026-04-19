VENV_DIR := .venv
PYTHON := $(VENV_DIR)/bin/python
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DATA_PYTHON ?= python3.11
APP_PORT ?= 8418
FRONTEND_PORT ?= 3418

.PHONY: install backend-install frontend-install backend-dev frontend-dev dev test coverage lint typecheck build api-smoke docker-up docker-down process-data

$(PYTHON):
	python3.11 -m venv $(VENV_DIR)

install: backend-install frontend-install

backend-install: $(PYTHON)
	$(PYTHON) -m pip install --upgrade pip
	cd $(BACKEND_DIR) && ../$(PYTHON) -m pip install -e ".[dev]"

frontend-install:
	cd $(FRONTEND_DIR) && npm install

backend-dev: $(PYTHON)
	cd $(BACKEND_DIR) && ../$(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port $(APP_PORT)

frontend-dev:
	cd $(FRONTEND_DIR) && FRONTEND_PORT=$(FRONTEND_PORT) npm run dev

dev:
	@echo "Run 'make backend-dev' and 'make frontend-dev' in separate terminals or use 'make docker-up'."

test:
	cd $(BACKEND_DIR) && ../$(PYTHON) -m pytest

coverage:
	cd $(BACKEND_DIR) && ../$(PYTHON) -m pytest --cov=app --cov-report=term-missing --cov-report=xml

lint:
	cd $(BACKEND_DIR) && ../$(PYTHON) -m ruff check .

typecheck:
	cd $(FRONTEND_DIR) && npm run typecheck

build:
	cd $(FRONTEND_DIR) && npm run build

api-smoke:
	npx --yes newman run qa/postman/dashboard-api.collection.json --env-var base_url=http://127.0.0.1:$(APP_PORT)

process-data:
	$(DATA_PYTHON) scripts/process_availability_data.py

docker-up:
	docker compose up --build

docker-down:
	docker compose down
