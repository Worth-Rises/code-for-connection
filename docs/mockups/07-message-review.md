# Wireframe: Message Review

**Screen:** `MessageReviewPage` + `ConversationView`
**Route:** `/monitoring/messages` + `/monitoring/messages/:conversationId`

---

## Screen 1: MessageReviewPage — Pending Review Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Message Review                                                          │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  👥 Residents│  │  Pending Review      │ │  Flagged Attachments │ │  Today Reviewed   │ │
│  🤝 Contacts │  │         23           │ │          3           │ │       156         │ │
│  🚪 Visitors │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Pending Review {23} ]  [ Attachments {3} ]  [ Conversations ]         │
│  📞 Voice    ├──────────────────────────────────────────────────────────────────────────┤
│  📹 Video    │  Sorted: Oldest first                              [Newest first ▼]      │
│ >>💬 Messages│                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│  INTELLIGENCE│  │ 8:02 AM  John Doe #4821  →  Alice Johnson                            ││
│  🔍 Search   │  │ "Hey I need you to bring the money to the lawyer before..."          ││
│              │  │ {Greylist}                                          [Expand ▼]       ││
│  OPERATIONS  │  └──────────────────────────────────────────────────────────────────────┘│
│  🏠 Housing  │                                                                          │
│  📈 Reports  │  ┌──────────────────────────────────────────────────────────────────────┐│
│  📋 Audit Log│  │ 8:14 AM  Michael Smith #3302  →  Carol Davis                         ││
│  ⚙️ Settings │  │ "I told you not to contact him. Just wait until I get out and we..." ││
│              │  │ {Greylist}                                          [Expand ▼]       ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │ 8:31 AM  Robert Johnson #2190  →  Bob Williams                       ││
│              │  │ "The package should arrive Thursday. Don't open it until I say..."   ││
│              │  │ {Watchlist}                                         [Expand ▼]       ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │ 8:47 AM  David Williams #0774  →  Grace Lee                          ││
│              │  │ "Can you call the number I gave you and ask for the stuff we..."     ││
│              │  │ {Greylist}                                          [Expand ▼]       ││
│              │  │                                                                      ││
│              │  │  ── Expanded ──────────────────────────────────────────────────────  ││
│              │  │                                                                      ││
│              │  │  Full message:                                                       ││
│              │  │  "Can you call the number I gave you and ask for the stuff we       ││
│              │  │   talked about last time. Make sure you use the other phone."       ││
│              │  │                                                                      ││
│              │  │  Keyword matched: "stuff" (Greylist)                                ││
│              │  │                                                                      ││
│              │  │  Thread context (2 prior messages):                                 ││
│              │  │  ┌────────────────────────────────────────────────────────────────┐ ││
│              │  │  │ Mar 6, 3:12 PM — Grace Lee:                                    │ ││
│              │  │  │ "Did you get my last letter? I haven't heard back."             │ ││
│              │  │  ├────────────────────────────────────────────────────────────────┤ ││
│              │  │  │ Mar 6, 4:45 PM — David Williams:                               │ ││
│              │  │  │ "Yes I got it. Everything is fine. Just need one more thing."   │ ││
│              │  │  └────────────────────────────────────────────────────────────────┘ ││
│              │  │                                                                      ││
│              │  │  [Approve]   [Block]                                                 ││
│              │  │                                                                      ││
│              │  │  Block reason (required if blocking): [_______________________________]││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
│              │  Showing 4 of 23 pending    [Load More]                                  │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Queue is sorted oldest-first by default so the most time-sensitive messages are reviewed first.
- Severity badges: {Blacklist} = auto-blocked, never appears in pending queue. {Greylist} = flagged for human review (appears here). {Watchlist} = alert-only, appears here for awareness but can be approved quickly.
- [Expand] toggles the full message body, thread context, and action buttons inline.
- "Block reason" is a required text field. [Block] is disabled until the field has content.
- [Approve] marks the message as reviewed and delivers it to the recipient.
- Blacklist matches are auto-blocked by the system and appear in the Conversations tab with a blocked status, not in this queue.

---

## Screen 2: MessageReviewPage — Attachments Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Message Review                                                          │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  👥 Residents│  │  Pending Review      │ │  Flagged Attachments │ │  Today Reviewed   │ │
│  🤝 Contacts │  │         23           │ │          3           │ │       156         │ │
│  🚪 Visitors │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MONITORING  │  [ Pending Review {23} ]  [ Attachments {3} ]  [ Conversations ]         │
│  📞 Voice    ├──────────────────────────────────────────────────────────────────────────┤
│  📹 Video    │                                                                          │
│ >>💬 Messages│  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │  ┌──────────────┐  Sender:       Alice Johnson                       ││
│  INTELLIGENCE│  │  │              │  Conversation: Alice Johnson / John Doe #4821      ││
│  🔍 Search   │  │  │  [IMAGE]     │  Sent:         Mar 7, 8:05 AM                      ││
│              │  │  │              │  Flagged:      Automated scan — possible document  ││
│  OPERATIONS  │  │  │  photo.jpg   │                                                    ││
│  🏠 Housing  │  │  │  (142 KB)    │  [Approve]  [Reject]                               ││
│  📈 Reports  │  │  └──────────────┘                                                    ││
│  📋 Audit Log│  └──────────────────────────────────────────────────────────────────────┘│
│  ⚙️ Settings │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │  ┌──────────────┐  Sender:       Carol Davis                         ││
│              │  │  │              │  Conversation: Carol Davis / Michael Smith #3302   ││
│              │  │  │  [IMAGE]     │  Sent:         Mar 7, 8:20 AM                      ││
│              │  │  │              │  Flagged:      Automated scan — possible contraband ││
│              │  │  │  scan001.pdf │  reference in filename                             ││
│              │  │  │  (88 KB)     │                                                    ││
│              │  │  └──────────────┘  [Approve]  [Reject]                               ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │  ┌──────────────┐  Sender:       Eva Martinez                        ││
│              │  │  │              │  Conversation: Eva Martinez / James Brown #1847    ││
│              │  │  │  [IMAGE]     │  Sent:         Mar 7, 9:01 AM                      ││
│              │  │  │              │  Flagged:      Automated scan — image content      ││
│              │  │  │  family.jpg  │                                                    ││
│              │  │  │  (2.1 MB)    │  [Approve]  [Reject]                               ││
│              │  │  └──────────────┘                                                    ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Attachments are flagged by an automated scan before delivery. Admins make the final call.
- The image placeholder box represents a thumbnail preview. Clicking it opens a full-size lightbox.
- "Flagged reason" is generated by the automated scanner and shown as context for the reviewer.
- [Approve] delivers the attachment. [Reject] blocks it and notifies the sender.
- Reject requires a reason (same pattern as message blocking).

---

## Screen 3: MessageReviewPage — Conversations Tab

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Message Review                                                          │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  [ Pending Review {23} ]  [ Attachments {3} ]  [ Conversations ]         │
│  👥 Residents├──────────────────────────────────────────────────────────────────────────┤
│  🤝 Contacts │  [Search participants___________]  [Status ▼]  [Facility ▼]              │
│  🚪 Visitors │                                                                          │
│              │  ┌──────────────────────┬──────────┬──────────────┬──────────┬──────────┐│
│  MONITORING  │  │ Participants         │ Messages │ Last Activity│ Status   │ Actions  ││
│  📞 Voice    │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│  📹 Video    │  │ John Doe #4821       │   142    │ Today 8:02AM │ Active   │[View]    ││
│ >>💬 Messages│  │ Alice Johnson        │          │              │          │[Block]   ││
│              │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│  INTELLIGENCE│  │ Michael Smith #3302  │    89    │ Today 8:14AM │ Active   │[View]    ││
│  🔍 Search   │  │ Carol Davis          │          │              │          │[Block]   ││
│              │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│  OPERATIONS  │  │ Robert Johnson #2190 │    34    │ Today 8:31AM │ Active   │[View]    ││
│  🏠 Housing  │  │ Bob Williams         │          │              │          │[Block]   ││
│  📈 Reports  │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│  📋 Audit Log│  │ David Williams #0774 │   211    │ Today 8:47AM │ Active   │[View]    ││
│  ⚙️ Settings │  │ Grace Lee            │          │              │          │[Block]   ││
│              │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│              │  │ James Brown #1847    │    17    │ Mar 6 3:00PM │ Blocked  │[View]    ││
│              │  │ Eva Martinez         │          │              │          │[Unblock] ││
│              │  ├──────────────────────┼──────────┼──────────────┼──────────┼──────────┤│
│              │  │ Sarah Davis #0091    │    58    │ Mar 5 1:22PM │ Active   │[View]    ││
│              │  │ Diana Chen           │          │              │          │[Block]   ││
│              │  └──────────────────────┴──────────┴──────────────┴──────────┴──────────┘│
│              │                                                                          │
│              │  Showing 1-20 of 94    [< Prev]  1  2  3  ...  5  [Next >]              │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- [View] navigates to ConversationView for the full message thread.
- [Block] opens a confirmation modal with a required reason field. Blocks all future messages in this conversation.
- [Unblock] on a blocked conversation opens a confirmation modal. No reason required to unblock.
- Status filter: All / Active / Blocked. Blocked conversations are visually distinct (muted row style).
- Message count includes all messages, not just pending ones.

---

## Screen 4: ConversationView

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  ← Back to Conversations                                                 │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  John Doe #4821  ↔  Alice Johnson                    {Active}            │
│  👥 Residents│                                                                          │
│  🤝 Contacts │  ┌──────────────────────────────────────────┐ ┌───────────────────────┐ │
│  🚪 Visitors │  │ MESSAGE THREAD                           │ │ SIDEBAR               │ │
│              │  ├──────────────────────────────────────────┤ ├───────────────────────┤ │
│  MONITORING  │  │                                          │ │ Resident              │ │
│  📞 Voice    │  │  Mar 6, 3:12 PM                         │ │ John Doe #4821        │ │
│  📹 Video    │  │  ┌──────────────────────────────────┐   │ │ [View Profile →]      │ │
│ >>💬 Messages│  │  │ Grace Lee:                        │   │ │                       │ │
│              │  │  │ "Did you get my last letter?      │   │ │ Contact               │ │
│  INTELLIGENCE│  │  │  I haven't heard back."           │   │ │ Alice Johnson         │ │
│  🔍 Search   │  │  │                              ✓    │   │ │ (Sister)              │ │
│              │  │  └──────────────────────────────────┘   │ │ [View Profile →]      │ │
│  OPERATIONS  │  │                                          │ │                       │ │
│  🏠 Housing  │  │  Mar 6, 4:45 PM                         │ │ Conversation Stats    │ │
│  📈 Reports  │  │  ┌──────────────────────────────────┐   │ │ ─────────────────     │ │
│  📋 Audit Log│  │  │ John Doe:                         │   │ │ Total messages: 142   │ │
│  ⚙️ Settings │  │  │ "Yes I got it. Everything is      │   │ │ Approved:       138   │ │
│              │  │  │  fine. Just need one more thing." │   │ │ Blocked:          2   │ │
│              │  │  │                              ✓    │   │ │ Pending:          2   │ │
│              │  │  └──────────────────────────────────┘   │ │ Started: Feb 12, 2026 │ │
│              │  │                                          │ │ Last msg: Today 8:02  │ │
│              │  │  Mar 7, 8:02 AM                         │ │                       │ │
│              │  │       ┌──────────────────────────────┐  │ │                       │ │
│              │  │       │ John Doe:                     │  │ │                       │ │
│              │  │       │ "Can you call the number I    │  │ │                       │ │
│              │  │       │  gave you and ask for the     │  │ │                       │ │
│              │  │       │  stuff we talked about last   │  │ │                       │ │
│              │  │       │  time. Use the other phone."  │  │ │                       │ │
│              │  │       │  Keyword: "stuff" {Greylist}  │  │ │                       │ │
│              │  │       │                          ⏳   │  │ │                       │ │
│              │  │       └──────────────────────────────┘  │ │                       │ │
│              │  │                                          │ │                       │ │
│              │  │  Mar 7, 8:05 AM                         │ │                       │ │
│              │  │  ┌──────────────────────────────────┐   │ │                       │ │
│              │  │  │ Alice Johnson:                    │   │ │                       │ │
│              │  │  │ "Ok I'll try. Are you doing ok?" │   │ │                       │ │
│              │  │  │                              ✗   │   │ │                       │ │
│              │  │  └──────────────────────────────────┘   │ │                       │ │
│              │  │                                          │ │                       │ │
│              │  ├──────────────────────────────────────────┤ │                       │ │
│              │  │  [Block Conversation]                    │ │                       │ │
│              │  └──────────────────────────────────────────┘ └───────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Message bubbles alternate sides: contact messages on the left, resident messages on the right (indented).
- Status icons per message: ✓ = approved and delivered, ✗ = blocked, ⏳ = pending review.
- Keyword matches are shown inline below the message text with the matched word and severity badge.
- Blocked messages show the message content to the admin but indicate it was not delivered.
- The sidebar shows profile links for both participants and aggregate conversation stats.
- [Block Conversation] is shown when the conversation is active. If already blocked, it shows [Unblock Conversation] instead.
- Clicking [Block Conversation] opens a modal with a required reason field. The block is logged in the audit trail.
- Admins can scroll the full thread history. Pending messages are visually distinct (lighter background or ⏳ icon).
