# Admin Portal — Implementation Tickets

**Date:** 2026-03-07
**Branch:** `guild-admin-keeks`
**Spec:** `docs/plans/2026-03-07-admin-portal-design.md`

---

## How to Read This Document

Each ticket is a **full-stack feature slice** organized by API endpoint. The person who picks up a ticket owns the entire vertical: schema changes, backend endpoint, frontend UI, and tests.

- **Priority**: P0 (must ship), P1 (should ship), P2 (nice to have)
- **Wireframe ref**: ASCII wireframe file in `docs/mockups/`
- **Spec ref**: section of the design spec

---

## TICKET-01: Deactivate Resident

**Endpoint:** `POST /api/admin/residents/:id/deactivate`
**Priority:** P0
**Wireframe:** `02-residents.md` (Screen D: Deactivate Resident Modal)
**Spec ref:** Section 8 Residents; Journey J10

### What this feature does

Admin clicks [Deactivate] on a resident profile → modal with required reason → resident status set to `deactivated` → all communication access removed → audit logged.

### Schema

Add to `IncarceratedPerson`:
```prisma
deactivatedBy        String?    @map("deactivated_by")
deactivationReason   String?    @map("deactivation_reason")
```

Add reverse relation on `AdminUser`:
```prisma
deactivatedResidents IncarceratedPerson[] @relation("DeactivatedByAdmin")
```

Run: `DATABASE_URL="..." npx prisma@5 migrate dev --name add-deactivation-fields`

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/:id/deactivate
  Body: { reason: string }
  Response: updated IncarceratedPerson
```

Logic:
- Validate resident exists and is not already `deactivated`
- Set `status` → `deactivated`, `deactivatedBy` → admin ID, `deactivationReason` → reason
- Create audit log entry: `resident_status_changed`
- Return updated resident

Errors:
- `400` — already deactivated, or empty reason
- `403` — admin lacks permission (requires `facility_admin` or `agency_admin`)
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

Components:
- **[Deactivate] button** in resident profile header — only visible when status is `active` or `transferred`
- **DeactivateResidentModal** — lists consequences ("Communication access will be removed. Records are preserved. This is reversible."), required reason textarea, [Cancel] / [Confirm Deactivation]
- On success: update profile status badge → "Deactivated", show success toast

### Tests / QA

- [ ] Deactivated resident cannot: place voice calls, join video calls, send messages, log in via tablet
- [ ] Historical data (calls, messages, contacts) still visible to admins
- [ ] Audit log entry contains admin ID, resident ID, reason, timestamp
- [ ] PIN value does NOT appear in audit log
- [ ] `401` without auth, `403` with wrong role

---

## TICKET-02: Release Resident

**Endpoint:** `POST /api/admin/residents/:id/release`
**Priority:** P0
**Wireframe:** `02-residents.md` (Screen E: Release Resident Modal)
**Spec ref:** Section 8 Residents; Journey J11

### What this feature does

Admin clicks [Release] on a resident profile → modal with required reason + release date → resident status set to `released` → all communication access removed → audit logged.

### Schema

Add to `IncarceratedPerson`:
```prisma
releaseReason   String?    @map("release_reason")
releasedBy      String?    @map("released_by")
```

Note: `releasedAt` and `status` (with `released` enum value) already exist in schema.

Add reverse relation on `AdminUser`:
```prisma
releasedResidents IncarceratedPerson[] @relation("ReleasedByAdmin")
```

Run migration alongside TICKET-01 or separately.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/:id/release
  Body: { reason: string, releaseDate?: string }
  Response: updated IncarceratedPerson
```

Logic:
- Validate resident exists and is not already `released`
- Set `status` → `released`, `releasedAt` → releaseDate or now(), `releasedBy` → admin ID, `releaseReason` → reason
- Create audit log entry: `resident_status_changed`
- Return updated resident

Errors:
- `400` — already released, or empty reason
- `403` — requires `facility_admin` or `agency_admin`
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

Components:
- **[Release] button** in resident profile header — only visible when status is `active`
- **ReleaseResidentModal** — release date picker (default: today), required reason textarea, [Cancel] / [Confirm Release]
- On success: update profile to show "Released" status badge with release date, show success toast

### Tests / QA

- [ ] Released resident blocked from all communication channels (same checks as TICKET-01)
- [ ] `releasedAt` timestamp recorded
- [ ] Released residents appear under "Released" filter on ResidentListPage
- [ ] Released residents excluded from active counts on DashboardPage
- [ ] Audit log entry created with admin, reason, release date
- [ ] `401` without auth, `403` with wrong role

---

## TICKET-03: Assign / Reset PIN

**Endpoint:** `POST /api/admin/residents/:id/reset-pin`
**Priority:** P0
**Wireframe:** `02-residents.md` (Screen C: Reset PIN Modal)
**Spec ref:** Section 8 Residents; Journey J8

### What this feature does

Admin views a resident's PIN section → clicks [Reset PIN] → modal generates new 4-digit PIN → new PIN displayed once → admin communicates PIN to resident out-of-band.

### Schema

No changes needed — `IncarceratedPerson.pin` (String) already exists.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/:id/reset-pin
  Body: { }
  Response: { newPin: string }
```

Logic:
- Generate random 4-digit PIN (check existing pattern — if PINs are hashed, hash the new one before storing)
- Store new PIN, overwriting old
- Create audit log entry: `pin_reset` (or `resident_status_changed`) — **log that a reset happened but NEVER log the PIN value**
- Return `{ newPin }` — this is the only time the plaintext PIN is available

Errors:
- `403` — requires `manage_contacts` or facility admin role
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

Components:
- **PIN section** on resident profile: shows "PIN: ••••" (masked) with "Set: [date]"
- **[Reset PIN] button** → opens **ResetPinModal**
- **ResetPinModal**: warning text ("This will generate a new PIN. The old PIN will stop working immediately. You must communicate the new PIN to the resident."), [Generate New PIN] button
- On success: display new PIN in highlighted box (large, monospace font), [Copy to Clipboard] button — **one-time view, not retrievable after closing**

### Tests / QA (Security-Critical)

- [ ] New PIN works for tablet auth immediately after reset
- [ ] Old PIN fails tablet auth immediately after reset
- [ ] PIN never appears in: server logs, audit log `details`, any GET response
- [ ] Audit log records WHO reset but NOT the PIN value
- [ ] PIN returned exactly once in the POST response, never cached
- [ ] `401` without auth, `403` with wrong role

---

## TICKET-04: Edit Contact Info

**Endpoint:** `PATCH /api/admin/contacts/:id`
**Priority:** P1
**Wireframe:** `03-contacts.md` (Screen E: Edit Contact Modal)
**Spec ref:** Section 8 Contacts; Journey J14

### What this feature does

Admin clicks [Edit] on an approved contact → modal pre-filled with current info → admin updates phone/email/address/relationship → changes saved → audit logged.

### Schema

Add to `FamilyMember`:
```prisma
address   String?
```

Add to `IncarceratedPerson` (if not already added by TICKET-05):
```prisma
lastContactChangeAt   DateTime?   @map("last_contact_change_at")
```

### Backend

Route: `guilds/admin/api/contacts.routes.ts`

```
PATCH /api/admin/contacts/:id
  Body: { phone?: string, email?: string, address?: string, relationship?: string }
  Response: updated FamilyMember + ApprovedContact
```

Logic:
- Validate at least one field is provided
- **Check contact change eligibility** before allowing edit — call the same logic as TICKET-05's endpoint. If not eligible, return `409` with `nextEligibleDate`
- Update `FamilyMember` fields (phone, email, address) and/or `ApprovedContact.relationship`
- Set `lastContactChangeAt` = now() on the resident
- Create audit log entry: `contact_edited` with old → new diff
- Return updated records

Errors:
- `400` — no fields provided
- `403` — requires `manage_contacts` permission
- `409` — contact change frequency not met (include `nextEligibleDate` in response)

### Frontend

Location: `guilds/admin/ui/contacts/ContactListPage.tsx`

Components:
- **[Edit] button** on approved contacts in the Approved tab — disabled with tooltip if in cooldown window
- **EditContactModal**: fields for First Name (read-only), Last Name (read-only), Phone, Email, Address, Relationship (dropdown), [Cancel] / [Save Changes]
- On `409` response: show inline error "Contact changes locked until [date]"
- On success: update table row, show toast

### Tests / QA

- [ ] Edit saves correctly and reflects in table immediately
- [ ] Contact change frequency enforcement: edit blocked if within cooldown period (API-level, not just UI)
- [ ] Audit log captures old → new values for each changed field
- [ ] Only `manage_contacts` permission holders see the [Edit] button
- [ ] `401` / `403` / `409` responses work correctly

---

## TICKET-05: Contact Change Frequency Enforcement

**Endpoint:** `GET /api/admin/contacts/change-eligibility/:residentId`
**Priority:** P1
**Wireframe:** `03-contacts.md` (Screen A: Contact Change Frequency banner)
**Spec ref:** Section 8 Contacts; Journey J60

### What this feature does

System enforces a minimum number of days between contact list changes (add/edit/remove) per resident. A banner at the top of the contacts page shows eligibility status. [Edit] and [Remove] buttons are disabled during cooldown.

### Schema

Add to `HousingUnitType`:
```prisma
contactChangeFrequencyDays   Int?   @map("contact_change_frequency_days")
```

Add to `IncarceratedPerson` (if not already added by TICKET-04):
```prisma
lastContactChangeAt   DateTime?   @map("last_contact_change_at")
```

Seed data: `general` → 90 days, `minimum` → 60 days, `restricted` → 120 days, `segregated` → null (admin-only, no limit).

### Backend

Route: `guilds/admin/api/contacts.routes.ts`

```
GET /api/admin/contacts/change-eligibility/:residentId
  Response: { eligible: boolean, nextEligibleDate?: string, daysSinceLastChange: number, frequencyDays: number | null }
```

Logic:
- Look up resident → housing unit → housing unit type → `contactChangeFrequencyDays`
- If `contactChangeFrequencyDays` is null → return `eligible: true` (no restriction)
- Compare `lastContactChangeAt` + `contactChangeFrequencyDays` against today
- Return eligibility status with computed dates

### Frontend

Location: `guilds/admin/ui/contacts/ContactListPage.tsx`

Components:
- **Info banner** at top of contact list (below tabs, above table):
  - Eligible: green — "Contact list changes are available."
  - Not eligible: amber — "Contact list changes allowed every [N] days. Last changed: [date]. Next eligible: [date]."
  - When not eligible: [Edit] and [Remove] buttons render as disabled with tooltip "Contact changes are locked until [date]."
- Call the eligibility endpoint on page load and after any contact change action
- **Agency admin override**: agency admins can bypass the cooldown (banner shows "Locked for facility admins" but buttons remain enabled for agency admins)

### Tests / QA

- [ ] `eligible: true` when frequency is null (unlimited)
- [ ] `eligible: true` when enough days have passed
- [ ] `eligible: false` with correct `nextEligibleDate` when too recent
- [ ] Enforcement at API level — PATCH/DELETE on contacts returns `409` if ineligible (not just UI disabled)
- [ ] Resident transferred to unit with different frequency → uses new unit's frequency
- [ ] Banner displays correct dates
- [ ] Agency admin can override lockout

---

## TICKET-06: Bulk User Import

**Endpoint:** `POST /api/admin/residents/bulk-import`
**Priority:** P2
**Wireframe:** `14-bulk-import.md` (Screen 1: Upload, Screen 2: Preview & Validation)
**Spec ref:** Section 8 Residents; Journey J58

### What this feature does

Agency admin uploads a CSV file → system parses and validates each row → preview table shows valid/warning/error status per row → admin confirms import → valid rows create resident profiles with auto-generated PINs.

### Schema

No new schema changes — uses existing `IncarceratedPerson` model.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/bulk-import
  Content-Type: multipart/form-data
  Body: CSV file
  Response: { imported: number, skipped: number, warnings: number, errors: { row: number, field: string, message: string }[] }
```

Required CSV columns: `firstName`, `lastName`, `dateOfBirth`, `inmateId`, `pin`, `housingUnitName`, `clearanceLevel`
Optional CSV columns: `email`, `phone`, `notes`

Logic:
- Parse CSV, validate headers
- Per-row validation:
  - Required fields present
  - `dateOfBirth` is valid date
  - `housingUnitName` matches an existing HousingUnit at admin's facility
  - `inmateId` not already in DB (warn if duplicate)
  - `clearanceLevel` is valid enum value
- Auto-generate 4-digit PIN for each imported resident (if `pin` column empty)
- Insert valid rows in a transaction — rollback entire batch on DB error
- Create single audit log entry: `bulk_import` with filename, imported count, skipped count

Errors:
- `400` — not a CSV, missing required columns, >500 rows
- `403` — agency admin only

### Frontend

Location: `guilds/admin/ui/residents/BulkImportPage.tsx` (new page)
Nav: add "📥 Bulk Import" under Operations in sidebar — agency admin only

**Screen 1 — Upload:**
- Info card: "Import resident profiles from a CSV file. Max 500 rows."
- [Download CSV Template] link
- Drag-and-drop zone + [Browse Files] button
- Accepted: `.csv` only, max 2 MB

**Screen 2 — Preview & Validation:**
- File info: name, row count, size
- 3 stat cards: ✓ Valid (green), ⚠ Warnings (amber), ✕ Errors (red)
- Filter tabs: All / Valid / Warnings / Errors
- Preview table: row #, name, inmate ID, DOB, unit, clearance, status
  - `✓ Valid` — passes all checks
  - `⚠ Warn` — importable but flagged (e.g., duplicate inmateId in DB)
  - `✕ Error` — blocked (missing field, invalid format, unknown unit)
- [Cancel] returns to upload, [Import N Valid Records] triggers import
- Confirmation modal: "Import N records into [facility]? This cannot be undone."
- Progress indicator during import, success summary on completion

### Tests / QA

- [ ] Valid CSV imports correctly, all rows become `IncarceratedPerson` records
- [ ] PINs auto-generated and functional for tablet auth
- [ ] Empty CSV → appropriate error
- [ ] Wrong columns → column mapping error
- [ ] >500 rows → max rows error
- [ ] Duplicate `inmateId` within file → deduplicated
- [ ] Existing `inmateId` in DB → warning, still importable
- [ ] Invalid housing unit → per-row error
- [ ] Missing required fields → per-row error
- [ ] Non-CSV file → rejected
- [ ] Valid rows import even when other rows have errors (no all-or-nothing on validation)
- [ ] Transaction: if DB insert fails mid-batch, entire batch rolls back
- [ ] Audit log: single entry with filename + counts
- [ ] `403` for non-agency-admin

---

## TICKET-07: Manual Refresh on Active Monitoring

**Endpoints:**
- `GET /api/admin/monitoring/voice/active`
- `GET /api/admin/monitoring/video/active`

**Priority:** P0
**Wireframe:** `05-voice-monitoring.md` (Screen 1), `06-video-monitoring.md` (Screen 3)
**Spec ref:** Section 8 Voice/Video Monitoring; Journey J59

### What this feature does

Admin clicks [↻ Refresh Now] on the active calls/sessions tab → table re-fetches from the server → "Last updated" timestamp updates. Provides manual control over data freshness without waiting for auto-polling.

### Schema

No changes.

### Backend

No new endpoints — the existing `GET /active` endpoints already return the data. This ticket verifies they:
- Respond in <500ms under normal load
- Include a `timestamp` or `fetchedAt` field in the response (add if missing)
- Work correctly when called on-demand (not just via interval polling)

### Frontend

**Voice — `guilds/admin/ui/monitoring/voice/VoiceMonitoringPage.tsx`:**
- Add to Active Calls tab header: `Active Calls (3)  [↻ Refresh Now]  Last updated: 2:45:12 PM`
- [↻ Refresh Now] button calls `GET /api/admin/monitoring/voice/active`
- Show spinner on button while fetching
- Update "Last updated" timestamp from response `fetchedAt`
- Keep existing auto-refresh (5s interval) running alongside manual refresh

**Video — `guilds/admin/ui/monitoring/video/VideoMonitoringPage.tsx`:**
- Same pattern on Active Sessions tab: `Active Sessions (2)  [↻ Refresh Now]  Last updated: 2:45:12 PM`
- Same behavior as voice

### Tests / QA

- [ ] Start a call → click refresh on admin → call appears in table
- [ ] End a call → click refresh → call disappears from active list
- [ ] No active calls → refresh shows empty state, not stale data
- [ ] Rapid clicks → no duplicate requests, no UI glitches (debounce or disable during fetch)
- [ ] "Last updated" timestamp updates on each successful refresh
- [ ] Auto-refresh continues working alongside manual refresh

---

## TICKET-08: Case Management Integration Stubs

**Endpoints:**
- `POST /api/admin/integration/sync-residents`
- `POST /api/admin/integration/sync-housing`

**Priority:** P2
**Spec ref:** Requirements #8, #9 from original scope (auto-create profiles, housing assignment via integration)

### What this feature does

Placeholder endpoints for future case management system integration. Returns `501 Not Implemented` for now — reserves the route structure for when the external system specs are available.

### Schema

No changes.

### Backend

Route: `guilds/admin/api/integration.routes.ts` (new file)

```
POST /api/admin/integration/sync-residents
  → 501 { message: "Integration endpoint reserved for case management system" }

POST /api/admin/integration/sync-housing
  → 501 { message: "Integration endpoint reserved for case management system" }
```

Mount in `guilds/admin/api/routes.ts`.

### Frontend

None — these are API-only stubs.

### Tests / QA

- [ ] Both routes return `501` with expected message
- [ ] Routes are registered and reachable (not 404)
- [ ] Auth still required (401 without token)

---

## Dependency Graph

```
TICKET-01 (Deactivate)     — independent, can start immediately
TICKET-02 (Release)        — independent, can start immediately
                             (shares schema migration with TICKET-01 — coordinate)
TICKET-03 (Reset PIN)      — independent, can start immediately
TICKET-04 (Edit Contact)   — depends on TICKET-05 (uses eligibility check)
TICKET-05 (Change Freq.)   — independent, can start immediately
TICKET-06 (Bulk Import)    — independent, can start immediately
TICKET-07 (Manual Refresh) — independent, can start immediately
TICKET-08 (Integration)    — independent, can start immediately
```

**Recommended pairing:** TICKET-01 + TICKET-02 should be done by the same person — they share schema fields on `IncarceratedPerson` and `AdminUser`, same migration, same test patterns.

**Recommended sequencing:** TICKET-05 before TICKET-04 — the edit contact endpoint needs the eligibility check.

## Priority Breakdown

### P0 — Must Ship
- TICKET-01: Deactivate Resident
- TICKET-02: Release Resident
- TICKET-03: Assign / Reset PIN
- TICKET-07: Manual Refresh on Active Monitoring

### P1 — Should Ship
- TICKET-04: Edit Contact Info
- TICKET-05: Contact Change Frequency Enforcement

### P2 — Nice to Have
- TICKET-06: Bulk User Import
- TICKET-08: Case Management Integration Stubs

## Validation Commands

```bash
# Schema validation (run after any schema change)
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma@5 validate

# Push changes
git push fork guild-admin-keeks
git push fork guild-admin-keeks:main
```
