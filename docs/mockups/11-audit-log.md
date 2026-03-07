# Wireframe: Audit Log

**Screen:** `AuditLogPage`
**Route:** `/audit-log`

---

## Full Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: All Facilities ▼]        🔔(1)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Audit Log                                                               │
│              │                                                                          │
│  📊 Dashboard│ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│  MANAGEMENT  │  Filters                                                                 │
│  👥 Residents│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐                 │
│  🤝 Contacts │  │ Date From    │ │ Date To      │ │ Admin User    ▼ │                 │
│  🚪 Visitors │  │ [2026-03-01] │ │ [2026-03-07] │ │ All Admins      │                 │
│              │  └──────────────┘ └──────────────┘ └─────────────────┘                 │
│  MONITORING  │  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐             │
│  📞 Voice    │  │ Action Type   ▼ │ │ Entity Type   ▼ │ │ [Apply Filters] │           │
│  📹 Video    │  │ All Actions     │ │ All Entities    │ └───────────────┘             │
│  💬 Messages │  └─────────────────┘ └─────────────────┘                               │
│              │                                                                          │
│  INTELLIGENCE│ ─────────────────────────────────────────────────────────────────────── │
│  🔍 Search   │                                                                          │
│              │  ┌──────────────────┬──────────────────────┬──────────────────┬─────────┤
│  OPERATIONS  │  │ Date / Time      │ Admin                │ Action           │ Entity  │
│  🏠 Housing  │  │                  │                      │                  │ Type    │
│  📈 Reports  │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│ >>📋 Audit   │  │ 2026-03-07 14:32 │ admin@singsingcf.gov │ Contact Approved │ Contact │
│  ⚙️ Settings │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 14:28 │ admin@singsingcf.gov │ Call Terminated  │ Voice   │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 14:15 │ admin@nydocs.gov     │ Keyword Alert    │ Keyword │
│              │  │                  │                      │ Created          │ Alert   │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 13:55 │ admin@singsingcf.gov │ Message Blocked  │ Message │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 13:40 │ admin@bedfordhills.. │ Resident         │ Resident│
│              │  │                  │                      │ Transferred      │         │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 13:22 │ admin@nydocs.gov     │ Admin Permission │ Admin   │
│              │  │                  │                      │ Updated          │ User    │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 12:58 │ admin@singsingcf.gov │ Visitor Denied   │ Visitor │
│              │  ├──────────────────┼──────────────────────┼──────────────────┼─────────┤
│              │  │ 2026-03-07 12:44 │ admin@bedfordhills.. │ Video Request    │ Video   │
│              │  │                  │                      │ Approved         │ Request │
│              │  └──────────────────┴──────────────────────┴──────────────────┴─────────┘
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

*(Table continues — columns Entity ID and Details are scrolled off to the right)*

---

## Table — Full Column View (horizontal scroll)

```
┌──────────────────┬──────────────────────┬──────────────────┬──────────┬─────────┬──────────────────────────────────────┐
│ Date / Time      │ Admin                │ Action           │ Entity   │ Entity  │ Details                              │
│                  │                      │                  │ Type     │ ID      │                                      │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 14:32 │ admin@singsingcf.gov │ Contact Approved │ Contact  │ #c-4521 │ Approved Alice Johnson for John Doe  │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 14:28 │ admin@singsingcf.gov │ Call Terminated  │ Voice    │ #vc-892 │ Terminated: suspicious activity      │
│                  │                      │                  │ Call     │         │                                      │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 14:15 │ admin@nydocs.gov     │ Keyword Alert    │ Keyword  │ #ka-103 │ Added 'fentanyl' (blacklist/drug)    │
│                  │                      │ Created          │ Alert    │         │                                      │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 13:55 │ admin@singsingcf.gov │ Message Blocked  │ Message  │ #m-7764 │ Keyword match: 'shank'               │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 13:40 │ admin@bedfordhills.. │ Resident         │ Resident │ #r-2231 │ Block A → Block C                    │
│                  │                      │ Transferred      │          │         │                                      │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 13:22 │ admin@nydocs.gov     │ Admin Permission │ Admin    │ #a-007  │ Removed 'Manage Settings' from       │
│                  │                      │ Updated          │ User     │         │ admin@singsingcf.gov                 │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 12:58 │ admin@singsingcf.gov │ Visitor Denied   │ Visitor  │ #v-3310 │ Denied: prior incident on record     │
├──────────────────┼──────────────────────┼──────────────────┼──────────┼─────────┼──────────────────────────────────────┤
│ 2026-03-07 12:44 │ admin@bedfordhills.. │ Video Request    │ Video    │ #vr-551 │ Approved for Emily Miller            │
│                  │                      │ Approved         │ Request  │         │                                      │
└──────────────────┴──────────────────────┴──────────────────┴──────────┴─────────┴──────────────────────────────────────┘

  Showing 1–50 of 2,847 entries          [< Prev]  1  2  3  ...  57  [Next >]
```

---

## Row Expanded — Detail Panel

*(Clicking any row expands an inline detail panel below it)*

```
┌──────────────────┬──────────────────────┬──────────────────┬──────────┬─────────┬──────────────────────────────────────┐
│ 2026-03-07 14:32 │ admin@singsingcf.gov │ Contact Approved │ Contact  │ #c-4521 │ Approved Alice Johnson for John Doe  │
├──────────────────┴──────────────────────┴──────────────────┴──────────┴─────────┴──────────────────────────────────────┤
│  ┌─ Detail ──────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Action:     contact_approved                                                                                       │ │
│  │ Admin:      admin@singsingcf.gov  (Sing Sing Facility Admin)                                                       │ │
│  │ IP Address: 10.0.1.45                                                                                              │ │
│  │ Changes:                                                                                                           │ │
│  │   status:     "pending"  →  "approved"                                                                             │ │
│  │   reviewedAt: null       →  "2026-03-07T14:32:00Z"                                                                 │ │
│  │   approvedBy: null       →  "admin-user-id-123"                                                                    │ │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
├──────────────────┬──────────────────────┬──────────────────┬──────────┬─────────┬──────────────────────────────────────┤
│ 2026-03-07 14:28 │ admin@singsingcf.gov │ Call Terminated  │ Voice    │ #vc-892 │ Terminated: suspicious activity      │
└──────────────────┴──────────────────────┴──────────────────┴──────────┴─────────┴──────────────────────────────────────┘
```

---

## Annotations

**Filter Bar**
- All five filters are independent. Applying any combination narrows the result set.
- "Admin User" dropdown lists all admins visible to the current user (agency admins see all; facility admins see only their facility's admins).
- "Action Type" options: Contact Approved, Contact Denied, Call Terminated, Message Blocked, Keyword Alert Created, Resident Transferred, Visitor Denied, Video Request Approved, Admin Permission Updated, Blocked Number Added, Blocked Number Removed.
- "Entity Type" options: Contact, Voice Call, Video Call, Message, Keyword Alert, Resident, Visitor, Video Request, Admin User, Blocked Number.
- [Apply Filters] triggers a fresh fetch. Filters persist in URL query params so the view is shareable/bookmarkable.

**Table**
- Rows are sorted newest-first by default. Clicking a column header sorts by that column.
- "Admin" column truncates long email addresses with ellipsis; full address shown on hover.
- "Details" column shows a short human-readable summary. Full diff is in the expanded panel.
- Rows are clickable anywhere to toggle the detail panel open/closed.

**Detail Panel**
- Shows the raw before/after diff for every field that changed, formatted as `field: "old" → "new"`.
- `null` values display literally as `null` to make it clear the field was previously unset.
- IP Address is captured server-side from the request context, not user-supplied.
- The panel is read-only. No actions can be taken from the audit log.

**Pagination**
- Page size is fixed at 50 rows.
- Total count ("2,847") reflects the filtered result set, not the full table.
- Navigating pages preserves all active filters.
