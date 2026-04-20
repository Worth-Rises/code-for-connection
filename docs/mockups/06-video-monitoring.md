# Wireframe: Video Monitoring

**Screen:** `VideoMonitoringPage` + `VideoDetailView`
**Route:** `/monitoring/video` + `/monitoring/video/:sessionId`

---

## Screen 1: VideoMonitoringPage — Pending Requests Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Video Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  👥 Residents│  │  Pending Requests    │ │  Active Sessions     │ │  Today Scheduled  │ │
│  🤝 Contacts │  │          5           │ │          2           │ │        12         │ │
│  🚪 Visitors │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Pending Requests {5} ]  [ Schedule ]  [ Active Sessions (2) ]         │
│  📞 Voice    │  [ History ]                                                             │
│ >>📹 Video   ├──────────────────────────────────────────────────────────────────────────┤
│  💬 Messages │                                                                          │
│              │  ┌──────────────┬──────────────┬──────────────┬──────────┬──────┬──────┐│
│  INTELLIGENCE│  │ Resident     │ Family Member│ Req. Date    │ Pref.Time│ Atty │Action││
│  🔍 Search   │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│              │  │ John Doe     │ Alice Johnson │ Mar 7        │ 10:00 AM │  No  │[Appr]││
│  OPERATIONS  │  │ #4821        │ (Sister)      │              │          │      │[Deny]││
│  🏠 Housing  │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│  📈 Reports  │  │ Michael Smith│ Carol Davis  │ Mar 7        │  2:00 PM │  No  │[Appr]││
│  📋 Audit Log│  │ #3302        │ (Spouse)     │              │          │      │[Deny]││
│  ⚙️ Settings │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│              │  │ Robert       │ Atty. Frank  │ Mar 8        │  9:00 AM │  Yes │[Appr]││
│              │  │ Johnson #2190│ Wilson       │              │          │      │[Deny]││
│              │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│              │  │ David        │ Grace Lee    │ Mar 8        │ 11:00 AM │  No  │[Appr]││
│              │  │ Williams#0774│ (Mother)     │              │          │      │[Deny]││
│              │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│              │  │ James Brown  │ Eva Martinez │ Mar 9        │  3:00 PM │  No  │[Appr]││
│              │  │ #1847        │ (Friend)     │              │          │      │[Deny]││
│              │  └──────────────┴──────────────┴──────────────┴──────────┴──────┴──────┘│
│              │                                                                          │
│              │  [Approve All]  [Deny All]                                               │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- [Approve] opens a time-slot picker modal to confirm the scheduled time before approving.
- [Deny] opens a modal requiring a denial reason (required field).
- Attorney requests (Atty = Yes) are flagged visually. They still require approval for scheduling but are not content-monitored.
- [Approve All] / [Deny All] are bulk actions that open a confirmation modal.

---

## Screen 2: VideoMonitoringPage — Schedule Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Video Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  👥 Residents│  │  Pending Requests    │ │  Active Sessions     │ │  Today Scheduled  │ │
│  🤝 Contacts │  │          5           │ │          2           │ │        12         │ │
│  🚪 Visitors │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Pending Requests {5} ]  [ Schedule ]  [ Active Sessions (2) ]         │
│  📞 Voice    │  [ History ]                                                             │
│ >>📹 Video   ├──────────────────────────────────────────────────────────────────────────┤
│  💬 Messages │  [< Prev]  Mar 7, 2026  [Next >]          Capacity: 3/10 slots used     │
│              │                                                                          │
│  INTELLIGENCE│  ┌────────┬──────────────────────────────────────────────────────────┐  │
│  🔍 Search   │  │  9 AM  │                                                          │  │
│              │  ├────────┼──────────────────────────────────────────────────────────┤  │
│  OPERATIONS  │  │ 10 AM  │ ┌──────────────────────────┐                             │  │
│  🏠 Housing  │  │        │ │ John Doe / Alice Johnson  │                             │  │
│  📈 Reports  │  │        │ │ 10:00 - 10:30 AM          │                             │  │
│  📋 Audit Log│  │        │ │ Approved by: J. Rivera    │                             │  │
│  ⚙️ Settings │  │        │ └──────────────────────────┘                             │  │
│              │  ├────────┼──────────────────────────────────────────────────────────┤  │
│              │  │ 11 AM  │ ┌──────────────────────────┐ ┌──────────────────────────┐│  │
│              │  │        │ │ David Williams / Grace Lee│ │ Sarah Davis / Diana Chen ││  │
│              │  │        │ │ 11:00 - 11:30 AM          │ │ 11:15 - 11:45 AM         ││  │
│              │  │        │ │ Approved by: T. Washington│ │ Approved by: J. Rivera   ││  │
│              │  │        │ └──────────────────────────┘ └──────────────────────────┘│  │
│              │  ├────────┼──────────────────────────────────────────────────────────┤  │
│              │  │ 12 PM  │                                                          │  │
│              │  ├────────┼──────────────────────────────────────────────────────────┤  │
│              │  │  1 PM  │                                                          │  │
│              │  ├────────┼──────────────────────────────────────────────────────────┤  │
│              │  │  2 PM  │ ┌──────────────────────────┐                             │  │
│              │  │        │ │ Michael Smith / Carol Davis                            │  │
│              │  │        │ │ 2:00 - 2:30 PM            │                             │  │
│              │  │        │ │ Approved by: J. Rivera    │                             │  │
│              │  │        │ └──────────────────────────┘                             │  │
│              │  └────────┴──────────────────────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Timeline spans 9 AM to 5 PM. Each session block is clickable and opens VideoDetailView.
- Overlapping sessions appear side-by-side in the same time row.
- "Capacity: 3/10 slots used" reflects the facility's concurrent video session limit.
- Clicking an empty time slot opens the "Schedule New Session" modal (for walk-in or admin-initiated sessions).
- [< Prev] / [Next >] navigate by day.

---

## Screen 3: VideoMonitoringPage — Active Sessions Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Video Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  👥 Residents│  │  Pending Requests    │ │  Active Sessions     │ │  Today Scheduled  │ │
│  🤝 Contacts │  │          5           │ │          2           │ │        12         │ │
│  🚪 Visitors │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Pending Requests {5} ]  [ Schedule ]  [ Active Sessions (2) ]         │
│  📞 Voice    │  [ History ]                                                             │
│ >>📹 Video   ├──────────────────────────────────────────────────────────────────────────┤
│  💬 Messages │  ⟳ Auto-refresh: 5s   [↻ Refresh Now]              Last: 9:17:42  │
│              │                                                                          │
│  INTELLIGENCE│  ┌──────────────┬──────────────┬──────────────┬──────────┬──────┬──────┐│
│  🔍 Search   │  │ Resident     │ Contact      │ Sched. Start │ Actual   │ Dur. │Action││
│              │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│  OPERATIONS  │  │ John Doe     │ Alice Johnson │ 10:00 AM     │ 10:02 AM │ 8:14 │[Term]││
│  🏠 Housing  │  │ #4821        │ (Sister)      │              │ (+2 min) │      │      ││
│  📈 Reports  │  ├──────────────┼──────────────┼──────────────┼──────────┼──────┼──────┤│
│  📋 Audit Log│  │ David        │ Grace Lee    │ 11:00 AM     │ 10:58 AM │ 9:47 │[Term]││
│  ⚙️ Settings │  │ Williams#0774│ (Mother)     │              │ (-2 min) │      │      ││
│              │  └──────────────┴──────────────┴──────────────┴──────────┴──────┴──────┘│
│              │                                                                          │
│              │  Note: Video sessions are scheduled in 30-minute blocks. Sessions that  │
│              │  run over will be auto-terminated at the 35-minute mark.               │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- "Actual Start" shows the real connection time vs. scheduled. Delta shown in parentheses.
- Duration ticks up live. A warning indicator appears when a session approaches the 30-minute limit.
- [Term] = [Terminate] button. Clicking opens a confirmation modal.
- Auto-termination at 35 minutes is a system rule. The admin can terminate early at any time.
- "⟳ Auto-refresh: 5s" shows the auto-refresh interval. [↻ Refresh Now] forces an immediate data fetch. Last-refresh timestamp shown at far right.
- Manual [↻ Refresh Now] is always available and does NOT reset the auto-refresh timer. Useful when admin wants instant data without waiting for next auto-cycle.

---

## Screen 4: VideoMonitoringPage — History Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Video Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  [ Pending Requests {5} ]  [ Schedule ]  [ Active Sessions (2) ]         │
│  👥 Residents│  [ History ]                                                             │
│  🤝 Contacts ├──────────────────────────────────────────────────────────────────────────┤
│  🚪 Visitors │  [Date Range___________] [Resident ▼] [Contact ▼] [Status ▼] [Search___]│
│              │                                                                          │
│  MONITORING  │  ┌────────────┬────────────┬────────────┬──────────┬──────────┬────────┐│
│  📞 Voice    │  │ Date/Time  │ Resident   │ Contact    │ Sched.   │ Duration │ Status ││
│ >>📹 Video   │  │            │            │            │ Start    │          │        ││
│  💬 Messages │  ├────────────┼────────────┼────────────┼──────────┼──────────┼────────┤│
│              │  │ Mar 7      │ Sarah Davis│ Diana Chen │ 9:00 AM  │ 28m 44s  │Compltd ││
│  INTELLIGENCE│  │ 9:00 AM    │ #0091      │ (Daughter) │          │          │        ││
│  🔍 Search   │  ├────────────┼────────────┼────────────┼──────────┼──────────┼────────┤│
│              │  │ Mar 6      │ James Brown│ Eva        │ 3:00 PM  │  4m 12s  │Terminat││
│  OPERATIONS  │  │ 3:00 PM    │ #1847      │ Martinez   │          │          │by Admin││
│  🏠 Housing  │  ├────────────┼────────────┼────────────┼──────────┼──────────┼────────┤│
│  📈 Reports  │  │ Mar 6      │ Michael    │ Carol Davis│ 2:00 PM  │ 30m 00s  │Compltd ││
│  📋 Audit Log│  │ 2:00 PM    │ Smith #3302│ (Spouse)   │          │          │        ││
│  ⚙️ Settings │  ├────────────┼────────────┼────────────┼──────────┼──────────┼────────┤│
│              │  │ Mar 6      │ Robert     │ Atty. Frank│ 9:00 AM  │ 25m 30s  │Compltd ││
│              │  │ 9:00 AM    │ Johnson    │ Wilson     │          │          │ (ATTY) ││
│              │  └────────────┴────────────┴────────────┴──────────┴──────────┴────────┘│
│              │                                                                          │
│              │  Showing 1-20 of 312    [< Prev]  1  2  3  ...  16  [Next >]            │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Each row is clickable and navigates to VideoDetailView.
- Attorney sessions show "(ATTY)" in the Status column. No keyword data is stored for these.
- "Terminated by Admin" shows the admin username on hover.

---

## Screen 5: VideoDetailView

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  ← Back to Video History                                                 │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  Video Session Detail — Mar 7, 2026 at 10:00 AM                         │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  ┌──────────────────────────────────────┐ ┌───────────────────────────┐ │
│  🚪 Visitors │  │ SESSION METADATA                     │ │ SESSION TIMELINE          │ │
│              │  ├──────────────────────────────────────┤ ├───────────────────────────┤ │
│  MONITORING  │  │ Resident:   John Doe (#4821)         │ │  10:00:00  ○ Scheduled    │ │
│  📞 Voice    │  │ Contact:    Alice Johnson (Sister)   │ │            │              │ │
│ >>📹 Video   │  │ Facility:   Sing Sing CF             │ │  10:02:14  ● Connected    │ │
│  💬 Messages │  │ Unit:       Block C, Cell 14         │ │            │              │ │
│              │  │                                      │ │  10:30:00  ! 30-min warn  │ │
│  INTELLIGENCE│  │ Sched. Start:  10:00 AM              │ │            │              │ │
│  🔍 Search   │  │ Actual Start:  10:02 AM  (+2 min)    │ │  10:30:44  ■ Session ended│ │
│              │  │ Sched. End:    10:30 AM              │ │            (family member │ │
│  OPERATIONS  │  │ Actual End:    10:30 AM              │ │             disconnected) │ │
│  🏠 Housing  │  │ Duration:      28m 30s               │ │                           │ │
│  📈 Reports  │  │                                      │ │                           │ │
│  📋 Audit Log│  │ Status:     Completed                │ │                           │ │
│  ⚙️ Settings │  │ Ended By:   Family Member            │ │                           │ │
│              │  │ Attorney?:  No                       │ │                           │ │
│              │  │ Approved By: J. Rivera               │ │                           │ │
│              │  │ Approved At: Mar 6, 4:15 PM          │ │                           │ │
│              │  └──────────────────────────────────────┘ └───────────────────────────┘ │
│              │                                                                          │
│              │  ── Admin Notes ────────────────────────────────────────────────────── │
│              │                                                                          │
│              │  No notes on this session.                                               │
│              │                                                                          │
│              │  [Add Note]                                                              │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- "Actual Start" vs "Sched. Start" comparison helps identify late-joining patterns.
- Timeline events: ○ scheduled, ● connected, ! warning, ■ ended. Each event has a precise timestamp.
- "Approved By" and "Approved At" provide a full approval audit trail.
- Attorney sessions show a notice: "Content monitoring is not applicable for attorney-client sessions."
- Admin Notes work the same as in CallDetailView — append-only with author and timestamp.
