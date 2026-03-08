.PHONY: open install setup dev services web stop clean

# Start everything and open the web app in a browser
open: dev
	@echo "Opening http://localhost:5173"
	@sleep 2 && open http://localhost:5173 &

# Start all services + web frontend (background)
dev:
	@docker compose up -d postgres redis
	@npm run dev &
	@echo "Dev servers starting..."
	@echo "  Web:       http://localhost:5173"
	@echo "  API:       http://localhost:3000"
	@echo "  Signaling: http://localhost:3001"
	@echo ""
	@echo "Admin logins (pwd: admin123):"
	@echo "  admin@nydocs.gov (agency)"
	@echo "  admin@singsingcf.gov (Sing Sing)"
	@echo "  admin@bedfordhillscf.gov (Bedford Hills)"

# Start only backend services
services:
	@docker compose up -d postgres redis
	@npm run dev:services

# Start only web frontend
web:
	@npm run dev:web

# Install dependencies
install:
	npm install

# First-time setup: install deps, copy env, start DB, run migrations and seed
setup: install
	@test -f .env || cp .env.example .env
	docker compose up -d postgres redis
	@echo "Waiting for database..."
	@sleep 3
	npm run db:generate
	npm run db:migrate
	npm run db:seed
	@echo "Setup complete. Run 'make open' to start."

# Stop background services
stop:
	-@pkill -f "npm run dev" 2>/dev/null || true
	-@pkill -f "vite" 2>/dev/null || true
	-@pkill -f "tsx watch" 2>/dev/null || true
	docker compose down

# Clean everything
clean: stop
	npm run clean
	docker compose down -v
