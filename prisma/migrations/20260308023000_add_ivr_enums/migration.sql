-- AlterEnum
ALTER TYPE "ContactStatus" ADD VALUE 'blocked_by_receiver';

-- AlterEnum
ALTER TYPE "VoiceCallStatus" ADD VALUE 'rejected';
ALTER TYPE "VoiceCallStatus" ADD VALUE 'blocked_by_receiver';

-- AlterEnum
ALTER TYPE "CallEndedBy" ADD VALUE 'blocked';
