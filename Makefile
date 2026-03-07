.PHONY: help open dev build db seed studio clean generate install setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

open: ## Start dev servers and open the web app
	@sleep 4 && open http://localhost:5173 &
	npm run dev

dev: ## Start development servers (API + signaling + web)
	npm run dev

build: ## Build all packages
	npm run build

db: ## Run database migrations
	npm run db:migrate

seed: ## Seed the database with test data
	npm run db:seed

studio: ## Open Prisma Studio (database browser)
	npm run db:studio

generate: ## Generate Prisma client from schema
	npx prisma generate

install: ## Install dependencies
	npm install

setup: ## Full setup: install, build, start DB, migrate, seed
	npm install
	npm run build -w @openconnect/shared
	npm run build -w @openconnect/ui
	docker compose up -d postgres redis
	sleep 3
	npm run db:migrate
	npm run db:seed

clean: ## Clean all build artifacts and node_modules
	npm run clean
