# Wireframe: Dashboard

**Screen:** `DashboardPage`
**Route:** `/dashboard`

---

## Full Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Dashboard                                                               │
│              │                                                                          │
│ >>📊 Dashboard  ├──────────────────────────────────────────────────────────────────────┤
│              │  Since your last login (Today, 8:42 AM)                                 │
│  MANAGEMENT  │  ┌────────────────────────────────────────────────────────────────────┐ │
│  👥 Residents│  │  ⚠  3 new flagged messages require review                         │ │
│  🤝 Contacts │  │  📋  7 pending contact requests awaiting approval                  │ │
│  🚪 Visitors │  │  📞  2 calls were terminated early since last session              │ │
│              │  └────────────────────────────────────────────────────────────────────┘ │
│  MONITORING  │                                                                          │
│  📞 Voice    │  ── Stats Overview ─────────────────────────────────────────────────── │
│  📹 Video    │                                                                          │
│  💬 Messages │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│              │  │ Active Calls │ │  Pending Msgs │ │  Pending     │ │   Flagged    │  │
│  INTELLIGENCE│  │              │ │              │ │  Contacts    │ │   Content    │  │
│  🔍 Search   │  │      4       │ │      12      │ │      7       │ │      3       │  │
│              │  │  ▲ 2 from    │ │  ▼ 5 from    │ │  ▲ 3 from   │ │  ▲ 1 from   │  │
│  OPERATIONS  │  │  yesterday   │ │  yesterday   │ │  yesterday  │ │  yesterday  │  │
│  🏠 Housing  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  ┌──────────────┐                                                       │
│  ⚙️ Settings │  │ Video Reqs   │                                                       │
│              │  │              │                                                       │
│              │  │      2       │                                                       │
│              │  │  -- same as  │                                                       │
│              │  │  yesterday   │                                                       │
│              │  └──────────────┘                                                       │
│              │                                                                          │
│              │  ── Recent Activity ────────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────┬─────────────────┬──────────────────────┬───────────────┐ │
│              │  │ Time     │ Admin            │ Action               │ Entity        │ │
│              │  ├──────────┼─────────────────┼──────────────────────┼───────────────┤ │
│              │  │ 9:14 AM  │ J. Rivera        │ Approved contact     │ M. Smith      │ │
│              │  │ 9:02 AM  │ T. Washington    │ Flagged message      │ J. Doe #4821  │ │
│              │  │ 8:55 AM  │ J. Rivera        │ Denied visitor app.  │ R. Johnson    │ │
│              │  │ 8:47 AM  │ System           │ Call terminated      │ J. Doe #4821  │ │
│              │  │ 8:43 AM  │ T. Washington    │ Updated housing unit │ C. Williams   │ │
│              │  └──────────┴─────────────────┴──────────────────────┴───────────────┘ │
│              │                                          [View Full Audit Log →]        │
│              │                                                                          │
│              │  ── Quick Actions ──────────────────────────────────────────────────── │
│              │                                                                          │
│              │  [+ Approve Pending Contacts]   [Review Flagged Content]                │
│              │  [Run Activity Report]          [View Active Calls]                     │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**Since Last Login Panel**
- Appears at top of every dashboard load, summarizing changes since the admin's previous session.
- Each item is a link that navigates to the relevant screen (e.g., clicking flagged messages goes to Messages > Flagged).
- Dismissible per session with an X button (not shown for brevity).

**Stat Cards**
- Each card shows the current count and a delta vs. yesterday.
- Clicking any card navigates to the corresponding list screen filtered to that state.
- "Active Calls" reflects real-time data; the others are point-in-time counts.

**Recent Activity Table**
- Pulls from the audit log, limited to the last 10 entries.
- "Entity" column links to the relevant resident or contact profile.
- "Admin" column links to the admin's own audit history.
- "View Full Audit Log" navigates to the Audit Log screen.

**Quick Actions**
- Shortcut buttons to the most common admin workflows.
- "Approve Pending Contacts" goes to Contacts > Pending tab.
- "Review Flagged Content" goes to Messages > Flagged tab.
