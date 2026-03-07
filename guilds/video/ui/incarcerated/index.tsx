import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ScheduledCallsList } from './ScheduledCallsList.js';
import { VideoCallRoom } from '../shared/VideoCallRoom.js';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:3001';

interface ActiveCall {
  callId: string;
  scheduledEnd: string;
}

function getUserIdFromToken(): string {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? '';
  } catch {
    return '';
  }
}

function IncarceratedVideoHome() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const userId = getUserIdFromToken();

  if (activeCall) {
    return (
      <VideoCallRoom
        callId={activeCall.callId}
        userId={userId}
        userRole="incarcerated"
        scheduledEnd={activeCall.scheduledEnd}
        signalingUrl={SIGNALING_URL}
        onExit={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      padding: '24px',
    }}>
      <h1 style={{
        color: '#e2e8f0',
        fontSize: '22px',
        fontWeight: 700,
        marginBottom: '24px',
      }}>
        Scheduled Video Calls
      </h1>
      <ScheduledCallsList
        onJoinCall={(callId, scheduledEnd) => {
          // First POST to join the call to mark it in_progress, then open the room
          fetch(`/api/video/join/${callId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
              'Content-Type': 'application/json',
            },
          })
            .then((r) => r.json())
            .then((body) => {
              if (body.success) {
                setActiveCall({ callId, scheduledEnd: body.data.scheduledEnd });
              } else {
                alert(`Cannot join: ${body.error?.message ?? 'Unknown error'}`);
              }
            })
            .catch(() => alert('Failed to join call. Please try again.'));
        }}
      />
    </div>
  );
}

// Default export for guild-loading conventions
export default function IncarceratedVideoUI() {
  return (
    <Routes>
      <Route index element={<IncarceratedVideoHome />} />
    </Routes>
  );
}
