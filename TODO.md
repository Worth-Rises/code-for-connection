# Production-Grade TODOs

Items deferred from MVP pilot but required before production deployment. Organized by priority.

## P0 — Must Have Before Real Deployment

### Compliance
- [ ] **Attorney-client recording suppression** — signaling server must check `isAttorney` flag and skip recording. Audit trail must show recording was suppressed for each call.
- [ ] **Consent announcement logging** — timestamp + callId proof that outside party was notified of recording. Required for evidentiary use.
- [ ] **PREA documentation module** — full incident documentation workflow per 28 CFR Part 115 (risk assessment, incident reporting, data retention, annual reporting).
- [ ] **FCC rate transparency** — display per-minute rate to resident before call connects. Itemized billing statements. Rate caps by facility type (large prison vs. small jail).
- [ ] **ADA/TRS support** — resident disability status flag, TRS/VRS call type handling, relay call monitoring exceptions, video relay service registration.
- [ ] **Legal hold workflow** — suspend automated data deletion for specific records under investigation. Hold scope (resident, date range, communication type). Hold release requires supervisor approval.
- [ ] **Data retention automation** — configurable retention periods per record type per facility. Automated deletion with pre-deletion notification. Legal hold override that suspends deletion.
- [ ] **State-specific consent rules** — configurable consent announcement playback per facility based on jurisdiction (one-party vs. two-party consent states).
- [ ] **Chain of custody** — tamper-evident storage (hash verification of recordings). Export packages with metadata, consent confirmation, access log. Court-admissible format.

### Security
- [ ] **3-way call detection** — detect and alert on conference bridging attempts (industry standard; Securus ICER pattern).
- [ ] **Voice biometrics** — speaker verification at call start. Detection of identity spoofing (resident using another's PIN/account).
- [ ] **Covert alert mode** — monitoring without alerting the resident. Requires separate audit trail. Investigator access requires supervisor authorization.
- [ ] **Emergency lockdown protocol** — facility-wide instant phone disable + staff mass notification + visitor lockout + communication log during lockdown + lockdown lift workflow.
- [ ] **Session management** — auto-logout after configurable inactivity period. Concurrent session limits. Shared workstation awareness.
- [ ] **IP allowlisting** — restrict admin portal access to facility networks.
- [ ] **Separation of duties** — investigators cannot access attorney-client privilege metadata. Billing cannot access investigation tools.

## P1 — Important for Production Quality

### Infrastructure
- [ ] **WebSocket real-time updates** — replace polling with Socket.io push for active call lists, dashboard stats, queue counts.
- [ ] **Call recording storage** — S3-compatible object storage with encryption at rest. Configurable retention. Streaming playback.
- [ ] **Audio transcription** — Whisper or similar for automatic call transcription. Speaker diarization. Confidence scores. Searchable transcript storage.
- [ ] **Keyword alert on audio** — scan transcripts against keyword alerts, not just message text.
- [ ] **Vector/semantic search** — pgvector embeddings for natural language search across transcripts, messages, and call metadata.
- [ ] **Background job queue** — Bull/BullMQ on Redis for: keyword scanning, report generation, retention cleanup, background check status polling, notification delivery.
- [ ] **Rate limiting** — per-endpoint rate limits for admin API. DDoS protection.
- [ ] **Caching layer** — Redis cache for dashboard stats, active call counts, housing occupancy. Cache invalidation on mutations.
- [ ] **Email/SMS notifications** — notify visitors of application status changes. Alert admins of high-severity flags.

### Features
- [ ] **Investigative link analysis** — network graph visualization (D3.js or similar) of resident communication patterns. Node-link diagrams showing who talks to whom.
- [ ] **Incident correlation** — link communications to facility incident reports. Reverse lookup: given an incident, surface all communications in the prior 24-72 hours.
- [ ] **Sentiment analysis** — emotional state detection in messages (distress, aggression, fear). Trend tracking per resident. PREA application for detecting coercion.
- [ ] **Translation services** — Spanish translation of messages before staff review. Language detection on incoming content.
- [ ] **Billing/rate management** — trust account integration, rate table configuration per facility, site commission tracking, refund processing, revenue reporting.
- [ ] **Commissary integration** — account balance display on resident profile, transaction history, low-balance alerts, account freeze during investigation.
- [ ] **Multi-language admin UI** — i18n for admin portal interface.
- [ ] **PDF report generation** — formatted, branded reports for compliance filing and management review.
- [ ] **Dark mode** — high-contrast theme for night shift staff. Reduces eye strain during extended monitoring sessions.
- [ ] **Keyboard shortcuts** — power-user shortcuts for queue navigation (J/K for next/prev, A for approve, D for deny).

## P2 — Scale & Advanced

- [ ] **Multi-jurisdiction support** — state-specific rule engines for consent, retention, billing.
- [ ] **Cross-facility investigation** — opt-in data sharing between facilities for THREADS-style cross-facility analysis.
- [ ] **Custom role creation** — full RBAC with admin-defined roles and granular permission matrices.
- [ ] **External system integrations** — JMS (Jail Management System), CCMS (Court Case Management), FBI N-DEx, state criminal history databases.
- [ ] **Horizontal scaling** — stateless API servers behind load balancer.
- [ ] **Read replicas** — PostgreSQL read replicas for reporting queries to avoid impacting operational database.
- [ ] **Archival storage** — cold storage tier for aged recordings and messages with retrieval workflow.
- [ ] **Predictive analytics** — AI risk scoring for communications (requires ethical review, legal counsel, and human oversight layer).
- [ ] **Mobile admin app** — responsive or native mobile admin interface for supervisors on the move.
- [ ] **SSO integration** — SAML/OIDC for agency credential systems (Securus One pattern — single login).
