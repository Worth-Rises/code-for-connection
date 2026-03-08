/**
 * Video call types shared between the admin page and the overview dashboard.
 */

export interface VideoCallRecord {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  durationSeconds: number | null;
  isLegal: boolean;
  endedBy: string | null;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
}

export interface VideoStats {
  activeCalls: number;
  todayTotal: number;
  pendingRequests: number;
}

export interface VideoCallLogResponse {
  success: boolean;
  data: VideoCallRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
