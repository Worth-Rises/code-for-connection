import type { VideoStats, VideoCallRecord, VideoCallLogResponse } from './types';

const API_BASE = '/api/video';

/**
 * Video API fetch functions — reusable by both the video admin page and the overview dashboard.
 * Each function takes an auth token and returns typed data.
 */

export async function fetchVideoStats(token: string): Promise<VideoStats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load video stats');
  return json.data;
}

export async function fetchVideoActiveCalls(token: string): Promise<VideoCallRecord[]> {
  const res = await fetch(`${API_BASE}/active-calls`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load active video calls');
  return json.data;
}

export async function fetchVideoPendingRequests(token: string): Promise<VideoCallRecord[]> {
  const res = await fetch(`${API_BASE}/pending-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load pending video requests');
  return json.data;
}

export async function fetchVideoCallLogs(
  token: string,
  page: number = 1,
  pageSize: number = 10
): Promise<VideoCallLogResponse> {
  const res = await fetch(`${API_BASE}/call-logs?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to load video call logs');
  return json;
}

export async function approveVideoRequest(token: string, callId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/approve-request/${callId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to approve video request');
}

export async function denyVideoRequest(token: string, callId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/deny-request/${callId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error('Failed to deny video request');
}
