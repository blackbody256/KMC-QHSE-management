.DEFAULT_GOAL := help
.PHONY: help up down logs build test tidy seed-manager web-dev clean

help: ## Show the available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Start the whole stack
	docker compose up --build -d
	@echo
	@echo "Application    http://localhost:8080"
	@echo "Keycloak       http://keycloak:8180  (add '127.0.0.1 keycloak' to /etc/hosts)"
	@echo "Grafana        http://localhost:3000"
	@echo "Prometheus     http://localhost:9090"
	@echo
	@echo "Seed the manager account before signing in:  make seed-manager"

down: ## Stop the stack, keeping data
	docker compose down

logs: ## Follow the service logs
	docker compose logs -f gateway identity

build: ## Build the Go binaries and the frontend
	go build ./...
	cd web && npm run build

test: ## Run the Go tests and vet
	go vet ./...
	go test ./...

tidy: ## Tidy the Go module
	go mod tidy

seed-manager: ## Create the first manager account (interactive)
	./deploy/scripts/seed-manager.sh

web-dev: ## Run the frontend against a running gateway
	cd web && npm run dev

clean: ## Stop the stack and remove its data. Destroys the Keycloak realm and every account.
	docker compose down -v
