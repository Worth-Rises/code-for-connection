export interface Agency {
    id: string;
    name: string;
    state: string;
    createdAt: Date;
}
export interface Facility {
    id: string;
    agencyId: string;
    name: string;
    announcementText: string;
    announcementAudioUrl?: string | null;
    createdAt: Date;
}
export interface HousingUnitType {
    id: string;
    agencyId: string;
    name: string;
    voiceCallDurationMinutes: number;
    videoCallDurationMinutes: number;
    callingHoursStart: string;
    callingHoursEnd: string;
    maxContacts: number;
    videoSlotDurationMinutes: number;
    maxConcurrentVideoCalls: number;
}
export interface HousingUnit {
    id: string;
    facilityId: string;
    unitTypeId: string;
    name: string;
}
export type PersonStatus = 'active' | 'transferred' | 'released' | 'deactivated';
export interface IncarceratedPerson {
    id: string;
    agencyId: string;
    facilityId: string;
    housingUnitId: string;
    firstName: string;
    lastName: string;
    externalId?: string | null;
    status: PersonStatus;
    admittedAt: Date;
    releasedAt?: Date | null;
    createdAt: Date;
}
export interface FamilyMember {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    isBlockedAgencyWide: boolean;
    blockedAgencyId?: string | null;
    createdAt: Date;
}
export type AdminRole = 'agency_admin' | 'facility_admin';
export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AdminRole;
    agencyId: string;
    facilityId?: string | null;
    createdAt: Date;
}
export type ContactStatus = 'pending' | 'approved' | 'denied' | 'removed';
export interface ApprovedContact {
    id: string;
    incarceratedPersonId: string;
    familyMemberId: string;
    relationship: string;
    isAttorney: boolean;
    status: ContactStatus;
    requestedAt: Date;
    reviewedAt?: Date | null;
    reviewedBy?: string | null;
    incarceratedPerson?: IncarceratedPerson;
    familyMember?: FamilyMember;
}
export type VoiceCallStatus = 'ringing' | 'connected' | 'completed' | 'missed' | 'terminated_by_admin';
export type CallEndedBy = 'caller' | 'receiver' | 'time_limit' | 'admin';
export interface VoiceCall {
    id: string;
    incarceratedPersonId: string;
    familyMemberId: string;
    facilityId: string;
    status: VoiceCallStatus;
    isLegal: boolean;
    startedAt: Date;
    connectedAt?: Date | null;
    endedAt?: Date | null;
    durationSeconds?: number | null;
    endedBy?: CallEndedBy | null;
    terminatedByAdminId?: string | null;
    incarceratedPerson?: IncarceratedPerson;
    familyMember?: FamilyMember;
}
export type VideoCallStatus = 'requested' | 'approved' | 'denied' | 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'terminated_by_admin';
export type VideoEndedBy = 'incarcerated' | 'family' | 'time_limit' | 'admin';
export interface VideoCall {
    id: string;
    incarceratedPersonId: string;
    familyMemberId: string;
    facilityId: string;
    status: VideoCallStatus;
    isLegal: boolean;
    scheduledStart: Date;
    scheduledEnd: Date;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    durationSeconds?: number | null;
    requestedBy: string;
    approvedBy?: string | null;
    endedBy?: VideoEndedBy | null;
    terminatedByAdminId?: string | null;
    incarceratedPerson?: IncarceratedPerson;
    familyMember?: FamilyMember;
}
export interface Conversation {
    id: string;
    incarceratedPersonId: string;
    familyMemberId: string;
    isBlocked: boolean;
    blockedBy?: string | null;
    createdAt: Date;
    incarceratedPerson?: IncarceratedPerson;
    familyMember?: FamilyMember;
}
export type SenderType = 'incarcerated' | 'family';
export type MessageStatus = 'pending_review' | 'approved' | 'sent' | 'delivered' | 'read' | 'blocked';
export interface Message {
    id: string;
    conversationId: string;
    senderType: SenderType;
    senderId: string;
    body: string;
    status: MessageStatus;
    reviewedBy?: string | null;
    createdAt: Date;
    deliveredAt?: Date | null;
    readAt?: Date | null;
    attachments?: MessageAttachment[];
}
export type AttachmentType = 'image';
export type AttachmentStatus = 'pending_review' | 'approved' | 'rejected';
export interface MessageAttachment {
    id: string;
    messageId: string;
    fileType: AttachmentType;
    fileUrl: string;
    fileSizeBytes: number;
    status: AttachmentStatus;
    createdAt: Date;
}
//# sourceMappingURL=entities.d.ts.map