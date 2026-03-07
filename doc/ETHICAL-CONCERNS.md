# Ethical Concerns: Open Connect

This document flags surveillance, censorship, and due process tensions in the Open Connect platform. It is written for Worth-Rises and for the hackathon team building Code for Connection.

The goal here is to ask questions, not to prescribe answers. Worth-Rises has deep expertise in how carceral technology harms incarcerated people and their families. The team building this system should understand what they are constructing and where it could cause harm, even when the intent is to help.

## 1. Message Pre-Approval as Censorship

Every message in the system, whether sent by an incarcerated person or a family member, enters a `pending_review` state and requires explicit admin approval before delivery (`guilds/messaging/api/routes.ts`, line 237; `prisma/schema.prisma`, MessageStatus enum). There is no path for a message to reach its recipient without passing through an administrator.

Questions for the team:

- Who decides what gets blocked, and on what criteria? The codebase defines no blocking criteria. An admin can block any message for any reason, and the system records no justification.
- Does the sender know their message was blocked? The Message model has a `status` field that transitions to `blocked`, but the messaging UI shows no indication to the sender that their message was suppressed. From the sender's perspective, blocked messages may simply vanish.
- Should attorney-flagged conversations (`isAttorney` on ApprovedContact) be exempt from content review? Attorney-client privilege is a legal right. Reviewing those messages may violate it.
- What happens to review backlogs? If the pending queue grows faster than admins can review, messages are effectively delayed indefinitely. For time-sensitive communications (medical updates, legal deadlines, family emergencies), this delay is itself a form of suppression.
- The `messageReviewRequired` field proposed in the admin-ops spec suggests review could be made optional per facility. Is the default "review everything" or "deliver everything"? That default encodes a significant value judgment.

## 2. Keyword Alerts as Mass Scanning

The admin-ops spec (`doc/admin-ops-spec-latest.txt`, lines 154-178) defines a `KeywordAlert` model and a `FlaggedContent` model. Admins can configure keywords (including regular expressions) that trigger automated scanning of all messages. Matched content is routed to a `FlaggedContent` queue with severity levels and assignment workflows.

Questions for the team:

- This is automated mass surveillance of a vulnerable population's private communications. Is the team comfortable with that framing? If not, what distinguishes this from mass surveillance?
- Who decides which keywords to add? The `KeywordAlert` model tracks `createdBy` but defines no approval process for adding new keywords. A single admin could add politically sensitive terms, terms related to legal advocacy, or terms targeting specific individuals.
- The `isRegex` flag allows pattern matching far beyond simple keyword detection. A regex can match sentence structures, phone number patterns, or names. What limits exist on the expressiveness of these patterns?
- Keyword alert systems at Securus and ViaPath have been documented flagging mundane language (the word "lawyer," discussions of medical symptoms, expressions of frustration). How will this system avoid the same outcome?
- The spec mentions extending keyword alerts to voice calls ("call detail with keyword matches," line 1860). Voice-to-text transcription plus keyword scanning of phone calls is a qualitative escalation from text message scanning.

## 3. Risk Levels Without Due Process

The admin-ops spec proposes adding a `riskLevel` field to the `IncarceratedPerson` model (line 191, line 1276): an enum of `low`, `medium`, `high`, defaulting to `low`. The spec defines a journey (J8) for admins to update risk levels with a note.

Questions for the team:

- What does "risk" mean here? The spec never defines what behaviors or characteristics correspond to low, medium, or high risk. Without defined criteria, this is an arbitrary label applied by administrators to incarcerated people.
- Is the incarcerated person notified when their risk level changes? Nothing in the spec or codebase suggests they are.
- Is there an appeal mechanism? Nothing in the spec or codebase provides one.
- What consequences attach to risk levels? If a "high risk" label restricts communication access (fewer contacts, shorter calls, more aggressive message review), that restriction is imposed without notice, criteria, or recourse.
- Risk classification systems in corrections have well-documented racial bias. The COMPAS algorithm is one famous example, but the pattern is pervasive. Even when individual admins act in good faith, subjective risk labels accumulate bias over time. How will this system account for that?
- The combination of keyword alerts (section 2) feeding into risk level assignments creates a feedback loop: flagged messages raise risk levels, higher risk levels trigger more scrutiny, more scrutiny produces more flags. Has the team considered this dynamic?

## 4. Covert Monitoring in Production TODOs

The voice and video admin UIs include placeholder text for real-time call monitoring features:

- `guilds/voice/ui/admin/index.tsx`, line 35: "Features: Monitor calls, terminate calls, view details"
- `guilds/video/ui/admin/index.tsx`, lines 42-43: "Features: Monitor, terminate, view participants"

The admin-ops spec goes further. Line 2124 lists as a P0 security feature: "Covert alert mode; monitoring without alerting resident, separate audit trail."

Questions for the team:

- The facility announcement text in the seed data states "This call may be monitored and recorded" (`prisma/seed.ts`, lines 96, 105). A general disclaimer at the start of a call is different from informed, ongoing consent. Does "may be monitored" provide meaningful notice when monitoring is designed to be covert?
- The spec explicitly calls for monitoring "without alerting resident." This means the system is designed to hide the fact that a specific call is being listened to in real time. What is the ethical basis for that design choice?
- Legal calls (`isLegal` flag on VoiceCall and VideoCall) presumably should never be monitored. The codebase has no enforcement of this. An admin can terminate or monitor any call regardless of the `isLegal` flag.
- Who monitors the monitors? The spec proposes a "separate audit trail" for covert monitoring, but audit trails are only useful if someone independent reviews them. Who has that role?

## 5. No Grievance or Appeal Mechanisms for Incarcerated Users

The system provides no way for incarcerated users to:

- Learn why a message was blocked
- Appeal a blocked message
- Challenge a denied contact request (ContactStatus transitions to `denied` with no documented reason requirement)
- Contest a risk level assignment
- Request review of a blocked conversation (`Conversation.isBlocked`)
- Appeal a denied video visit request (VideoCallStatus transitions to `denied`)
- Know that a family member has been blocked agency-wide (`FamilyMember.isBlockedAgencyWide`)

The incarcerated user's interface (`apps/tablet/`) is a simplified kiosk app. The admin-ops spec defines 23 screens for administrators. The incarcerated person gets a tablet with no feedback, no status visibility, and no recourse.

Questions for the team:

- In a system where every communication requires approval, the absence of an appeal process means every denial is final and unaccountable. Is that acceptable?
- Worth-Rises has extensively documented how lack of grievance mechanisms in prison communication systems compounds existing power imbalances. What would a meaningful appeal workflow look like here?
- Even basic transparency features (showing the sender that a message was blocked, providing a reason code, offering a "request review" button) would shift the power dynamic. What is the argument against including them?

## 6. Comparison to Securus and ViaPath Systems

Worth-Rises campaigns against Securus (now Aventiv) and ViaPath (formerly Global Tel Link). These companies profit from charging incarcerated people and their families for communication while providing surveillance tools to corrections agencies. The question for this team: how does Open Connect differ from those systems, and where does it replicate the same patterns?

**Parallels that exist today in the codebase:**

- All messages require admin approval before delivery. Securus THREADS and ViaPath Command both implement message pre-approval queues with content moderation.
- Admins can terminate active voice and video calls at will (`terminated_by_admin` status on both VoiceCall and VideoCall). Both commercial platforms provide real-time call termination.
- Admins can block entire conversations, block family members agency-wide, and block phone numbers at facility or agency scope. These are standard features in Securus and ViaPath systems.
- The contact approval workflow (pending, approved, denied, removed) mirrors commercial platform contact management.

**Parallels proposed in the admin-ops spec:**

- Keyword alert scanning of all messages, with regex support and severity-based triage. Securus and ViaPath both sell keyword monitoring as a core feature to corrections agencies.
- Risk level classification of incarcerated people. Commercial platforms provide "threat level" or "risk score" features that restrict communication access.
- Covert call monitoring. Both Securus and ViaPath provide silent monitoring of calls. The spec explicitly designs for this.
- The admin-ops spec cites "industry research" into Securus/THREADS, ViaPath/Command, ICSolutions, and JPay (line 325). The spec treats these companies' feature sets as "table-stakes." This framing treats surveillance capabilities as requirements rather than examining whether they should exist.

**Where Open Connect could differ:**

- Open Connect is open source. The code is inspectable.
- Open Connect does not charge for communication. Removing the profit motive changes incentives significantly.
- Open Connect could choose transparency defaults (notify on review, explain denials, provide appeals) that commercial platforms deliberately omit because opacity serves their customers (corrections agencies, not incarcerated people and families).

The question is whether the team will make those different choices, or whether the gravitational pull of "industry standard" features will reproduce the same system under an open-source label.

## 7. Recommendations

These are framed as questions the team should answer before production deployment.

**Transparency:**

- Should incarcerated users and family members be notified when a message is under review, when it is approved, and when it is blocked? What information should accompany a block notification?
- Should the system display estimated review times so users know whether a delay is normal?
- Should risk level assignments be visible to the incarcerated person?

**Appeal workflows:**

- Can the team design a simple appeal flow? For example: blocked message shows a "Request Review" option; a different admin (not the original reviewer) handles the appeal; the outcome and reason are recorded and visible to the sender.
- Can denied contacts request reconsideration after a waiting period?
- Can incarcerated users request an explanation of their risk level?

**Consent frameworks:**

- Should the system require explicit, per-call consent for monitoring (beyond the generic facility announcement)?
- Should legal calls be technically exempt from monitoring, enforced in code rather than policy?
- Should family members be informed about the extent of message review and keyword scanning when they create an account?

**Data retention:**

- How long are message bodies, call recordings, and flagged content retained?
- Who can access historical communication data, and under what circumstances?
- Can incarcerated people or family members request deletion of their data after release?
- The system currently stores message bodies in plain text with no expiration. Is that appropriate?

**Oversight mechanisms:**

- Who audits admin actions? The proposed AuditLog model records actions, but logs without review are theater.
- Should there be an external oversight role (ombudsperson, advocacy organization) with read access to audit logs and flagged content statistics?
- Should aggregate statistics on message blocking rates, keyword alert triggers, and risk level distributions be published to identify patterns of bias or overreach?

**Structural questions:**

- The admin-ops spec was written by examining what Securus, ViaPath, ICSolutions, and JPay build. Should the design process instead start from the needs and rights of incarcerated people and their families?
- Worth-Rises has a set of principles for prison communication. Has the team mapped this system's features against those principles?
- Is there a mechanism for incarcerated users or family members to provide feedback on the system itself?

---

This document is meant to be a starting point. The tensions it identifies are inherent in building communication infrastructure for carceral settings. There are no easy answers, but there are better and worse ones. The team's choices here will shape the lived experience of incarcerated people and their families who use this system.
