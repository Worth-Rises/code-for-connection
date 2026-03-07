# Maintainability Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete maintainability package so early-career state employees can deploy, understand, and modify Code for Connection on any major cloud.

**Architecture:** Four documentation files (ARCHITECTURE, GLOSSARY, RUNBOOK, CONTRIBUTING), three Dockerfiles, a production docker-compose, AWS Terraform with Azure porting notes, setup/deploy scripts, and three respectful PRs to other guild forks offering shared utilities and docs.

**Tech Stack:** Markdown, Docker, Terraform (AWS provider), Bash, GitHub CLI

**Branch:** `guild-admin-chris` on `chrishwiggins/code-for-connection`

---

## Phase 1: Documentation (sequential, each builds on the last)

### Task 1: Write ARCHITECTURE.md

**Files:**
- Create: `doc/ARCHITECTURE.md`

**Step 1: Write the architecture doc**

Include these sections in plain language:

```markdown
# Architecture

## What This System Does
[One paragraph a non-technical manager could read. The system connects
incarcerated people with their families through voice calls, video calls,
and messaging, with administrative oversight at every layer.]

## The Four User Roles
[Table: incarcerated, family, facility_admin, agency_admin. What each sees.]

## How a Voice Call Works
[Numbered steps 1-9, from PIN login to call history. Reference the tablet,
Twilio PSTN bridge, signaling server, and admin dashboard.]

## How a Video Call Works
[Numbered steps 1-8, from family requesting a visit to call completion.
Reference scheduling, approval, WebRTC, and the timer.]

## How a Message Gets Delivered
[Numbered steps 1-6, from compose to read receipt. Emphasize the
pending_review step where an admin approves before delivery.]

## Services
[What each process does:
- API Gateway (Express, port 3000): routes requests to guild backends
- Signaling Server (Socket.IO, port 3001): real-time call coordination
- Web App (Vite/React, port 5173): browser UI for all roles
- PostgreSQL: persistent data (users, calls, messages, contacts)
- Redis: signaling server pub/sub and session cache]

## Directory Map
[ASCII tree showing top-level structure:
guilds/{admin,voice,video,messaging}/
  api/routes.ts
  ui/{admin,incarcerated,family}/index.tsx
packages/shared/
services/{api-gateway,signaling}/
apps/web/
prisma/schema.prisma
deploy/]
```

Use ASCII box diagrams for the service architecture. No jargon without definition. Every acronym (PSTN, WebRTC, JWT, API, SQL) defined on first use.

**Step 2: Review for exclusionary language**

Run: `grep -iE 'whitelist|blacklist|master|slave|vanilla|sanity' doc/ARCHITECTURE.md`
Expected: No matches

**Step 3: Commit**

```bash
git add doc/ARCHITECTURE.md
git commit -m "doc: add plain-language architecture overview for future maintainers"
```

---

### Task 2: Write GLOSSARY.md

**Files:**
- Create: `doc/GLOSSARY.md`

**Step 1: Write the glossary**

Two sections: Domain Terms and Technical Terms.

Domain terms (alphabetical):
- Agency: a state department (e.g., NY DOCCS) that oversees multiple facilities
- Approved contact: a family member verified and authorized to communicate with a specific incarcerated person
- Facility: a single correctional institution (e.g., Sing Sing)
- Guild: a self-contained feature module in the codebase (voice, video, messaging, admin)
- Housing unit: a section within a facility where residents are housed; different unit types may have different communication rules
- Incarcerated person / Resident: someone currently in a correctional facility who uses the tablet interface
- Pending review: a message state where content awaits admin approval before delivery
- PSTN bridge: the connection between the internet-based call system and the regular phone network (via Twilio)

Technical terms (alphabetical):
- API Gateway: the Express server that routes HTTP requests to the correct guild backend
- ECS (Elastic Container Service): AWS service that runs Docker containers
- JWT (JSON Web Token): an encoded token sent with each request to prove identity
- ORM (Object-Relational Mapping): Prisma translates TypeScript code into SQL queries
- Prisma: the ORM used in this project; schema defined in `prisma/schema.prisma`
- RDS (Relational Database Service): AWS managed PostgreSQL
- Signaling server: a Socket.IO server that coordinates real-time events (call joined, call ended, mute toggled)
- Terraform: infrastructure-as-code tool that creates cloud resources from config files
- WebRTC: browser technology for peer-to-peer video and audio calls

**Step 2: Review for exclusionary language**

Run: `grep -iE 'whitelist|blacklist|master|slave|vanilla|sanity' doc/GLOSSARY.md`
Expected: No matches

**Step 3: Commit**

```bash
git add doc/GLOSSARY.md
git commit -m "doc: add glossary of domain and technical terms"
```

---

### Task 3: Write RUNBOOK.md

**Files:**
- Create: `doc/RUNBOOK.md`

**Step 1: Write the runbook**

Each procedure follows this template:
```
## Procedure Name
**When to use this:** [one sentence]
**Prerequisites:** [what you need before starting]
**Steps:**
1. [exact command or action]
2. [exact command or action]
**What can go wrong:**
- [symptom]: [cause and fix]
```

Procedures to include:
1. Deploy from scratch (local development)
2. Deploy to production (AWS)
3. Add a new facility
4. Onboard a new admin user
5. Investigate a failed voice call
6. Investigate a failed video call
7. Investigate a stuck message (pending_review)
8. Roll back a bad deploy
9. Rotate the JWT secret
10. Rotate the database password
11. Rotate Twilio credentials
12. Back up the database
13. Restore the database from backup
14. Common error messages (table: error, cause, fix)

For local deploy, the steps should be:
```bash
# 1. Clone the repository
git clone https://github.com/Worth-Rises/code-for-connection.git
cd code-for-connection

# 2. Copy environment config
cp .env.example .env
# Edit .env: set DATABASE_URL=postgresql://openconnect:hackathon2026@localhost:5432/openconnect

# 3. Start database and cache
docker compose up -d postgres redis

# 4. Install dependencies
npm install

# 5. Build shared packages
npm run build -w @openconnect/shared
npm run build -w @openconnect/ui

# 6. Set up database tables
npx prisma migrate dev --name init

# 7. Load sample data
npm run db:seed

# 8. Start the application
npm run dev

# 9. Verify: open http://localhost:5173 and log in
#    Admin: admin@nydocs.gov / admin123
#    Incarcerated: PIN 1234
#    Family: alice@example.com / password123
```

**Step 2: Review for exclusionary language**

Run: `grep -iE 'whitelist|blacklist|master|slave|vanilla|sanity' doc/RUNBOOK.md`
Expected: No matches

**Step 3: Commit**

```bash
git add doc/RUNBOOK.md
git commit -m "doc: add operational runbook with deployment and maintenance procedures"
```

---

### Task 4: Write CONTRIBUTING.md

**Files:**
- Create: `doc/CONTRIBUTING.md`

**Step 1: Write the contributing guide**

Sections:
1. **Local setup** (reference RUNBOOK.md procedure 1, don't duplicate)
2. **Adding a new API endpoint** - walk through creating a route in a guild's `api/routes.ts`, using `requireAuth`/`requireRole`, using `prisma` for queries, returning `createSuccessResponse`. Show a complete working example.
3. **Adding a new UI screen** - walk through creating a component in a guild's `ui/{role}/index.tsx`, using `useGuildApi` for data fetching, adding a route in `App.tsx`. Show a complete working example.
4. **The guild pattern** - explain why the codebase is split into guilds (independent teams, no merge conflicts, clear ownership), how guilds share the database and auth system, how the API gateway mounts guild routers.
5. **Code conventions** - TypeScript for everything, Tailwind CSS for styling, Prisma for database, Express for API, React with hooks for UI. File naming matches directory structure.
6. **Testing** - how to run existing tests, how to add a new test.
7. **Making a pull request** - branch naming, commit message style, PR description template.

**Step 2: Review for exclusionary language**

Run: `grep -iE 'whitelist|blacklist|master|slave|vanilla|sanity' doc/CONTRIBUTING.md`
Expected: No matches

**Step 3: Commit**

```bash
git add doc/CONTRIBUTING.md
git commit -m "doc: add contributing guide for future developers"
```

---

## Phase 2: Docker (can run in parallel with Phase 3)

### Task 5: Create Dockerfiles

**Files:**
- Create: `deploy/docker/Dockerfile.api`
- Create: `deploy/docker/Dockerfile.web`
- Create: `deploy/docker/Dockerfile.signaling`

**Step 1: Create deploy directory**

Run: `mkdir -p deploy/docker deploy/terraform deploy/scripts`

**Step 2: Write Dockerfile.api**

```dockerfile
# API Gateway
# Runs the Express server that handles all /api/* requests
# Connects to PostgreSQL and Redis

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api-gateway/package.json services/api-gateway/
COPY guilds/admin/package.json guilds/admin/
COPY guilds/voice/package.json guilds/voice/
COPY guilds/video/package.json guilds/video/
COPY guilds/messaging/package.json guilds/messaging/
RUN npm ci
COPY . .
RUN npm run build -w @openconnect/shared
RUN npm run build -w services/api-gateway

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["node", "services/api-gateway/dist/index.js"]
```

**Step 3: Write Dockerfile.web**

```dockerfile
# Web Frontend
# Builds the React app and serves it with nginx
# All API calls are proxied to the API gateway

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/
COPY guilds/ guilds/
RUN npm ci
COPY . .
RUN npm run build -w @openconnect/shared
RUN npm run build -w @openconnect/ui
RUN npm run build -w apps/web

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Step 4: Write nginx.conf**

Create `deploy/docker/nginx.conf`:
```nginx
# Routes /api/* requests to the API gateway
# Serves the React app for all other routes (SPA)
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # API and auth requests go to the backend
    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket connections for the signaling server
    location /socket.io/ {
        proxy_pass http://signaling:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Everything else serves the React app
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 5: Write Dockerfile.signaling**

```dockerfile
# Signaling Server
# Socket.IO server for real-time call events
# Connects to Redis for pub/sub across instances

FROM node:20-alpine AS builder
WORKDIR /app
COPY services/signaling/package*.json ./
RUN npm ci
COPY services/signaling/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Step 6: Verify Dockerfiles build**

Run: `docker build -f deploy/docker/Dockerfile.api -t c4c-api . 2>&1 | tail -5`
Run: `docker build -f deploy/docker/Dockerfile.web -t c4c-web . 2>&1 | tail -5`
Run: `docker build -f deploy/docker/Dockerfile.signaling -t c4c-signaling . 2>&1 | tail -5`
Expected: Each ends with "Successfully built" or "Successfully tagged"

Note: builds may fail if workspaces have issues; fix as needed and document any gotchas.

**Step 7: Commit**

```bash
git add deploy/docker/
git commit -m "deploy: add production Dockerfiles for API, web, and signaling"
```

---

### Task 6: Create docker-compose.prod.yml

**Files:**
- Create: `deploy/docker/docker-compose.prod.yml`

**Step 1: Write production compose file**

```yaml
# Production Docker Compose
# Use this to run the full application stack locally or on a single server.
# For cloud deployment (AWS, Azure), use the Terraform configs instead.
#
# Usage:
#   docker compose -f deploy/docker/docker-compose.prod.yml up -d
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - A .env file with production values (see .env.example)

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-openconnect}
      POSTGRES_USER: ${POSTGRES_USER:-openconnect}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openconnect"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ../..
      dockerfile: deploy/docker/Dockerfile.api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-openconnect}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-openconnect}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET in .env}
      NODE_ENV: production
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  signaling:
    build:
      context: ../..
      dockerfile: deploy/docker/Dockerfile.signaling
    restart: unless-stopped
    environment:
      REDIS_URL: redis://redis:6379
      PORT: 3001
    depends_on:
      redis:
        condition: service_healthy

  web:
    build:
      context: ../..
      dockerfile: deploy/docker/Dockerfile.web
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - api
      - signaling

volumes:
  pgdata:
```

**Step 2: Commit**

```bash
git add deploy/docker/docker-compose.prod.yml
git commit -m "deploy: add production docker-compose with health checks and secret requirements"
```

---

## Phase 3: Terraform (can run in parallel with Phase 2)

### Task 7: Write Terraform configs

**Files:**
- Create: `deploy/terraform/main.tf`
- Create: `deploy/terraform/ecs.tf`
- Create: `deploy/terraform/rds.tf`
- Create: `deploy/terraform/elasticache.tf`
- Create: `deploy/terraform/alb.tf`
- Create: `deploy/terraform/variables.tf`
- Create: `deploy/terraform/outputs.tf`
- Create: `deploy/terraform/README.md`

**Step 1: Write variables.tf**

Define all inputs with descriptions and sensible defaults:
- `aws_region` (default "us-east-1")
- `environment` (default "production")
- `app_name` (default "code-for-connection")
- `db_instance_class` (default "db.t3.micro")
- `db_password` (sensitive, no default)
- `jwt_secret` (sensitive, no default)
- `redis_node_type` (default "cache.t3.micro")
- `container_cpu` / `container_memory` for each service

Every variable gets a `description` that explains what it does in plain English.

**Step 2: Write main.tf**

VPC with public and private subnets, security groups. Heavy comments:
```hcl
# main.tf
# Creates the network infrastructure for Code for Connection.
#
# Think of this like building the office building before putting people in it:
# - VPC = the building itself (an isolated network)
# - Subnets = floors (public floors face the internet, private floors don't)
# - Security groups = locked doors (only specific traffic gets through)
```

**Step 3: Write rds.tf**

PostgreSQL on RDS in private subnet. Comments explain:
- Why it's in a private subnet (database should never face the internet)
- What `db.t3.micro` means (smallest/cheapest instance, fine for getting started)
- How to connect from ECS tasks (via security group rules)

**Step 4: Write elasticache.tf**

Redis on ElastiCache in private subnet. Same commenting style.

**Step 5: Write ecs.tf**

Three ECS Fargate services (api, web, signaling). Comments explain:
- What Fargate is (AWS runs the containers, you don't manage servers)
- What a task definition is (recipe for running a container)
- What a service is (keeps N copies of the task running)

**Step 6: Write alb.tf**

Application Load Balancer routing:
- `/api/*` to API service
- `/socket.io/*` to signaling service
- `/*` to web service

**Step 7: Write outputs.tf**

Output the ALB URL, RDS endpoint, Redis endpoint.

**Step 8: Write README.md**

```markdown
# Terraform Deployment

## What This Does
These files tell AWS to create the cloud infrastructure for Code for Connection.
[explain each file in one sentence]

## Prerequisites
- An AWS account
- Terraform installed (https://terraform.io)
- AWS CLI configured (`aws configure`)

## Deploy
terraform init
terraform plan -var="db_password=YOUR_PASSWORD" -var="jwt_secret=YOUR_SECRET"
terraform apply

## Porting to Azure
| AWS Service | Azure Equivalent | Notes |
|---|---|---|
| ECS Fargate | Azure Container Apps | Similar container-as-a-service |
| RDS PostgreSQL | Azure Database for PostgreSQL | Flexible Server tier |
| ElastiCache Redis | Azure Cache for Redis | Basic tier for starting |
| ALB | Azure Application Gateway | Or Azure Front Door |
| ECR | Azure Container Registry | Store Docker images |

## Estimated Monthly Cost
[Rough estimate for smallest instances: ~$50-80/month]
```

**Step 9: Validate Terraform**

Run: `cd deploy/terraform && terraform init && terraform validate`
Expected: "Success! The configuration is valid."

**Step 10: Commit**

```bash
git add deploy/terraform/
git commit -m "deploy: add AWS Terraform configs with Azure porting notes"
```

---

## Phase 4: Scripts

### Task 8: Write setup and deploy scripts

**Files:**
- Create: `deploy/scripts/setup-local.sh`
- Create: `deploy/scripts/deploy.sh`
- Create: `deploy/scripts/db-backup.sh`
- Create: `deploy/scripts/db-restore.sh`

**Step 1: Write setup-local.sh**

```bash
#!/bin/bash
# setup-local.sh
# Sets up Code for Connection for local development from a fresh clone.
#
# What this does:
#   1. Checks that required tools are installed (node, docker, npm)
#   2. Starts PostgreSQL and Redis in Docker
#   3. Installs Node.js dependencies
#   4. Builds shared packages
#   5. Creates database tables
#   6. Loads sample data
#   7. Starts the application
#
# Usage:
#   chmod +x deploy/scripts/setup-local.sh
#   ./deploy/scripts/setup-local.sh
#
# What can go wrong:
#   - "Docker not running": Start Docker Desktop first
#   - "Port 5432 in use": Another PostgreSQL is running; stop it or change the port
#   - "npm install fails": Try deleting node_modules and package-lock.json, then retry
```

Include prerequisite checks (`command -v node`, `command -v docker`, etc.) with helpful error messages.

**Step 2: Write deploy.sh**

Production deployment with confirmation prompts. Builds Docker images, pushes to registry, updates services. Includes rollback instructions in comments.

**Step 3: Write db-backup.sh and db-restore.sh**

Simple wrappers around `pg_dump` and `pg_restore` with timestamped filenames and confirmation prompts.

**Step 4: Make scripts executable and commit**

```bash
chmod +x deploy/scripts/*.sh
git add deploy/scripts/
git commit -m "deploy: add setup, deploy, and database backup/restore scripts"
```

---

## Phase 5: PRs to Guild Forks

### Task 9: PR to Voice Guild (boubascript/code-for-connection)

**Step 1: Add boubascript remote**

Run: `git remote add boubascript https://github.com/boubascript/code-for-connection.git`
Run: `git fetch boubascript`

**Step 2: Create branch from their guild-voice**

Run: `git checkout -b contrib-voice-shared-hooks boubascript/guild-voice`

**Step 3: Copy shared hooks and docs**

```bash
cp guilds/shared/hooks/useGuildApi.ts guilds/shared/hooks/useGuildApi.ts
cp guilds/shared/hooks/useSocket.ts guilds/shared/hooks/useSocket.ts
cp guilds/shared/hooks/useCallTimer.ts guilds/shared/hooks/useCallTimer.ts
cp doc/ARCHITECTURE.md doc/ARCHITECTURE.md
cp doc/GLOSSARY.md doc/GLOSSARY.md
```

Note: will need to checkout guild-admin-chris files and cherry-pick. Exact git commands depend on state at execution time.

**Step 4: Commit and push**

```bash
git add guilds/shared/hooks/ doc/ARCHITECTURE.md doc/GLOSSARY.md
git commit -m "feat: add shared hooks and architecture docs from admin guild"
git push fork contrib-voice-shared-hooks
```

**Step 5: Open PR**

```bash
gh pr create \
  --repo boubascript/code-for-connection \
  --base guild-voice \
  --head chrishwiggins:contrib-voice-shared-hooks \
  --title "Shared hooks and architecture docs from admin guild" \
  --body "$(cat <<'EOF'
## Summary

From the admin guild team. Three shared React hooks and two documentation files, offered as optional utilities for your voice guild work.

**Shared hooks** (`guilds/shared/hooks/`):
- `useGuildApi(basePath)`: Authenticated fetch wrapper (generalization of the admin guild's useAdminApi)
- `useSocket()`: Socket.IO connection to the signaling server
- `useCallTimer(seconds)`: Countdown timer with warning threshold; built for the voice call timer use case in your spec

**Documentation** (`doc/`):
- `ARCHITECTURE.md`: Plain-language system overview for future maintainers
- `GLOSSARY.md`: Domain and technical terms

These are additive (no changes to your existing files). Use them if helpful, close this PR if not.

Janak's Twilio integration is excellent work. The `useCallTimer` hook was designed to pair with the tablet UI timer display described in Dolan's spec.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 10: PR to Messaging Guild (benjaminmeow/code-for-connection-messaging)

**Step 1: Add benjaminmeow remote**

Run: `git remote add benjaminmeow https://github.com/benjaminmeow/code-for-connection-messaging.git`
Run: `git fetch benjaminmeow`

**Step 2: Create branch from their guild-message**

Run: `git checkout -b contrib-messaging-shared-hooks benjaminmeow/guild-message`

**Step 3: Copy shared hooks and docs, add role guard**

Copy the same shared hooks and docs. Also add `requireRole('incarcerated', 'family')` to the `/send` route in their `routes.ts`.

**Step 4: Commit, push, and open PR**

PR body acknowledges their better validation on the send endpoint and explains the role guard addition.

---

### Task 11: PR to Upstream (Worth-Rises/code-for-connection)

**Step 1: Create branch from upstream guild-video**

Run: `git checkout -b contrib-video-shared-hooks origin/guild-video`

**Step 2: Copy shared hooks and docs**

Same files as the other PRs.

**Step 3: Commit, push to fork, and open PR against upstream**

PR body references the video spec's terminology note ("video calls" not "video visits").

---

## Phase 6: Push and Verify

### Task 12: Push maintainability package to guild-admin-chris

**Step 1: Switch back to guild-admin-chris**

Run: `git checkout guild-admin-chris`

**Step 2: Push**

Run: `git push fork guild-admin-chris`

**Step 3: Verify docs render on GitHub**

Check: https://github.com/chrishwiggins/code-for-connection/tree/guild-admin-chris/doc
Check: https://github.com/chrishwiggins/code-for-connection/tree/guild-admin-chris/deploy

**Step 4: Verify Terraform**

Run: `cd deploy/terraform && terraform init && terraform validate`
Expected: "Success! The configuration is valid."

**Step 5: Verify Docker builds**

Run: `docker build -f deploy/docker/Dockerfile.api -t c4c-api .`
Expected: Successful build

**Step 6: Verify setup script**

Run: `bash -n deploy/scripts/setup-local.sh`
Expected: No syntax errors
