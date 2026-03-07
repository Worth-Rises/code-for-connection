.PHONY: open dev build db seed studio clean

# Start dev servers and open the web app in browser
open:
	@sleep 4 && open http://localhost:5173 &
	npm run dev

# Start development servers (API + signaling + web)
dev:
	npm run dev

# Build all packages
build:
	npm run build

# Run database migrations
db:
	npm run db:migrate

# Seed the database with test data
seed:
	npm run db:seed

# Open Prisma Studio
studio:
	npm run db:studio

# Generate Prisma client
generate:
	npx prisma generate

# Install dependencies
install:
	npm install

# Full setup: install, build shared packages, start postgres/redis, migrate, seed
setup:
	npm install
	npm run build -w @openconnect/shared
	npm run build -w @openconnect/ui
	docker compose up -d postgres redis
	sleep 3
	npm run db:migrate
	npm run db:seed

# Clean all build artifacts
clean:
	npm run clean
