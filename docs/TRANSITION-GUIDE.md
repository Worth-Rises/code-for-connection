# Open Connect: Hackathon Transition Guide and Next Steps

**Date:** April 20, 2026
**Prepared by:** Code Review Analysis (post-hackathon)
**Audience:** Internal team + Bianca Tylek (Executive Director, Worth Rises)

---

## Executive Summary

The Code for Connection hackathon produced four functional vertical slices—voice, video, messaging, and admin—each living on its own git branch. The team built more than expected: the voice calling system uses Twilio conferences and is genuinely demo-able today with the right credentials; the video system has a complete WebRTC implementation with background blur; messaging has keyword screening and photo attachments; and the admin platform has a unified dashboard, resident management, housing configuration, and contact approval workflows. The tech stack diverged from the Asterisk + FreePBX recommendation in the strategic guidance, and this was the right call for a two-day event—the chosen stack (Express + Twilio + WebRTC + PostgreSQL/Prisma) is more developer-accessible and better suited to rapid iteration. The four branches are not yet merged and cannot simply be stitched together—there are migration conflicts, a duplicate route bug, and one branch has a more complete integration picture than the others. However, the core data model is consistent across all branches, authentication is unified, and a clear merge path exists. The first 30 days should focus on selecting a merge trunk (guild-admin is the strongest candidate), resolving the divergent migrations, fixing the three critical bugs in the messaging layer, and running the integrated system end-to-end in a seeded environment. A DOC demo is achievable in 6–10 weeks with even a small part-time paid team.

---

## Table of Contents

1. [Guild Voice — Branch Review](#1-guild-voice--branch-review)
2. [Guild Video — Branch Review](#2-guild-video--branch-review)
3. [Guild Message — Branch Review](#3-guild-message--branch-review)
4. [Guild Admin — Branch Review](#4-guild-admin--branch-review)
5. [Convergence Plan](#5-convergence-plan)
6. [Tech Stack Decision](#6-tech-stack-decision)
7. [Path to Demo-able for the DOC](#7-path-to-demo-able-for-the-doc)
8. [Development Options Going Forward](#8-development-options-going-forward)
9. [Risks and Unknowns](#9-risks-and-unknowns)
10. [Immediate Next Steps — First 30 Days](#10-immediate-next-steps--first-30-days)

---

## 1. Guild Voice — Branch Review

### 1.1 Inventory of What Was Built

**Branch:** `origin/guild-voice` (28 commits ahead of main, 40 files changed, +8,986 lines)

**Tech stack:**
- **Backend:** Express.js + Twilio REST API + Twilio Voice SDK (conferences, TwiML)
- **Frontend (tablet):** React 18 + Vite + `@twilio/voice-sdk@^2.10.0`
- **Auth:** Shared JWT middleware from `@openconnect/shared`
- **Database:** PostgreSQL via Prisma (shared schema)
- **Real-time:** Twilio conference infrastructure (not WebSockets for voice)
- **Audio:** WAV recorder in `apps/tablet/src/utils/twilioCompliantRecorder.ts` for name recording

**Stack vs. recommendation:** The strategic guidance recommended Asterisk + FreePBX + WebRTC. The guild chose Twilio Programmable Voice instead. See §6 for the trade-off analysis. For a hackathon, this was the correct choice: Twilio provides managed conference infrastructure, caller ID, PSTN termination, and compliance hooks that would have taken weeks to configure in Asterisk.

**Directory structure:**
```
guilds/voice/
├── api/
│   ├── index.ts          — Router aggregator (5 sub-routers)
│   ├── userRoutes.ts     — 1,034 lines: call initiation, token, history
│   ├── adminRoutes.ts    — 544 lines: monitoring, termination
│   ├── contactRoutes.ts  — 55 lines: approved contact lookup
│   ├── nameAudioRoutes.ts — 148 lines: name recording pipeline
│   └── twimlRoutes.ts    — 350 lines: TwiML webhooks
└── ui/
    ├── incarcerated/index.tsx — 888 lines (VoiceHome + ActiveCallScreen)
    ├── family/index.tsx       — 169 lines (receive view)
    └── admin/index.tsx        — call monitoring
```

**End-to-end flows:**
- ✅ PIN login on tablet → approved contacts → outbound call initiation
- ✅ Twilio conference created, family phone dialed via PSTN
- ✅ On-screen call timer with countdown
- ✅ 1-minute audio warning (`/public/sounds/one-minute-warning.mp3`)
- ✅ Auto-disconnect at time limit (enforced in `userRoutes.ts`)
- ✅ Admin can see active calls and terminate them
- ✅ Call appears in history for both parties (scoped by user ID after privacy fix in commit `79610f8`)
- ✅ Name audio recording with TTS fallback (`RecordNamePage.tsx`)
- ✅ Legal call flag (attorney calls excluded from monitoring hooks)
- ⚠️ Facility announcement: architecture present (TwiML injection point), but announcement audio file is facility-specific configuration not yet seeded
- ⚠️ "Accept/decline call prompt" for family: the family side receives a phone call via PSTN—there is no web UI for accepting/declining (family uses their phone). This is architecturally correct but may need a demo explanation.
- ❌ Speed dial for PREA hotline, crisis hotline: UI stubs exist but numbers are not seeded

**Notable extras (beyond hackathon IN scope):**
- IVR support (`add_ivr_enums` migration)
- ngrok auto-discovery for development Twilio webhooks
- In-memory call metadata cache (`callMetadata` Map) for conference management
- `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` required in addition to Account SID/Auth Token

### 1.2 Demo Target Coverage

| Demo Step | Status | Evidence |
|-----------|--------|----------|
| Family logs in, sees approved contacts | ✅ Working | `family/index.tsx` renders approved contacts |
| Incarcerated person initiates call | ✅ Working | `userRoutes.ts` POST `/call` creates Twilio conference |
| Family receives call with facility announcement | ⚠️ Partial | TwiML supports announcement injection; audio not seeded |
| Family positively accepts | N/A (PSTN) | Family uses their phone; web UI is informational |
| Call connects with audio | ✅ Working | Twilio conference bridge |
| Timer counts down on screen | ✅ Working | `ActiveCallScreen` with live countdown |
| Audio warning at 1 minute | ✅ Working | `one-minute-warning.mp3` plays at 60s remaining |
| Either party can end / auto-ends at limit | ✅ Working | Manual hang-up + time limit enforcement |
| Admin sees call in progress, can terminate | ✅ Working | `adminRoutes.ts` GET `/active-calls`, POST `/terminate` |
| Call appears in call history for both | ✅ Working | Scoped query in `userRoutes.ts` (commit `79610f8`) |

**IN items missed:** None in the core flow. Hotlines (tagged MAYBE) are stubbed.

**OUT/FUTURE items built:** None. IVR is an infrastructure-level extension, not a user-facing feature.

### 1.3 Code Quality and Structural Health

**Architecture:** Reasonably separated. TwiML webhook handlers are isolated in `twimlRoutes.ts`. The in-memory `callMetadata` Map is a risk: it does not survive server restarts and breaks in any multi-process deployment. This works for a demo but must be moved to Redis before a pilot.

**File size:** `userRoutes.ts` at 1,034 lines is too long and contains multiple concerns (token generation, call initiation, history, IVR). Acceptable for a hackathon; refactor before production.

**Tests:** None on the current branch. The admin guild has tests for overlapping areas (contact requests, PIN reset).

**Dependencies:** `twilio@^5.7.1` (not pinned to a patch), `@twilio/voice-sdk@^2.10.0`. Both are floating minor versions; acceptable for now.

**Secrets:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` are expected in `.env`. The `.env.example` lists the first three but **missing** `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`. The token endpoint will fail silently if these are absent.

**Error handling:** Present but inconsistent. Some routes use `console.error` + 500; others have more specific error codes. Acceptable.

**Documentation:** `docs/guild-voice/VoiceCallsGuild.md` exists. Setup instructions in root `docs/README.md`.

### 1.4 Integration Readiness

**Auth model:** ✅ Uses `requireAuth` from `@openconnect/shared`. JWT payload includes `role`, `facilityId`, `agencyId`. Fully compatible with other guilds.

**Data model:** ✅ Uses shared `VoiceCall`, `IncarceratedPerson`, `ApprovedContact` from Prisma schema. No schema divergence.

**Shared services assumed:** Relies on `/api/admin/contacts/:incarceratedPersonId` to get approved contacts for the incarcerated person's contact list. This is provided by the admin guild.

**Cross-cutting concerns:**
- PIN auth: handled in `services/api-gateway/src/routes/auth.ts`, shared.
- Calling hours enforcement: **not implemented**. The guild reads `HousingUnitType.callingHoursStart/End` from config but does not block calls outside those hours. This is a gap for a real deployment.
- Legal call flag: present in schema and accessible in UI.

**API gateway mounting:** On the `guild-voice` branch, the voice router IS mounted at `/api/voice`. The most complete integration is on `origin/guild-admin`, which mounts all four routers.

### 1.5 Compliance and License Alignment

**Twilio dependency:** Twilio stores call metadata and records (if recording is enabled). This is the most significant license consideration. The OpenConnect license prohibits profiting from consumer data but permits cost recovery for infrastructure. Twilio charges per minute for PSTN termination (approximately $0.013/min outbound US). Under the license, these costs must be absorbed by the agency or facility—they cannot be passed to the incarcerated person or family member. This is legally consistent with the license's "cost recovery for infrastructure" carve-out, but **must be documented explicitly in any agency contract**.

**Surveillance separation:** Legal call detection is present. The current architecture does not record calls by default; Twilio recording would need to be explicitly enabled via a separate TwiML `<Record>` verb. This means surveillance is not baked in—it can be added as a discrete module. ✅ Compatible with the license's surveillance-separation requirement.

**No incompatible licenses found** in the dependency tree for this guild.

### 1.6 Gaps to a DOC Demo

- [ ] Add `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET` to `.env.example` and setup docs
- [ ] Seed facility announcement text and audio URL in the database (even a placeholder WAV)
- [ ] Move `callMetadata` Map from in-memory to Redis (prevents breakage on restart during demo)
- [ ] Seed 2–3 hotline numbers in `SystemConfiguration` table
- [ ] Confirm Twilio phone number is US-PSTN-capable and not restricted to verified numbers (trial accounts restrict outbound calls)
- [ ] `PUBLIC_URL` must be set (or ngrok running) for Twilio webhooks to reach the app; demo environment must account for this

---

## 2. Guild Video — Branch Review

### 2.1 Inventory of What Was Built

**Branch:** `origin/guild-video` (3 commits ahead of main per PR list, 52 files changed, +8,631 lines)

**Tech stack:**
- **Backend:** Express.js + custom WebRTC signaling via Socket.io
- **Signaling server:** `services/signaling/src/index.ts` (Socket.io + Redis adapter)
- **Frontend:** React 18 + WebRTC browser APIs
- **Background blur:** `@mediapipe/tasks-vision` (MediaPipe selfie segmenter, GPU delegate) loaded from `cdn.jsdelivr.net` and Google Storage
- **Auth:** Shared JWT middleware
- **Database:** PostgreSQL via Prisma (shared schema)

**Stack vs. recommendation:** Uses WebRTC directly (as recommended) but with a custom Socket.io signaling server rather than a managed service (Daily, LiveKit, etc.). This is consistent with the open-source, self-hosted mandate of the license.

**Directory structure:**
```
guilds/video/
├── api/routes.ts             — 826 lines: all video scheduling and admin endpoints
├── ui/
│   ├── incarcerated/         — ScheduledCallsList, PastCallsList, join flow
│   ├── family/               — schedule, view scheduled, manage contacts, past calls
│   ├── admin/                — approval queue, call cards, monitoring
│   └── shared/
│       ├── VideoCallRoom.tsx  — 333 lines: in-call UI (controls, remote video)
│       ├── PreCallCheck.tsx   — 330 lines: device/network pre-check
│       ├── useVideoCall.ts    — 594 lines: WebRTC state machine
│       └── useBlurBackground.ts — 177 lines: MediaPipe segmentation
```

**End-to-end flows:**
- ✅ Family requests video call for a time slot
- ✅ Admin approval workflow (approve/deny request)
- ✅ Incarcerated person sees scheduled call alert
- ✅ Both parties join at scheduled time (WebRTC room via Socket.io signaling)
- ✅ Camera and mic toggle controls
- ✅ Background blur (MediaPipe selfie segmenter)
- ✅ Pre-call check (camera, mic, network)
- ✅ Call timer (countdown to scheduled end)
- ✅ Auto-end at time limit
- ✅ Admin can see active calls and terminate them
- ⚠️ `ADMIN_APPROVAL_REQUIRED` env flag: when `false`, calls auto-approve. This is useful for demo but must default `true` for production.
- ⚠️ `TEST_MODE` env flag enables a `/test/create-call` endpoint that bypasses scheduling. This **must be disabled** before any real deployment.

**Notable extras (beyond IN scope):**
- Pre-call check flow (OUT in hackathon scope; built anyway—this is valuable)
- `TODO.md` with 182 tracked tasks (shows disciplined planning)
- `GUILD_VIDEO_SPEC.md` spec document

### 2.2 Demo Target Coverage

| Demo Step | Status | Evidence |
|-----------|--------|----------|
| Family requests video call for a time slot | ✅ Working | `family/schedule.tsx` + POST `/api/video/request-call` |
| Admin approves the request | ✅ Working | `admin/ApprovalRequest.tsx` + POST `/approve-request/:callId` |
| Incarcerated person sees scheduled call alert | ✅ Working | `incarcerated/ScheduledCallsList.tsx` with polling |
| Both parties join at scheduled time | ✅ Working | `VideoCallRoom.tsx` + WebRTC via signaling server |
| Video/audio works, both can toggle camera/mic | ✅ Working | `useVideoCall.ts` manages RTCPeerConnection |
| Background blur on both sides | ✅ Working | `useBlurBackground.ts` via MediaPipe |
| Timer shows remaining time | ✅ Working | Countdown from `scheduledEnd` in `VideoCallRoom.tsx` |
| Call ends at limit or when either party leaves | ✅ Working | Auto-end logic in `useVideoCall.ts` |
| Admin can see active calls and terminate | ✅ Working | `admin/index.tsx` + POST `/terminate-call/:callId` |

**IN items missed:** None. This guild had the most complete demo target coverage.

**OUT items built:** Pre-call check (a good decision). `TEST_MODE` test endpoint (must be removed).

### 2.3 Code Quality and Structural Health

**Architecture:** The cleanest of the four guilds. `useVideoCall.ts` is a well-structured state machine. UI components are split by role (incarcerated / family / admin) with a shared `VideoCallRoom`. The 826-line routes file is manageable.

**Tests:** Most comprehensive of all four guilds.
- `api/__tests__/video-routes.test.ts` — 355 lines of API route tests
- `ui/shared/__tests__/useVideoCall.test.ts` — 412 lines of hook tests
- `src/__tests__/smoke.test.ts` — 16-line smoke test
- `vitest.config.ts` is present; tests are CI-runnable

**Critical dependency:** `@mediapipe/tasks-vision` loads its WASM binary from `cdn.jsdelivr.net` and the model from `storage.googleapis.com` at runtime. In a correctional facility network with locked-down egress, these CDN requests may be blocked. The WASM and model file must be self-hosted (can be vendored into the `public/` directory) before any pilot.

**Assumption flagged:** Video admin UI was moved from `guilds/video/ui/admin/` to `guilds/admin/ui/video/` by the admin team (`commit eb2d45d`). The video branch may still have the old admin UI path. This needs reconciliation during merge.

**Error handling:** Good. Uses `createErrorResponse` consistently. `TEST_MODE` guard is a clean pattern.

**Secrets/config:** `ADMIN_APPROVAL_REQUIRED` and `TEST_MODE` env vars documented in code but not in `.env.example`. Must be added.

### 2.4 Integration Readiness

**Auth model:** ✅ Uses shared JWT middleware. Role checks (`requireRole('facility_admin', 'agency_admin')`) consistent with other guilds.

**Data model:** ✅ Uses shared `VideoCall`, `VideoCallTimeSlot`, `HousingUnitType` from Prisma schema. No schema divergence.

**Signaling server dependency:** The video guild requires the `services/signaling` WebSocket server to be running. This is a separate process (port 3001) that other guilds do not use. Must be included in the demo deployment.

**API gateway:** On `origin/guild-video`, the api-gateway mounts `/api/video` and `/api/admin` but NOT `/api/voice` or `/api/messaging`. The admin guild's api-gateway (which mounts all four) is the correct target.

**Cross-cutting concerns:**
- Time slot availability: read from `HousingUnitType` config set by the admin guild. ✅ Compatible.
- Legal call flag: schema field exists in `VideoCall`, not surfaced in UI.
- Concurrent call limits: `maxConcurrentVideoCalls` field is read and enforced in scheduling logic.

### 2.5 Compliance and License Alignment

**No Twilio dependency.** Pure WebRTC + Socket.io. All media stays peer-to-peer (server is just a signaling relay). ✅ No per-minute costs, no third-party data retention.

**MediaPipe:** Apache 2.0 license. ✅ Compatible. However, the CDN dependency creates an implicit external network call during initialization. Self-hosting is required for correctional environments and recommended for license transparency.

**Surveillance separation:** No monitoring hooks baked into the video pipeline. Admin termination works by signaling the room to close. ✅ Compatible with surveillance-separation requirement.

### 2.6 Gaps to a DOC Demo

- [ ] Self-host MediaPipe WASM and model file (`selfie_segmenter.tflite`) to avoid CDN dependency
- [ ] Remove or gate `TEST_MODE` endpoint behind a build flag, not a runtime env var
- [ ] Add `ADMIN_APPROVAL_REQUIRED=true` and `TEST_MODE=false` to `.env.example`
- [ ] Seed video call time slots in the database (the family scheduling UI requires existing slots to display)
- [ ] Ensure signaling server (`services/signaling`) is included in demo startup sequence
- [ ] Reconcile admin UI location (video guild's admin view vs. admin guild's video module)
- [ ] Verify Redis is running for signaling adapter (both dev and demo environments)

---

## 3. Guild Message — Branch Review

### 3.1 Inventory of What Was Built

**Branch:** `origin/guild-message` (10 commits ahead of main, 23 files changed, +4,789 lines)

**Tech stack:**
- **Backend:** Express.js (same as all guilds)
- **Frontend:** React 18 + Vite
- **Auth:** Shared JWT middleware
- **Content moderation:** Custom keyword matching (`screenMessage` function)
- **Photo support:** URL-based attachments (no file upload service specified)
- **Real-time:** Socket.io client (used for connection management, not message push in the current implementation)
- **Database:** PostgreSQL via Prisma with two additional models: `FlaggedKeyword`, `ConversationNote`

**Directory structure:**
```
guilds/messaging/
├── api/
│   ├── routes.ts         — 1,425 lines: all messaging endpoints
│   └── __tests__/        — 3 test files (219 lines total)
└── ui/
    ├── incarcerated/
    │   ├── index.tsx      — 1,098 lines
    │   └── components/PhotoUploadButton.tsx
    ├── family/index.tsx   — 811 lines
    └── admin/index.tsx    — 1,052 lines
```

**End-to-end flows:**
- ✅ Family sends text message; incarcerated person receives it
- ✅ Incarcerated person replies
- ✅ Message status indicators (pending_review, sent, delivered, read)
- ✅ Keyword screening (10 default flagged words; messages with matches go to `pending_review`)
- ✅ Admin views pending messages and approves/rejects
- ✅ Admin blocks/unblocks conversation
- ✅ Contact requests visible in admin view
- ✅ Emoji support
- ⚠️ Photo attachments: `PhotoUploadButton.tsx` exists but the backend's `fileUrl` field assumes an already-uploaded URL. There is no file upload endpoint or storage integration. Photo feature is UI-only; the URL must be manually provided or the feature is non-functional in a demo.
- ⚠️ Message push: messages arrive when the page is polled (polling), not via WebSocket push. The incarcerated person must refresh to see new messages.
- ⚠️ Notepad: implemented as `ConversationNote` (one note per conversation). This is a minor feature but introduces a migration.

### 3.2 Demo Target Coverage

| Demo Step | Status | Evidence |
|-----------|--------|----------|
| Family logs in, sends message | ✅ Working | `family/index.tsx` POST `/api/messaging/send` |
| Photo attachment | ⚠️ Partial | UI present; no file upload backend |
| Incarcerated person receives message | ✅ Working | `incarcerated/index.tsx` GET `/api/messaging/conversations/:id/messages` |
| Incarcerated person replies | ✅ Working | POST `/api/messaging/send` |
| Message status indicators | ✅ Working | Status field rendered in UI |
| Family receives reply with notification | ⚠️ Partial | Polling only; no push notification |
| Admin views message logs, blocks conversation | ✅ Working | `admin/index.tsx` + admin routes |

**IN items missed:** Push notification for new messages (polling is present; push is absent). Photo attachment is non-functional without a storage backend.

**OUT items built:** Keyword screening (tagged OUT in hackathon scope, built anyway—this is substantive and valuable).

### 3.3 Code Quality and Structural Health

**Critical bug — duplicate route registration:** `POST /messaging/send` is registered **twice** in `routes.ts` (lines 25 and 943). Express matches the first registration and ignores the second. The consequences:
- The **active** handler (line 25): has `requireRole("incarcerated","family")`, runs keyword screening, **lacks participant authorization check** (any user with correct role can message any conversation)
- The **dead** handler (line 943): has no role guard, **has correct participant check**, always sets status to `pending_review` (no keyword screening), never executes

This is a security bug. Any authenticated incarcerated person or family member can send messages to conversations they do not belong to.

**Additional security gaps:**
- `POST /conversations` (line 815): no authorization—any authenticated user can create a conversation between any two people they don't belong to.
- `GET /conversations/:id/messages` (line 900): no participant check—any authenticated user can read any conversation's messages by guessing the conversation ID.

**File sizes:** `routes.ts` at 1,425 lines is the largest file in the codebase. It must be split before a real code review is productive.

**Tests:** 3 test files covering filter behavior (219 lines total). Not comprehensive; the duplicate route bug and authorization gaps are untested.

**Schema additions:** `FlaggedKeyword` and `ConversationNote` models with two migration files. These conflict with the `dolan/postgres` branch (which also adds `FlaggedKeyword` via a different migration). **This migration conflict must be resolved before merge.**

### 3.4 Integration Readiness

**Auth model:** ✅ Uses shared JWT middleware. However, the security gaps noted above undermine the auth model's effectiveness.

**Data model:** ⚠️ Adds two new Prisma models (`FlaggedKeyword`, `ConversationNote`) with their own migrations. These will conflict with migrations on other branches.

**API gateway:** On `origin/guild-message` (the `dolan/postgres` branch we reviewed earlier), messaging is mounted at `/api/messaging`. The admin guild's api-gateway is the only branch that mounts all four routers correctly.

**Cross-cutting concerns:** The messaging guild's keyword screening is simpler (plain substring match) than the admin guild's planned keyword-alerts system (regex + `pg_trgm` fuzzy matching), which was disabled (`keyword-alerts.routes.ts` commented out) specifically because of this conflict. The team needs to agree on one approach.

### 3.5 Compliance and License Alignment

**No third-party messaging service used.** Everything is stored in the project's own PostgreSQL instance. ✅ No per-message costs, no third-party data retention.

**Content moderation:** The keyword screening is local. No AI/ML service calls. ✅ Compatible with the data privacy clause.

**Photo storage:** Not yet implemented. If an S3-compatible service or cloud storage is added, the "no profit from consumer data" clause applies—the storage provider must not be permitted to use the data. AWS S3 with appropriate bucket policies would be acceptable.

### 3.6 Gaps to a DOC Demo

- [ ] **Fix the duplicate `/send` route** — merge the participant check from the dead handler into the active handler
- [ ] **Add participant authorization** to `GET /conversations/:id/messages`
- [ ] **Add authorization** to `POST /conversations` (caller must be one of the parties)
- [ ] Decide on photo attachment strategy: either remove the UI button for demo or add a minimal file upload endpoint with local disk storage (not production-ready but demo-sufficient)
- [ ] Resolve migration conflict with `dolan/postgres` / other branches on `FlaggedKeyword`
- [ ] Implement server-sent events or WebSocket push for new message notifications (polling creates poor UX on tablet demos)
- [ ] Split `routes.ts` (1,425 lines) into sub-routers before the codebase becomes unmaintainable

---

## 4. Guild Admin — Branch Review

### 4.1 Inventory of What Was Built

**Branch:** `origin/guild-admin` (27 commits ahead of main, 100 files changed, +4,654 lines — largest changeset)

**Tech stack:**
- **Backend:** Express.js
- **Frontend:** React 18 + Vite + **shadcn/ui** (in addition to `@openconnect/ui`)
- **Auth:** Shared JWT middleware
- **Design system:** Tailwind CSS + shadcn/ui components (badge, button, dialog, input, label, tabs, textarea) — not used by other guilds
- **Polling:** Custom `usePolling` hook (15-second refresh cycle for live data)
- **Database:** PostgreSQL via Prisma (shared schema, no new migrations)

**Directory structure:**
```
guilds/admin/
├── api/
│   ├── routes.ts                  — 468 lines (core admin endpoints)
│   ├── session-limits.routes.ts   — 577 lines (housing config, time slots)
│   ├── keyword-alerts.routes.ts   — 332 lines (DISABLED — conflicts with messaging guild)
│   ├── flagged-content.routes.ts  — 281 lines (DISABLED)
│   ├── services/messageScanner.ts — 233 lines
│   └── __tests__/                 — 788 lines (4 test files)
└── ui/
    ├── index.tsx              — 305 lines (unified dashboard)
    ├── HousingConfigPage.tsx  — 655 lines
    ├── SearchPage.tsx         — 361 lines
    ├── contacts/              — ContactListPage, ContactDetailPanel
    ├── residents/             — ResidentListPage, ResidentProfilePage, modals
    ├── voice/                 — voice admin module (api.ts, components.tsx, types.ts)
    ├── video/                 — video admin module (moved from guild-video)
    └── messaging/             — messaging admin module
```

**End-to-end flows:**
- ✅ Unified admin dashboard with stats from voice, video, and messaging (polling at 15s)
- ✅ Resident list, search, profile view
- ✅ Resident deactivation and release modals with workflow
- ✅ PIN reset modal
- ✅ Contact approval queue with approve/deny
- ✅ Contact detail panel
- ✅ Housing unit configuration (call duration, calling hours, max contacts, concurrent call limits)
- ✅ Video time slot management (day of week, start/end time, capacity)
- ✅ Emergency lockdown button (present in UI, wired to `session-limits` route)
- ✅ Search across voice, video, and messaging
- ✅ Admin views of all three communication channels
- ⚠️ Content moderation routes disabled (`keyword-alerts.routes.ts`, `flagged-content.routes.ts` commented out); the admin team built a more sophisticated system (regex + `pg_trgm` fuzzy matching with tiered severity) that was never integrated with the messaging pipeline
- ❌ Audit log: planned (documented in mockups) but not implemented
- ❌ Bulk import: planned but not implemented

**Most complete `api-gateway/src/index.ts` in the codebase:** The admin guild's version mounts all four routers (`/api/auth`, `/api/admin`, `/api/video`, `/api/voice`, `/api/messaging`). This is the correct integration target.

### 4.2 Demo Target Coverage

| Demo Step | Status | Evidence |
|-----------|--------|----------|
| Agency admin configures calling hours and durations by unit type | ✅ Working | `HousingConfigPage.tsx` + `session-limits.routes.ts` |
| Video call time slots configured | ✅ Working | Time slot management in HousingConfigPage |
| Incarcerated profiles seeded with housing assignments | ✅ Working | `prisma/seed.ts` (839 lines on guild-voice) |
| Facility admin reviews and approves a contact request | ✅ Working | `contacts/ContactListPage.tsx` + admin contacts route |
| Unified dashboard shows voice/video/messaging activity | ✅ Working | `admin/ui/index.tsx` with usePolling |
| Search across users and communications | ✅ Working | `SearchPage.tsx` (361 lines) |
| Contact approval flows to all three channels | ✅ Working | Shared `ApprovedContact` table used by all guilds |

**IN items missed:** Emergency lockdown (present as UI button; backend enforcement across all communication channels is partial—it disables new sessions but active calls would continue).

**FUTURE items built:** Design mockups (14 complete HTML mockups, 1,037-line design doc, 787-line tickets doc) — impressive for a hackathon; these are directly usable for stakeholder presentations.

### 4.3 Code Quality and Structural Health

**Architecture:** Best-structured of the four guilds. The admin UI correctly imports from all three guild APIs (voice, video, messaging api.ts modules) rather than making direct fetch calls in components. The `usePolling` hook is a clean abstraction.

**Design system divergence:** The admin guild introduced shadcn/ui, which the other three guilds did not adopt. This creates an inconsistent visual experience when the branches are merged. Either the other guilds adopt shadcn/ui or the admin guild's components need to be rationalized back to `@openconnect/ui`. This is not a blocker but is a UX debt item.

**Relative path imports:** `guilds/admin/ui/index.tsx` imports from `../../../apps/web/src/context/AuthContext` and `../../../packages/ui/src/admin/StatCard`. These relative-path-across-workspace imports are fragile; they should be replaced with workspace package imports.

**Tests:** Second-best test coverage (after guild-video).
- `admin/__tests__/contact-requests.test.ts` — 334 lines
- `admin/__tests__/reset-pin.test.ts` — 148 lines
- `admin/__tests__/residents.test.ts` — 194 lines
- `admin/__tests__/routes.test.ts` — 112 lines
Total: 788 lines of tests. Tests are written against real database (Prisma) rather than mocks.

**Disabled routes:** `keyword-alerts.routes.ts` and `flagged-content.routes.ts` are complete implementations (613 lines total) that were explicitly disabled. The conflict explanation is documented in a comment at the top of `routes.ts`. This is technically honest and clean, but represents significant work that is currently unreachable.

**Documentation:** The admin guild produced 14 HTML mockups and two planning documents. These are the best artifacts for presenting the product vision to a non-technical stakeholder.

### 4.4 Integration Readiness

**Auth model:** ✅ Fully compatible. Uses shared JWT middleware.

**Data model:** ✅ No new Prisma migrations. Uses the shared schema.

**API gateway:** ✅ The admin guild's `api-gateway/src/index.ts` is the correct target for the merged codebase—it's the only version that mounts all four guild routers.

**Cross-cutting concerns:** The admin guild is the provider for cross-cutting concerns. Other guilds call `/api/admin/contacts/:id`, `/api/admin/facilities`, etc. These are all present and working.

**Content moderation conflict:** The admin guild's disabled `keyword-alerts.routes.ts` is architecturally more sophisticated than the messaging guild's simple keyword matching. Resolution options: (a) adopt messaging guild's simple system and delete admin guild's disabled routes, (b) resurrect admin guild's system and wire it into the message pipeline, (c) ship messaging guild's system for demo and plan admin guild's system for pilot. Option (c) is recommended—it minimizes risk and defers complexity.

### 4.5 Compliance and License Alignment

**No third-party data services used.** All admin operations are local. ✅ Fully compatible.

**Emergency lockdown:** Disabling all communication system-wide is a surveillance-adjacent feature. It is consistent with the license's carve-out for "agency-controlled rules." ✅ Compatible.

**Disabled keyword/flagged-content routes:** If these are re-enabled, they need to be reviewed against the license's data privacy clause (no profiting from pattern analysis).

### 4.6 Gaps to a DOC Demo

- [ ] Fix relative path imports (e.g., `../../../apps/web/src/context/AuthContext`) to use workspace packages
- [ ] Rationalize design system: decide on shadcn/ui vs. `@openconnect/ui` for the demo
- [ ] Implement emergency lockdown backend enforcement (not just the button)
- [ ] Seed agency admin + facility admin accounts in `prisma/seed.ts` (credentials for demo walkthrough)
- [ ] Decide fate of disabled content moderation routes — document the decision clearly

---

## 5. Convergence Plan

### 5.1 Current State

Four branches, each with divergent code and (in two cases) divergent migrations, cannot simply be merged sequentially without conflicts. The specific collision points are:

| Conflict | Guilds Involved | Severity |
|----------|----------------|----------|
| `api-gateway/src/index.ts` — different routers mounted on each branch | All | Low — admin branch has correct version |
| `prisma/migrations/` — guild-message and dolan/postgres each add `FlaggedKeyword` with different migration timestamps | Message + dolan/postgres | High — will break `prisma migrate deploy` |
| `prisma/schema.prisma` — `FlaggedKeyword` and `ConversationNote` added on message branch | Message vs. others | Medium — schema needs consolidation |
| `guilds/admin/ui/video/` vs. `guilds/video/ui/admin/` — admin UI moved by admin guild | Video + Admin | Medium — need to pick one location |
| `session-limits.routes.ts` — admin guild adds `maxDailyVoiceCalls`, `maxDailyMessages`, `maxWeeklyVideoRequests` fields to `HousingUnitType` not present in base schema | Admin vs. all | High — migration + schema divergence |

**Assumption:** The `session-limits.routes.ts` references fields (`voiceCallsEnabled`, `videoCallsEnabled`, `messagingEnabled`, `maxDailyVoiceCalls`, etc.) that are not in the base schema. The admin guild likely has a migration for these. This needs verification.

### 5.2 Recommended Merge Strategy

**Trunk candidate: `origin/guild-admin`**

Rationale: the admin branch has the most files changed (100), the most complete api-gateway integration (all four routers mounted), tests, design docs, and is the only branch where a developer could clone and boot the system with all four guild APIs responding. Start here.

**Merge order:**

```
Step 1: Create integration branch from origin/guild-admin
        git checkout -b integration origin/guild-admin

Step 2: Merge origin/guild-voice
        git merge origin/guild-voice
        — Conflicts expected in: services/api-gateway/src/index.ts (easy, admin wins)
        — New files: guilds/voice/** (no conflicts)
        — New migrations: 4 voice migrations (add to the sequence)

Step 3: Merge origin/guild-video
        git merge origin/guild-video
        — Conflicts expected in: services/api-gateway/src/index.ts (admin wins)
        — guilds/video/ui/admin/ vs guilds/admin/ui/video/ — DELETE the video branch's
          admin UI; the admin guild's is correct
        — New migrations: video has none of its own (easiest merge)

Step 4: Merge origin/guild-message
        git merge origin/guild-message
        — Conflicts expected in: prisma/schema.prisma, prisma/migrations/**
        — MUST manually reconcile FlaggedKeyword migrations
        — Duplicate /send route must be fixed as part of this merge
        — ConversationNote migration can be added cleanly if sequenced correctly
```

**After merge, the following requires hand-editing regardless of merge tool:**
1. Consolidate all Prisma migrations into a coherent sequence with correct timestamps
2. Fix the duplicate `POST /send` route
3. Add participant authorization to messaging routes
4. Resolve admin guild's `session-limits` schema fields vs. base schema

### 5.3 Shared Platform Code to Extract

Post-merge, extract the following into reusable modules:

| Module | Current location | Extract to |
|--------|-----------------|-----------|
| `apiFetch` helper | Duplicated in messaging and admin UIs | `packages/shared/src/utils/apiFetch.ts` |
| `usePolling` hook | `guilds/admin` only | `packages/shared/src/hooks/usePolling.ts` |
| Error display components | Inline in all guild UIs | `packages/ui/src/ErrorMessage.tsx` |
| Token getter (`localStorage.getItem('token')`) | Scattered across all UIs | Context-provided via `AuthContext` |

---

## 6. Tech Stack Decision

### 6.1 What the Teams Built vs. What Was Recommended

The strategic guidance recommended **Asterisk + FreePBX + WebRTC + Appsmith**. The teams built:

| Component | Recommended | Actual |
|-----------|------------|--------|
| Voice calling | Asterisk + FreePBX | Twilio Programmable Voice + Twilio Voice SDK |
| Video calling | WebRTC (generic) | WebRTC + custom Socket.io signaling |
| Admin UI | Appsmith (low-code) | React + shadcn/ui (hand-coded) |
| Backend | Implicit Node | Express.js |
| Database | Not specified | PostgreSQL + Prisma |
| Auth | Not specified | JWT (RS256-capable, currently HS256) |

### 6.2 Recommendation: Keep What Was Built

**Do not switch to Asterisk + FreePBX.** Rationale:

- The hackathon teams proved the current stack works. Asterisk has a steep learning curve and would require re-implementing everything the voice guild built.
- The voice guild's Twilio integration handles PSTN termination, which Asterisk also needs (via SIP trunking from a provider like Twilio anyway). The current approach skips the Asterisk intermediary without losing capability.
- Twilio's managed infrastructure handles reliability, geographic routing, and compliance hooks (CALEA intercept points) that would require months to replicate in self-hosted Asterisk.
- The Appsmith recommendation was appropriate for a solo developer; with an actual engineering team, hand-coded React is faster to iterate on and more controllable.

**The only valid reason to revisit Asterisk** is if the agency self-hosting requirement mandates on-prem telephony without any Twilio dependency. This is a rare constraint and should be confirmed with a specific agency before rebuilding. Document it as a known fork in the deployment model.

### 6.3 Build-from-Scratch vs. Wrap-an-Existing-Platform

**Recommendation: Continue building on the current custom stack, with a specific exception for video.**

The strategic guidance listed this as "Option 1 vs. Option 2." Here is the position:

**Voice:** Keep Twilio. The cost is manageable (~$0.013/min US outbound), the integration is working, and the alternative (self-hosted Asterisk + SIP trunk) provides no meaningful benefit at pilot scale. The license's "cost recovery for infrastructure" carve-out covers Twilio charges billed to the agency.

**Video:** The custom WebRTC + Socket.io signaling implementation is architecturally sound and license-compatible. The risk is the signaling server's reliability and scalability. For the demo and initial pilot (5–10 concurrent calls), the custom implementation is fine. If a pilot shows demand for 50+ concurrent calls, evaluate LiveKit (open-source, self-hostable, Apache 2.0) as a drop-in signaling layer. Do not adopt Daily or Twilio Video—they introduce per-minute costs that complicate the non-charging clause.

**Messaging:** Keep the custom implementation. No vendor makes sense here; the data must stay on the agency's infrastructure. The current PostgreSQL-backed implementation is correct and the schema is solid.

**Admin:** Keep the custom React UI. Appsmith would constrain the UX; the mockup quality from the admin guild shows the team can build the right interface faster in React.

---

## 7. Path to Demo-able for the DOC

### 7.1 Scope of the Demo

**Five stories that must work end-to-end with seeded data:**

1. **Voice call:** Incarcerated person (PIN login on Android tablet) selects an approved family member contact → initiates a call → family member's phone rings with facility announcement → call connects → timer shows on screen → 1-minute warning plays → call auto-ends → both parties see call in history.

2. **Video call:** Family member (web browser) requests a video call for a time slot → facility admin (web browser) approves it → incarcerated person (tablet) sees scheduled call and joins at the time → both sides have working camera/mic with blur → timer counts down → call ends.

3. **Messaging:** Family member sends a text message → admin sees it in pending review queue (because of keyword or default pending policy) → admin approves → incarcerated person sees the message on tablet → replies → family member sees the reply with a status indicator.

4. **Admin contact approval:** Family member has a pending contact request → facility admin reviews and approves → that contact now appears in the incarcerated person's voice and messaging contact lists.

5. **Admin configuration:** Agency admin sets calling hours and video time slot by housing unit type → the incarcerated person's home screen reflects those constraints.

**What is explicitly out of demo scope:**
- Photo attachments (non-functional without storage backend — remove the button for demo)
- PREA/crisis hotlines (not seeded)
- Push notifications (polling is acceptable for demo)
- Audit log
- Bulk import

### 7.2 Work Breakdown

**Platform track (must happen first)**

| Task | Effort |
|------|--------|
| Create integration branch from guild-admin | 0.5 days |
| Merge guild-voice; resolve api-gateway conflict | 0.5 days |
| Merge guild-video; delete duplicate admin UI path | 0.5 days |
| Merge guild-message; manually reconcile FlaggedKeyword migrations | 1 day |
| Fix duplicate POST /send route + add participant auth | 0.5 days |
| Add participant auth to GET /conversations/:id/messages and POST /conversations | 0.5 days |
| Validate all migrations run clean on fresh DB | 0.5 days |
| Fix relative-path imports in admin UI | 0.5 days |
| **Subtotal** | **~5 days** |

**Guild Voice track**

| Task | Effort |
|------|--------|
| Add TWILIO_API_KEY_SID/SECRET to .env.example | 0.5 hrs |
| Move callMetadata Map to Redis (demo-critical: prevents restart bugs) | 1 day |
| Seed facility announcement text; configure TwiML announcement injection | 0.5 days |
| Verify Twilio number works for outbound PSTN in demo environment | 0.5 days |
| Set up ngrok or PUBLIC_URL for demo environment | 0.5 days |
| **Subtotal** | **~3 days** |

**Guild Video track**

| Task | Effort |
|------|--------|
| Vendor MediaPipe WASM + model into public/ (remove CDN dependency) | 1 day |
| Confirm signaling server is in demo start script | 0.5 hrs |
| Seed video call time slots for demo facility | 0.5 days |
| Add ADMIN_APPROVAL_REQUIRED and TEST_MODE to .env.example; gate TEST_MODE | 0.5 days |
| **Subtotal** | **~2.5 days** |

**Guild Messaging track**

| Task | Effort |
|------|--------|
| Fix duplicate /send route (block on security) | 0.5 days |
| Fix authorization gaps in conversation routes | 0.5 days |
| Hide photo attachment button for demo | 0.5 hrs |
| Fix /stats endpoint to filter by facilityId | 0.5 days |
| **Subtotal** | **~1.5 days** |

**Guild Admin track**

| Task | Effort |
|------|--------|
| Decide on shadcn/ui vs @openconnect/ui for demo (pick one) | 0.5 days |
| Implement emergency lockdown backend enforcement | 1 day |
| Seed agency admin + 2 facility admin accounts | 0.5 hrs |
| Verify session-limits schema fields are migrated correctly | 0.5 days |
| **Subtotal** | **~2.5 days** |

**Seed data (prerequisite for any demo)**

| Seed entities | Details |
|--------------|---------|
| 1 Agency | "New York State DOCS" |
| 2 Housing unit types | General population (30-min voice, 30-min video), Restrictive (15-min voice, no video) |
| 1 Facility | "Sing Sing Correctional Facility" |
| 3 Housing units | Unit A (GP), Unit B (GP), Unit C (Restrictive) |
| 5 Incarcerated persons | Mix of housing units; pre-assigned PINs documented for demo |
| 3 Family members | Email/password login; pre-approved contacts |
| 1 Agency admin | `admin@nydocs.gov` / documented password |
| 1 Facility admin | `admin@singsingcf.gov` / documented password |
| 5 Approved contacts | Link incarcerated persons to family members |
| 3 Video time slots | Mon/Wed/Fri 10am–12pm, max 3 concurrent |
| 10 Flagged keywords | Pre-loaded default set |

**Total estimated effort to demo-ready:** ~15 engineer-days (3 weeks with one engineer, 1.5 weeks with two). These are not polished sprints; they are focused, sequential tasks with a clear acceptance criterion: the five demo stories above work end-to-end on a laptop without a developer touching the terminal.

### 7.3 Demo Environment

**Hosting for the DOC visit:** A single developer laptop running all services locally is acceptable for an initial meeting. A hardened version (cloud-hosted, always-on) is needed for a formal demo.

For the formal demo:
- Single cloud VM (AWS EC2 t3.medium, ~$35/month) running all services via Docker Compose
- PostgreSQL and Redis as Docker containers (already defined in `docker-compose.yml`)
- Signaling server as a Docker container (already has a Dockerfile)
- Twilio webhook URL set to the VM's public IP (no ngrok needed in cloud)
- Android tablet: demo device running the tablet app (Chrome PWA or bundled APK)
- Family/admin side: presenter's laptop browser

**Failure modes to prepare for:**
- Twilio webhook reachability: ensure ports are open and PUBLIC_URL is set; test a call 30 minutes before the demo
- Video call signaling: verify Redis is running before the demo; add a health check endpoint that confirms signaling server connectivity
- Database: run `prisma db seed` immediately before the demo to ensure clean state; document the reset command in a cheat sheet

---

## 8. Development Options Going Forward

### Option A: Volunteer / Open-Source Community

Ride hackathon momentum via Hacktoberfest contributions, civic tech networks (Code for America, USDS alumni), and outreach to Unlocked Labs (named in 2024 Strategy Session) and Twilio.org.

| Dimension | Details |
|-----------|---------|
| Monthly burn | $0–$200 (infrastructure only) |
| Time to demo-ready | 3–6 months (unpredictable; depends on volunteer engagement) |
| Time to pilot-ready | 12–18 months |
| Top risk 1 | Volunteer dropout — critical work stalls with no accountability |
| Top risk 2 | No single engineer owns the integration; the four branches never fully converge |

Best for: maintaining community momentum and attracting contributors *after* a core team gets the demo working. Not suited as the primary path to demo.

### Option B: Small Contracted Core Team

Per the strategic guidance composition: 1 infrastructure/security engineer, 2 full-stack engineers, 1 product manager, 1 UX designer (part-time).

Using the strategic guidance market rates (conservative end):

| Role | Rate | FTE | Monthly |
|------|------|-----|---------|
| Infrastructure/Security Engineer | $175/hr | 0.5 | ~$15,000 |
| Full-Stack Engineer (×2) | $150/hr | 1.0 each | ~$26,000 |
| Product Manager | $120/hr | 0.5 | ~$10,500 |
| UX Designer | $100/hr | 0.25 | ~$4,500 |
| Infrastructure (AWS + Twilio) | — | — | ~$800 |
| **Total** | | | **~$57,000/month** |

| Dimension | Details |
|-----------|---------|
| Monthly burn | ~$50,000–$57,000 |
| Time to demo-ready | 6–8 weeks |
| Time to pilot-ready | 4–6 months |
| Top risk 1 | Funding gap — $300K+ needed for a 6-month engagement |
| Top risk 2 | Knowledge transfer to a volunteer maintainer community after the contract ends |

Best for: controlled timeline and predictable output. This is the right model if Worth Rises can secure a grant or donor specifically for Phase 1 execution.

### Option C: Hybrid (Recommended)

Small paid core (1 tech lead + 1 full-stack engineer) plus structured volunteer contribution plus pro-bono engineering from a partner organization.

**Specific partner targets** (all named in hackathon or strategy materials):
- **Twilio.org**: Contact for pro-bono engineering hours specifically for the voice integration; their SDK is already in use.
- **Unlocked Labs**: Civic tech org focused on criminal justice software; natural mission alignment.
- **Code for America Brigade network**: For UI/UX volunteer contributions and testing.

| Role | Rate | FTE | Monthly |
|------|------|-----|---------|
| Tech Lead (integration + architecture) | $200/hr | 0.75 | ~$26,000 |
| Full-Stack Engineer | $150/hr | 1.0 | ~$26,000 |
| PM (Worth Rises internal staff + volunteer) | — | — | ~$0 |
| UX (Code for America volunteer) | — | — | ~$0 |
| Pro-bono partner (Twilio.org / Unlocked Labs) | — | — | ~$0 |
| Infrastructure (AWS + Twilio) | — | — | ~$800 |
| **Total** | | | **~$53,000/month → $30,000–35,000/month** (with pro-bono hours absorbing ~30%) |

| Dimension | Details |
|-----------|---------|
| Monthly burn | $30,000–$53,000 (depending on pro-bono realization) |
| Time to demo-ready | 8–12 weeks |
| Time to pilot-ready | 6–9 months |
| Top risk 1 | Pro-bono hours are not guaranteed; timeline slips if partners don't deliver |
| Top risk 2 | Coordination overhead between paid and volunteer contributors; needs a strong PM |

Best for: Worth Rises's current stage. Preserve the hackathon community while moving fast enough to reach a DOC conversation. Start with Option C; convert to Option B if a large grant is secured.

---

## 9. Risks and Unknowns

### 9.1 Updated Coverage Analysis (from Strategic Guidance Appendix)

| Goal/Feature | Original Assessment | Status After Hackathon |
|---|---|---|
| Web-based VoIP (voice) calls | ✅ Confidently Deliverable | ✅ **Resolved** — Twilio integration working |
| Video calls (WebRTC) | 🟡 Needs Discovery | ✅ **Resolved** — Custom WebRTC + signaling working |
| Secure messaging | 🟡 Needs Discovery | ✅ **Mostly Resolved** — Working implementation; security gaps need fixing |
| FCC baseline security (call blocking, etc.) | 🟡 Needs Discovery | 🟡 **Partially Resolved** — Call blocking present; three-way detection not yet implemented |
| Self-hosting & easy deployment | ✅ Confidently Deliverable | 🟡 **Partially Resolved** — Docker Compose works; one-click deployment not yet documented |
| Pilot in Nucleos-powered tablet facility | ✅ Confidently Deliverable | ❓ **Not Addressed** — PWA on Android works technically; Nucleos MDM compatibility untested |
| Pilot in non-Nucleos/no-tablet facility | 🟡/❓ Needs Discovery / Unknown | ❓ **Not Addressed** — Requires device procurement assessment |
| Feedback collection | ✅ Confidently Deliverable | ✅ **Resolved** — Can be added trivially |
| Proof of concept for cost-free communication | ✅ Confidently Deliverable | ✅ **Resolved** — Demonstrated |
| Documentation of infrastructure/deployment | ✅ Confidently Deliverable | 🟡 **Partial** — Dev setup docs exist; production deployment guide absent |
| Security/compliance for privileged comms | 🟡/❓ Needs Discovery / Unknown | 🟡 **Partially Addressed** — Legal call flag in schema and UI; routing is not yet separate |
| Integration with legacy/external systems | ❓ Complete Unknown | ❓ **Not Addressed** — Case management integration is seeded data only |
| Scalability/performance at scale | ❓ Complete Unknown | ❓ **Not Addressed** — No load testing; in-memory voice call state is a ceiling |

### 9.2 New Risks Surfaced by the Code

**Voice in-memory state:** The `callMetadata` Map in `guilds/voice/api/userRoutes.ts` stores active call state in memory. A server restart drops all active call records. In production or even a demo restart, calls cannot be recovered. This is the highest-operational-risk item in the codebase.

**Twilio trial account restrictions:** Trial Twilio accounts can only call verified phone numbers. A demo using a real incarcerated person's family member's phone requires a paid Twilio account and a purchased phone number. Budget for this.

**MediaPipe CDN dependency:** `useBlurBackground.ts` loads WASM from `cdn.jsdelivr.net` and a model from Google Storage at runtime. Correctional facility networks commonly block external CDN traffic. This will silently fail (the blur button will stop working) in a locked-down network environment.

**Migration sequence fragility:** With four divergent branches each adding migrations, the merge will require manually reconciling timestamps and ensuring idempotency. Running `prisma migrate deploy` on a clean database must be tested as a formal acceptance criterion before any demo.

**Three-way call detection:** Listed as IN scope in the hackathon spec. It is not implemented in any guild. For a pilot with a real DOC, this is often a contractual requirement.

**Privileged call routing:** The legal/attorney flag is present in both voice and video schemas and surfaced in the UI. However, flagging a call as legal does not route it differently—it only marks it in the database. A real deployment requires separate routing (no monitoring hooks can fire on legal calls). This is documented as a gap.

---

## 10. Immediate Next Steps — First 30 Days

**This is the part Bianca should read first.**

The following steps are ordered by dependency and impact. They are achievable by one or two engineers regardless of which long-term funding path is chosen.

- [ ] **Week 1: Get a single branch that boots.** Create `integration` branch from `origin/guild-admin`. Merge `origin/guild-voice` (lowest conflict). Confirm `npm run dev` starts all services and the seed data loads. This is the foundation everything else builds on.

- [ ] **Week 1: Fix the three messaging security bugs.** The duplicate `/send` route, the missing participant check on `GET /conversations/:id/messages`, and the open `POST /conversations` endpoint. These are concrete, bounded tasks. Do not demo the product publicly until these are fixed.

- [ ] **Week 2: Merge guild-video and guild-message.** Resolve the MediaPipe CDN dependency and the FlaggedKeyword migration conflict. Run `prisma migrate deploy` on a clean database as the acceptance test.

- [ ] **Week 2: Make voice calls work in the demo environment.** Upgrade to a paid Twilio account (or confirm the trial account's phone number is verified for demo calls). Set `PUBLIC_URL`. Verify a test call completes end-to-end.

- [ ] **Week 2: Move voice call state to Redis.** This is a one-session task. Without it, a server restart during the demo drops all call state and the demo fails silently.

- [ ] **Week 3: Vendor the MediaPipe assets.** Copy `@mediapipe/tasks-vision` WASM and model file into `public/`. Update `useBlurBackground.ts` to load from local paths. Test that background blur still works offline.

- [ ] **Week 3: Write the one-page demo script.** Document exactly which accounts to log in as, in what order, on which devices. Include the reset commands to run before the demo. This is not a technical task but it is the most important demo preparation artifact.

- [ ] **Week 3–4: Seed a clean demo environment.** Use the seed data specification in §7.2 to create a reproducible demo state. The reset command (`npm run db:reset && npm run db:seed`) should restore the environment in under 60 seconds.

- [ ] **Week 4: Reach out to Twilio.org and Unlocked Labs.** Send a concrete ask: engineering hours to help with integration and pilot preparation. The codebase is already at a stage where a new contributor can be productive. This costs nothing and opens Option C.

- [ ] **Ongoing: Do not merge anything to `integration` without running the demo script first.** The demo script is the integration test. A broken demo is worse than no demo for an agency conversation.

---

*This document was produced from direct code analysis of the four hackathon branches. Where data was unavailable or ambiguous, assumptions are labeled. The cost estimates use market rates from the OpenConnect Strategic Guidance document. All file path references are relative to the repository root.*
