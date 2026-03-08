/**
 * Voice call types shared between the admin page and the overview dashboard.
 */

export interface VoiceCallRecord {
  id: string;
  status: string;
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  endedBy: string | null;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string; phone: string };
}

export interface VoiceStats {
  activeCalls: number;
  todayTotal: number;
}

export interface VoiceCallLogResponse {
  success: boolean;
  data: VoiceCallRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
