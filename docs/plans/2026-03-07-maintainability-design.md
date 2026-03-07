# Maintainability Package Design

## Context

Code for Connection was built at a hackathon by four guild teams working in parallel. The codebase will eventually be handed off to state government employees (likely early-career) who need to deploy, understand, modify, and maintain it. These future maintainers:

- Were not in the room when design decisions were made
- May not know TypeScript, React, Prisma, or Docker
- May be deploying to AWS, Azure, or another cloud
- Need operational procedures, not just source code

Three other guild teams (voice, video, messaging) have built real work on their own forks. Our contributions should be additive and respectful of their ownership.

## Approach

"Docs-First Integration": build the maintainability package on the `guild-admin-chris` branch (where shared infrastructure lives), and open small additive PRs to each guild fork offering shared utilities and documentation.

## Deliverables

### 1. Documentation (on guild-admin-chris)

**`doc/ARCHITECTURE.md`**
- Plain-language system overview (one paragraph a non-technical manager could read)
- ASCII diagrams of the four user roles and what each sees
- Step-by-step numbered flows: voice call, video call, message lifecycle
- What each service does (API gateway, signaling server, database, cache)
- Directory map showing where each piece of code lives

**`doc/GLOSSARY.md`**
- Domain terms: guild, facility, agency, housing unit, approved contact, pending review, signaling server, PSTN bridge
- Written for someone who has never been inside a correctional facility
- Every acronym defined

**`doc/RUNBOOK.md`**
- Deploy from scratch (local, then production)
- Add a new facility
- Onboard a new admin user
- Investigate a failed call
- Roll back a bad deploy
- Rotate secrets (JWT, Twilio, DB password)
- Back up and restore the database
- Common error messages and what they mean
- Every procedure has a "what can go wrong" section

**`doc/CONTRIBUTING.md`**
- Local dev setup (copy-paste commands, no assumed knowledge)
- How to add a new API endpoint (with example)
- How to add a new UI screen (with example)
- How to run tests
- Code style conventions
- How the guild pattern works and why

### 2. Deployment Infrastructure (on guild-admin-chris)

**`deploy/docker/`**
- `Dockerfile.api`: API gateway container
- `Dockerfile.web`: Vite build served by nginx
- `Dockerfile.signaling`: Moved from `services/signaling/Dockerfile` for consistency
- `docker-compose.prod.yml`: Production compose (health checks, restart policies, no debug ports, proper secrets handling)

**`deploy/terraform/`** (AWS with Azure porting notes)
- `main.tf`: VPC, subnets, security groups
- `ecs.tf`: ECS Fargate tasks for API, web, signaling
- `rds.tf`: PostgreSQL on RDS
- `elasticache.tf`: Redis on ElastiCache
- `alb.tf`: Application Load Balancer with HTTPS
- `variables.tf`: Every variable documented with description and defaults
- `outputs.tf`: URLs and connection strings
- `README.md`: Plain-language explanation of what each file does, plus "Porting to Azure" section mapping AWS services to Azure equivalents (ECS to App Service, RDS to Azure Database for PostgreSQL, ElastiCache to Azure Cache for Redis, ALB to Application Gateway)
- Every `.tf` file heavily commented for readers who are learning Terraform

**`deploy/scripts/`**
- `setup-local.sh`: One command from fresh clone to running app (checks prereqs, starts Docker, runs migrations, seeds data)
- `deploy.sh`: Production deployment with confirmation prompts
- `db-backup.sh`: Database backup
- `db-restore.sh`: Database restore
- Every script has a header comment explaining purpose, prerequisites, and failure modes

### 3. Respectful PRs to Guild Forks

**PR to boubascript/code-for-connection (Voice Guild)**
- Files: `guilds/shared/hooks/useGuildApi.ts`, `useSocket.ts`, `useCallTimer.ts`, `doc/ARCHITECTURE.md`, `doc/GLOSSARY.md`
- Title: "Shared hooks and architecture docs from admin guild"
- Body acknowledges Janak's Twilio integration and Dolan's spec, frames hooks as optional utilities

**PR to benjaminmeow/code-for-connection-messaging (Messaging Guild)**
- Files: same shared hooks + docs, plus `requireRole('incarcerated', 'family')` guard on `/send` endpoint
- Title: "Shared hooks, architecture docs, and small role guard fix"
- Body acknowledges Ben's team built better send validation (participant check, blocked-conversation check), notes we learned from their approach

**PR to Worth-Rises/code-for-connection upstream (Video Guild)**
- Files: same shared hooks + docs
- Title: "Shared hooks and architecture docs from admin guild"
- Body references the video spec's terminology correction ("video calls" not "video visits")

### Writing Principles (all docs)

- No assumed knowledge of TypeScript, React, Prisma, or Docker
- Every acronym defined on first use
- Copy-pasteable commands with concrete examples (no "replace X with your value" without showing what X looks like)
- "What can go wrong" section for every procedure
- No coded or exclusionary language (no "whitelist/blacklist", "master/slave", etc.)

## Verification

1. Fresh clone test: `setup-local.sh` takes a new machine from zero to running app
2. Docs review: hand `ARCHITECTURE.md` to someone not on the project, ask if they can explain the system back
3. Terraform plan: `terraform plan` succeeds with example variables
4. Docker build: all three Dockerfiles build successfully
5. PR check: each PR passes CI on the target fork
