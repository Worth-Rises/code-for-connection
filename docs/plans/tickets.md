# Admin Portal — Implementation Tickets

**Date:** 2026-03-07
**Branch:** `guild-admin-keeks`
**Spec:** `docs/plans/2026-03-07-admin-portal-design.md`

---

## How to Read This Document

Each ticket has:
- **ID**: `[LAYER]-[NUMBER]` (e.g., `DATA-001`, `BE-003`, `FE-012`, `QA-007`)
- **Priority**: P0 (must ship), P1 (should ship), P2 (nice to have)
- **Depends on**: tickets that must be completed first
- **Spec ref**: section of the design spec that defines this

---

## DATA — Schema & Migrations

### DATA-001: Add deactivation and release fields to IncarceratedPerson
**Priority:** P0
**Depends on:** —
**Spec ref:** Section 4, IncarceratedPerson modifications

Add fields to `IncarceratedPerson`:
- `deactivatedBy` (String?, FK → AdminUser)
- `deactivationReason` (String?)
- `releaseReason` (String?)
- `releasedBy` (String?, FK → AdminUser)
- `lastContactChangeAt` (DateTime?)

**Acceptance:**
- `npx prisma@5 validate` passes
- Migration runs cleanly on empty + seeded DB
- Existing rows unaffected (all new fields nullable)

---

### DATA-002: Add contactChangeFrequencyDays to HousingUnitType
**Priority:** P1
**Depends on:** —
**Spec ref:** Section 4, HousingUnitType modifications

Add field:
- `contactChangeFrequencyDays` (Int?, nullable = no limit)

Seed data: set `general` to 90 days, `minimum` to 60 days, `restricted` to 120 days, `segregated` to null (admin-only changes).

**Acceptance:**
- `npx prisma@5 validate` passes
- Seed data includes values for all 3 existing HousingUnitTypes

---

### DATA-003: Add address field to FamilyMember
**Priority:** P1
**Depends on:** —
**Spec ref:** Section 4, FamilyMember modifications

Add field:
- `address` (String?, nullable)

**Acceptance:**
- `npx prisma@5 validate` passes

---

### DATA-004: Add relations for deactivatedBy/releasedBy on AdminUser
**Priority:** P0
**Depends on:** DATA-001
**Spec ref:** Section 4

Add reverse relations on AdminUser:
- `deactivatedResidents IncarceratedPerson[] @relation("DeactivatedByAdmin")`
- `releasedResidents IncarceratedPerson[] @relation("ReleasedByAdmin")`

**Acceptance:**
- `npx prisma@5 validate` passes
- Relations queryable in both directions

---

## BE — Backend API Endpoints

### BE-001: POST /api/admin/residents/:id/deactivate
**Priority:** P0
**Depends on:** DATA-001
**Spec ref:** Section 8, Residents; Journey J10

Endpoint to deactivate a resident:
- Requires `reason` in request body
- Sets `status` → `deactivated`, records `deactivatedBy`, `deactivationReason`
- Audit logs action `resident_status_changed`
- Returns updated resident

**Validation:**
- 400 if resident already deactivated
- 400 if `reason` empty
- 403 if admin lacks permission

**Acceptance:**
- Resident status changes to `deactivated`
- Audit log entry created
- Subsequent comms attempts by this resident are blocked by existing status checks

---

### BE-002: POST /api/admin/residents/:id/release
**Priority:** P0
**Depends on:** DATA-001
**Spec ref:** Section 8, Residents; Journey J11

Endpoint to process a release:
- Requires `reason` in request body, optional `releaseDate` (defaults to now)
- Sets `status` → `released`, records `releasedAt`, `releasedBy`, `releaseReason`
- Audit logs action `resident_status_changed`

**Validation:**
- 400 if resident already released
- 400 if `reason` empty

**Acceptance:**
- Resident status changes to `released`
- `releasedAt` is set
- Audit log entry created

---

### BE-003: POST /api/admin/residents/:id/reset-pin
**Priority:** P0
**Depends on:** —
**Spec ref:** Section 8, Residents; Journey J8

Endpoint to generate a new 4-digit PIN:
- Generates random 4-digit PIN
- Hashes and stores it (or stores plaintext if existing pattern does so — match codebase)
- Returns `{ newPin }` in response (one-time display)
- Audit logs action `resident_status_changed` (or new `pin_reset` action)

**Validation:**
- 404 if resident not found
- 403 if admin lacks permission

**Acceptance:**
- New PIN replaces old PIN
- Old PIN no longer works for auth
- Response includes the new PIN exactly once

---

### BE-004: PATCH /api/admin/contacts/:id (edit contact info)
**Priority:** P1
**Depends on:** DATA-003
**Spec ref:** Section 8, Contacts; Journey J14

Endpoint to edit contact (FamilyMember) info:
- Accepts optional fields: `phone`, `email`, `address`, `relationship`
- Updates FamilyMember record and/or ApprovedContact relationship field
- Updates `lastContactChangeAt` on the resident
- Audit logs action `contact_approved` (or new `contact_edited` action)

**Validation:**
- Check contact change frequency eligibility first (see BE-005)
- 400 if no fields provided
- 409 if contact change frequency not met

**Acceptance:**
- Contact info updated
- `lastContactChangeAt` updated on resident
- Audit log entry created

---

### BE-005: GET /api/admin/contacts/change-eligibility/:residentId
**Priority:** P1
**Depends on:** DATA-002
**Spec ref:** Section 8, Contacts; Journey J60

Returns whether a resident's contact list can be modified:
- Looks up resident's HousingUnitType → `contactChangeFrequencyDays`
- Compares `lastContactChangeAt` + frequency against current date
- Returns `{ eligible: boolean, nextEligibleDate?: string, daysSinceLastChange: number }`

**Acceptance:**
- Returns `eligible: true` if no frequency set (null)
- Returns `eligible: true` if enough days have passed
- Returns `eligible: false` with `nextEligibleDate` if too recent

---

### BE-006: POST /api/admin/residents/bulk-import
**Priority:** P2
**Depends on:** —
**Spec ref:** Section 8, Residents; Journey J58

CSV upload endpoint for bulk user creation:
- Accepts `multipart/form-data` with CSV file
- Required columns: `first_name`, `last_name`, `external_id`, `facility_id`, `housing_unit_id`
- Validates each row: facility exists, housing unit exists, external_id not duplicate
- Auto-generates PIN for each imported resident
- Returns `{ imported: number, skipped: number, errors: { row, field, message }[] }`
- Single audit log entry with filename, imported count

**Validation:**
- 400 if file not CSV
- 400 if required columns missing
- Max 500 rows per upload
- Agency admin only

**Acceptance:**
- Valid rows create IncarceratedPerson records with auto-generated PINs
- Invalid rows returned in error array with row number and reason
- Duplicate external_ids skipped (not errored)
- Audit log records bulk import action

---

### BE-007: Add manual refresh support to active call endpoints
**Priority:** P0
**Depends on:** —
**Spec ref:** Section 8, Voice/Video Monitoring; Journey J59

No new endpoints needed — the existing `GET /api/admin/monitoring/voice/active` and `GET /api/admin/monitoring/video/active` endpoints already support this. This ticket is to verify they work correctly when called on-demand (not just via polling) and return a `timestamp` field for "Last updated" display.

**Acceptance:**
- Response includes `timestamp` or `fetchedAt` field
- Endpoint responds in <500ms under normal load

---

### BE-008: Integration endpoint stubs for case management system
**Priority:** P2
**Depends on:** DATA-001
**Spec ref:** Requirements #8, #9 from original scope

Create stub endpoints for future case management integration:
```
POST /api/admin/integration/sync-residents    → accepts array of resident records from external system
POST /api/admin/integration/sync-housing      → accepts housing assignment updates
```

MVP: stub routes that return 501 Not Implemented with a message. These are placeholders for hackathon demo; real integration requires external system specs.

**Acceptance:**
- Routes registered and return 501
- Response body: `{ message: "Integration endpoint reserved for case management system" }`

---

## FE — Frontend Components & Pages

### FE-001: ResidentProfilePage — PIN management section
**Priority:** P0
**Depends on:** BE-003
**Spec ref:** Section 6, ResidentProfilePage; Wireframe 02-residents

Add PIN management section to ResidentProfilePage:
- Shows "PIN: ••••" (masked) with "Set: [date]"
- [Reset PIN] button opens ResetPinModal
- ResetPinModal: warning text, [Generate New PIN] button
- On success: displays new PIN in highlighted box, one-time view
- Copies PIN to clipboard on click

**Acceptance:**
- PIN section visible on resident profile
- Reset generates new PIN and displays it
- Modal warns about communicating PIN to resident

---

### FE-002: ResidentProfilePage — Deactivate action
**Priority:** P0
**Depends on:** BE-001
**Spec ref:** Section 6, DeactivateResidentModal; Journey J10

Add [Deactivate] button to resident profile header:
- Opens DeactivateResidentModal
- Modal lists consequences (comms access removed, records preserved, reversible)
- Reason textarea (required)
- On confirm: calls BE-001, updates profile status badge, shows toast

**Acceptance:**
- Button only visible for `active` or `transferred` residents
- Modal requires reason before enabling confirm
- Profile updates to show "Deactivated" status badge after action

---

### FE-003: ResidentProfilePage — Release action
**Priority:** P0
**Depends on:** BE-002
**Spec ref:** Section 6, ReleaseResidentModal; Journey J11

Add [Release] button to resident profile header:
- Opens ReleaseResidentModal
- Release date input (default: today)
- Reason textarea (required)
- On confirm: calls BE-002, updates profile

**Acceptance:**
- Button only visible for `active` residents
- Modal requires reason
- Profile shows "Released" status with release date after action

---

### FE-004: ContactListPage — Edit Contact modal
**Priority:** P1
**Depends on:** BE-004, BE-005
**Spec ref:** Section 6, EditContactModal; Journey J14

Add [Edit] action button to approved contacts table:
- Before opening modal, check change eligibility (BE-005)
- If not eligible: show inline error with next eligible date
- If eligible: open EditContactModal with current values
- Fields: phone, email, address, relationship
- On save: calls BE-004, updates table row, shows toast

**Acceptance:**
- [Edit] button visible on approved contacts
- Frequency check prevents editing if within cooldown period
- Saved changes reflect immediately in the table

---

### FE-005: ContactListPage — Change frequency banner
**Priority:** P1
**Depends on:** BE-005
**Spec ref:** Journey J60

Show info banner at top of ContactListPage:
- "Contact list changes allowed every [N] days. Last changed: [date]. Next eligible: [date]."
- If within cooldown: banner is amber, [Edit] and [Remove] buttons disabled
- If eligible: banner is green or hidden

**Acceptance:**
- Banner displays correct dates from BE-005 response
- Buttons disabled during cooldown period with tooltip explanation

---

### FE-006: VoiceMonitoringPage — Manual refresh button
**Priority:** P0
**Depends on:** BE-007
**Spec ref:** Section 6, VoiceMonitoringPage; Journey J59

Add refresh button to Active Calls tab:
- "Active Calls (3) &nbsp; [↻ Refresh] &nbsp; Last updated: 2:45:12 PM"
- Button calls `GET /api/admin/monitoring/voice/active`
- Shows loading spinner on button while fetching
- Updates "Last updated" timestamp on completion
- Disable auto-polling if it exists; manual refresh only

**Acceptance:**
- Button visible in active calls tab header
- Clicking refreshes the call list
- Timestamp updates on each refresh
- No stale data displayed

---

### FE-007: VideoMonitoringPage — Manual refresh button
**Priority:** P0
**Depends on:** BE-007
**Spec ref:** Section 6, VideoMonitoringPage; Journey J59

Same pattern as FE-006 but for video active sessions tab:
- "Active Sessions (2) &nbsp; [↻ Refresh] &nbsp; Last updated: 2:45:12 PM"

**Acceptance:**
- Same criteria as FE-006 but for video sessions

---

### FE-008: BulkImportPage
**Priority:** P2
**Depends on:** BE-006
**Spec ref:** Section 6, BulkImportPage; Journey J58; Wireframe 14-bulk-import

New page at `/admin/bulk-import`:
- Step 1: Upload area with drag-and-drop, [Browse Files], download template link
- Step 2: Preview table showing parsed rows with validation status per row
  - Valid rows: green checkmark
  - Warning rows: amber icon with message
  - Error rows: red X with field-level error message
- Validation summary cards: Valid (green), Warnings (amber), Errors (red)
- [Import N Valid Records] button (N = valid count)
- On import: progress indicator, then success toast with count

**Acceptance:**
- CSV file uploads and parses correctly
- Validation errors display per-row with clear messages
- Only valid rows are imported
- Success shows imported count

---

### FE-009: Add BulkImportPage to sidebar navigation
**Priority:** P2
**Depends on:** FE-008
**Spec ref:** Section 3

Add "📥 Bulk Import" link under Operations section in sidebar, or under Settings. Link to `/admin/bulk-import`. Agency admin only — hidden for facility admins.

**Acceptance:**
- Link visible for agency admins
- Link hidden for facility admins
- Navigates to BulkImportPage

---

## QA — Security, Testing & Quality Assurance

### QA-001: PIN reset — security review
**Priority:** P0
**Depends on:** BE-003, FE-001
**Spec ref:** —

Security review of PIN reset flow:
- Verify new PIN is returned only once and not stored in logs
- Verify old PIN is invalidated immediately
- Verify PIN is not included in API responses other than the reset endpoint
- Verify audit log records WHO reset the PIN but NOT the PIN value
- Test: reset PIN → attempt auth with old PIN → fails
- Test: reset PIN → attempt auth with new PIN → succeeds

**Acceptance:**
- PIN never appears in server logs, audit log details, or GET responses
- Old PIN invalidated before new PIN is returned

---

### QA-002: Deactivation — access removal verification
**Priority:** P0
**Depends on:** BE-001, FE-002
**Spec ref:** Journey J10

Verify deactivated residents cannot:
- Place voice calls (blocked at call initiation)
- Join video calls (blocked at request/join)
- Send messages (blocked at message creation)
- Receive messages (sender notified)
- Log in via tablet app (blocked at auth)

Test that records are preserved:
- Call history still visible to admins
- Message history still visible to admins
- Contact list preserved (in case of reactivation)

**Acceptance:**
- All 5 communication channels blocked for deactivated residents
- All historical data accessible to admins

---

### QA-003: Release — access removal verification
**Priority:** P0
**Depends on:** BE-002, FE-003
**Spec ref:** Journey J11

Same verification as QA-002 but for released residents. Additionally:
- Verify `releasedAt` is recorded
- Verify released residents appear in "Released" filter on ResidentListPage
- Verify released residents do NOT appear in active resident counts on dashboard

**Acceptance:**
- Same access removal as deactivation
- Release date and reason recorded
- Dashboard counts exclude released residents

---

### QA-004: Contact change frequency — enforcement testing
**Priority:** P1
**Depends on:** BE-004, BE-005, FE-004, FE-005
**Spec ref:** Journey J60

Test the contact change frequency enforcement:
- Set frequency to 90 days, make a change, try again immediately → blocked
- Set frequency to 1 day, make a change, advance clock 2 days → allowed
- Set frequency to null (unlimited) → always allowed
- Verify the banner shows correct dates
- Verify [Edit] and [Remove] are disabled during cooldown
- Test with different HousingUnitTypes having different frequencies

**Acceptance:**
- Frequency enforced at API level (not just UI)
- UI correctly reflects eligibility state
- Edge case: resident transferred to unit with different frequency → uses new frequency

---

### QA-005: Bulk import — validation and error handling
**Priority:** P2
**Depends on:** BE-006, FE-008
**Spec ref:** Journey J58

Test bulk import edge cases:
- Upload empty CSV → appropriate error
- Upload CSV with wrong columns → column mapping error
- Upload CSV with >500 rows → max rows error
- Upload CSV with duplicate external_ids (within file) → deduplicated
- Upload CSV with external_ids that already exist in DB → skipped with warning
- Upload CSV with invalid facility_id → per-row error
- Upload CSV with invalid housing_unit_id → per-row error
- Upload CSV with missing required fields → per-row error
- Upload non-CSV file → rejected
- Test concurrent uploads → no race conditions

**Acceptance:**
- Each error case produces a clear, actionable message
- Valid rows import despite invalid rows in same file
- No partial state on upload failure (transaction)

---

### QA-006: Manual refresh — no stale data
**Priority:** P0
**Depends on:** FE-006, FE-007
**Spec ref:** Journey J59

Test manual refresh behavior:
- Start a call on one browser, refresh on admin portal → call appears
- End a call, refresh → call disappears
- Refresh while no calls active → shows empty state
- Rapid clicks on refresh → no duplicate requests or UI glitches
- Verify "Last updated" timestamp updates on each refresh

**Acceptance:**
- Data is fresh after every manual refresh
- No visual artifacts from rapid refreshing
- Timestamp accurately reflects last successful fetch

---

### QA-007: Audit log coverage for new actions
**Priority:** P0
**Depends on:** BE-001, BE-002, BE-003, BE-004, BE-006
**Spec ref:** Section 9, Audit Logging

Verify audit log entries are created for ALL new actions:
- `pin_reset` — records admin, resident, timestamp (NOT the PIN)
- `resident_deactivated` — records admin, resident, reason
- `resident_released` — records admin, resident, reason, release date
- `contact_edited` — records admin, contact, changed fields (old → new)
- `bulk_import` — records admin, filename, imported count, skipped count

**Acceptance:**
- Each action produces exactly one audit log entry
- Entries contain sufficient detail for investigation
- No sensitive data (PINs, passwords) in audit log details

---

### QA-008: Permission checks for new endpoints
**Priority:** P0
**Depends on:** All BE tickets
**Spec ref:** Section 5, RBAC

Verify RBAC enforcement:
- PIN reset: requires `manage_contacts` or facility admin role
- Deactivate/Release: requires facility admin or agency admin
- Edit contact: requires `manage_contacts`
- Bulk import: requires agency admin ONLY
- Manual refresh: requires `monitor_calls`

Test:
- Call each endpoint without auth → 401
- Call each endpoint with wrong role → 403
- Call each endpoint with correct role → 200

**Acceptance:**
- Every new endpoint returns 401/403 for unauthorized access
- No endpoint is accessible without authentication

---

## Dependency Graph

```
DATA-001 ──┬──→ BE-001 ──→ FE-002 ──→ QA-002
           ├──→ BE-002 ──→ FE-003 ──→ QA-003
           └──→ DATA-004

DATA-002 ──→ BE-005 ──┬──→ FE-004 ──→ QA-004
                      └──→ FE-005

DATA-003 ──→ BE-004 ──→ FE-004

(independent)
BE-003 ──→ FE-001 ──→ QA-001
BE-006 ──→ FE-008 ──→ FE-009 ──→ QA-005
BE-007 ──→ FE-006 ──→ QA-006
       ──→ FE-007

All BE ──→ QA-007
All BE ──→ QA-008
```

## Suggested Sprint Breakdown

### Sprint 1 (P0 — Must Ship)
- DATA-001, DATA-004
- BE-001, BE-002, BE-003, BE-007
- FE-001, FE-002, FE-003, FE-006, FE-007
- QA-001, QA-002, QA-003, QA-006, QA-007, QA-008

### Sprint 2 (P1 — Should Ship)
- DATA-002, DATA-003
- BE-004, BE-005
- FE-004, FE-005
- QA-004

### Sprint 3 (P2 — Nice to Have)
- BE-006, BE-008
- FE-008, FE-009
- QA-005
