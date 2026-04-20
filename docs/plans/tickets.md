# Admin Portal — Implementation Tickets

**Date:** 2026-03-07 (updated: added frontend stack, decoupled schema migrations)
**Branch:** `guild-admin-keeks`
**Spec:** `docs/plans/2026-03-07-admin-portal-design.md`

---

## How to Read This Document

Each ticket is a **full-stack feature slice** organized by API endpoint. The person who picks up a ticket owns the entire vertical: backend endpoint, frontend UI, and tests.

- **Priority**: P0 (must ship), P1 (should ship), P2 (nice to have), P3 (deferred — optional scope)
- **Wireframe ref**: ASCII wireframe file in `docs/mockups/`
- **Spec ref**: section of the design spec

**Key change:** Schema migrations have been decoupled from tickets 01, 02, 04, and 05. The core functionality works with existing schema fields. New columns (enrichment data, frequency enforcement) are deferred to TICKET-09 and TICKET-10.

---

## Frontend Stack & Setup

### UI Library: shadcn/ui

All admin portal frontend work uses **[shadcn/ui](https://ui.shadcn.com/)** — a component library built on Radix UI + Tailwind CSS. Components are copied into the project (not installed as a dependency), so they're fully customizable.

shadcn/ui is officially compatible with Vite. The existing codebase already has Tailwind and the `@` path alias configured.

### One-Time Setup (before starting any ticket)

```bash
# 1. Install the Tailwind Vite plugin (if not already present)
npm install tailwindcss @tailwindcss/vite

# 2. Update vite.config.ts to include the Tailwind plugin:
#    import tailwindcss from "@tailwindcss/vite"
#    plugins: [react(), tailwindcss()]

# 3. Initialize shadcn in the web app
cd apps/web
npx shadcn@latest init
#    Style: Default
#    Base color: Slate (matches existing gray-900 sidebar)
#    CSS variables: Yes

# 4. Components will install to: apps/web/src/components/ui/
#    Import pattern: import { Button } from "@/components/ui/button"
```

### Shared Components Used Across Tickets

These should be installed once and reused:

```bash
# Install all components needed across tickets
npx shadcn@latest add button dialog textarea badge input select label \
  popover calendar table tabs card alert progress separator tooltip sonner
```

| Component | From | Used For |
|-----------|------|----------|
| `Button` | shadcn | All action buttons — primary, destructive, outline, ghost variants |
| `Dialog` | shadcn (Radix) | All modals — confirmation dialogs, edit forms, detail panels |
| `Badge` | shadcn | Status indicators — active/released/deactivated, severity levels |
| `Input` | shadcn | Text fields — phone, email, search |
| `Label` | shadcn | Form field labels |
| `Textarea` | shadcn | Multi-line text — reason fields, notes |
| `Select` | shadcn (Radix) | Dropdowns — relationship type, filters |
| `Table` | shadcn | Data tables — resident lists, call history, queues |
| `Tabs` | shadcn (Radix) | Tab navigation — Pending/Approved/Denied, Active/History |
| `Card` | shadcn | Content containers — stat cards, info panels |
| `Popover` + `Calendar` | shadcn (Radix + react-day-picker) | Date pickers — release date, date range filters |
| `Alert` | shadcn | Warning/info banners — PIN reset warning, consequences text |
| `Progress` | shadcn (Radix) | Progress bars — import progress, capacity bars |
| `Separator` | shadcn (Radix) | Visual dividers between sections |
| `Tooltip` | shadcn (Radix) | Hover hints — disabled button explanations |
| `Sonner` | shadcn (sonner) | Toast notifications — success/error feedback after actions |

### Icon Library: Lucide React

shadcn uses **[lucide-react](https://lucide.dev/)** for icons (installed automatically with shadcn init).

```tsx
import { RefreshCw, Shield, AlertTriangle, Copy, Upload, Loader2 } from "lucide-react"
```

### Note on Existing `@openconnect/ui` Package

The shared `packages/ui/` package (Card, Button, Modal, etc.) is used by other guilds. **Do not modify it.** Admin portal screens should use shadcn components instead. If a page currently imports from `@openconnect/ui`, replace those imports with shadcn equivalents when you touch that file.

---

## TICKET-01: Deactivate Resident

**Endpoint:** `POST /api/admin/residents/:id/deactivate`
**Priority:** P0
**Schema changes:** None — uses existing `status` enum (`deactivated` value already exists)
**Wireframe:** `02-residents.md` (Screen D: Deactivate Resident Modal)
**Spec ref:** Section 8 Residents; Journey J10

### What this feature does

Admin clicks [Deactivate] on a resident profile → modal with required reason → resident status set to `deactivated` → all communication access removed → audit logged.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/:id/deactivate
  Body: { reason: string }
  Response: updated IncarceratedPerson
```

Logic:
- Validate resident exists and is not already `deactivated`
- Set `status` → `deactivated`
- Create audit log entry: `resident_status_changed` with `details: { reason, previousStatus }` in the JSON payload — admin ID and reason are captured in the audit log, not in dedicated columns
- Return updated resident

Errors:
- `400` — already deactivated, or empty reason
- `403` — admin lacks permission (requires `facility_admin` or `agency_admin`)
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

**shadcn components:**
- `Button` (variant `"destructive"`) — [Deactivate] action in profile header
- `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogDescription` + `DialogFooter` — the confirmation modal
- `Textarea` — reason input (required)
- `Badge` (variant `"destructive"`) — "Deactivated" status badge on profile
- `Sonner` `toast()` — success/error notification

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
```

Components:
- **[Deactivate] button** — `<Button variant="destructive">Deactivate</Button>` in resident profile header. Only visible when status is `active` or `transferred`.
- **DeactivateResidentModal** — `<Dialog>` containing:
  - `<DialogTitle>`: "Deactivate Resident"
  - `<DialogDescription>`: "Communication access will be removed. Records are preserved. This is reversible."
  - `<Textarea placeholder="Reason for deactivation (required)" />` — reason field, submit disabled until non-empty
  - `<DialogFooter>`: `<Button variant="outline">Cancel</Button>` + `<Button variant="destructive">Confirm Deactivation</Button>`
- On success: update profile `<Badge variant="destructive">Deactivated</Badge>`, call `toast.success("Resident deactivated")`

### Tests / QA

- [ ] Deactivated resident cannot: place voice calls, join video calls, send messages, log in via tablet
- [ ] Historical data (calls, messages, contacts) still visible to admins
- [ ] Audit log entry contains admin ID, resident ID, reason, timestamp (in `details` JSON)
- [ ] PIN value does NOT appear in audit log
- [ ] `401` without auth, `403` with wrong role

---

## TICKET-02: Release Resident

**Endpoint:** `POST /api/admin/residents/:id/release`
**Priority:** P0
**Schema changes:** None — uses existing `status` enum (`released` value exists) and existing `releasedAt` field
**Wireframe:** `02-residents.md` (Screen E: Release Resident Modal)
**Spec ref:** Section 8 Residents; Journey J11

### What this feature does

Admin clicks [Release] on a resident profile → modal with required reason + release date → resident status set to `released` → all communication access removed → audit logged.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

```
POST /api/admin/residents/:id/release
  Body: { reason: string, releaseDate?: string }
  Response: updated IncarceratedPerson
```

Logic:
- Validate resident exists and is not already `released`
- Set `status` → `released`, `releasedAt` → releaseDate or now()
- Create audit log entry: `resident_status_changed` with `details: { reason, releaseDate, previousStatus }` — admin ID and reason captured in audit log JSON, not dedicated columns
- Return updated resident

Errors:
- `400` — already released, or empty reason
- `403` — requires `facility_admin` or `agency_admin`
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

**shadcn components:**
- `Button` (variant `"destructive"`) — [Release] action
- `Dialog` — confirmation modal
- `Textarea` — reason input
- `Popover` + `Calendar` — release date picker (default: today)
- `Badge` — "Released" status badge
- `Sonner` `toast()` — success notification

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CalendarIcon } from "lucide-react"
```

Components:
- **[Release] button** — `<Button variant="destructive">Release</Button>` in profile header. Only visible when status is `active`.
- **ReleaseResidentModal** — `<Dialog>` containing:
  - Release date picker: `<Popover>` → `<Calendar mode="single" selected={date} onSelect={setDate} />` (default: today)
  - `<Textarea placeholder="Reason for release (required)" />`
  - `<DialogFooter>`: Cancel + `<Button variant="destructive">Confirm Release</Button>`
- On success: show `<Badge>Released</Badge>` with release date, `toast.success("Resident released")`

### Tests / QA

- [ ] Released resident blocked from all communication channels (same checks as TICKET-01)
- [ ] `releasedAt` timestamp recorded correctly
- [ ] Released residents appear under "Released" filter on ResidentListPage
- [ ] Released residents excluded from active counts on DashboardPage
- [ ] Audit log entry created with admin, reason, release date (in `details` JSON)
- [ ] `401` without auth, `403` with wrong role

---

## TICKET-03: Assign / Reset PIN

**Endpoint:** `POST /api/admin/residents/:id/reset-pin`
**Priority:** P0
**Schema changes:** None — `IncarceratedPerson.pin` (String) already exists
**Wireframe:** `02-residents.md` (Screen C: Reset PIN Modal)
**Spec ref:** Section 8 Residents; Journey J8

### What this feature does

Admin views a resident's PIN section → clicks [Reset PIN] → modal generates new 4-digit PIN → new PIN displayed once → admin communicates PIN to resident out-of-band.

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
- Create audit log entry: `pin_reset` — **log that a reset happened but NEVER log the PIN value**
- Return `{ newPin }` — this is the only time the plaintext PIN is available

Errors:
- `403` — requires `manage_contacts` or facility admin role
- `404` — resident not found

### Frontend

Location: `guilds/admin/ui/residents/ResidentProfilePage.tsx`

**shadcn components:**
- `Button` — [Reset PIN] trigger
- `Dialog` — two-step modal (warning → result)
- `Alert` + `AlertDescription` — warning banner inside modal
- `Sonner` `toast()` — success notification

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { AlertTriangle, Copy } from "lucide-react"
```

Components:
- **PIN section** on resident profile: shows "PIN: ••••" (masked) with "Set: [date]"
- **[Reset PIN] button** — `<Button variant="outline">Reset PIN</Button>` → opens ResetPinModal
- **ResetPinModal** (step 1 — warning):
  - `<Alert variant="destructive">` with `<AlertTriangle />` icon: "This will generate a new PIN. The old PIN will stop working immediately. You must communicate the new PIN to the resident."
  - `<DialogFooter>`: Cancel + `<Button>Generate New PIN</Button>`
- **ResetPinModal** (step 2 — result):
  - New PIN displayed in a large monospace `<div className="text-4xl font-mono tracking-widest text-center p-6 bg-muted rounded-lg">1234</div>`
  - `<Button variant="outline" onClick={copyToClipboard}><Copy className="mr-2 h-4 w-4" /> Copy to Clipboard</Button>`
  - **One-time view** — closing the dialog discards the PIN. Add note: "This PIN will not be shown again."

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
**Schema changes:** None — uses existing `phone`, `email` on FamilyMember and `relationship` on ApprovedContact
**Wireframe:** `03-contacts.md` (Screen E: Edit Contact Modal)
**Spec ref:** Section 8 Contacts; Journey J14

### What this feature does

Admin clicks [Edit] on an approved contact → modal pre-filled with current info → admin updates phone, email, or relationship → changes saved → audit logged.

### Backend

Route: `guilds/admin/api/contacts.routes.ts`

```
PATCH /api/admin/contacts/:id
  Body: { phone?: string, email?: string, relationship?: string }
  Response: updated FamilyMember + ApprovedContact
```

Logic:
- Validate at least one field is provided
- Update `FamilyMember` fields (phone, email) and/or `ApprovedContact.relationship`
- Create audit log entry: `contact_edited` with `details: { oldValues, newValues }` diff
- Return updated records

Errors:
- `400` — no fields provided
- `403` — requires `manage_contacts` permission
- `404` — contact not found

### Frontend

Location: `guilds/admin/ui/contacts/ContactListPage.tsx`

**shadcn components:**
- `Button` (variant `"outline"`, size `"sm"`) — [Edit] action on each table row
- `Dialog` — edit form modal
- `Input` — phone and email fields
- `Label` — form field labels
- `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` — relationship dropdown
- `Sonner` `toast()` — success notification

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
```

Components:
- **[Edit] button** — `<Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>` on each approved contact row
- **EditContactModal** — `<Dialog>` containing:
  - `<Label>` + `<Input disabled />` — First Name, Last Name (read-only)
  - `<Label>` + `<Input />` — Phone, Email (editable, pre-filled)
  - `<Label>` + `<Select>` — Relationship (dropdown: parent, sibling, spouse, child, friend, attorney, other)
  - `<DialogFooter>`: `<Button variant="outline">Cancel</Button>` + `<Button>Save Changes</Button>` (disabled if no changes)
- On success: update table row data, `toast.success("Contact updated")`

### Tests / QA

- [ ] Edit saves correctly and reflects in table immediately
- [ ] Audit log captures old → new values for each changed field
- [ ] Only `manage_contacts` permission holders see the [Edit] button
- [ ] `401` / `403` responses work correctly
- [ ] Partial updates work (e.g., only changing phone, leaving email unchanged)

---

## TICKET-06: Bulk User Import

**Endpoint:** `POST /api/admin/residents/bulk-import`
**Priority:** P2
**Schema changes:** None — uses existing `IncarceratedPerson` model
**Wireframe:** `14-bulk-import.md` (Screen 1: Upload, Screen 2: Preview & Validation)
**Spec ref:** Section 8 Residents; Journey J58

### What this feature does

Agency admin uploads a CSV file → system parses and validates each row → preview table shows valid/warning/error status per row → admin confirms import → valid rows create resident profiles with auto-generated PINs.

### Backend

Route: `guilds/admin/api/residents.routes.ts`

Additional dependency: `npm install multer @types/multer` for file upload handling.

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

Additional dependency: `npm install react-dropzone` for drag-and-drop file upload (no shadcn equivalent).

**shadcn components:**
- `Card` + `CardHeader` + `CardContent` — upload area container, info card
- `Button` — [Browse Files], [Download Template], [Import N Records], [Cancel]
- `Table` + `TableHeader` + `TableRow` + `TableHead` + `TableBody` + `TableCell` — preview table
- `Badge` — per-row status (✓ Valid / ⚠ Warning / ✕ Error)
- `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` — All / Valid / Warnings / Errors filter
- `Dialog` — import confirmation ("Import N records into [facility]?")
- `Progress` — import progress bar
- `Sonner` `toast()` — success/error notification

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Upload, Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { useDropzone } from "react-dropzone"
```

**Screen 1 — Upload:**
- `<Card>` with info text: "Import resident profiles from a CSV file. Max 500 rows."
- `<Button variant="outline"><Download /> Download CSV Template</Button>`
- Dropzone area (react-dropzone): dashed border container, drag-and-drop + `<Button>Browse Files</Button>`
- Accepted: `.csv` only, max 2 MB

**Screen 2 — Preview & Validation:**
- File info bar: name, row count, size
- 3 stat `<Card>`s: `<Badge variant="default">` ✓ Valid (green), `<Badge variant="secondary">` ⚠ Warnings (amber), `<Badge variant="destructive">` ✕ Errors (red)
- `<Tabs defaultValue="all">` with `<TabsTrigger>`s: All / Valid / Warnings / Errors
- `<Table>`: row #, name, inmate ID, DOB, unit, clearance, status badge
- `<Button variant="outline">Cancel</Button>` + `<Button>Import {n} Valid Records</Button>`
- Confirmation `<Dialog>`: "Import N records into [facility]? This cannot be undone."
- `<Progress value={percent} />` during import, success summary on completion

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
**Schema changes:** None
**Wireframe:** `05-voice-monitoring.md` (Screen 1), `06-video-monitoring.md` (Screen 3)
**Spec ref:** Section 8 Voice/Video Monitoring; Journey J59

### What this feature does

Admin clicks [↻ Refresh Now] on the active calls/sessions tab → table re-fetches from the server → "Last updated" timestamp updates. Provides manual control over data freshness without waiting for auto-polling.

### Backend

No new endpoints — the existing `GET /active` endpoints already return the data. This ticket verifies they:
- Respond in <500ms under normal load
- Include a `timestamp` or `fetchedAt` field in the response (add if missing)
- Work correctly when called on-demand (not just via interval polling)

### Frontend

**shadcn components:**
- `Button` (variant `"outline"`, size `"sm"`) — [↻ Refresh Now] trigger
- `Tooltip` + `TooltipTrigger` + `TooltipContent` — hover hint on refresh button

```tsx
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw, Loader2 } from "lucide-react"
```

**Voice — `guilds/admin/ui/monitoring/voice/VoiceMonitoringPage.tsx`:**
- Tab header layout: `Active Calls (3)` + refresh button + timestamp
  ```tsx
  <div className="flex items-center gap-3">
    <h2>Active Calls ({calls.length})</h2>
    <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
      {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Refresh
    </Button>
    <span className="text-sm text-muted-foreground">Last updated: {lastUpdated}</span>
  </div>
  ```
- On click: call `GET /active`, swap icon to `<Loader2 className="animate-spin" />` while fetching
- Update "Last updated" timestamp from response `fetchedAt`
- Keep existing auto-refresh (5s interval) running alongside manual refresh

**Video — `guilds/admin/ui/monitoring/video/VideoMonitoringPage.tsx`:**
- Same pattern on Active Sessions tab

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
**Schema changes:** None
**Spec ref:** Requirements #8, #9 from original scope (auto-create profiles, housing assignment via integration)

### What this feature does

Placeholder endpoints for future case management system integration. Returns `501 Not Implemented` for now — reserves the route structure for when the external system specs are available.

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

## TICKET-09: Schema — Resident Status Enrichment Fields (Deferred)

**Priority:** P3 (optional scope — deferred)
**Depends on:** TICKET-01 and TICKET-02 shipped first (core flows work without these fields)

### What this adds

Dedicated columns to track *who* deactivated/released a resident and *why*, instead of relying on audit log `details` JSON.

### Schema

Add to `IncarceratedPerson`:
```prisma
deactivatedBy        String?    @map("deactivated_by")
deactivationReason   String?    @map("deactivation_reason")
releaseReason        String?    @map("release_reason")
releasedBy           String?    @map("released_by")
```

Add reverse relations on `AdminUser`:
```prisma
deactivatedResidents IncarceratedPerson[] @relation("DeactivatedByAdmin")
releasedResidents    IncarceratedPerson[] @relation("ReleasedByAdmin")
```

Run: `DATABASE_URL="..." npx prisma@5 migrate dev --name add-resident-status-enrichment`

### Backend changes

Update TICKET-01 deactivate handler:
- Also set `deactivatedBy` → admin ID, `deactivationReason` → reason

Update TICKET-02 release handler:
- Also set `releasedBy` → admin ID, `releaseReason` → reason

### Frontend changes

**shadcn components:** Same as TICKET-01/02 — no new components needed. Just render the enrichment data on the profile:

- Show `<Alert>` with: "Deactivated by [admin name] on [date]: [reason]" on deactivated profiles
- Show `<Alert>` with: "Released by [admin name] on [date]: [reason]" on released profiles
- These details currently require looking up the audit log; with dedicated columns they render directly

### Tests / QA

- [ ] `deactivatedBy` and `deactivationReason` populated on deactivate
- [ ] `releasedBy` and `releaseReason` populated on release
- [ ] Profile renders enrichment data when present
- [ ] Profile still works when fields are null (backwards compatible with residents deactivated/released before this migration)
- [ ] Audit log entries still created (enrichment fields supplement, not replace, audit logging)

---

## TICKET-10: Schema — Contact Change Frequency Enforcement (Deferred)

**Priority:** P3 (optional scope — deferred)
**Depends on:** TICKET-04 shipped first (basic edit works without frequency limits)
**Absorbs:** Former TICKET-05 (Contact Change Frequency Enforcement) in its entirety

### What this adds

A configurable minimum number of days between contact list changes per resident, based on their housing unit type. Adds an `address` field to family members. Adds eligibility checking and enforcement at the API level.

### Schema

Add to `HousingUnitType`:
```prisma
contactChangeFrequencyDays   Int?   @map("contact_change_frequency_days")
```

Add to `IncarceratedPerson`:
```prisma
lastContactChangeAt   DateTime?   @map("last_contact_change_at")
```

Add to `FamilyMember`:
```prisma
address   String?
```

Run: `DATABASE_URL="..." npx prisma@5 migrate dev --name add-contact-change-frequency`

Seed data: `general` → 90 days, `minimum` → 60 days, `restricted` → 120 days, `segregated` → null (admin-only, no limit).

### Backend — new endpoint

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

### Backend — update TICKET-04 edit handler

- Before allowing edit, check eligibility. If not eligible, return `409` with `nextEligibleDate`
- On successful edit, set `lastContactChangeAt` = now() on the resident
- Add `address` to accepted PATCH fields

### Frontend

**shadcn components (in addition to TICKET-04's components):**
- `Alert` + `AlertDescription` — eligibility banner (green when eligible, amber when locked)
- `Tooltip` — disabled button explanation ("Contact changes are locked until [date]")
- `Input` — address field added to EditContactModal

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, Clock } from "lucide-react"
```

Components:
- **Eligibility banner** at top of contact list (below tabs, above table):
  - Eligible: `<Alert><CheckCircle /> Contact list changes are available.</Alert>` (green-tinted)
  - Locked: `<Alert variant="warning"><Clock /> Contact list changes allowed every {N} days. Last changed: {date}. Next eligible: {date}.</Alert>` (amber-tinted)
- When locked: [Edit] and [Remove] buttons wrapped in `<Tooltip>` showing "Contact changes are locked until [date]"
- **Agency admin override**: agency admins bypass the cooldown — buttons stay enabled
- Add `<Label>Address</Label>` + `<Input />` to EditContactModal

### Tests / QA

- [ ] `eligible: true` when frequency is null (unlimited)
- [ ] `eligible: true` when enough days have passed
- [ ] `eligible: false` with correct `nextEligibleDate` when too recent
- [ ] Enforcement at API level — PATCH on contacts returns `409` if ineligible (not just UI disabled)
- [ ] Resident transferred to unit with different frequency → uses new unit's frequency
- [ ] Banner displays correct dates
- [ ] Agency admin can override lockout
- [ ] Address field saves and displays correctly
- [ ] `lastContactChangeAt` updates on edit

---

## Dependency Graph

```
TICKET-01 (Deactivate)     — independent, no schema changes, can start immediately
TICKET-02 (Release)        — independent, no schema changes, can start immediately
TICKET-03 (Reset PIN)      — independent, no schema changes, can start immediately
TICKET-04 (Edit Contact)   — independent, no schema changes, can start immediately
TICKET-06 (Bulk Import)    — independent, no schema changes, can start immediately
TICKET-07 (Manual Refresh) — independent, no schema changes, can start immediately
TICKET-08 (Integration)    — independent, no schema changes, can start immediately

TICKET-09 (Status Enrich.) — depends on TICKET-01 + TICKET-02 being shipped
TICKET-10 (Change Freq.)   — depends on TICKET-04 being shipped
```

All P0-P2 tickets are now independent — no blocking dependencies, no shared migrations. Any ticket can start immediately.

TICKET-09 and TICKET-10 are deferred enrichments that layer on top of the core flows.

---

## Priority Breakdown

### P0 — Must Ship
- TICKET-01: Deactivate Resident
- TICKET-02: Release Resident
- TICKET-03: Assign / Reset PIN
- TICKET-07: Manual Refresh on Active Monitoring

### P1 — Should Ship
- TICKET-04: Edit Contact Info

### P2 — Nice to Have
- TICKET-06: Bulk User Import
- TICKET-08: Case Management Integration Stubs

### P3 — Deferred (Optional Scope)
- TICKET-09: Schema — Resident Status Enrichment Fields
- TICKET-10: Schema — Contact Change Frequency Enforcement

---

## Validation Commands

```bash
# Schema validation (run after any schema change)
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma@5 validate

# Push changes
git push fork guild-admin-keeks
```
