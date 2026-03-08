import { useEffect, useState } from 'react';
import { Button } from '@openconnect/ui';

interface VideoCall {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  approvedBy?: string | null;
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

  const visibleCalls = calls
    .filter((call) => ['scheduled', 'in_progress'].includes(call.status))
    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
  const now = Date.now();
  const TOLERANCE_MS = 900_000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {visibleCalls.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>No upcoming calls scheduled.</p>
      )}
      {visibleCalls.map((call) => {
        const start = new Date(call.scheduledStart).getTime();
        const end   = new Date(call.scheduledEnd).getTime();
        const canJoin = now >= start - TOLERANCE_MS
          && now <= end + TOLERANCE_MS;
        const startStr = new Date(call.scheduledStart).toLocaleString();

        return (
          <div
            key={call.id}
            id={`call-${call.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-xl border"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <div>
              <p className="font-semibold text-slate-200 m-0">
                {call.familyMember
                  ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
                  : 'Family Member'}
              </p>
              <p className="text-sm text-slate-400 mt-1 mb-0">{startStr}</p>
            </div>
            <div className="w-full sm:w-auto mt-3 sm:mt-0 flex">
              <Button
                id={`join-btn-${call.id}`}
                disabled={!canJoin}
                variant="primary"
                onClick={() => onJoinCall(call.id, call.scheduledEnd)}
                className="w-full sm:w-auto"
              >
                {canJoin ? 'Join' : 'Upcoming'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
