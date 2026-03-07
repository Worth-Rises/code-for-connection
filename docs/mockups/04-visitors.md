# Wireframe: Visitors

**Screens:** `VisitorListPage` + `VisitorProfilePage`
**Routes:** `/visitors` and `/visitors/:id`

---

## Screen A: Visitor List — Applications Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Visitors                                                                │
│              │                                                                          │
│  📊 Dashboard│  [*Applications {4}*]  [ Approved ]  [ Suspended ]                      │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [Search: ________________________________]  [Type ▼]  [Sort by ▼]      │
│  🤝 Contacts │                                                                          │
│ >>🚪 Visitors │  ┌──────────────────┬──────────┬──────────────────┬────────────┬───────┐ │
│              │  │ Visitor Name     │ Type     │ Resident         │ Submitted  │ BG    │ │
│  MONITORING  │  ├──────────────────┼──────────┼──────────────────┼────────────┼───────┤ │
│  📞 Voice    │  │ Sarah Doe        │ Family   │ Doe, John #4821  │ Mar 5 2026 │ Clear │ │
│  📹 Video    │  │ Kevin Williams   │ Family   │ Williams, C.#5519│ Mar 4 2026 │Pending│ │
│  💬 Messages │  │ Angela Johnson   │ Family   │ Johnson, R.#2244 │ Mar 3 2026 │ Clear │ │
│              │  │ Mark Reyes, Esq. │ Attorney │ Doe, John #4821  │ Mar 1 2026 │ Clear │ │
│  INTELLIGENCE│  └──────────────────┴──────────┴──────────────────┴────────────┴───────┘ │
│  🔍 Search   │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────┐   │
│  OPERATIONS  │  │  Actions column (per row):                                       │   │
│  🏠 Housing  │  │  Sarah Doe:        [Approve]  [Deny]                             │   │
│  📈 Reports  │  │  Kevin Williams:   [Approve]  [Deny]  (BG check pending)         │   │
│  📋 Audit Log│  │  Angela Johnson:   [Approve]  [Deny]                             │   │
│  ⚙️ Settings │  │  Mark Reyes, Esq.: [Approve]  [Deny]                             │   │
│              │  └──────────────────────────────────────────────────────────────────┘   │
│              │                                                                          │
│              │  ── Document Preview ───────────────────────────────────────────────── │
│              │  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │                                                                  │   │
│              │  │   Select a visitor application above to preview submitted        │   │
│              │  │   documents (ID scan, background check report, application       │   │
│              │  │   form) here.                                                    │   │
│              │  │                                                                  │   │
│              │  │   [ No document selected ]                                       │   │
│              │  │                                                                  │   │
│              │  └──────────────────────────────────────────────────────────────────┘   │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen B: Visitor List — Applications Tab + Document Preview Active

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Visitors                                                                │
│              │                                                                          │
│  📊 Dashboard│  [*Applications {4}*]  [ Approved ]  [ Suspended ]                      │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐ │
│  🤝 Contacts │  │ Name         │ Type   │ BG Check │  │  Document Preview            │ │
│ >>🚪 Visitors │  ├──────────────┼────────┼──────────┤  ├──────────────────────────────┤ │
│              │  │ Sarah Doe    │ Family │ Clear    │  │  Sarah Doe — Application     │ │
│  MONITORING  │  │*Kevin Willi.*│*Family*│*Pending *│  │                              │ │
│  📞 Voice    │  │ Angela John. │ Family │ Clear    │  │  [ID Scan] [BG Report] [Form]│ │
│  📹 Video    │  │ Mark Reyes   │ Atty   │ Clear    │  │                              │ │
│  💬 Messages │  └──────────────────────────────────┘  │  ┌────────────────────────┐ │ │
│              │                                         │  │                        │ │ │
│  INTELLIGENCE│  Actions for Kevin Williams:            │  │   [ ID SCAN IMAGE ]    │ │ │
│  🔍 Search   │  [Approve]  [Deny]                      │  │   Kevin Williams       │ │ │
│              │  Note: BG check still pending.          │  │   DOB: Sep 14, 1990    │ │ │
│  OPERATIONS  │  Approving before BG check              │  │   DL: NY-4821-X        │ │ │
│  🏠 Housing  │  completes requires confirmation.       │  │                        │ │ │
│  📈 Reports  │                                         │  └────────────────────────┘ │ │
│  📋 Audit Log│                                         │                              │ │
│  ⚙️ Settings │                                         │  Background Check: PENDING   │ │
│              │                                         │  Submitted: Mar 4, 2026      │ │
│              │                                         │  Provider: SafeCheck Inc.    │ │
│              │                                         │  Est. completion: Mar 8      │ │
│              │                                         │                              │ │
│              │                                         │  [Download Full Report]      │ │
│              │                                         └──────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen C: Visitor List — Approved Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Visitors                                                                │
│              │                                                                          │
│  📊 Dashboard│  [ Applications {4} ]  [*Approved*]  [ Suspended ]                      │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [Search: ________________________________]  [Type ▼]  [Sort by ▼]      │
│  🤝 Contacts │                                                                          │
│ >>🚪 Visitors │  ┌──────────────────┬──────────┬──────────────────┬────────────┬───────┐ │
│              │  │ Visitor Name     │ Type     │ Resident(s)      │ Approved   │ Action│ │
│  MONITORING  │  ├──────────────────┼──────────┼──────────────────┼────────────┼───────┤ │
│  📞 Voice    │  │ Sarah Doe        │ Family   │ Doe, John #4821  │ Jan 2024   │[Susp.]│ │
│  📹 Video    │  │ Linda Doe        │ Family   │ Doe, John #4821  │ Jan 2024   │[Susp.]│ │
│  💬 Messages │  │ Patricia Smith   │ Family   │ Smith, M. #3307  │ Feb 2025   │[Susp.]│ │
│              │  │ Mark Reyes, Esq. │ Attorney │ Doe, John #4821  │ Mar 2026   │[Susp.]│ │
│  INTELLIGENCE│  │ Angela Johnson   │ Family   │ Johnson, R.#2244 │ Nov 2023   │[Susp.]│ │
│  🔍 Search   │  └──────────────────┴──────────┴──────────────────┴────────────┴───────┘ │
│              │                                                                          │
│  OPERATIONS  │  Showing 1-5 of 62 approved visitors                                    │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  [< Prev]  Page [1] of 13  [Next >]          [10 per page ▼]            │
│  📋 Audit Log│                                                                          │
│  ⚙️ Settings │  Click any row to view the Visitor Profile.                             │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen D: Visitor Profile — Linked Residents Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Visitors > Sarah Doe                                                    │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │  [Photo]   Sarah Doe                 {Family}  {BG: Clear}       │   │
│  MANAGEMENT  │  │  [ img ]   DOB: Apr 03, 1985                                     │   │
│  👥 Residents│  │  [     ]   Phone: (718) 555-0198                                 │   │
│  🤝 Contacts │  │            Address: 44 Oak Street, Bronx, NY 10451               │   │
│ >>🚪 Visitors │  │            Approved: Jan 10, 2024   |   Status: {Approved}       │   │
│              │  └──────────────────────────────────────────────────────────────────┘   │
│  MONITORING  │                                                                          │
│  📞 Voice    │  [*Linked Residents*]  [ Visit History ]                                 │
│  📹 Video    │  ─────────────────────────────────────────────────────────────────────  │
│  💬 Messages │                                                                          │
│              │  ┌──────────────────┬──────────────┬──────────┬────────────────────────┐ │
│  INTELLIGENCE│  │ Resident         │ Relationship │ Status   │ Visit Restrictions     │ │
│  🔍 Search   │  ├──────────────────┼──────────────┼──────────┼────────────────────────┤ │
│              │  │ Doe, John #4821  │ Wife         │ Approved │ None                   │ │
│  OPERATIONS  │  └──────────────────┴──────────────┴──────────┴────────────────────────┘ │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  [+ Link to Another Resident]                                           │
│  📋 Audit Log│                                                                          │
│  ⚙️ Settings │  ── Actions ────────────────────────────────────────────────────────── │
│              │  [Suspend Visitor]   [Edit Profile]   [View Application Documents]      │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen E: Visitor Profile — Visit History Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Visitors > Sarah Doe                                                    │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │  [Photo]   Sarah Doe                 {Family}  {BG: Clear}       │   │
│  MANAGEMENT  │  │  [ img ]   DOB: Apr 03, 1985  |  Status: {Approved}              │   │
│  👥 Residents│  └──────────────────────────────────────────────────────────────────┘   │
│  🤝 Contacts │                                                                          │
│ >>🚪 Visitors │  [ Linked Residents ]  [*Visit History*]                                 │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MONITORING  │                                                                          │
│  📞 Voice    │  [Date Range: ____________ to ____________]  [Apply]  [Export CSV]       │
│  📹 Video    │                                                                          │
│  💬 Messages │  ┌────────────┬──────────────────┬──────────┬──────────┬───────────────┐ │
│              │  │ Date       │ Resident         │ Duration │ Location │ Notes         │ │
│  INTELLIGENCE│  ├────────────┼──────────────────┼──────────┼──────────┼───────────────┤ │
│  🔍 Search   │  │ Feb 28 '26 │ Doe, John #4821  │ 45 min   │ Room 3   │               │ │
│              │  │ Feb 14 '26 │ Doe, John #4821  │ 60 min   │ Room 1   │ Valentine's   │ │
│  OPERATIONS  │  │ Jan 31 '26 │ Doe, John #4821  │ 30 min   │ Room 3   │               │ │
│  🏠 Housing  │  │ Jan 15 '26 │ Doe, John #4821  │ 45 min   │ Room 2   │               │ │
│  📈 Reports  │  │ Dec 24 '25 │ Doe, John #4821  │ 60 min   │ Room 1   │ Holiday visit │ │
│  📋 Audit Log│  └────────────┴──────────────────┴──────────┴──────────┴───────────────┘ │
│  ⚙️ Settings │                                                                          │
│              │  Showing 1-5 of 18 visits                                               │
│              │                                                                          │
│              │  [< Prev]  Page [1] of 4  [Next >]          [10 per page ▼]             │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**Tab Bar (List)**
- Badge count on "Applications" reflects unreviewed applications only.
- "Suspended" tab shows visitors whose access has been revoked but not permanently removed.

**Applications Tab**
- Background Check column values: Clear (green), Pending (amber), Failed (red).
- Clicking a row populates the Document Preview area below the table.
- [Approve] when BG check is still Pending triggers a warning modal: "Background check is not yet complete. Approve anyway?"
- [Deny] triggers a confirmation modal with an optional reason field.

**Document Preview Area**
- Shows the selected applicant's submitted ID scan, background check report, and application form.
- Tabs within the preview switch between document types.
- "Download Full Report" exports the background check PDF.

**Approved Tab**
- [Susp.] = Suspend button. Triggers a modal: "Suspend Sarah Doe? She will lose all visit access until reinstated."
- Clicking a row navigates to the Visitor Profile page.

**Visitor Profile Header**
- Type badge: Family, Attorney, Clergy, Other.
- BG badge: Clear (green), Pending (amber), Failed (red), Expired (gray).
- Status badge: Approved (green), Suspended (red), Pending (amber).

**Linked Residents Tab**
- A visitor can be linked to multiple residents (e.g., a mother visiting two incarcerated children).
- Visit Restrictions field shows any facility-imposed constraints (e.g., "No contact visits").
- [+ Link to Another Resident] opens a search modal to find and link a resident.

**Visit History Tab**
- Date range filter defaults to the last 90 days.
- [Export CSV] downloads the filtered visit log.
- Notes column is editable inline by admins for adding context to specific visits.
