# Explore: Code for Connection (Full Codebase)

## Summary

Open Connect (Code for Connection) is a communication platform for incarcerated persons and their families, built as a TypeScript/Node.js monorepo. It provides voice calls, video visits, and moderated messaging through a "guild" architecture where each communication feature (voice, video, messaging, admin) is an independent module with its own API routes and UI components. The stack is React + Vite frontends, Express API gateway, Socket.io signaling server for WebRTC, PostgreSQL via Prisma, and Redis for pub/sub.

## Key Files

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema: 16 tables covering agencies, facilities, users, contacts, calls, messages |
| `prisma/seed.ts` | Demo data: 2 NY facilities, 10 incarcerated users, 8 family members, 3 admins |
| `packages/shared/src/` | Shared types, JWT auth, password hashing, Prisma client, error classes, pagination |
| `packages/ui/src/` | Reusable React components: Button, Input, Card, Layout, Navigation, Modal, LoadingSpinner |
| `services/api-gateway/src/index.ts` | Express server (port 3000) with auth routes, admin routes, guild route stubs |
| `services/api-gateway/src/routes/auth.ts` | PIN login (incarcerated), email/password login (family/admin), registration |
| `services/signaling/src/index.ts` | Socket.io server (port 3001) managing WebRTC rooms, offer/answer/ICE relay |
| `apps/web/src/App.tsx` | Main React app router: role-based routing for incarcerated/family/admin |
| `apps/web/src/context/AuthContext.tsx` | Auth state management: JWT in localStorage, login/logout/register functions |
| `apps/tablet/src/` | Simplified tablet app for kiosk devices (incarcerated users only) |
| `guilds/voice/api/routes.ts` | Voice API: active calls, call logs, terminate, stats |
| `guilds/video/api/routes.ts` | Video API: active calls, pending requests, approve, terminate, stats |
| `guilds/messaging/api/routes.ts` | Messaging API: logs, pending review queue, approve, block conversation, stats |
| `guilds/admin/ui/index.tsx` | Admin dashboard: stats cards, activity feed, quick actions, system status |
| `docker-compose.yml` | PostgreSQL 16, Redis 7, signaling server containers |

## How It Works

### Architecture

The monorepo uses npm workspaces with four layers:

1. **`packages/`** - Shared code consumed by everything else. `@openconnect/shared` provides types, auth middleware, DB client, utilities. `@openconnect/ui` provides React components.

2. **`services/`** - Backend infrastructure. The API gateway (Express on 3000) serves REST endpoints. The signaling server (Socket.io on 3001) handles real-time WebRTC negotiation with Redis pub/sub for horizontal scaling.

3. **`guilds/`** - Feature modules. Each guild (voice, video, messaging, admin) owns its API routes and UI components. Guilds are independently deployable units of functionality.

4. **`apps/`** - Frontend applications. The web app serves all three roles (incarcerated, family, admin) with role-based routing. The tablet app is a simplified incarcerated-only interface for kiosk devices.

### Authentication Flow

Three login paths converge on JWT:
- **Incarcerated**: PIN + facilityId -> bcrypt compare against all active persons in facility -> JWT with role=incarcerated
- **Family**: email + password -> lookup FamilyMember, check not blocked -> JWT with role=family
- **Admin**: email + password -> lookup AdminUser -> JWT with role=facility_admin or agency_admin

JWT payload includes: sub (userId), role, agencyId, facilityId, housingUnitId. Token stored in localStorage, sent as Bearer header, validated by `requireAuth` middleware which also fetches full user from DB and populates `req.user`.

### Authorization Model

Three middleware layers (`packages/shared/src/auth/middleware.ts`):
- `requireAuth` - validates JWT, hydrates user
- `requireRole('role1', 'role2')` - whitelist roles
- `requireFacilityAccess('facilityId')` - agency admins access all facilities; facility admins only their own; users only their own

### Communication Flows

**Voice**: Incarcerated user initiates -> system checks approved contact + calling hours + housing unit limits -> signaling server creates room -> WebRTC P2P audio -> on end, guild logs call to DB with duration and end reason.

**Video**: Family requests visit -> admin approves -> system schedules within VideoCallTimeSlot -> at time, both join -> signaling server facilitates WebRTC video -> logs completion.

**Messaging**: Either party sends message -> stored as pending_review -> admin reviews and approves/blocks -> if approved, delivered to recipient -> read receipts tracked.

### Database Design

Organizational hierarchy: Agency -> Facility -> HousingUnit (typed by HousingUnitType which defines call limits and hours).

User types: IncarceratedPerson (PIN auth, status lifecycle), FamilyMember (email auth, can be blocked), AdminUser (email auth, agency or facility scoped).

ApprovedContact is the central relationship table linking incarcerated persons to family members with approval workflow and attorney flag.

All communication tables (VoiceCall, VideoCall, Message) have status state machines with admin termination/blocking capabilities.

### Real-time Signaling

Socket.io server manages in-memory call rooms. Events: join-room, offer, answer, ice-candidate, leave-room, call-ended, mute-toggle. Redis adapter enables multi-instance deployment. Rooms auto-cleanup when empty.

## Patterns and Conventions

- **Guild isolation**: Each guild owns `api/routes.ts` and `ui/{role}/index.tsx`. Guild routes are mounted in the API gateway under `/api/{guild}`.
- **Shared types first**: All entity interfaces defined in `packages/shared/src/types/entities.ts`, API types in `api.ts`, auth types in `auth.ts`.
- **Error classes**: Domain errors extend `AppError` (e.g., `ContactNotApprovedError`, `OutsideCallingHoursError`). Responses use `createSuccessResponse()`/`createErrorResponse()`.
- **Status enums as string unions**: Not TypeScript enums; status fields use literal string union types matching Prisma schema.
- **Middleware stacking**: Route protection is `requireAuth` then `requireRole(...)` then optionally `requireFacilityAccess(...)`.
- **Seed data is realistic**: NY DOCS agency, Sing Sing and Bedford Hills facilities, housing unit types with real call limits.

## Gotchas

- **Guild routes are TODO**: The API gateway (`services/api-gateway/src/index.ts`) has commented-out guild route mounts. The guild route files exist but aren't wired in yet.
- **UI components are stubs**: Most guild UI files (`guilds/*/ui/*/index.tsx`) are placeholder components listing planned features, not functional implementations.
- **PIN login is brute-forceable**: The PIN login iterates over all active incarcerated persons in a facility and bcrypt-compares each one. No rate limiting.
- **In-memory room state**: Signaling server stores rooms in a Map. Server restart loses all active call state. Redis adapter helps with scaling but not persistence.
- **Auth hydration on every request**: `requireAuth` does a DB query on every protected request to fetch the full user object. No caching layer.
- **No WebRTC TURN/STUN config**: Signaling server handles offer/answer relay but there's no TURN server configuration for NAT traversal, which would be needed in a real deployment.
- **Message moderation is synchronous**: All messages require admin approval before delivery. No automated content filtering.

## Open Questions

- How are guild routes intended to be mounted? The TODO comments suggest they should be imported but the pattern isn't established.
- Is there a migration file, or is the schema meant to be pushed directly? Only `schema.prisma` exists, no `prisma/migrations/` directory visible.
- What's the intended deployment model? Docker Compose suggests development, but the signaling Dockerfile implies some production path.
- How should calling hour enforcement work in practice? `isWithinCallingHours()` exists in utils but isn't referenced in the voice guild routes.
- Are video time slots meant to be admin-configurable through the UI, or seed-data only?
