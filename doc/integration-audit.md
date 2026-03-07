# Guild Integration Audit

Cross-guild compatibility check against the canonical docs (README architecture, Prisma schema, API gateway, shared hooks, frontend routing).

## Summary

The three communication guilds (voice, video, messaging) and the admin guild share the same auth system, the same Prisma database, the same API response format, and the same frontend routing tree. No blocking incompatibilities exist. Three issues are worth tracking before the frontends move beyond stubs.

## Issue 1: Unguarded message send endpoint

**Severity**: Medium
**File**: `guilds/messaging/api/routes.ts:229`
**Canonical expectation**: The README says messaging uses `senderType` of `incarcerated` or `family`. The Prisma enum `SenderType` only has those two values.

The `/conversations/:id/send` route has `requireAuth` but no `requireRole` guard. The sender type is derived like this:

```typescript
const senderType = user.role === 'incarcerated' ? 'incarcerated' : 'family';
```

If an admin user hits this endpoint, they get classified as `family`. The message would be created with a misleading sender type and an admin user ID in the `senderId` field, which breaks the data model's assumption that senders are always one of the two participant roles.

**Fix**: Add `requireRole('incarcerated', 'family')` middleware to the route, matching the pattern used by the video guild's `request-visit` endpoint (which correctly uses `requireRole('family')`).

## Issue 2: Frontend stubs are not yet wired to backends

**Severity**: Low (expected at this stage)
**Files**: All 9 `guilds/{voice,video,messaging}/ui/{admin,incarcerated,family}/index.tsx`

The canonical docs describe specific frontend behaviors per role:

| Guild | Role | Expected behavior | Current state |
|-------|------|-------------------|---------------|
| Voice | Admin | Active calls table, terminate, call logs | Static placeholder card |
| Voice | Incarcerated | Contact list, call initiation, 15-min timer | Static placeholder card |
| Voice | Family | Poll for incoming calls, accept/decline, history | Static placeholder card |
| Video | Admin | Pending request queue, active monitoring, logs | Static placeholder card |
| Video | Incarcerated | Scheduled calls list, join button, camera view | Static placeholder card |
| Video | Family | Request visit form, scheduled visits, join call | Static placeholder card |
| Messaging | Admin | Review queue, approve/block, message logs | Static placeholder card |
| Messaging | Incarcerated | Conversation list, chat thread, status indicators | Static placeholder card |
| Messaging | Family | Same chat interface, desktop layout | Static placeholder card |

The backend endpoints for all of these exist and are tested. The shared hooks (`useGuildApi`, `useSocket`, `useCallTimer`) exist and follow the same pattern as the admin guild's working `useAdminApi`. The frontends just need to be filled in.

**No incompatibility here**: the contracts (API paths, response shapes, auth tokens) all align. This is a completeness gap, not a compatibility gap.

## Issue 3: Cross-package import path convention

**Severity**: Low (pre-existing pattern)
**File**: `guilds/shared/hooks/useGuildApi.ts:2`

```typescript
import { useAuth } from '../../../apps/web/src/context/AuthContext';
```

This deep relative import crosses the guild/app package boundary. The admin guild's `useAdminApi` uses the same pattern (`../../../../apps/web/src/context/AuthContext`), so this is an established convention, not a new problem. Vite resolves it correctly during bundling.

If the monorepo structure changes (web app directory moves, or guilds get extracted to separate packages), these paths break silently. A path alias (e.g., `@web/context/AuthContext`) in the Vite config would make this more resilient, but that's a refactor for later.

## What integrates cleanly

These integration points were checked and found consistent across all guilds:

- **Auth roles**: All `requireRole()` calls use the same four strings (`incarcerated`, `family`, `facility_admin`, `agency_admin`) matching the `UserRole` type in `packages/shared/src/types/auth.ts`
- **API gateway mounts**: Voice at `/api/voice`, video at `/api/video`, messaging at `/api/messaging`, admin at `/api/admin`; all imported and mounted in `services/api-gateway/src/index.ts`
- **Frontend routing**: All 9 lazy-loaded guild UIs mounted under correct role-scoped paths in `apps/web/src/App.tsx`
- **Prisma field names**: Backend routes reference correct field names (`startedAt`/`endedAt` for VoiceCall, `scheduledStart`/`actualStart` for VideoCall, `senderType`/`body`/`status` for Message)
- **Response format**: All guilds use `createSuccessResponse()` from `@openconnect/shared` for success responses and `createErrorResponse()` for errors, with consistent `{ success, data, pagination }` shape
- **Package exports**: All guild `package.json` files point `main` to `api/routes.ts` and export the named router (`voiceRouter`, `videoRouter`, `messagingRouter`)
- **Socket.IO**: `useSocket` connects to the same signaling server that both voice and video guilds expect for real-time call events
- **Facility scoping**: Admin endpoints consistently accept optional `facilityId` query params, and the `useFacilityScope` hook from the admin guild handles the agency-vs-facility admin distinction

## Recommendation

Fix Issue 1 (add `requireRole` to the send endpoint) before any frontend work begins on the messaging guild. Issues 2 and 3 are tracked but non-blocking.
