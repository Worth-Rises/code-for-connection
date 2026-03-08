/**
 * Messaging types shared between the admin page and the overview dashboard.
 */

export interface MessageRecord {
  id: string;
  body: string;
  status: string;
  senderType: 'incarcerated' | 'family';
  senderId: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  conversation: {
    id: string;
    isBlocked: boolean;
    incarceratedPerson: { firstName: string; lastName: string };
    familyMember: { firstName: string; lastName: string };
  };
  attachments?: { id: string; fileType: string; fileUrl: string; status: string }[];
}

export interface MessagingStats {
  todayTotal: number;
  pendingReview: number;
}

export interface MessageLogResponse {
  success: boolean;
  data: MessageRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
