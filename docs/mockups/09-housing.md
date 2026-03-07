# Wireframe: Housing

**Screens:** `HousingDashboardPage` · `UnitRosterPage` · `UnitTypeEditorPage`
**Routes:** `/housing` · `/housing/units/:id` · `/housing/unit-types/:id/edit`

---

## Screen 1: HousingDashboardPage

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Sing Sing Correctional Facility — Housing Overview                      │
│              │                                                                          │
│  📊 Dashboard│  Total Capacity: 450  |  Occupied: 387 (86%)  |  Available: 63          │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  🤝 Contacts │  │ Block A - Unit 1          │  │ Block A - Unit 2          │            │
│  🚪 Visitors │  │ General Population        │  │ General Population        │            │
│              │  │ ████████████████░░░░ 42/50│  │ ████████████████████ 50/50│            │
│  MONITORING  │  │ (84%)                     │  │ (100%) FULL               │            │
│  📞 Voice    │  │ [View Roster]             │  │ [View Roster]             │            │
│  📹 Video    │  └──────────────────────────┘  └──────────────────────────┘             │
│  💬 Messages │                                                                          │
│              │  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  INTELLIGENCE│  │ Block B - Unit 1          │  │ Block B - Unit 2          │            │
│  🔍 Search   │  │ Restricted                │  │ Restricted                │            │
│  🚨 Alerts   │  │ ████████████░░░░░░░░ 30/50│  │ ████████░░░░░░░░░░░░ 20/50│            │
│              │  │ (60%)                     │  │ (40%)                     │            │
│  OPERATIONS  │  │ [View Roster]             │  │ [View Roster]             │            │
│ >>🏠 Housing │  └──────────────────────────┘  └──────────────────────────┘             │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  ⚙️ Settings │  │ Block C - Unit 1          │  │ Block C - Unit 2          │            │
│              │  │ Segregated                │  │ Minimum Security          │            │
│              │  │ ████░░░░░░░░░░░░░░░░ 10/25│  │ ██████████████████░░ 45/50│            │
│              │  │ (40%)                     │  │ (90%)                     │            │
│              │  │ [View Roster]             │  │ [View Roster]             │            │
│              │  └──────────────────────────┘  └──────────────────────────┘             │
│              │                                                                          │
│              │  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│              │  │ Block D - Unit 1          │  │ Block D - Unit 2          │            │
│              │  │ General Population        │  │ General Population        │            │
│              │  │ ██████████████░░░░░░ 35/50│  │ ████████████░░░░░░░░ 30/50│            │
│              │  │ (70%)                     │  │ (60%)                     │            │
│              │  │ [View Roster]             │  │ [View Roster]             │            │
│              │  └──────────────────────────┘  └──────────────────────────┘             │
│              │                                                                          │
│              │  ┌──────────────────────────┐                                            │
│              │  │ Block E - Unit 1          │                                            │
│              │  │ Restricted                │                                            │
│              │  │ ██████████████████░░ 45/50│                                            │
│              │  │ (90%)                     │                                            │
│              │  │ [View Roster]             │                                            │
│              │  └──────────────────────────┘                                            │
│              │                                                                          │
│              │  [Manage Unit Types]                                                     │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: UnitRosterPage

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  ← Back to Housing                                                       │
│              │                                                                          │
│  📊 Dashboard│  Block A - Unit 1  |  General Population  |  42 / 50 residents          │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────────────────────────────────────────────┐   │
│  🤝 Contacts │  │ Unit Type: General Population   Calling Hours: 08:00 - 22:00     │   │
│  🚪 Visitors │  │ Call Duration: 30 min           Max Contacts: 25                 │   │
│              │  │ Video Slot: 30 min              Max Concurrent Video: 10          │   │
│  MONITORING  │  └──────────────────────────────────────────────────────────────────┘   │
│  📞 Voice    │                                                                          │
│  📹 Video    │  [+ Add Resident to Unit]                                                │
│  💬 Messages │                                                                          │
│              │  ┌──────────────────┬──────────┬────────────┬───────────┬────────────┐  │
│  INTELLIGENCE│  │ Name             │ ID#      │ Status     │ Risk      │ Move Date  │  │
│  🔍 Search   │  ├──────────────────┼──────────┼────────────┼───────────┼────────────┤  │
│  🚨 Alerts   │  │ John Doe         │ #4821    │ Active     │ Medium    │ Jan 15     │  │
│              │  │ Michael Smith    │ #5678    │ Active     │ Low       │ Feb 3      │  │
│  OPERATIONS  │  │ Robert Johnson   │ #4892    │ Active     │ High      │ Nov 22     │  │
│ >>🏠 Housing │  │ David Williams   │ #3456    │ Active     │ Low       │ Mar 1      │  │
│  📈 Reports  │  │ James Brown      │ #7890    │ Active     │ Medium    │ Dec 10     │  │
│  📋 Audit Log│  │ Carlos Rivera    │ #6341    │ Active     │ Low       │ Feb 18     │  │
│  ⚙️ Settings │  │ Terrence Walker  │ #5512    │ Active     │ Medium    │ Jan 28     │  │
│              │  │ Antoine Davis    │ #6089    │ Active     │ High      │ Oct 5      │  │
│              │  │ Marcus Thompson  │ #4477    │ Active     │ Low       │ Mar 2      │  │
│              │  │ Darius Moore     │ #5923    │ Active     │ Medium    │ Feb 25     │  │
│              │  └──────────────────┴──────────┴────────────┴───────────┴────────────┘  │
│              │                                                                          │
│              │  (continued — 42 residents total)                                        │
│              │                                                                          │
│              │  ┌──────────────────┬──────────┬────────────┬───────────┬────────────┐  │
│              │  │ Actions          │          │            │           │            │  │
│              │  ├──────────────────┼──────────┼────────────┼───────────┼────────────┤  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  │ [Move] [Profile] │          │            │           │            │  │
│              │  └──────────────────┴──────────┴────────────┴───────────┴────────────┘  │
│              │                                                                          │
│              │  Showing 10 of 42    [< Prev]  Page 1 of 5  [Next >]                    │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 3: UnitTypeEditorPage

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  ← Back to Housing                                                       │
│              │                                                                          │
│  📊 Dashboard│  Edit Unit Type: General Population                                      │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────────────┬───────────────────────────────┐   │
│  🤝 Contacts │  │  COMMUNICATION RULES             │  SESSION LIMITS               │   │
│  🚪 Visitors │  │                                  │                               │   │
│              │  │  Voice Call Duration             │  Clearance Level              │   │
│  MONITORING  │  │  [30] minutes                    │  [general ▼]                  │   │
│  📞 Voice    │  │                                  │                               │   │
│  📹 Video    │  │  Video Call Duration             │  Voice Calls Enabled          │   │
│  💬 Messages │  │  [30] minutes                    │  [x] (checked)                │   │
│              │  │                                  │                               │   │
│  INTELLIGENCE│  │  Calling Hours                   │  Video Calls Enabled          │   │
│  🔍 Search   │  │  [08:00] to [22:00]              │  [x] (checked)                │   │
│  🚨 Alerts   │  │                                  │                               │   │
│              │  │  Max Contacts                    │  Messaging Enabled            │   │
│  OPERATIONS  │  │  [25]                            │  [x] (checked)                │   │
│ >>🏠 Housing │  │                                  │                               │   │
│  📈 Reports  │  │  Video Slot Duration             │  Max Daily Voice Calls        │   │
│  📋 Audit Log│  │  [30] minutes                    │  [___] (blank = unlimited)    │   │
│  ⚙️ Settings │  │                                  │                               │   │
│              │  │  Max Concurrent Video            │  Max Daily Messages           │   │
│              │  │  [10]                            │  [___] (blank = unlimited)    │   │
│              │  │                                  │                               │   │
│              │  │                                  │  Max Weekly Video Requests    │   │
│              │  │                                  │  [___] (blank = unlimited)    │   │
│              │  │                                  │                               │   │
│              │  │                                  │  Content Review Required      │   │
│              │  │                                  │  [x] (checked)                │   │
│              │  │                                  │                               │   │
│              │  └──────────────────────────────────┴───────────────────────────────┘   │
│              │                                                                          │
│              │  ⚠  Changes apply to all units of this type across the facility.        │
│              │     Residents currently in calls will not be affected until next session.│
│              │                                                                          │
│              │                              [Cancel]  [Save Changes]                   │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Modal: Move Resident

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Block A - Unit 1  |  General Population  |  42 / 50 residents          │
│  (dimmed)    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │                                                                          │
│              │         ┌──────────────── Move Resident ─────────────────┐              │
│              │         │                                                 │              │
│              │         │  Resident:    John Doe (#4821)                  │              │
│              │         │  Current:     Block A - Unit 1                  │              │
│              │         │                                                 │              │
│              │         │  Target Unit: [Block B - Unit 3 ▼]             │              │
│              │         │  Available:   8 / 50 spots                      │              │
│              │         │                                                 │              │
│              │         │  Reason:      [_____________________________]   │              │
│              │         │                                                 │              │
│              │         │               [Cancel]  [Confirm Move]          │              │
│              │         └─────────────────────────────────────────────────┘              │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**HousingDashboardPage**
- The summary bar at the top aggregates across all units in the currently selected facility.
- Unit cards use a fill bar where `█` represents occupied slots and `░` represents empty slots. The bar is proportional to capacity.
- Cards at 100% capacity show a "FULL" label. Cards below 20% capacity show an "AVAILABLE" label.
- Clicking "View Roster" navigates to the UnitRosterPage for that unit.
- "Manage Unit Types" navigates to a list of all unit types for the facility, each with an Edit link.
- Facility admins see only their facility. Agency admins can switch facilities via the header dropdown.

**UnitRosterPage**
- The unit info bar pulls from the unit's assigned HousingUnitType. It's read-only here; editing happens in UnitTypeEditorPage.
- Risk Level values: Low (green), Medium (amber), High (red).
- "Move Date" is the date the resident was assigned to this unit.
- "Move" opens the MoveResidentModal. "Profile" navigates to the resident's full profile page.
- "+ Add Resident to Unit" opens a search-and-select dialog to find a resident not currently assigned to any unit.

**UnitTypeEditorPage**
- The two-column layout separates communication rules (timing/duration) from session limits (counts/toggles).
- Clearance Level dropdown options: minimum, general, restricted, segregated. Changing this affects which communication features are available.
- Leaving a session limit field blank means no limit is enforced for that metric.
- "Content Review Required" means all outgoing messages from residents in this unit type go to the moderation queue before delivery.
- The warning banner reminds admins that changes are facility-wide for this unit type, not per-unit.

**MoveResidentModal**
- The Target Unit dropdown only shows units with available capacity (not full).
- Available spot count updates dynamically when a different target unit is selected.
- Reason field is required. It gets written to the audit log.
- A successful move triggers a toast and returns focus to the roster, which refreshes to reflect the change.
