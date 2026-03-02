# Database Schema Reference

The database schema is defined in `prisma/schema.prisma`. **Do not modify without coordination.**

## Core Tables (Shared)

### agencies
Top-level organizational entity.
- `id` (UUID) - Primary key
- `name` - e.g., "New York State DOCS"
- `state` - State abbreviation

### facilities
Individual correctional facilities.
- `id` (UUID) - Primary key
- `agency_id` - FK to agencies
- `name` - Facility name
- `announcement_text` - Text read at call start
- `announcement_audio_url` - Optional audio URL

### housing_unit_types
Rule categories set at agency level.
- `id` (UUID) - Primary key
- `agency_id` - FK to agencies
- `name` - e.g., "General Population"
- `voice_call_duration_minutes` - Default 30
- `video_call_duration_minutes`
- `calling_hours_start` - e.g., "08:00"
- `calling_hours_end` - e.g., "22:00"
- `max_contacts` - Maximum approved contacts
- `video_slot_duration_minutes`
- `max_concurrent_video_calls`

### housing_units
Actual units within facilities.
- `id` (UUID) - Primary key
- `facility_id` - FK to facilities
- `unit_type_id` - FK to housing_unit_types
- `name` - e.g., "Unit B"

## User Tables

### incarcerated_persons
- `id` (UUID) - Primary key
- `agency_id`, `facility_id`, `housing_unit_id` - Location FKs
- `first_name`, `last_name`
- `pin` - Hashed PIN for authentication
- `external_id` - ID from agency CMS
- `status` - active, transferred, released, deactivated
- `admitted_at`, `released_at`, `created_at`

### family_members
- `id` (UUID) - Primary key
- `email` - Unique, used for login
- `phone` - Phone number
- `first_name`, `last_name`
- `password_hash`
- `is_blocked_agency_wide` - Boolean
- `blocked_agency_id` - Optional FK

### admin_users
- `id` (UUID) - Primary key
- `email` - Unique
- `password_hash`
- `first_name`, `last_name`
- `role` - agency_admin or facility_admin
- `agency_id` - FK
- `facility_id` - FK (null for agency admins)

## Relationship Tables

### approved_contacts
Links incarcerated persons to family members.
- `id` (UUID) - Primary key
- `incarcerated_person_id`, `family_member_id` - FKs
- `relationship` - e.g., "mother", "attorney"
- `is_attorney` - Boolean
- `status` - pending, approved, denied, removed
- `requested_at`, `reviewed_at`, `reviewed_by`

### blocked_numbers
- `phone_number`
- `scope` - facility or agency
- `facility_id`, `agency_id`
- `reason`, `blocked_by`, `created_at`

## Team-Owned Tables

### voice_calls (Voice Team)
- `id` (UUID) - Primary key
- `incarcerated_person_id`, `family_member_id`, `facility_id`
- `status` - ringing, connected, completed, missed, terminated_by_admin
- `is_legal` - Attorney call flag
- `started_at`, `connected_at`, `ended_at`
- `duration_seconds`
- `ended_by` - caller, receiver, time_limit, admin

### video_calls (Video Team)
- `id` (UUID) - Primary key
- `incarcerated_person_id`, `family_member_id`, `facility_id`
- `status` - requested, approved, denied, scheduled, in_progress, completed, missed, terminated_by_admin
- `is_legal`
- `scheduled_start`, `scheduled_end`
- `actual_start`, `actual_end`, `duration_seconds`
- `requested_by`, `approved_by`, `ended_by`

### video_call_time_slots (Video Team)
- `facility_id`, `housing_unit_type_id`
- `day_of_week` - 0-6
- `start_time`, `end_time`
- `max_concurrent`

### conversations (Messaging Team)
- `id` (UUID) - Primary key
- `incarcerated_person_id`, `family_member_id`
- `is_blocked`, `blocked_by`

### messages (Messaging Team)
- `id` (UUID) - Primary key
- `conversation_id`
- `sender_type` - incarcerated or family
- `sender_id`
- `body` - Message text
- `status` - pending_review, approved, sent, delivered, read, blocked
- `reviewed_by`

### message_attachments (Messaging Team)
- `message_id`
- `file_type` - image
- `file_url`, `file_size_bytes`
- `status` - pending_review, approved, rejected

## Using Prisma

```typescript
import { prisma } from '@openconnect/shared';

// Query example
const contacts = await prisma.approvedContact.findMany({
  where: {
    incarceratedPersonId: userId,
    status: 'approved',
  },
  include: {
    familyMember: true,
  },
});
```
