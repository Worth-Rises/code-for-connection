# Wireframe: Search & Keyword Alerts

**Screens:** `SearchPage` · `KeywordAlertsPage`
**Routes:** `/search` · `/alerts/keywords`

---

## Screen 1: SearchPage (empty state)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Search                                                                  │
│              │                                                                          │
│  📊 Dashboard│                                                                          │
│              │                                                                          │
│  MANAGEMENT  │          ┌────────────────────────────────────────────────────────────┐  │
│  👥 Residents│          │ 🔍  Search residents, contacts, messages, calls...         │  │
│  🤝 Contacts │          └────────────────────────────────────────────────────────────┘  │
│  🚪 Visitors │                                                                          │
│              │                                                                          │
│  MONITORING  │                                                                          │
│  📞 Voice    │                  Enter a search term to find residents,                  │
│  📹 Video    │                  contacts, messages, and calls.                          │
│  💬 Messages │                                                                          │
│              │                                                                          │
│  INTELLIGENCE│                                                                          │
│ >>🔍 Search  │                                                                          │
│  🚨 Alerts   │                                                                          │
│              │                                                                          │
│  OPERATIONS  │                                                                          │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│                                                                          │
│  ⚙️ Settings │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: SearchPage (results for "johnson")

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Search                                                                  │
│              │                                                                          │
│  📊 Dashboard│  ┌──────────────────────────────────────────────────────────────────┐   │
│              │  │ 🔍  johnson                                                       │   │
│  MANAGEMENT  │  └──────────────────────────────────────────────────────────────────┘   │
│  👥 Residents│  22 results across 4 categories                                         │
│  🤝 Contacts │                                                                          │
│  🚪 Visitors │  ── Residents (3) ──────────────────────────────────────────────────── │
│              │                                                                          │
│  MONITORING  │  ┌──────────────────┬──────────┬──────────────────────┬────────────┐   │
│  📞 Voice    │  │ Name             │ ID#      │ Facility             │ Unit       │   │
│  📹 Video    │  ├──────────────────┼──────────┼──────────────────────┼────────────┤   │
│  💬 Messages │  │ Robert Johnson   │ #4892    │ Sing Sing            │ Block A-1  │   │
│              │  │ Marcus Johnson   │ #5103    │ Sing Sing            │ Block C-3  │   │
│  INTELLIGENCE│  │ Darnell Johnson  │ #6217    │ Bedford Hills        │ Unit 7     │   │
│ >>🔍 Search  │  └──────────────────┴──────────┴──────────────────────┴────────────┘   │
│  🚨 Alerts   │                                              View all 3 results →       │
│              │                                                                          │
│  OPERATIONS  │  ── Contacts (5) ───────────────────────────────────────────────────── │
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  ┌──────────────────┬──────────────────────────┬──────────────────┐    │
│  📋 Audit Log│  │ Name             │ Linked Resident          │ Status           │    │
│  ⚙️ Settings │  ├──────────────────┼──────────────────────────┼──────────────────┤    │
│              │  │ Alice Johnson    │ John Doe (#4821)         │ ✓ Approved       │    │
│              │  │ Grace Johnson    │ Michael Smith (#5678)    │ ✓ Approved       │    │
│              │  │ Tamara Johnson   │ Robert Johnson (#4892)   │ ⏳ Pending       │    │
│              │  │ Kevin Johnson    │ Marcus Johnson (#5103)   │ ✓ Approved       │    │
│              │  │ Denise Johnson   │ David Williams (#3456)   │ ✗ Denied         │    │
│              │  └──────────────────┴──────────────────────────┴──────────────────┘    │
│              │                                              View all 5 results →       │
│              │                                                                          │
│              │  ── Messages (12) ──────────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────────────────────────┬──────────────┬────────────┐  │
│              │  │ Snippet                               │ Participants │ Date       │  │
│              │  ├──────────────────────────────────────┼──────────────┼────────────┤  │
│              │  │ "...tell Johnson I said hello and..." │ Doe → Smith  │ Mar 6      │  │
│              │  │ "...Johnson's hearing is next week..."│ Smith → Doe  │ Mar 5      │  │
│              │  │ "...ask Alice Johnson if she can..."  │ Doe → Rivera │ Mar 4      │  │
│              │  └──────────────────────────────────────┴──────────────┴────────────┘  │
│              │                                             View all 12 results →       │
│              │                                                                          │
│              │  ── Calls (2) ───────────────────────────────────────────────────────  │
│              │                                                                          │
│              │  ┌──────────────────────────────────────┬────────────┬────────────┐    │
│              │  │ Participants                          │ Date       │ Duration   │    │
│              │  ├──────────────────────────────────────┼────────────┼────────────┤    │
│              │  │ Robert Johnson (#4892) ↔ Alice Johnson│ Mar 6      │ 12m 34s    │    │
│              │  │ Marcus Johnson (#5103) ↔ Kevin Johnson│ Mar 5      │ 8m 02s     │    │
│              │  └──────────────────────────────────────┴────────────┴────────────┘    │
│              │                                              View all 2 results →       │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 3: KeywordAlertsPage

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Keyword Alerts                                    [+ Add Alert]         │
│              │                                                                          │
│  📊 Dashboard│  [Tier ▼]  [Category ▼]  [Severity ▼]  [Active Only ☑]                 │
│              │                                                                          │
│  MANAGEMENT  │  ┌──────────────┬────────────┬──────────────┬──────┬──────────────────┐ │
│  👥 Residents│  │ Keyword      │ Tier       │ Category     │ Sev. │ Scope            │ │
│  🤝 Contacts │  ├──────────────┼────────────┼──────────────┼──────┼──────────────────┤ │
│  🚪 Visitors │  │ heroin       │ blacklist  │ drug         │ HIGH │ Agency-wide      │ │
│              │  │ fentanyl     │ blacklist  │ drug         │ HIGH │ Agency-wide      │ │
│  MONITORING  │  │ take care of │ greylist   │ coded_threat │ HIGH │ Agency-wide      │ │
│  📞 Voice    │  │ handle it    │ greylist   │ coded_threat │ MED  │ Sing Sing        │ │
│  📹 Video    │  │ colors       │ watchlist  │ gang         │ LOW  │ Agency-wide      │ │
│  💬 Messages │  │ set          │ watchlist  │ gang         │ LOW  │ Agency-wide      │ │
│              │  │ burner       │ greylist   │ contraband   │ MED  │ Agency-wide      │ │
│  INTELLIGENCE│  │ kite         │ watchlist  │ contraband   │ LOW  │ Bedford Hills    │ │
│  🔍 Search   │  │ green light  │ blacklist  │ violence     │ HIGH │ Agency-wide      │ │
│ >>🚨 Alerts  │  │ move on him  │ blacklist  │ violence     │ HIGH │ Sing Sing        │ │
│              │  └──────────────┴────────────┴──────────────┴──────┴──────────────────┘ │
│  OPERATIONS  │                                                                          │
│  🏠 Housing  │  (continued)                                                             │
│  📈 Reports  │                                                                          │
│  📋 Audit Log│  ┌──────────────┬────────────┬──────────────┬──────┬──────────────────┐ │
│  ⚙️ Settings │  │ Matches      │ Active     │              │      │                  │ │
│              │  ├──────────────┼────────────┼──────────────┼──────┼──────────────────┤ │
│              │  │ 47           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 31           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 23           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 8            │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 19           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 14           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 6            │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 3            │ [● OFF]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 52           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  │ 11           │ [ON  ●]    │ [Edit]       │ [View Matches]          │ │
│              │  └──────────────┴────────────┴──────────────┴──────┴──────────────────┘ │
│              │                                                                          │
│              │  Showing 10 of 34 alerts    [< Prev]  Page 1 of 4  [Next >]             │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Modal: Add / Edit Keyword Alert

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR     │  Keyword Alerts                                    [+ Add Alert]         │
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
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              │                                                                          │
│              │         ┌─────────────── Add Keyword Alert ───────────────┐             │
│              │         │                                                  │             │
│              │         │  Keyword:    [_______________________________]   │             │
│              │         │  Is Regex:   [ ] (check to use regex pattern)    │             │
│              │         │                                                  │             │
│              │         │  Tier:       [blacklist ▼]                       │             │
│              │         │  Category:   [drug ▼]                            │             │
│              │         │  Severity:   (•) High  ( ) Medium  ( ) Low       │             │
│              │         │                                                  │             │
│              │         │  Scope:      (•) Agency-wide                     │             │
│              │         │              ( ) Facility: [Select facility ▼]   │             │
│              │         │                                                  │             │
│              │         │                  [Cancel]  [Save Alert]          │             │
│              │         └──────────────────────────────────────────────────┘             │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

---

## Annotations

**SearchPage — Empty State**
- The search bar is centered and prominent, the only element on screen.
- Placeholder text lists all searchable entity types so admins know the scope.
- Search triggers on Enter or after a short debounce (300ms).

**SearchPage — Results**
- Results are grouped by entity type, each in its own labeled section.
- Sections only appear if that type has at least one match. Zero-result types are hidden.
- Each row is clickable and navigates to the full entity detail page.
- "View all X results" links open a filtered list view for that entity type only.
- The global count ("22 results across 4 categories") updates as the query changes.

**KeywordAlertsPage — Table**
- Tier values: `blacklist` (auto-block, red badge), `greylist` (flag for review, amber badge), `watchlist` (alert only, blue badge).
- Severity badges: `HIGH` (red), `MED` (amber), `LOW` (grey).
- The Active toggle is an inline switch. Toggling it takes effect immediately with a brief confirmation toast.
- "View Matches" opens a filtered Messages/Calls list showing all content that triggered that keyword.
- Scope shows "Agency-wide" or the specific facility name when scoped to one facility.

**Add/Edit Alert Modal**
- "Is Regex" checkbox reveals a small helper note: "Use standard regex syntax. Tested against message body only."
- Tier dropdown options: blacklist, greylist, watchlist.
- Category dropdown options: drug, violence, gang, contraband, coded_threat, other.
- Facility selector only appears when the "Facility" scope radio is selected.
- Edit mode pre-fills all fields and shows a "Last modified by / date" line at the bottom.
