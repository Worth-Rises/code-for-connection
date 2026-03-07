# Video Guild TODO

Ordered by demo flow — get end-to-end working first, polish after.

---

## Phase 0: Infra / Wiring

### 0.1 Mount video router in API gateway
- **What:** Uncomment `app.use('/api/video', videoRouter)` in `services/api-gateway/src/index.ts`
- **Status:** One-liner, but nothing works without it
- **Issues:** None — the import path and router already exist

### 0.2 Add missing API endpoints to `guilds/video/api/routes.ts`
- **What:** The existing routes cover admin operations (active calls, logs, pending requests, approve, terminate, stats). We need family + incarcerated endpoints:
  - `GET /time-slots` — available time slots for a facility (queries `video_call_time_slots` + checks existing bookings against `max_concurrent`)
  - `POST /request` — family member requests a video call (creates `VideoCall` with status `requested`)
  - `GET /my-calls` — upcoming scheduled/approved calls for the authenticated user (works for both family and incarcerated roles)
  - `POST /join/:callId` — transition call to `in_progress`, set `actualStart`, return signaling room ID
  - `POST /end/:callId` — transition call to `completed`, set `actualEnd` + `durationSeconds` + `endedBy`
  - `POST /deny-request/:callId` — admin denies a request (sets status to `denied`)
- **Decisions needed:**
  - **Room ID format:** Use the `VideoCall.id` (UUID) as the signaling room ID? Simplest option, no extra mapping needed.
  - **Auto-approve logic:** Should we check if the caller is an approved contact + slot is open and skip the `requested` state? Or always require admin approval first and add auto-approve later (Phase 3)?
    - **Recommendation:** Always require approval first. Auto-approve is Phase 3.
  - **Time slot validation:** When a family member requests a call, do we validate against `video_call_time_slots` server-side? **Yes** — must check day of week, time range, and concurrent call count.

---

## Phase 1: WebRTC Client (the actual video call)

### 1.1 WebRTC hook — `useWebRTC`
- **What:** React hook that connects to the signaling server (`socket.io-client` already in `guilds/video/package.json`), handles:
  - `getUserMedia` for camera + mic
  - `RTCPeerConnection` setup (offer/answer/ICE via signaling server)
  - Local and remote `MediaStream` refs
  - Mute/unmute audio and video (toggle tracks + emit `mute-toggle` event)
  - Cleanup on unmount
- **Where:** `guilds/video/ui/shared/useWebRTC.ts` (shared between tablet + PWA)
- **Decisions needed:**
  - **STUN/TURN servers:** For local dev, browser default STUN works (Google's public `stun:stun.l.google.com:19302`). For the demo on the same network this is fine. If we need TURN for NAT traversal across networks, we'd need a TURN server (e.g. Twilio's Network Traversal Service — we already have Twilio creds in `.env`).
    - **Recommendation:** Start with Google STUN. Add Twilio TURN only if connections fail on demo day.
  - **Peer connection config:** Just 1:1 calls, no SFU needed. Simple peer-to-peer.

### 1.2 Video call UI component — `VideoCallRoom`
- **What:** Shared React component used by both tablet and PWA:
  - Remote video (large), local video (small pip overlay)
  - Controls bar: camera toggle, mic toggle, end call button
  - Call timer countdown (based on `scheduledEnd` from the API)
  - Auto-disconnect when timer hits zero (emit `call-ended` with reason `time_limit`)
  - Display peer connection state (connecting, connected, disconnected)
- **Where:** `guilds/video/ui/shared/VideoCallRoom.tsx`
- **Decisions needed:**
  - **UI library:** The project uses Tailwind + `@openconnect/ui` (Button, Card, Modal, Input, LoadingSpinner, Layout, Navigation). We should use these existing components where possible and build the video-specific UI with Tailwind.
  - **Timer source of truth:** Server-side `scheduledEnd` passed to the client. Client-side countdown is display only — the server should also enforce the limit (cron or check on heartbeat). For hackathon scope, client-side enforcement is fine.
  - **Responsive layout:** The tablet is fixed at 1280x800. The PWA needs to handle various screen sizes. Use the same component with Tailwind responsive classes.

---

## Phase 2: Wire Up Interfaces (Demo Flow)

### 2.1 Family PWA — `guilds/video/ui/family/`
- **What:** Replace the placeholder with real pages:
  - **Video home** — list of upcoming scheduled calls + "Request a Video Call" button
  - **Request flow** — select approved contact → pick available time slot → submit request → confirmation
  - **Join call** — when a scheduled call is within the join window, show "Join" button → navigates to `VideoCallRoom`
  - **Call history** — list of past calls with date, duration, status
- **Routes:** `/family/video/` (home), `/family/video/request`, `/family/video/call/:callId`, `/family/video/history`
- **Decisions needed:**
  - **How does family see approved contacts?** Need a `GET /api/video/approved-contacts` endpoint (or reuse a shared one). The `approved_contacts` table is shared with voice/messaging — check if there's already an endpoint.
    - Looking at the codebase: **No existing endpoint.** We need to add `GET /approved-contacts` that returns contacts where `status = 'approved'` for the authenticated family member.
  - **Time slot picker UX:** Calendar view or simple list of next 7 days with available slots?
    - **Recommendation:** Simple list — faster to build, clear for the user.

### 2.2 Tablet App — `guilds/video/ui/incarcerated/`
- **What:** Replace the placeholder with real pages:
  - **Video home** — list of upcoming scheduled calls with countdown to next one
  - **Alert/notification** — when a new call is scheduled, show it prominently (poll API or use signaling socket for real-time push)
  - **Join call** — "Join" button when call is in the join window → navigates to `VideoCallRoom`
  - **Call history** — past calls
- **Routes:** `/incarcerated/video/` (home), `/incarcerated/video/call/:callId`, `/incarcerated/video/history`
- **Decisions needed:**
  - **Real-time notifications:** Polling vs socket? The signaling server is already a socket.io server. We could add a `call-scheduled` event that the server emits when a call is approved. But the signaling server doesn't have DB access — it's just for WebRTC.
    - **Recommendation:** Simple polling (every 30s) for the call list. Good enough for hackathon. Could add a lightweight notification socket later.
  - **Join window:** How early can someone join before `scheduledStart`? 5 minutes? Configurable?
    - **Recommendation:** 5 minutes before `scheduledStart`, hardcoded. Keep it simple.

### 2.3 Admin Dashboard — `guilds/video/ui/admin/`
- **What:** Replace the placeholder with a real dashboard:
  - **Stats cards** — wire up the existing stat cards to the `/api/video/stats` endpoint (already exists)
  - **Pending requests queue** — list from `/api/video/pending-requests`, approve/deny buttons
  - **Active calls monitor** — list from `/api/video/active-calls`, terminate button
  - **Call logs** — paginated table from `/api/video/call-logs`, filterable by date/facility
- **Routes:** `/admin/video/` (dashboard), `/admin/video/logs`
- **Issues:**
  - The existing admin UI component already has the layout structure (stat cards + sections). Just needs to be wired to real data.
  - All API endpoints for admin already exist. This is mostly frontend work.

---

## Phase 3: Required Scope Polish

### 3.1 Background blur
- **What:** Toggle to blur the user's background on their video stream
- **Decisions needed — THIS IS THE BIGGEST TECHNICAL CHOICE:**
  - **Option A: MediaPipe Selfie Segmentation** — Google's ML model, runs in-browser via WASM/WebGL. Segments person from background. We'd draw to a canvas: person pixels from camera + blurred background pixels. Feed the canvas stream to the peer connection instead of raw camera.
    - Pros: Free, no server needed, good quality
    - Cons: ~20-30MB download for the model, CPU-intensive (may lag on cheap tablets), complex canvas pipeline
  - **Option B: `insertableStreams` / `MediaStreamTrack Processor API`** — newer browser API for processing video frames. Same ML model but more efficient pipeline.
    - Pros: More performant
    - Cons: Limited browser support (Chrome 94+), might not work on the JP6 tablet's browser
  - **Option C: CSS `backdrop-filter: blur()` on a virtual background** — not real blur, just a UI trick
    - Pros: Trivial to implement
    - Cons: Doesn't actually work — the remote user still sees the real background
  - **Recommendation:** MediaPipe Selfie Segmentation via `@mediapipe/selfie_segmentation` or the newer `@mediapipe/tasks-vision`. Start without it, add as a toggle. If it's too slow on the tablet, disable it for that platform.
  - **Package:** `@mediapipe/tasks-vision` (newer, better API) — ~5MB WASM bundle
  - **Important for spec:** Background blur is specifically called out so "kids don't see the prison environment." This is a real user need, not just a nice-to-have.

### 3.2 Legal video calls (attorney)
- **What:** When `isAttorney` is true on the `ApprovedContact`, the video call should:
  - Set `isLegal: true` on the `VideoCall` record
  - Display a "Legal Call — Not Monitored" indicator in the UI
  - Prevent admin from listening in (they can see it's active but can't join/monitor)
- **Issues:** For hackathon scope, this is just a flag + UI indicator. No actual monitoring exists yet, so "prohibiting" monitoring is just about the data model and UI treatment.

### 3.3 Auto-approve scheduling
- **What:** When a family member requests a call and they're an approved contact + the time slot is available, skip admin approval and go straight to `scheduled`.
- **Where:** `POST /request` endpoint logic
- **Decision:** Make this a facility-level setting? Or always auto-approve for approved contacts?
  - **Recommendation:** Always auto-approve if contact is approved + slot is available. Admins already approved the contact — requiring them to also approve every call creates unnecessary friction.

### 3.4 Call history views
- **What:** Past calls list for all three interfaces. The `/api/video/call-logs` endpoint already exists with pagination and filtering. Just need the frontend for each interface.

---

## Phase 4: Optional Scope (Stretch)

### 4.1 Ambient noise cancelling
- **Package options:** `@nicolo-ribaudo/rnnoise-wasm` (RNNoise ML model) or Web Audio API with a simple noise gate
- **Recommendation:** Skip unless we have time. RNNoise is good but adds complexity.

### 4.2 Voice captioning
- **Package options:** Web Speech API (`SpeechRecognition`) — built into Chrome, free, no packages needed
- **Recommendation:** Easy win if we have time. ~20 lines of code for basic captions. Won't work on all browsers.

### 4.3 Real-time translation
- **Requires:** External API (Google Translate, DeepL). Adds latency and cost.
- **Recommendation:** Skip for hackathon.

### 4.4 Technical requirements check
- **What:** Pre-call check for camera, mic, bandwidth
- **Recommendation:** Easy to add — `navigator.mediaDevices.enumerateDevices()` for camera/mic, simple speed test ping to the signaling server. Low effort, good UX.

### 4.5 Reschedule/cancel call
- **What:** Family member can modify or cancel a pending/scheduled call
- **Recommendation:** Simple — `PUT /reschedule/:callId` and `DELETE /cancel/:callId` endpoints + UI buttons

### 4.6 Quality metrics
- **What:** Track `RTCPeerConnection.getStats()` — bitrate, packet loss, resolution
- **Recommendation:** Log to console for debugging during dev. Display to admin if time permits.

---

## Dependency Summary

| Need | Package | Already installed? | Notes |
|---|---|---|---|
| WebRTC signaling | `socket.io-client` | Yes (guilds/video) | Signaling server is built |
| UI components | `@openconnect/ui` | Yes | Button, Card, Modal, Input, etc. |
| Styling | `tailwindcss` | Yes (apps) | Both apps already configured |
| Background blur | `@mediapipe/tasks-vision` | **No** | ~5MB WASM, Phase 3 |
| STUN server | Google public STUN | N/A (free) | `stun:stun.l.google.com:19302` |
| TURN server | Twilio Network Traversal | Maybe (creds in .env) | Only if NAT traversal fails |
| Voice captioning | Web Speech API | N/A (browser built-in) | Chrome only, stretch goal |

## Open Questions

1. **Do other guilds have an `/approved-contacts` endpoint we can reuse?** Need to check voice/messaging guild routes.
2. **What browser does the JP6 tablet run?** Affects WebRTC compatibility and MediaPipe support.
3. **Demo network setup** — Will the demo be on the same LAN? If so, STUN is fine. If across NAT, we need TURN.
4. **Should we coordinate with the admin guild on the approval queue UI?** Their dashboard (`guilds/admin/ui`) also shows video call info — make sure we're not duplicating work.
