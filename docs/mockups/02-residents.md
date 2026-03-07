# Wireframe: Residents

**Screens:** `ResidentListPage` + `ResidentProfilePage`
**Routes:** `/residents` and `/residents/:id`

---

## Screen A: Resident List

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Residents                                                               │
│              │                                                                          │
│  📊 Dashboard│  [Search: ________________________________] [Search]                    │
│              │                                                                          │
│  MANAGEMENT  │  [Facility ▼]  [Unit ▼]  [Status ▼]  [Risk Level ▼]   [Clear Filters]  │
│ >>👥 Residents  │                                                                          │
│  🤝 Contacts │  ┌──────────────────┬────────┬────────────┬──────┬──────────┬──────────┐ │
│  🚪 Visitors │  │ Name          ↕  │ ID#  ↕ │ Facility ↕ │ Unit │ Status ↕ │ Risk   ↕ │ │
│              │  ├──────────────────┼────────┼────────────┼──────┼──────────┼──────────┤ │
│  MONITORING  │  │ Doe, John        │ #4821  │ Sing Sing  │ B-12 │ Active   │ Medium   │ │
│  📞 Voice    │  │ Smith, Michael   │ #3307  │ Sing Sing  │ A-04 │ Active   │ Low      │ │
│  📹 Video    │  │ Williams, Carlos │ #5519  │ Sing Sing  │ C-07 │ Active   │ High     │ │
│  💬 Messages │  │ Johnson, Robert  │ #2244  │ Sing Sing  │ B-03 │ Inactive │ Low      │ │
│              │  │ Davis, Marcus    │ #6631  │ Sing Sing  │ D-11 │ Active   │ Medium   │ │
│  INTELLIGENCE│  │ Brown, Anthony   │ #1198  │ Sing Sing  │ A-09 │ Active   │ High     │ │
│  🔍 Search   │  │ Garcia, Luis     │ #7742  │ Sing Sing  │ C-02 │ Active   │ Low      │ │
│              │  │ Martinez, Jose   │ #8853  │ Sing Sing  │ B-06 │ Inactive │ Medium   │ │
│  OPERATIONS  │  └──────────────────┴────────┴────────────┴──────┴──────────┴──────────┘ │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  Showing 1-8 of 247 residents                                           │
│  📋 Audit Log│                                                                          │
│  ⚙️ Settings │  [< Prev]  Page [1] of 31  [Next >]          [25 per page ▼]            │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

### Annotations: Resident List

**Search Bar**
- Full-text search across name, ID number, and housing unit.
- Results filter in real time (debounced, 300ms).

**Filter Row**
- Facility dropdown is pre-set to the admin's assigned facility; multi-facility admins see all.
- Status options: Active, Inactive, Released, Transferred.
- Risk Level options: Low, Medium, High.
- "Clear Filters" resets all dropdowns and the search field.

**Table**
- Column headers with ↕ are sortable; clicking toggles asc/desc.
- Clicking any row navigates to that resident's profile page.
- Status and Risk Level render as colored badges in the final UI.

**Pagination**
- Page number input is editable; pressing Enter jumps to that page.
- Per-page selector: 10, 25, 50.

---

## Screen B: Resident Profile

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Residents > John Doe                                                    │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │  [Photo]   John Doe                  {Active}  {Risk: Medium}    │   │
│  MANAGEMENT  │  │  [ img ]   ID: #4821                                             │   │
│ >>👥 Residents  │  │  [     ]   Facility: Sing Sing  |  Unit: B-12                   │   │
│  🤝 Contacts │  │            Admitted: 03/14/2021    |  Release Est.: 06/30/2027   │   │
│  🚪 Visitors │  └──────────────────────────────────────────────────────────────────┘   │
│              │                                                                          │
│  MONITORING  │  [ Activity ] [ Contacts ] [ Housing ] [ Notes ]                        │
│  📞 Voice    │  ─────────────────────────────────────────────────────────────────────  │
│  📹 Video    │                                                                          │
│  💬 Messages │  ── Activity Tab (default) ──────────────────────────────────────────── │
│              │                                                                          │
│  INTELLIGENCE│  Filter: [All ▼]  [Date Range: ____________ to ____________]  [Apply]   │
│  🔍 Search   │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────┐   │
│  OPERATIONS  │  │  Mar 06, 2026                                                    │   │
│  🏠 Housing  │  │  ├─ 2:15 PM  📞 Voice call  with Sarah Doe (wife)  14 min       │   │
│  📈 Reports  │  │  │           Status: Completed  [View Recording]                 │   │
│  📋 Audit Log│  │  │                                                               │   │
│  ⚙️ Settings │  │  ├─ 10:30 AM  💬 Message sent  to Sarah Doe (wife)              │   │
│              │  │  │           "Hey, can you bring the kids on Saturday?"          │   │
│              │  │  │           Status: Delivered  [View Thread]                    │   │
│              │  │                                                                   │   │
│              │  │  Mar 05, 2026                                                    │   │
│              │  │  ├─ 4:00 PM  📞 Voice call  with James Doe (brother)  8 min     │   │
│              │  │  │           Status: Terminated early  [View Details]            │   │
│              │  │  │                                                               │   │
│              │  │  ├─ 11:00 AM  🏠 Housing move  B-08 → B-12                      │   │
│              │  │  │           Reason: Routine reassignment  [View Record]         │   │
│              │  │  │                                                               │   │
│              │  │  ├─ 9:45 AM  💬 Message received  from Sarah Doe (wife)         │   │
│              │  │             "We'll be there Saturday at 2pm"                    │   │
│              │  │             Status: Read  [View Thread]                          │   │
│              │  └──────────────────────────────────────────────────────────────────┘   │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

### Resident Profile: Contacts Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Residents > John Doe                                                    │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │  [Photo]   John Doe                  {Active}  {Risk: Medium}    │   │
│  MANAGEMENT  │  │  [ img ]   ID: #4821  |  Sing Sing  |  Unit: B-12               │   │
│ >>👥 Residents  │  └──────────────────────────────────────────────────────────────────┘   │
│  🤝 Contacts │                                                                          │
│  🚪 Visitors │  [ Activity ] [*Contacts*] [ Housing ] [ Notes ]                        │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MONITORING  │                                                                          │
│  📞 Voice    │  Approved Contacts                                                       │
│  📹 Video    │  ┌──────────────────┬──────────────┬────────────┬──────────────────────┐ │
│  💬 Messages │  │ Name             │ Relationship │ Attorney   │ Actions              │ │
│              │  ├──────────────────┼──────────────┼────────────┼──────────────────────┤ │
│  INTELLIGENCE│  │ Sarah Doe        │ Wife         │ No         │ [View] [Remove]      │ │
│  🔍 Search   │  │ James Doe        │ Brother      │ No         │ [View] [Remove]      │ │
│              │  │ Linda Doe        │ Mother       │ No         │ [View] [Remove]      │ │
│  OPERATIONS  │  │ Mark Reyes, Esq. │ Attorney     │ Yes [atty] │ [View] [Remove]      │ │
│  🏠 Housing  │  └──────────────────┴──────────────┴────────────┴──────────────────────┘ │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  Approved Visitors                                                       │
│  ⚙️ Settings │  ┌──────────────────┬──────────────┬────────────┬──────────────────────┐ │
│              │  │ Name             │ Relationship │ Last Visit │ Actions              │ │
│              │  ├──────────────────┼──────────────┼────────────┼──────────────────────┤ │
│              │  │ Sarah Doe        │ Wife         │ Feb 28     │ [View] [Suspend]     │ │
│              │  │ Linda Doe        │ Mother       │ Jan 15     │ [View] [Suspend]     │ │
│              │  └──────────────────┴──────────────┴────────────┴──────────────────────┘ │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

### Resident Profile: Housing Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Residents > John Doe                                                    │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │  [Photo]   John Doe                  {Active}  {Risk: Medium}    │   │
│  MANAGEMENT  │  │  [ img ]   ID: #4821  |  Sing Sing  |  Unit: B-12               │   │
│ >>👥 Residents  │  └──────────────────────────────────────────────────────────────────┘   │
│  🤝 Contacts │                                                                          │
│  🚪 Visitors │  [ Activity ] [ Contacts ] [*Housing*] [ Notes ]                        │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MONITORING  │                                                                          │
│  📞 Voice    │  Current Assignment                                                      │
│  📹 Video    │  ┌──────────────────────────────────────────────────────────────────┐   │
│  💬 Messages │  │  Facility:  Sing Sing Correctional Facility                      │   │
│              │  │  Block:     B                                                    │   │
│  INTELLIGENCE│  │  Cell:      B-12                                                 │   │
│  🔍 Search   │  │  Assigned:  Mar 05, 2026                                         │   │
│              │  │  Cellmate:  Marcus Davis (#6631)  [View Profile]                 │   │
│  OPERATIONS  │  └──────────────────────────────────────────────────────────────────┘   │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  Move History                                                            │
│  📋 Audit Log│  ┌────────────┬──────────┬──────────┬──────────────────────────────────┐ │
│  ⚙️ Settings │  │ Date       │ From     │ To       │ Reason                           │ │
│              │  ├────────────┼──────────┼──────────┼──────────────────────────────────┤ │
│              │  │ Mar 5 2026 │ B-08     │ B-12     │ Routine reassignment             │ │
│              │  │ Nov 2 2025 │ A-03     │ B-08     │ Disciplinary transfer            │ │
│              │  │ Jun 1 2024 │ Intake   │ A-03     │ Initial assignment               │ │
│              │  └────────────┴──────────┴──────────┴──────────────────────────────────┘ │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

### Annotations: Resident Profile

**Header**
- Status badge colors: Active = green, Inactive = gray, Released = blue, Transferred = orange.
- Risk badge colors: Low = green, Medium = yellow, High = red.
- Photo placeholder shows initials if no photo is on file.

**Tab Bar**
- Active tab is underlined and bold in the final UI.
- Tab state persists in the URL query string (e.g., `?tab=contacts`) so links are shareable.

**Activity Tab**
- Timeline is grouped by date, newest first.
- Each entry shows the event type icon, timestamp, counterparty name, and a quick-action link.
- "Terminated early" calls are highlighted in amber.
- Filter dropdown: All, Calls, Messages, Housing, Notes.

**Contacts Tab**
- Attorney contacts are flagged with an `[atty]` badge; their communications are exempt from monitoring.
- [Remove] triggers a confirmation modal before removing the contact.

**Housing Tab**
- Cellmate name links to that resident's profile.
- Move history is read-only; housing changes are made from the Housing screen.
