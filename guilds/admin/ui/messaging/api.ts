import type { MessagingStats, MessageRecord, MessageLogResponse } from './types';

const API_BASE = '/api/messaging';

/**
 * Messaging API fetch functions — reusable by both the messaging admin page and the overview dashboard.
 */

export async function fetchMessagingStats(token: string): Promise<MessagingStats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load messaging stats');
  return json.data;
}

export async function fetchPendingMessages(token: string): Promise<MessageRecord[]> {
  const res = await fetch(`${API_BASE}/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load pending messages');
  return json.data;
}

export async function fetchMessageLogs(
  token: string,
  page: number = 1,
  pageSize: number = 10
): Promise<MessageLogResponse> {
  const res = await fetch(`${API_BASE}/logs?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load message logs');
  return json;
}

export async function approveMessage(token: string, messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/approve/${messageId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to approve message');
}

export async function rejectMessage(token: string, messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reject/${messageId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to reject message');
}

export async function blockConversation(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/block-conversation/${conversationId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to block conversation');
}
