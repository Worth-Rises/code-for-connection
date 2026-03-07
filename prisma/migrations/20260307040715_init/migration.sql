-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('active', 'transferred', 'released', 'deactivated');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('agency_admin', 'facility_admin');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('pending', 'approved', 'denied', 'removed');

-- CreateEnum
CREATE TYPE "BlockedScope" AS ENUM ('facility', 'agency');

-- CreateEnum
CREATE TYPE "VoiceCallStatus" AS ENUM ('ringing', 'connected', 'completed', 'missed', 'terminated_by_admin');

-- CreateEnum
CREATE TYPE "CallEndedBy" AS ENUM ('caller', 'receiver', 'time_limit', 'admin');

-- CreateEnum
CREATE TYPE "VideoCallStatus" AS ENUM ('requested', 'approved', 'denied', 'scheduled', 'in_progress', 'completed', 'missed', 'terminated_by_admin');

-- CreateEnum
CREATE TYPE "VideoEndedBy" AS ENUM ('incarcerated', 'family', 'time_limit', 'admin');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('incarcerated', 'family');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('pending_review', 'approved', 'sent', 'delivered', 'read', 'blocked');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('image');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('pending_review', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "announcement_text" TEXT NOT NULL,
    "announcement_audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing_unit_types" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voice_call_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "video_call_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "calling_hours_start" TEXT NOT NULL DEFAULT '08:00',
    "calling_hours_end" TEXT NOT NULL DEFAULT '22:00',
    "max_contacts" INTEGER NOT NULL DEFAULT 10,
    "video_slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "max_concurrent_video_calls" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "housing_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing_units" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "unit_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "housing_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incarcerated_persons" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "housing_unit_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "PersonStatus" NOT NULL DEFAULT 'active',
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incarcerated_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_blocked_agency_wide" BOOLEAN NOT NULL DEFAULT false,
    "blocked_agency_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "agency_id" TEXT NOT NULL,
    "facility_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_contacts" (
    "id" TEXT NOT NULL,
    "incarcerated_person_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "is_attorney" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContactStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "approved_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_numbers" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "scope" "BlockedScope" NOT NULL,
    "facility_id" TEXT,
    "agency_id" TEXT NOT NULL,
    "reason" TEXT,
    "blocked_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_calls" (
    "id" TEXT NOT NULL,
    "incarcerated_person_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "status" "VoiceCallStatus" NOT NULL DEFAULT 'ringing',
    "is_legal" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "ended_by" "CallEndedBy",
    "terminated_by_admin_id" TEXT,

    CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_calls" (
    "id" TEXT NOT NULL,
    "incarcerated_person_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "status" "VideoCallStatus" NOT NULL DEFAULT 'requested',
    "is_legal" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "ended_by" "VideoEndedBy",
    "terminated_by_admin_id" TEXT,

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_call_time_slots" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "housing_unit_type_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "max_concurrent" INTEGER NOT NULL,

    CONSTRAINT "video_call_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "incarcerated_person_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'pending_review',
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_type" "AttachmentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_members_email_key" ON "family_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "approved_contacts_incarcerated_person_id_family_member_id_key" ON "approved_contacts"("incarcerated_person_id", "family_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_incarcerated_person_id_family_member_id_key" ON "conversations"("incarcerated_person_id", "family_member_id");

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_unit_types" ADD CONSTRAINT "housing_unit_types_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_units" ADD CONSTRAINT "housing_units_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_units" ADD CONSTRAINT "housing_units_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "housing_unit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incarcerated_persons" ADD CONSTRAINT "incarcerated_persons_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incarcerated_persons" ADD CONSTRAINT "incarcerated_persons_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incarcerated_persons" ADD CONSTRAINT "incarcerated_persons_housing_unit_id_fkey" FOREIGN KEY ("housing_unit_id") REFERENCES "housing_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_blocked_agency_id_fkey" FOREIGN KEY ("blocked_agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_contacts" ADD CONSTRAINT "approved_contacts_incarcerated_person_id_fkey" FOREIGN KEY ("incarcerated_person_id") REFERENCES "incarcerated_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_contacts" ADD CONSTRAINT "approved_contacts_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_contacts" ADD CONSTRAINT "approved_contacts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_numbers" ADD CONSTRAINT "blocked_numbers_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_numbers" ADD CONSTRAINT "blocked_numbers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_numbers" ADD CONSTRAINT "blocked_numbers_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_incarcerated_person_id_fkey" FOREIGN KEY ("incarcerated_person_id") REFERENCES "incarcerated_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_terminated_by_admin_id_fkey" FOREIGN KEY ("terminated_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_incarcerated_person_id_fkey" FOREIGN KEY ("incarcerated_person_id") REFERENCES "incarcerated_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_terminated_by_admin_id_fkey" FOREIGN KEY ("terminated_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_time_slots" ADD CONSTRAINT "video_call_time_slots_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_time_slots" ADD CONSTRAINT "video_call_time_slots_housing_unit_type_id_fkey" FOREIGN KEY ("housing_unit_type_id") REFERENCES "housing_unit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_incarcerated_person_id_fkey" FOREIGN KEY ("incarcerated_person_id") REFERENCES "incarcerated_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
