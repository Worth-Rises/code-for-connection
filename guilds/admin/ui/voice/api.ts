import type { VoiceStats, VoiceCallRecord, VoiceCallLogResponse } from './types';

const API_BASE = '/api/voice';

/**
 * Voice API fetch functions — reusable by both the voice admin page and the overview dashboard.
 * Each function takes an auth token and returns typed data.
 */

export async function fetchVoiceStats(token: string): Promise<VoiceStats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load voice stats');
  return json.data;
}

export async function fetchVoiceActiveCalls(token: string): Promise<VoiceCallRecord[]> {
  const res = await fetch(`${API_BASE}/active-calls`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load active voice calls');
  return json.data;
}

export async function fetchVoiceCallLogs(
  token: string,
  page: number = 1,
  pageSize: number = 10
): Promise<VoiceCallLogResponse> {
  const res = await fetch(`${API_BASE}/call-logs?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load voice call logs');
  return json;
}
