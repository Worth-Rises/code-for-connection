# Wireframe: Shared Modals

**Component:** Shared modal dialogs used across multiple screens
**Used by:** Voice/Video monitoring, Contacts, Visitors, Messages, Residents, Housing, Flagged Content

---

## Modal Layout Convention

All modals follow this pattern:
- Centered overlay with a semi-transparent backdrop
- Fixed width (~480px / ~60 chars in ASCII)
- Title bar, body content, optional form fields, action buttons
- [Cancel] always on the left, primary action on the right
- Destructive actions (Terminate, Deny, Block) use a danger-styled primary button

---

## 1. ConfirmTerminateModal

**Used by:** Voice Call Monitoring, Video Call Monitoring

```
  ┌──────────────────── Terminate Call ─────────────────────────┐
  │                                                              │
  │  Are you sure you want to terminate this call between        │
  │  John Doe (#r-4821) and Alice Johnson?                       │
  │                                                              │
  │  This action cannot be undone. The call will be             │
  │  disconnected immediately and both parties notified.         │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                           [Cancel]   [!! Terminate Call !!]  │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- Resident name, ID, and contact name are injected from the call record.
- Reason field is required. [Terminate Call] stays disabled until at least 3 characters are entered.
- On confirm: call is terminated server-side via the signaling server, reason is written to the call record, and the action is audit-logged.
- [!! Terminate Call !!] renders as a red/danger button in the UI.
- Modal closes automatically after a successful termination. A toast confirms: "Call #vc-892 terminated."

---

## 2. ConfirmDenyModal

**Used by:** Contacts (deny contact request), Visitors (deny visitor application), Video Requests (deny video request)

```
  ┌──────────────────── Deny Contact ───────────────────────────┐
  │                                                              │
  │  You are about to deny this contact request.                 │
  │                                                              │
  │  Contact:  Alice Johnson                                     │
  │  Resident: John Doe (#r-4821)                                │
  │                                                              │
  │  This action is logged and the applicant will not be         │
  │  notified automatically.                                     │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                                  [Cancel]   [Deny Contact]   │
  └──────────────────────────────────────────────────────────────┘
```

**Title variants by context**
```
  "Deny Contact"         — contact approval flow
  "Deny Visitor"         — visitor application flow
  "Deny Video Request"   — video request flow
```

**Annotations**
- Title and entity details are injected based on context. The modal component accepts `entityType`, `entityName`, and `residentName` as props.
- Reason is required. Stored on the entity record as `denialReason`.
- Audit log entry is created on confirm with action `contact_denied`, `visitor_denied`, or `video_request_denied`.
- The denied entity's status updates to `denied` in the list view without a page reload.

---

## 3. ConfirmBlockModal

**Used by:** Messages (block conversation), Conversations, Blocked Numbers (block a phone number)

### Variant A — Block a Message / Conversation

```
  ┌──────────────────── Block Conversation ─────────────────────┐
  │                                                              │
  │  You are about to block all future messages between          │
  │  John Doe (#r-4821) and Alice Johnson.                       │
  │                                                              │
  │  Existing messages are not deleted. No new messages          │
  │  can be sent or received in this conversation.               │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                          [Cancel]   [!! Block Conversation !!]│
  └──────────────────────────────────────────────────────────────┘
```

### Variant B — Block a Phone Number

```
  ┌──────────────────── Block Phone Number ─────────────────────┐
  │                                                              │
  │  Block this number from placing or receiving calls.          │
  │                                                              │
  │  Phone Number: +1-555-0142                                   │
  │                                                              │
  │  Scope                                                       │
  │  (•) Agency-wide  — applies to all facilities                │
  │  ( ) Facility only — applies to Sing Sing only               │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │                                                              │
  │                           [Cancel]   [!! Block Number !!]    │
  └──────────────────────────────────────────────────────────────┘
```

**Title variants by context**
```
  "Block Conversation"   — messaging flow
  "Block Phone Number"   — blocked numbers flow
```

**Annotations**
- Scope selector only appears in the phone number variant. Facility admins see the radio group but "Agency-wide" is disabled.
- Reason is required in all variants.
- Blocking a conversation does not delete messages. It sets `status: blocked` on the conversation record.
- Blocking a phone number adds a row to the `blocked_numbers` table with the chosen scope.
- Both actions are audit-logged.

---

## 4. ApproveContactModal

**Used by:** Contacts (approve a pending contact request)

```
  ┌──────────────────── Approve Contact ────────────────────────┐
  │                                                              │
  │  Review and approve this contact request.                    │
  │                                                              │
  │  Contact Details                                             │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Name:         Alice Johnson                            │  │
  │  │ Relationship: Sister                                   │  │
  │  │ Phone:        +1-555-0142                              │  │
  │  │ Email:        alice@example.com                        │  │
  │  │ Resident:     John Doe (#r-4821)                       │  │
  │  │ Submitted:    Mar 5, 2026                              │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  Notes (optional)                                            │
  │  [__________________________________________________________] │
  │                                                              │
  │                          [Cancel]   [Approve Contact]        │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- Contact details are read-only. The admin cannot edit them here.
- Notes field is optional. If filled, stored as `reviewNotes` on the contact record.
- On approve: contact status updates to `approved`, `approvedBy` and `reviewedAt` are set, audit log records `contact_approved`.
- If the resident is already at their max-visitors limit, [Approve Contact] is disabled and a warning shows: "John Doe has reached the maximum of 15 approved contacts."

---

## 5. AttorneyFlagModal

**Used by:** Contacts (flag a contact as attorney with attorney-client privilege)

```
  ┌──────────── Flag as Attorney-Client Privilege ──────────────┐
  │                                                              │
  │  !! Warning                                                  │
  │  Calls and messages with this contact will NOT be            │
  │  recorded or monitored while this flag is active.            │
  │  This flag is audit-logged and subject to review.            │
  │                                                              │
  │  Contact: Alice Johnson (+1-555-0142)                        │
  │                                                              │
  │  Bar Number (required)                                       │
  │  [__________________________________________________________] │
  │                                                              │
  │  Jurisdiction (required)                                     │
  │  [__________________________________________________________] │
  │  e.g. New York State Bar, Southern District of NY            │
  │                                                              │
  │                           [Cancel]   [Confirm Flag]          │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- Both Bar Number and Jurisdiction are required before [Confirm Flag] enables.
- The warning block renders with an amber/yellow background in the UI to draw attention.
- On confirm: `isAttorney` flag is set to `true` on the contact record, `barNumber` and `jurisdiction` are stored, audit log records `attorney_flag_set`.
- Removing the flag uses a separate confirmation (not this modal). The flag removal is also audit-logged.
- Recording suppression is enforced at the signaling/media layer, not just the UI.

---

## 6. MoveResidentModal

**Used by:** Housing (move a resident to a different unit within the same facility)

```
  ┌──────────────────── Move Resident ──────────────────────────┐
  │                                                              │
  │  Resident:         John Doe (#r-4821)                        │
  │  Current Location: Block A, Cell 14  (Sing Sing)             │
  │                                                              │
  │  Target Unit                                                 │
  │  [Block C ▼]                                                 │
  │                                                              │
  │  Target Cell                                                 │
  │  [Cell 07 ▼]   Capacity: 1/2 occupied                       │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                            [Cancel]   [Confirm Move]         │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- Target Unit dropdown lists all units within the current facility.
- Target Cell dropdown updates when Target Unit changes, showing only cells in that unit.
- Capacity indicator ("1/2 occupied") helps admins avoid overfilling cells.
- Cells at full capacity are shown in the dropdown but disabled with a "(Full)" label.
- Reason is required.
- On confirm: resident's `housingUnit` and `cell` are updated, audit log records `resident_moved` with old and new locations.

---

## 7. TransferResidentModal

**Used by:** Housing (agency admin only — transfer a resident to a different facility)

```
  ┌──────────────────── Transfer Resident ──────────────────────┐
  │                                                              │
  │  Resident:         John Doe (#r-4821)                        │
  │  Current Facility: Sing Sing Correctional Facility           │
  │  Current Unit:     Block A, Cell 14                          │
  │                                                              │
  │  Target Facility                                             │
  │  [Select facility... ▼]                                      │
  │                                                              │
  │  Target Unit                                                 │
  │  [Select unit... ▼]   (updates when facility is chosen)      │
  │                                                              │
  │  Target Cell                                                 │
  │  [Select cell... ▼]   (updates when unit is chosen)          │
  │                                                              │
  │  Reason (required)                                           │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                         [Cancel]   [Confirm Transfer]        │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- This modal is only reachable by agency admins. Facility admins do not see the "Transfer" action.
- Target Facility dropdown lists all facilities in the agency except the current one.
- Target Unit and Target Cell dropdowns are disabled until the preceding selection is made.
- Capacity is shown next to each cell option, same as MoveResidentModal.
- On confirm: resident's `facilityId`, `housingUnit`, and `cell` are all updated. Audit log records `resident_transferred` with full before/after snapshot.
- All approved contacts and visitors remain associated with the resident after transfer. Facility admins at the destination facility gain visibility of the resident.

---

## 8. EscalateModal

**Used by:** Flagged Content (escalate a flagged message or call to another admin for review)

```
  ┌──────────────────── Escalate Flagged Content ───────────────┐
  │                                                              │
  │  Escalate this item to another admin for review.             │
  │                                                              │
  │  Item:    Message #m-7764                                    │
  │  Flagged: Keyword match — 'shank'                            │
  │  Resident: John Doe (#r-4821)                                │
  │                                                              │
  │  Target Admin (required)                                     │
  │  [Select admin... ▼]                                         │
  │  admin@nydocs.gov — Agency Admin                             │
  │  admin@singsingcf.gov — Sing Sing Facility Admin             │
  │                                                              │
  │  Notes (optional)                                            │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │  [__________________________________________________________] │
  │                                                              │
  │                              [Cancel]   [Escalate]           │
  └──────────────────────────────────────────────────────────────┘
```

**Annotations**
- Target Admin dropdown lists admins within the same agency who have the "View Flagged Content" permission.
- The escalating admin is excluded from the dropdown (you can't escalate to yourself).
- Notes are optional but encouraged. Stored as `escalationNotes` on the flagged content record.
- On confirm: flagged item status updates to `escalated`, `escalatedTo` and `escalatedAt` are set, the target admin receives an in-app notification (bell icon), and the audit log records `content_escalated`.
- The item remains visible to the original admin after escalation. Both admins can act on it.
- If the target admin has already reviewed the item, a warning shows: "This admin has already reviewed this item."
