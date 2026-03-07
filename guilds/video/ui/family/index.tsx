import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Button } from '@openconnect/ui';
import { VideoCallRoom } from '../shared/VideoCallRoom.js';

/**
 * Family UI — Development Stub
 *
 * This is an intentionally minimal stub for the family-side UI.
 * Full family scheduling/requesting UI is deferred to a future sprint.
 * For now, a developer can manually enter a callId to join an active room.
 */

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:3001';

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

function FamilyVideoHome() {
  const [callId, setCallId] = useState('');
  const [activeCall, setActiveCall] = useState<{ callId: string; scheduledEnd: string } | null>(null);
  const userId = getUserIdFromToken();

  if (activeCall) {
    return (
      <VideoCallRoom
        callId={activeCall.callId}
        userId={userId}
        userRole="family"
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '40px',
        width: '360px',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '24px', fontSize: '20px' }}>
          Join a Video Call
        </h2>
        <input
          id="callId-input"
          type="text"
          placeholder="Enter Call ID"
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.07)',
            color: '#e2e8f0',
            fontSize: '14px',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />
        <Button
          id="join-call-dev-btn"
          disabled={!callId.trim()}
          fullWidth
          variant="primary"
          onClick={() => {
            fetch(`/api/video/join/${callId.trim()}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                'Content-Type': 'application/json',
              },
            })
              .then((r) => r.json())
              .then((body) => {
                if (body.success) {
                  setActiveCall({ callId: callId.trim(), scheduledEnd: body.data.scheduledEnd });
                } else {
                  alert(`Cannot join: ${body.error?.message ?? 'Unknown error'}`);
                }
              })
              .catch(() => alert('Failed to join call.'));
          }}
        >
          Join Call (Dev)
        </Button>
        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '16px' }}>
          [Dev stub — full scheduling UI coming soon]
        </p>
      </div>
    </div>
  );
}

export default function FamilyVideoUI() {
  return (
    <Routes>
      <Route index element={<FamilyVideoHome />} />
    </Routes>
  );
}

