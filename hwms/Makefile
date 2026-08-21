.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps images build test integration-test access-test smoke fmt tidy seed-manager login-theme web-dev clean

# Ports are overridable because 8080 and 3000 are the most contended ports on a
# developer machine. Keep APP_BASE_URL and the Keycloak redirect URI in step
# with WEB_PORT. All three have to agree or sign-in is refused.
WEB_PORT     ?= 8090
GRAFANA_PORT ?= 3001
CLINICAL_TEST_DATABASE_URL ?= postgres://hwms_clinical:clinical-development-password@127.0.0.1:55433/clinical?sslmode=disable
METRICS_TEST_DATABASE_URL  ?= postgres://hwms:hwms-development-password@127.0.0.1:55432/metrics?sslmode=disable

help: ## Show the available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: images ## Build the images and start the whole stack
	docker compose up -d
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

restart: images ## Rebuild and restart the application services, leaving data alone
	docker compose up -d gateway identity clinical admin occupational metrics web

ps: ## Show what is running
	docker compose ps --format "table {{.Service}}\t{{.Status}}"

logs: ## Follow the application service logs
	docker compose logs -f gateway identity clinical admin occupational metrics

# The interface is compiled on the host rather than inside the image: Docker's
# build sandbox cannot resolve DNS on some Linux hosts, so npm cannot reach the
# registry from inside a build stage. web/Dockerfile copies the result in.
#
# This step is not optional when only the frontend changed. "docker compose up
# --build" on its own packages whatever dist happens to be on disk, which is
# how a stale interface reaches a demonstration.
images: ## Build the frontend on the host, then build the container images
	@[ -d web/node_modules ] || (cd web && npm ci)
	cd web && npm run build
	docker compose build

build: ## Compile the Go binaries and the frontend, without packaging them
	go build ./...
	cd web && npm run build

test: ## Run vet and the Go tests
	go vet ./...
	go test ./...

integration-test: ## Run the clinical and metrics SQL regression tests
	@CLINICAL_TEST_DATABASE_URL='$(CLINICAL_TEST_DATABASE_URL)' \
		METRICS_TEST_DATABASE_URL='$(METRICS_TEST_DATABASE_URL)' \
		go test ./services/clinical ./services/metrics \
		-run 'StaleReferralTransition|CorrectedFeedback|OutOfOrderLeaveContributions' -v

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

# realm-hwms.json already selects the theme, so a realm imported from scratch
# needs nothing here. Keycloak's --import-realm skips a realm that already
# exists, so a stack older than the theme still points at the stock pages.
login-theme: ## Point an already-imported realm at the KMC login theme
	./deploy/scripts/apply-login-theme.sh

web-dev: ## Run the frontend with hot reloading against a running gateway
	cd web && npm run dev

clean: ## Stop the stack and delete its data. Destroys the realm, every account and every record.
	@printf 'This deletes the Keycloak realm, all accounts and all clinical records. Type yes to continue: ' && read ans && [ "$$ans" = "yes" ]
	docker compose down -v
