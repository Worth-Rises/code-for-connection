# Wireframe: Reports & Analytics

**Screen:** `ReportsPage`
**Route:** `/reports`

---

## Screen 1: ReportsPage — Communication Volume Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Reports & Analytics                                                     │
│              │                                                                          │
│  📊 Dashboard│  Date Range:  [From: 2026-03-01]  [To: 2026-03-07]  [Apply]             │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [ Communication Volume ]  [ Moderation ]  [ Flags & Alerts ]  [ Visitors ]│
│  🤝 Contacts │  ──────────────────────────────────────────────────────────────────────  │
│  🚪 Visitors │                                                                          │
│              │  ── Voice Calls (Last 7 Days) ──────────────────────────────────────── │
│  MONITORING  │                                                                          │
│  📞 Voice    │  Mon  ████████████████████                          47                  │
│  📹 Video    │  Tue  ███████████████████████                       52                  │
│  💬 Messages │  Wed  ██████████████████                            41                  │
│              │  Thu  ████████████████████████████                  63                  │
│  INTELLIGENCE│  Fri  ███████████████████████████                   58                  │
│  🔍 Search   │  Sat  ████████████                                  28                  │
│  🚨 Alerts   │  Sun  ██████████                                    22                  │
│              │                                                                          │
│  OPERATIONS  │  Total Calls: 311  |  Avg Duration: 14m  |  Peak Hour: 2-3 PM           │
│  🏠 Housing  │                                                                          │
│ >>📈 Reports │  ── Video Calls (Last 7 Days) ──────────────────────────────────────── │
│  📋 Audit Log│                                                                          │
│  ⚙️ Settings │  Mon  ████████                                      18                  │
│              │  Tue  ██████████                                    22                  │
│              │  Wed  ███████                                       15                  │
│              │  Thu  ████████████                                  27                  │
│              │  Fri  ██████████                                    23                  │
│              │  Sat  █████                                         11                  │
│              │  Sun  ████                                          9                   │
│              │                                                                          │
│              │  Total Sessions: 125  |  Avg Duration: 22m  |  Peak Hour: 6-7 PM        │
│              │                                                                          │
│              │  ── Messages (Last 7 Days) ─────────────────────────────────────────── │
│              │                                                                          │
│              │  Mon  ████████████████████████████████              78                  │
│              │  Tue  ██████████████████████████████████████        94                  │
│              │  Wed  ████████████████████████████                  71                  │
│              │  Thu  ████████████████████████████████████          88                  │
│              │  Fri  ██████████████████████████████████            83                  │
│              │  Sat  ████████████████████                          49                  │
│              │  Sun  ████████████████                              38                  │
│              │                                                                          │
│              │  Total Messages: 501  |  Avg per Resident: 3.2  |  Peak Day: Tuesday    │
│              │                                                                          │
│              │  ── Breakdown by Facility ──────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────────┬────────────┬────────────┬────────────────┐   │
│              │  │ Facility             │ Voice Calls│ Video Sess.│ Messages       │   │
│              │  ├──────────────────────┼────────────┼────────────┼────────────────┤   │
│              │  │ Sing Sing            │ 187        │ 74         │ 301            │   │
│              │  │ Bedford Hills        │ 124        │ 51         │ 200            │   │
│              │  │ Total                │ 311        │ 125        │ 501            │   │
│              │  └──────────────────────┴────────────┴────────────┴────────────────┘   │
│              │                                                                          │
│              │  ── Breakdown by Unit Type ─────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────────┬────────────┬────────────┬────────────────┐   │
│              │  │ Unit Type            │ Voice Calls│ Video Sess.│ Messages       │   │
│              │  ├──────────────────────┼────────────┼────────────┼────────────────┤   │
│              │  │ General Population   │ 198        │ 89         │ 342            │   │
│              │  │ Minimum Security     │ 67         │ 28         │ 112            │   │
│              │  │ Restricted           │ 38         │ 8          │ 41             │   │
│              │  │ Segregated           │ 8          │ 0          │ 6              │   │
│              │  └──────────────────────┴────────────┴────────────┴────────────────┘   │
│              │                                                                          │
│              │                          [Export CSV]  [Export PDF]                     │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: ReportsPage — Moderation Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Reports & Analytics                                                     │
│              │                                                                          │
│  📊 Dashboard│  Date Range:  [From: 2026-03-01]  [To: 2026-03-07]  [Apply]             │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [ Communication Volume ]  [ Moderation ]  [ Flags & Alerts ]  [ Visitors ]│
│  🤝 Contacts │  ──────────────────────────────────────────────────────────────────────  │
│  🚪 Visitors │                                                                          │
│              │  ── Queue Overview ─────────────────────────────────────────────────── │
│  MONITORING  │                                                                          │
│  📞 Voice    │  Avg Queue Wait Time: 4m 12s  |  Throughput: 18 reviews/hr              │
│  📹 Video    │  Total Reviewed: 312          |  Currently Pending: 7                   │
│  💬 Messages │                                                                          │
│              │  ── Admin Performance ──────────────────────────────────────────────── │
│  INTELLIGENCE│                                                                          │
│  🔍 Search   │  ┌──────────────────┬──────────┬──────────────┬────────────┬──────────┐ │
│  🚨 Alerts   │  │ Admin            │ Reviewed │ Avg Resp Time│ Approvals  │ Blocks   │ │
│              │  ├──────────────────┼──────────┼──────────────┼────────────┼──────────┤ │
│  OPERATIONS  │  │ J. Rivera        │ 124      │ 3m 41s       │ 98 (79%)   │ 26 (21%) │ │
│  🏠 Housing  │  │ T. Washington    │ 108      │ 4m 55s       │ 81 (75%)   │ 27 (25%) │ │
│ >>📈 Reports │  │ M. Chen          │ 80       │ 3m 12s       │ 67 (84%)   │ 13 (16%) │ │
│  📋 Audit Log│  │ Agency Admin     │ 0        │ —            │ —          │ —        │ │
│  ⚙️ Settings │  └──────────────────┴──────────┴──────────────┴────────────┴──────────┘ │
│              │                                                                          │
│              │  ── Review Outcomes ────────────────────────────────────────────────── │
│              │                                                                          │
│              │  Approved:   ████████████████████████████████████████  246 (79%)        │
│              │  Blocked:    ████████████                               66 (21%)         │
│              │                                                                          │
│              │                          [Export CSV]  [Export PDF]                     │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 3: ReportsPage — Flags & Alerts Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Reports & Analytics                                                     │
│              │                                                                          │
│  📊 Dashboard│  Date Range:  [From: 2026-03-01]  [To: 2026-03-07]  [Apply]             │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [ Communication Volume ]  [ Moderation ]  [ Flags & Alerts ]  [ Visitors ]│
│  🤝 Contacts │  ──────────────────────────────────────────────────────────────────────  │
│  🚪 Visitors │                                                                          │
│              │  ── Top Flagged Keywords ───────────────────────────────────────────── │
│  MONITORING  │                                                                          │
│  📞 Voice    │  ┌──────────────────┬────────────┬──────────┬──────────┬─────────────┐  │
│  📹 Video    │  │ Keyword          │ Tier       │ Matches  │ Resolved │ Pending     │  │
│  💬 Messages │  ├──────────────────┼────────────┼──────────┼──────────┼─────────────┤  │
│              │  │ heroin           │ blacklist  │ 47       │ 47       │ 0           │  │
│  INTELLIGENCE│  │ green light      │ blacklist  │ 52       │ 49       │ 3           │  │
│  🔍 Search   │  │ take care of     │ greylist   │ 23       │ 18       │ 5           │  │
│  🚨 Alerts   │  │ fentanyl         │ blacklist  │ 31       │ 31       │ 0           │  │
│              │  │ colors           │ watchlist  │ 19       │ 14       │ 5           │  │
│  OPERATIONS  │  │ move on him      │ blacklist  │ 11       │ 10       │ 1           │  │
│  🏠 Housing  │  │ handle it        │ greylist   │ 8        │ 5        │ 3           │  │
│ >>📈 Reports │  │ burner           │ greylist   │ 6        │ 4        │ 2           │  │
│  📋 Audit Log│  └──────────────────┴────────────┴──────────┴──────────┴─────────────┘  │
│  ⚙️ Settings │                                                                          │
│              │  ── Resolution Status ──────────────────────────────────────────────── │
│              │                                                                          │
│              │  Total Flags: 197                                                        │
│              │                                                                          │
│              │  Resolved    ████████████████████████████████████████░░░░░░  67%  132   │
│              │  Dismissed   ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  22%   43   │
│              │  Escalated   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8%   16   │
│              │  Pending     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3%    6   │
│              │                                                                          │
│              │  ── Flags by Category ──────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────┬──────────┬──────────────────────────────────────┐ │
│              │  │ Category         │ Count    │ Share                                │ │
│              │  ├──────────────────┼──────────┼──────────────────────────────────────┤ │
│              │  │ violence         │ 63       │ ████████████████████████████████ 32% │ │
│              │  │ drug             │ 78       │ ████████████████████████████████████ 40%│ │
│              │  │ gang             │ 27       │ █████████████ 14%                    │ │
│              │  │ coded_threat     │ 19       │ █████████ 10%                        │ │
│              │  │ contraband       │ 10       │ █████ 5%                             │ │
│              │  └──────────────────┴──────────┴──────────────────────────────────────┘ │
│              │                                                                          │
│              │                          [Export CSV]  [Export PDF]                     │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 4: ReportsPage — Visitors Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Reports & Analytics                                                     │
│              │                                                                          │
│  📊 Dashboard│  Date Range:  [From: 2026-03-01]  [To: 2026-03-07]  [Apply]             │
│              │  ──────────────────────────────────────────────────────────────────────  │
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  [ Communication Volume ]  [ Moderation ]  [ Flags & Alerts ]  [ Visitors ]│
│  🤝 Contacts │  ──────────────────────────────────────────────────────────────────────  │
│  🚪 Visitors │                                                                          │
│              │  ── Visitor Application Summary ────────────────────────────────────── │
│  MONITORING  │                                                                          │
│  📞 Voice    │  ┌──────────────────┬──────────────────┬──────────────────┐             │
│  📹 Video    │  │  Applications    │  Approvals       │  Denials         │             │
│  💬 Messages │  │                  │                  │                  │             │
│              │  │       34         │       26 (76%)   │       8 (24%)    │             │
│  INTELLIGENCE│  │  ▲ 6 from prior  │  ▲ 4 from prior  │  ▼ 2 from prior  │             │
│  🔍 Search   │  │  week            │  week            │  week            │             │
│  🚨 Alerts   │  └──────────────────┴──────────────────┴──────────────────┘             │
│              │                                                                          │
│  OPERATIONS  │  ── Visit Volume Trend (Last 7 Days) ──────────────────────────────── │
│  🏠 Housing  │                                                                          │
│ >>📈 Reports │  Mon  ████████████                                  12                  │
│  📋 Audit Log│  Tue  ██████████████████                            18                  │
│  ⚙️ Settings │  Wed  ██████████                                    10                  │
│              │  Thu  ████████████████                              16                  │
│              │  Fri  ██████████████████████                        22                  │
│              │  Sat  ████████████████████████████                  28                  │
│              │  Sun  ████████████████████████                      24                  │
│              │                                                                          │
│              │  Total Visits: 130  |  Avg per Day: 18.6  |  Peak Day: Saturday         │
│              │                                                                          │
│              │  ── Denial Reasons ─────────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────────────────────┬──────────┐                        │
│              │  │ Reason                           │ Count    │                        │
│              │  ├──────────────────────────────────┼──────────┤                        │
│              │  │ Background check failed          │ 4        │                        │
│              │  │ Resident request                 │ 2        │                        │
│              │  │ Facility restriction             │ 1        │                        │
│              │  │ Incomplete application           │ 1        │                        │
│              │  └──────────────────────────────────┴──────────┘                        │
│              │                                                                          │
│              │                          [Export CSV]  [Export PDF]                     │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Modal: Export Report

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Reports & Analytics                                                     │
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
│              │         ┌──────────────── Export Report ─────────────────┐              │
│              │         │                                                 │              │
│              │         │  Report:     Communication Volume               │              │
│              │         │  Date Range: Mar 1 - Mar 7, 2026               │              │
│              │         │  Facility:   Sing Sing                          │              │
│              │         │                                                 │              │
│              │         │  Format:     (•) CSV   ( ) PDF                  │              │
│              │         │                                                 │              │
│              │         │               [Cancel]  [Download]              │              │
│              │         └─────────────────────────────────────────────────┘              │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**Date Range Picker**
- Defaults to the last 7 days on page load.
- "Apply" re-fetches all data for the selected range. All four tabs update simultaneously.
- Date inputs accept free-form typing or a calendar picker (not shown).

**Communication Volume Tab**
- Bar charts are proportional within each section. The longest bar fills roughly 40 characters.
- Each chart section (Voice, Video, Messages) has its own summary stats line below it.
- Breakdown tables let admins compare across facilities (agency admins) or across unit types (facility admins).
- Agency admins see both facilities in the breakdown. Facility admins see only their own.

**Moderation Tab**
- Admin Performance table shows only admins who reviewed at least one item in the date range.
- "Avg Resp Time" is the median time from a message entering the queue to a decision being made.
- The review outcomes bar chart is a simple horizontal proportional bar, not a pie chart.

**Flags & Alerts Tab**
- "Top Flagged Keywords" table is sorted by total match count, descending.
- Resolution Status bars use `█` for the filled portion and `░` for the remainder, proportional to 100%.
- "Flags by Category" table includes a mini inline bar for visual weight.
- Clicking a keyword row in the table navigates to the Keyword Alerts page filtered to that keyword.

**Visitors Tab**
- The three summary cards mirror the stat card style from the Dashboard.
- Visit Volume Trend counts completed visits per day, not applications.
- Denial Reasons table covers the full date range, not just the 7-day chart window.

**Export Modal**
- CSV exports raw tabular data. PDF exports a formatted summary with charts rendered as tables.
- The modal always shows the currently active tab's report name and the selected date range.
- After clicking Download, the modal closes and a toast confirms the file is downloading.
