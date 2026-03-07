# Wireframe: Contacts

**Screens:** `ContactListPage` + `ContactDetailPanel`
**Routes:** `/contacts`

---

## Screen A: Contact List — Pending Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Contacts                                                                │
│              │                                                                          │
│  📊 Dashboard│  [*Pending {7}*]  [ Approved ]  [ Denied / Removed ]                   │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────────────────────────────────────────────┐   │
│ >>🤝 Contacts │  │  ℹ  Contact list changes allowed every 90 days.                        │   │
│  🚪 Visitors │  │     Last changed: Jan 15, 2026.  Next eligible: Apr 15, 2026.        │   │
│              │  │     [Edit] and [Remove] are disabled until Apr 15, 2026.             │   │
│  MONITORING  │  └──────────────────────────────────────────────────────────────────┘   │
│  📞 Voice    │                                                                          │
│  📹 Video    │  [Search: ________________________________]  [Facility ▼]  [Sort by ▼]  │
│  💬 Messages │                                                                          │
│              │  ┌──────────────────┬──────────────────┬──────────────┬────────────────┐ │
│  INTELLIGENCE│  │ Contact Name     │ Resident         │ Relationship │ Requested      │ │
│  🔍 Search   │  ├──────────────────┼──────────────────┼──────────────┼────────────────┤ │
│              │  │ Sarah Doe        │ Doe, John #4821  │ Wife         │ Mar 05, 2026   │ │
│  OPERATIONS  │  │ Patricia Smith   │ Smith, M. #3307  │ Mother       │ Mar 04, 2026   │ │
│  🏠 Housing  │  │ Kevin Williams   │ Williams, C.#5519│ Brother      │ Mar 04, 2026   │ │
│  📈 Reports  │  │ Angela Johnson   │ Johnson, R.#2244 │ Sister       │ Mar 03, 2026   │ │
│  📋 Audit Log│  │ Tanya Davis      │ Davis, M. #6631  │ Girlfriend   │ Mar 02, 2026   │ │
│  ⚙️ Settings │  │ Robert Brown     │ Brown, A. #1198  │ Father       │ Mar 01, 2026   │ │
│              │  │ Carmen Garcia    │ Garcia, L. #7742 │ Wife         │ Feb 28, 2026   │ │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen B: Contact List — Pending Tab + Detail Panel Open

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Contacts                                                                │
│              │                                                                          │
│  📊 Dashboard│  [*Pending {7}*]  [ Approved ]  [ Denied / Removed ]                   │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌────────────────────────────────┐  ┌──────────────────────────────┐   │
│ >>🤝 Contacts │  │ Contact Name    │ Resident      │  │  Contact Detail          [X] │   │
│  🚪 Visitors │  ├─────────────────┼───────────────┤  ├──────────────────────────────┤   │
│              │  │ Sarah Doe       │ Doe, J. #4821 │  │  Resident                    │   │
│  MONITORING  │  │*Patricia Smith *│*Smith,M.#3307*│  │  ┌────────────────────────┐  │   │
│  📞 Voice    │  │ Kevin Williams  │ Williams #5519│  │  │ Michael Smith  #3307   │  │   │
│  📹 Video    │  │ Angela Johnson  │ Johnson #2244 │  │  │ Sing Sing  |  Unit A-04│  │   │
│  💬 Messages │  │ Tanya Davis     │ Davis   #6631 │  │  │ Status: Active         │  │   │
│              │  │ Robert Brown    │ Brown   #1198 │  │  └────────────────────────┘  │   │
│  INTELLIGENCE│  │ Carmen Garcia   │ Garcia  #7742 │  │                              │   │
│  🔍 Search   │  └────────────────────────────────┘  │  Contact (Requesting)        │   │
│              │                                       │  ┌────────────────────────┐  │   │
│  OPERATIONS  │                                       │  │ Patricia Smith         │  │   │
│  🏠 Housing  │                                       │  │ DOB: Jun 12, 1958      │  │   │
│  📈 Reports  │                                       │  │ Phone: (718) 555-0142  │  │   │
│  📋 Audit Log│                                       │  │ Address: 44 Oak St,    │  │   │
│  ⚙️ Settings │                                       │  │ Bronx, NY 10451        │  │   │
│              │                                       │  └────────────────────────┘  │   │
│              │                                       │                              │   │
│              │                                       │  Relationship: Mother        │   │
│              │                                       │  Attorney: ( ) Yes  (•) No   │   │
│              │                                       │  Requested: Mar 04, 2026     │   │
│              │                                       │                              │   │
│              │                                       │  Communication History       │   │
│              │                                       │  (No prior contact)          │   │
│              │                                       │                              │   │
│              │                                       │  ┌──────────────────────────┐│   │
│              │                                       │  │ [Approve]  [Deny]        ││   │
│              │                                       │  │ [Flag as Attorney]       ││   │
│              │                                       │  └──────────────────────────┘│   │
│              │                                       └──────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen C: Contact List — Approved Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Contacts                                                                │
│              │                                                                          │
│  📊 Dashboard│  [ Pending {7} ]  [*Approved*]  [ Denied / Removed ]                   │
│              │  ─────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [Search: ________________________________]  [Facility ▼]  [Sort by ▼]  │
│ >>🤝 Contacts │                                                                          │
│  🚪 Visitors │  ┌──────────────────┬──────────────────┬──────────────┬────────┬───────┐ │
│              │  │ Contact Name     │ Resident         │ Relationship │ Atty   │ Action│ │
│  MONITORING  │  ├──────────────────┼──────────────────┼──────────────┼────────┼───────┤ │
│  📞 Voice    │  │ Sarah Doe        │ Doe, John #4821  │ Wife         │        │[Remove│ │
│  📹 Video    │  │ James Doe        │ Doe, John #4821  │ Brother      │        │[Remove│ │
│  💬 Messages │  │ Mark Reyes, Esq. │ Doe, John #4821  │ Attorney     │ [atty] │[Remove│ │
│              │  │ Patricia Smith   │ Smith, M. #3307  │ Mother       │        │[Remove│ │
│  INTELLIGENCE│  │ Angela Johnson   │ Johnson, R.#2244 │ Sister       │        │[Remove│ │
│  🔍 Search   │  │ Carmen Garcia    │ Garcia, L. #7742 │ Wife         │        │[Remove│ │
│              │  └──────────────────┴──────────────────┴──────────────┴────────┴───────┘ │
│  OPERATIONS  │                                                                          │
│  🏠 Housing  │  Showing 1-6 of 84 approved contacts                                    │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  [< Prev]  Page [1] of 14  [Next >]          [10 per page ▼]            │
│  ⚙️ Settings │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen D: Contact Detail Panel — With Communication History

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         Contact Detail Panel (slideout, right side)                      │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  Contact Detail                                                                  [X]     │
│  ─────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                          │
│  Resident                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  John Doe  #4821  |  Sing Sing  |  Unit B-12  |  Status: Active  |  Risk: Med  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  Contact (Family Member)                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Sarah Doe                                                                       │   │
│  │  DOB: Apr 03, 1985   |   Phone: (718) 555-0198                                  │   │
│  │  Address: 44 Oak Street, Bronx, NY 10451                                         │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  Relationship:  Wife                                                                     │
│  Attorney:      (•) No   ( ) Yes                                                         │
│  Approved:      Jan 10, 2024   by Admin J. Rivera                                       │
│                                                                                          │
│  Communication History (last 30 days)                                                    │
│  ┌──────────────┬──────────┬──────────────────────────────────────────────────────┐     │
│  │ Date         │ Type     │ Summary                                              │     │
│  ├──────────────┼──────────┼──────────────────────────────────────────────────────┤     │
│  │ Mar 06, 2026 │ Voice    │ 14 min  Completed  [Listen]                          │     │
│  │ Mar 06, 2026 │ Message  │ "Hey, can you bring the kids..."  [View]             │     │
│  │ Mar 04, 2026 │ Message  │ "We'll be there Saturday at 2pm"  [View]             │     │
│  │ Feb 28, 2026 │ Voice    │ 22 min  Completed  [Listen]                          │     │
│  └──────────────┴──────────┴──────────────────────────────────────────────────────┘     │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  [Approve]          [Deny]          [Remove]          [Flag as Attorney]        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---


---

## Screen E: Edit Contact Modal

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │  Edit Contact — Alice Johnson                                              [X] │  │
│   ├─────────────────────────────────────────────────────────────────────────────────┤  │
│   │                                                                                 │  │
│   │  First Name                          Last Name                                  │  │
│   │  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │  │
│   │  │  Alice                          │  │  Johnson                        │  │  │
│   │  └─────────────────────────────────┘  └─────────────────────────────────┘  │  │
│   │                                                                                 │  │
│   │  Phone                               Email                                      │  │
│   │  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │  │
│   │  │  +1-555-0142                    │  │  alice@example.com               │  │  │
│   │  └─────────────────────────────────┘  └─────────────────────────────────┘  │  │
│   │                                                                                 │  │
│   │  Address                                                                        │  │
│   │  ┌─────────────────────────────────────────────────────────────────────────┐   │  │
│   │  │  123 Main St, New York, NY 10001                                         │   │  │
│   │  └─────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                 │  │
│   │  Relationship                                                                   │  │
│   │  ┌─────────────────────────────────┐                                                   │  │
│   │  │  Sister                      ▼ │                                                   │  │
│   │  └─────────────────────────────────┘                                                   │  │
│   │                                                                                 │  │
│   │                                          [Cancel]  [Save Changes]               │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**Tab Bar**
- Badge count on "Pending" reflects unreviewed requests only.
- Tab state is reflected in the URL query string (e.g., `?tab=pending`).

**Pending Tab**
- Rows are sorted by request date, oldest first, so the longest-waiting requests surface at the top.
- Clicking a row slides in the ContactDetailPanel from the right; the list narrows to accommodate it.
- The selected row is highlighted (shown with `*` markers in the wireframe).

**Approved Tab**
- `[atty]` badge appears in the Attorney column for contacts flagged as legal counsel.
- Attorney contacts are visually distinct (e.g., a subtle border or icon) in the final UI.
- [Remove] triggers a confirmation modal: "Remove Sarah Doe as a contact for John Doe? This will end all communication access."

**ContactDetailPanel**
- Slides in from the right; does not navigate away from the list.
- [X] closes the panel and restores the full-width list.
- Action buttons at the bottom are context-sensitive: Pending contacts show [Approve] and [Deny]; Approved contacts show [Remove] and [Flag as Attorney].
- [Flag as Attorney] toggles the attorney status and shows a confirmation prompt.
- Communication history links open in a new tab or modal, not in the panel itself.

**Contact Change Frequency Banner**
- The 90-day window is calculated from the date of the last approved contact list change (add or remove).
- While within the lockout window, [Edit] and [Remove] buttons render as disabled. Hovering shows a tooltip: "Contact changes are locked until Apr 15, 2026."
- Agency admins can override the lockout window. Facility admins cannot.

**Edit Contact Modal**
- Only facility admins and agency admins can open this modal. The [Edit] button is not shown to read-only roles.
- All changes are audit-logged with the admin's username, timestamp, and a diff of what changed.
- Relationship dropdown options match the approved list in system settings.
