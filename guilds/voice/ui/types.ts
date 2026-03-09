
export interface FamilyMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface IncarceratedPersonInfo {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  facility: {
    name: string;
  }
}  

export interface ApprovedContact {
  id: string;
  relationship: string;
  isAttorney: boolean;
  familyMember: FamilyMemberInfo;
}

export interface ApprovedUserContact {
  id: string;
  incarceratedPerson: IncarceratedPersonInfo
}

export interface VoiceCallRecord {
  id: string;
  status: string;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endedBy?: string;
  familyMember?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}