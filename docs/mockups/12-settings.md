# Wireframe: Settings

**Screens:** `FacilitySettingsPage` · `BlockedNumbersPage` · `PermissionsPage` · `SystemStatusPage`
**Route:** `/settings/*`

---

## 1. Facility Settings

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]             🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Facility Settings — Sing Sing Correctional Facility                     │
│              │                                                                          │
│  📊 Dashboard│ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│  MANAGEMENT  │  General                                                                 │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  Facility Name                                                           │
│  🚪 Visitors │  [Sing Sing Correctional Facility_______________________________]        │
│              │                                                                          │
│  MONITORING  │  Announcement Text                                                       │
│  📞 Voice    │  [This call is from an incarcerated individual at Sing Sing              │
│  📹 Video    │   Correctional Facility. This call may be monitored and recorded._____] │
│  💬 Messages │                                                                          │
│              │  Announcement Audio                                                      │
│  INTELLIGENCE│  [Choose File]   Current: none                                          │
│  🔍 Search   │  Supported formats: MP3, WAV, OGG. Max 10MB.                            │
│              │                                                                          │
│  OPERATIONS  │  Timezone                                                                │
│  🏠 Housing  │  [America/New_York ▼]                                                   │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  Max Visitors Per Resident                                               │
│ >>⚙️ Settings│  [15_____]                                                              │
│    ├ Facility│                                                                          │
│    ├ Blocked │  Message Review                                                          │
│    ├ Perms   │  [x] All messages require admin review before delivery                  │
│    └ Status  │                                                                          │
│              │ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│              │                                    [Cancel]   [Save Changes]             │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Annotations — Facility Settings

- Only agency admins can edit Facility Name. Facility admins see it as read-only text.
- Announcement Text is the spoken preamble played at the start of every call. Supports plain text; the system uses TTS if no audio file is uploaded.
- Announcement Audio, when uploaded, replaces TTS. Deleting the file reverts to TTS.
- Timezone affects all timestamps displayed to facility admins and in reports for this facility.
- Max Visitors Per Resident caps the approved-contact list. Attempting to approve beyond the limit shows an inline error.
- Message Review toggle applies facility-wide. Turning it off means messages are delivered immediately without admin review.
- [Save Changes] is disabled until at least one field is dirty. On success, a toast confirms the save and the audit log records the change.

---

## 2. Blocked Phone Numbers

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]             🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Blocked Phone Numbers                          [+ Block Number]         │
│              │                                                                          │
│  📊 Dashboard│ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│  MANAGEMENT  │  [Scope: All ▼]   [Search phone number___________________________]      │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  ┌──────────────┬──────────┬─────────────┬──────────────┬───────────────┤
│  🚪 Visitors │  │ Phone Number │ Scope    │ Facility    │ Reason       │ Blocked By    │
│              │  ├──────────────┼──────────┼─────────────┼──────────────┼───────────────┤
│  MONITORING  │  │ +1-555-0199  │ Agency   │ —           │ Spam caller  │ admin@nydocs  │
│  📞 Voice    │  ├──────────────┼──────────┼─────────────┼──────────────┼───────────────┤
│  📹 Video    │  │ +1-555-0142  │ Facility │ Sing Sing   │ Harassment   │ admin@singsing│
│  💬 Messages │  ├──────────────┼──────────┼─────────────┼──────────────┼───────────────┤
│              │  │ +1-555-0388  │ Agency   │ —           │ Known threat │ admin@nydocs  │
│  INTELLIGENCE│  ├──────────────┼──────────┼─────────────┼──────────────┼───────────────┤
│  🔍 Search   │  │ +1-555-0271  │ Facility │ Sing Sing   │ Court order  │ admin@singsing│
│              │  ├──────────────┼──────────┼─────────────┼──────────────┼───────────────┤
│  OPERATIONS  │  │ +1-555-0455  │ Facility │ Bedford H.  │ Contraband   │ admin@bedfordh│
│  🏠 Housing  │  └──────────────┴──────────┴─────────────┴──────────────┴───────────────┘
│  📈 Reports  │
│  📋 Audit Log│  *(table continues with Date and Remove columns — see full view below)*
│ >>⚙️ Settings│
│    ├ Facility│
│    ├ Blocked │
│    ├ Perms   │
│    └ Status  │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Blocked Numbers — Full Column View

```
┌──────────────┬──────────┬─────────────┬──────────────┬───────────────────────┬──────────────┬──────────┐
│ Phone Number │ Scope    │ Facility    │ Reason       │ Blocked By            │ Date         │          │
├──────────────┼──────────┼─────────────┼──────────────┼───────────────────────┼──────────────┼──────────┤
│ +1-555-0199  │ Agency   │ —           │ Spam caller  │ admin@nydocs.gov      │ Mar 5, 2026  │ [Remove] │
├──────────────┼──────────┼─────────────┼──────────────┼───────────────────────┼──────────────┼──────────┤
│ +1-555-0142  │ Facility │ Sing Sing   │ Harassment   │ admin@singsingcf.gov  │ Mar 3, 2026  │ [Remove] │
├──────────────┼──────────┼─────────────┼──────────────┼───────────────────────┼──────────────┼──────────┤
│ +1-555-0388  │ Agency   │ —           │ Known threat │ admin@nydocs.gov      │ Feb 28, 2026 │ [Remove] │
├──────────────┼──────────┼─────────────┼──────────────┼───────────────────────┼──────────────┼──────────┤
│ +1-555-0271  │ Facility │ Sing Sing   │ Court order  │ admin@singsingcf.gov  │ Feb 20, 2026 │ [Remove] │
├──────────────┼──────────┼─────────────┼──────────────┼───────────────────────┼──────────────┼──────────┤
│ +1-555-0455  │ Facility │ Bedford H.  │ Contraband   │ admin@bedfordhillscf  │ Feb 14, 2026 │ [Remove] │
└──────────────┴──────────┴─────────────┴──────────────┴───────────────────────┴──────────────┴──────────┘
```

### Add Blocked Number Modal (inline)

```
  ┌──────────────────── Block Phone Number ─────────────────────┐
  │                                                              │
  │  Phone Number                                                │
  │  [+1-___-___-____________________________________]           │
  │                                                              │
  │  Scope                                                       │
  │  (•) Agency-wide  — blocks across all facilities             │
  │  ( ) Facility only — blocks for Sing Sing only               │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │                                                              │
  │                              [Cancel]   [Block Number]       │
  └──────────────────────────────────────────────────────────────┘
```

### Annotations — Blocked Numbers

- Scope filter: "All" shows agency-wide and facility-level blocks. "Agency" shows only agency-wide. "Facility" shows only facility-level blocks for the current facility.
- Facility admins can only create Facility-scoped blocks. The "Agency-wide" radio is disabled for them.
- Agency admins see blocks from all facilities. Facility admins see only their facility's blocks plus agency-wide blocks.
- [Remove] triggers a confirmation toast ("Are you sure?") before deleting. Removal is audit-logged.
- Phone number input auto-formats to E.164 on blur.

---

## 3. Admin Permissions

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: All Facilities ▼]        🔔(1)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Admin Permissions                                                       │
│              │                                                                          │
│  📊 Dashboard│ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│  MANAGEMENT  │  Admin Users                    Permission Matrix                        │
│  👥 Residents│  ┌──────────────────────────┐   ┌──────────────────────────────────────┐│
│  🤝 Contacts │  │ > admin@nydocs.gov        │   │  admin@singsingcf.gov                ││
│  🚪 Visitors │  │   admin@singsingcf.gov    │   │  Role: Facility Admin (Sing Sing)    ││
│              │  │   admin@bedfordhillscf.gov│   │                                      ││
│  MONITORING  │  │                           │   │  [x] Manage Contacts                 ││
│  📞 Voice    │  │                           │   │  [x] Monitor Calls                   ││
│  📹 Video    │  │                           │   │  [x] Review Messages                 ││
│  💬 Messages │  │                           │   │  [x] Manage Visitors                 ││
│              │  │                           │   │  [x] Manage Housing                  ││
│  INTELLIGENCE│  │                           │   │  [ ] Manage Settings                 ││
│  🔍 Search   │  │                           │   │  [x] View Audit Log                  ││
│              │  │                           │   │  [ ] Manage Blocked Numbers          ││
│  OPERATIONS  │  │                           │   │  [x] Run Reports                     ││
│  🏠 Housing  │  │                           │   │  [x] Manage Keyword Alerts           ││
│  📈 Reports  │  │                           │   │  [x] View Flagged Content            ││
│  📋 Audit Log│  │                           │   │                                      ││
│ >>⚙️ Settings│  │                           │   │                    [Save Permissions] ││
│    ├ Facility│  └──────────────────────────┘   └──────────────────────────────────────┘│
│    ├ Blocked │                                                                          │
│    ├ Perms   │                                                                          │
│    └ Status  │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

### Annotations — Permissions

- This screen is only accessible to agency admins. Facility admins do not see it in the sidebar.
- Clicking an admin in the left list loads their current permission flags into the right panel.
- The selected admin is highlighted with `>` in the list.
- Checkboxes map 1:1 to the 11 permission flags stored on the admin user record.
- [Save Permissions] is disabled until at least one checkbox changes. On save, the audit log records which permissions were added or removed and by whom.
- Role label ("Facility Admin", "Agency Admin") is display-only and cannot be changed here.

---

## 4. System Status

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: All Facilities ▼]        🔔(1)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  System Status                                                           │
│              │                                                                          │
│  📊 Dashboard│ ─────────────────────────────────────────────────────────────────────── │
│              │                                                                          │
│  MANAGEMENT  │  Last checked: Mar 7, 2026 at 2:45 PM                    [Refresh]      │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  ┌─ API Gateway ──────────────┐  ┌─ Database ──────────────────────┐   │
│  🚪 Visitors │  │ Status:       ● Online      │  │ Status:       ● Online          │   │
│              │  │ Uptime:       14d 6h 22m    │  │ Connections:  12                │   │
│  MONITORING  │  │ Requests/min: 245           │  │ Pool Size:    20                │   │
│  📞 Voice    │  │ Avg Latency:  18ms          │  │ Avg Query:    4ms               │   │
│  📹 Video    │  └─────────────────────────────┘  └─────────────────────────────────┘   │
│  💬 Messages │                                                                          │
│              │  ┌─ Signaling Server ─────────┐  ┌─ Redis ─────────────────────────┐   │
│  INTELLIGENCE│  │ Status:       ● Online      │  │ Status:       ● Online          │   │
│  🔍 Search   │  │ Active Rooms: 3             │  │ Memory:       24MB / 256MB      │   │
│              │  │ Connected:    47            │  │ Keys:         1,247             │   │
│  OPERATIONS  │  │ Uptime:       14d 6h 22m    │  │ Hit Rate:     98.2%             │   │
│  🏠 Housing  │  └─────────────────────────────┘  └─────────────────────────────────┘   │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│ ─────────────────────────────────────────────────────────────────────── │
│ >>⚙️ Settings│                                                                          │
│    ├ Facility│  All systems operational.                                                │
│    ├ Blocked │                                                                          │
│    ├ Perms   │                                                                          │
│    └ Status  │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

### System Status — Degraded State Example

```
  ┌─ Database ──────────────────────┐
  │ Status:       ⚠ Degraded        │
  │ Connections:  20 / 20  (at max) │
  │ Pool Size:    20                │
  │ Avg Query:    312ms  (elevated) │
  └─────────────────────────────────┘
```

### System Status — Offline State Example

```
  ┌─ Redis ─────────────────────────┐
  │ Status:       ✕ Offline         │
  │ Memory:       —                 │
  │ Keys:         —                 │
  │ Hit Rate:     —                 │
  │ Last seen:    2m 14s ago        │
  └─────────────────────────────────┘
```

### Annotations — System Status

- This screen is only accessible to agency admins.
- Status indicators: `● Online` (green), `⚠ Degraded` (amber), `✕ Offline` (red).
- [Refresh] re-fetches all service health checks. The "Last checked" timestamp updates on each refresh.
- Auto-refresh is not enabled by default to avoid hammering health endpoints. Admins refresh manually.
- If any service is degraded or offline, the page header shows a banner: "One or more services are experiencing issues."
- Metrics shown are point-in-time snapshots from the health check endpoint, not historical graphs.
- "Active Rooms" on the Signaling Server reflects live WebRTC sessions (voice + video combined).
