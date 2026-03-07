# Wireframe: Voice Monitoring

**Screen:** `VoiceMonitoringPage` + `CallDetailView`
**Route:** `/monitoring/voice` + `/monitoring/voice/:callId`

---

## Screen 1: VoiceMonitoringPage — Active Calls Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Voice Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌─────────┐ │
│  👥 Residents│  │  Active Calls    │ │  Today Total     │ │ Avg Duration │ │Terminatd│ │
│  🤝 Contacts │  │       3          │ │       47         │ │    12m       │ │    1    │ │
│  🚪 Visitors │  └──────────────────┘ └──────────────────┘ └──────────────┘ └─────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Active Calls (3) ]  [ Call History ]              [↻ Refresh]  │
│ >>📞 Voice   ├──────────────────────────────────────────────────────────────────────────┤
│  📹 Video    │  ⟳ Auto-refresh: 5s   [↻ Refresh Now]              Last: 9:17:42  │
│  💬 Messages │                                                                          │
│              │  ┌──────────────┬──────────────┬─────────┬──────────┬──────────┬───────┐│
│  INTELLIGENCE│  │ Resident     │ Contact      │ Started │ Duration │ Status   │Actions││
│  🔍 Search   │  ├──────────────┼──────────────┼─────────┼──────────┼──────────┼───────┤│
│              │  │ John Doe     │ Alice Johnson│ 9:13 AM │  4:23    │ LIVE     │[Term.]││
│  OPERATIONS  │  │ #4821        │ (Sister)     │         │          │          │       ││
│  🏠 Housing  │  ├──────────────┼──────────────┼─────────┼──────────┼──────────┼───────┤│
│  📈 Reports  │  │ Michael Smith│ Carol Davis  │ 9:09 AM │  8:47    │ LIVE     │[Term.]││
│  📋 Audit Log│  │ #3302        │ (Spouse)     │         │          │          │       ││
│  ⚙️ Settings │  ├──────────────┼──────────────┼─────────┼──────────┼──────────┼───────┤│
│              │  │ Robert       │ Frank Wilson │ 9:15 AM │  2:11    │ LIVE     │[Term.]││
│              │  │ Johnson #2190│ (Attorney)   │         │          │ ATTY     │       ││
│              │  └──────────────┴──────────────┴─────────┴──────────┴──────────┴───────┘│
│              │                                                                          │
│              │  Note: Attorney calls are monitored for scheduling only. Content is     │
│              │  privileged and not subject to keyword analysis.                        │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Stats bar shows real-time counts. "Terminated: 1" links to the terminated call in history.
- Duration column ticks up live via Socket.io — displayed as M:SS format.
- [Term.] = [Terminate] button. Clicking opens a confirmation modal before ending the call.
- Attorney calls show "ATTY" status badge and the Terminate button is disabled (greyed out).
- "⟳ Auto-refresh: 5s" shows the auto-refresh interval. [↻ Refresh Now] forces an immediate data fetch. Last-refresh timestamp shown at far right.
- Manual [↻ Refresh Now] is always available and does NOT reset the auto-refresh timer. Useful when admin wants instant data without waiting for next auto-cycle.

---

## Screen 2: VoiceMonitoringPage — Call History Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Voice Monitoring                                                        │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌─────────┐ │
│  👥 Residents│  │  Active Calls    │ │  Today Total     │ │ Avg Duration │ │Terminatd│ │
│  🤝 Contacts │  │       3          │ │       47         │ │    12m       │ │    1    │ │
│  🚪 Visitors │  └──────────────────┘ └──────────────────┘ └──────────────┘ └─────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Active Calls (3) ]  [ Call History ]                                  │
│ >>📞 Voice   ├──────────────────────────────────────────────────────────────────────────┤
│  📹 Video    │  [Date Range___________] [Resident ▼] [Contact ▼] [Status ▼] [Search___]│
│  💬 Messages │                                                                          │
│              │  ┌──────────────┬──────────────┬──────────────┬──────────┬────────────┐ │
│  INTELLIGENCE│  │ Date / Time  │ Resident     │ Contact      │ Duration │ Status     │ │
│  🔍 Search   │  ├──────────────┼──────────────┼──────────────┼──────────┼────────────┤ │
│              │  │ Mar 7, 9:02  │ David        │ Grace Lee    │  14m 32s │ Completed  │ │
│  OPERATIONS  │  │              │ Williams     │ (Mother)     │          │            │ │
│  🏠 Housing  │  ├──────────────┼──────────────┼──────────────┼──────────┼────────────┤ │
│  📈 Reports  │  │ Mar 7, 8:51  │ James Brown  │ Eva Martinez │   3m 07s │ Terminated │ │
│  📋 Audit Log│  │              │ #1847        │ (Friend)     │          │ by: Admin  │ │
│  ⚙️ Settings │  ├──────────────┼──────────────┼──────────────┼──────────┼────────────┤ │
│              │  │ Mar 7, 8:44  │ John Doe     │ Alice Johnson│  18m 55s │ Completed  │ │
│              │  │              │ #4821        │ (Sister)     │          │            │ │
│              │  ├──────────────┼──────────────┼──────────────┼──────────┼────────────┤ │
│              │  │ Mar 7, 8:30  │ Michael Smith│ Bob Williams │   0m 42s │ Missed     │ │
│              │  │              │ #3302        │ (Brother)    │          │            │ │
│              │  ├──────────────┼──────────────┼──────────────┼──────────┼────────────┤ │
│              │  │ Mar 7, 8:15  │ Sarah Davis  │ Diana Chen   │  22m 10s │ Completed  │ │
│              │  │              │ #0091        │ (Daughter)   │          │            │ │
│              │  └──────────────┴──────────────┴──────────────┴──────────┴────────────┘ │
│              │                                                                          │
│              │  Showing 1-20 of 847    [< Prev]  1  2  3  ...  43  [Next >]            │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Each row is clickable and navigates to CallDetailView.
- Status values: "Completed", "Terminated" (shows who ended it), "Missed" (no answer).
- "Terminated by: Admin" shows the admin username on hover/expand.
- Date Range picker defaults to today. Filters apply immediately on change.
- Pagination shows total record count. Page size is fixed at 20.

---

## Screen 3: CallDetailView

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  ← Back to Call History                                                  │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  Call Detail — Mar 7, 2026 at 8:44 AM                                   │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  ┌──────────────────────────────────────┐ ┌───────────────────────────┐ │
│  🚪 Visitors │  │ CALL METADATA                        │ │ CALL TIMELINE             │ │
│              │  ├──────────────────────────────────────┤ ├───────────────────────────┤ │
│  MONITORING  │  │ Resident:   John Doe (#4821)         │ │  8:44:02  ○ Ringing       │ │
│ >>📞 Voice   │  │ Contact:    Alice Johnson (Sister)   │ │           │               │ │
│  📹 Video    │  │ Facility:   Sing Sing CF             │ │  8:44:09  ● Connected     │ │
│  💬 Messages │  │ Unit:       Block C, Cell 14         │ │           │               │ │
│              │  │                                      │ │  8:51:33  ⚑ Keyword match │ │
│  INTELLIGENCE│  │ Started:    8:44:09 AM               │ │           │  "money"      │ │
│  🔍 Search   │  │ Ended:      9:03:04 AM               │ │           │               │ │
│              │  │ Duration:   18m 55s                  │ │  9:03:04  ■ Call ended    │ │
│  OPERATIONS  │  │                                      │ │           (resident hung  │ │
│  🏠 Housing  │  │ Status:     Completed                │ │            up)            │ │
│  📈 Reports  │  │ Ended By:   Resident                 │ │                           │ │
│  📋 Audit Log│  │                                      │ │                           │ │
│  ⚙️ Settings │  │ Recording:  [Play Recording]         │ │                           │ │
│              │  └──────────────────────────────────────┘ └───────────────────────────┘ │
│              │                                                                          │
│              │  ── Keyword Matches ────────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────┬──────────┬──────────────────────────────┬──────────────┐ │
│              │  │ Time     │ Keyword  │ Context (excerpt)            │ Severity     │ │
│              │  ├──────────┼──────────┼──────────────────────────────┼──────────────┤ │
│              │  │ 8:51:33  │ "money"  │ "...just need the money by   │ {Watchlist}  │ │
│              │  │          │          │  Friday or else..."          │              │ │
│              │  └──────────┴──────────┴──────────────────────────────┴──────────────┘ │
│              │                                                                          │
│              │  ── Admin Notes ────────────────────────────────────────────────────── │
│              │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────┐  │
│              │  │ Mar 7, 9:05 AM — J. Rivera                                       │  │
│              │  │ Reviewed keyword match. Context appears to be a personal finance  │  │
│              │  │ discussion. No further action taken.                              │  │
│              │  └──────────────────────────────────────────────────────────────────┘  │
│              │                                                                          │
│              │  [Add Note]                                                              │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- "← Back to Call History" preserves the previous filter/pagination state.
- Call Timeline is a vertical sequence. Each event has a timestamp and icon: ○ ringing, ● connected, ⚑ flagged event, ■ ended.
- Keyword match rows link to the specific timestamp in the recording (if playback is available).
- Severity badges: {Blacklist} = auto-blocked (red), {Greylist} = flagged for review (amber), {Watchlist} = alert only (blue).
- Admin Notes are append-only. Each note shows author and timestamp. [Add Note] opens an inline textarea.
- [Play Recording] is only shown if recording is enabled for this facility.
