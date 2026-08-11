.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps build test access-test smoke fmt tidy seed-manager web-dev clean

# Ports are overridable because 8080 and 3000 are the most contended ports on a
# developer machine. Keep APP_BASE_URL and the Keycloak redirect URI in step
# with WEB_PORT — all three have to agree or sign-in is refused.
WEB_PORT     ?= 8090
GRAFANA_PORT ?= 3001

help: ## Show the available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the whole stack
	docker compose up --build -d
	@echo
	@echo "  Application    http://localhost:$(WEB_PORT)"
	@echo "  Keycloak       http://keycloak:8180   (needs '127.0.0.1 keycloak' in /etc/hosts)"
	@echo "  Grafana        http://localhost:$(GRAFANA_PORT)"
	@echo "  Prometheus     http://localhost:9090"
	@echo
	@echo "  No accounts exist yet. Create the first manager:  make seed-manager"
	@echo

down: ## Stop the stack, keeping data
	docker compose down

restart: ## Rebuild and restart the application services, leaving data alone
	docker compose up --build -d gateway identity clinical web

ps: ## Show what is running
	docker compose ps --format "table {{.Service}}\t{{.Status}}"

logs: ## Follow the application service logs
	docker compose logs -f gateway identity clinical

build: ## Build the Go binaries and the frontend
	go build ./...
	cd web && npm run build

test: ## Run vet and the Go tests
	go vet ./...
	go test ./...

access-test: ## Run only the clinical access-control suite, verbosely
	@echo "Proving that no role other than the Health and Wellness Officer reaches a clinical route."
	go test ./services/clinical/... -run 'Access|Refus|Officer|Covered' -v

smoke: ## Check a running stack against the Phase 0 acceptance criteria
	KEYCLOAK_URL=http://localhost:8180 ./deploy/scripts/smoke-test.sh

fmt: ## Format the Go source
	gofmt -w platform services

tidy: ## Tidy the Go module
	go mod tidy

seed-manager: ## Create the first manager account (interactive)
	./deploy/scripts/seed-manager.sh

web-dev: ## Run the frontend with hot reloading against a running gateway
	cd web && npm run dev

clean: ## Stop the stack and delete its data. Destroys the realm, every account and every record.
	@printf 'This deletes the Keycloak realm, all accounts and all clinical records. Type yes to continue: ' && read ans && [ "$$ans" = "yes" ]
	docker compose down -v
