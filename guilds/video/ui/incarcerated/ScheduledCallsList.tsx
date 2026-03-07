import React, { useEffect, useState } from 'react';
import { Button } from '@openconnect/ui';

interface VideoCall {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  familyMember?: { firstName: string; lastName: string };
}

interface ScheduledCallsListProps {
  onJoinCall: (callId: string, scheduledEnd: string) => void;
}

export function ScheduledCallsList({ onJoinCall }: ScheduledCallsListProps) {
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/video/my-scheduled', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
    })
      .then((r) => r.json())
      .then((body) => { setCalls(body.data ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load calls'); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading scheduled calls…</p>;
  if (error)   return <p style={{ color: '#f87171', textAlign: 'center' }}>{error}</p>;

  const now = Date.now();
  const TOLERANCE_MS = 60_000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {calls.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>No upcoming calls scheduled.</p>
      )}
      {calls.map((call) => {
        const start = new Date(call.scheduledStart).getTime();
        const end   = new Date(call.scheduledEnd).getTime();
        const canJoin = now >= start - TOLERANCE_MS && now <= end + TOLERANCE_MS;
        const startStr = new Date(call.scheduledStart).toLocaleString();

        return (
          <div
            key={call.id}
            id={`call-${call.id}`}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>
                {call.familyMember
                  ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
                  : 'Family Member'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>{startStr}</p>
            </div>
            <Button
              id={`join-btn-${call.id}`}
              disabled={!canJoin}
              variant="primary"
              onClick={() => onJoinCall(call.id, call.scheduledEnd)}
            >
              {canJoin ? 'Join' : 'Upcoming'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
