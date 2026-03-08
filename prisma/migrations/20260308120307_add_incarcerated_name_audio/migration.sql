-- AlterTable
ALTER TABLE "incarcerated_persons" ADD COLUMN     "name_audio_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name_audio_bytes" BYTEA,
ADD COLUMN     "name_audio_content_type" TEXT;
