import React, { useEffect, useState } from 'react';

interface PastCall {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationSeconds?: number;
  endedBy?: string;
  familyMember?: { firstName: string; lastName: string };
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  completed:            { background: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
  missed:               { background: 'rgba(234,179,8,0.15)',  color: '#facc15' },
  terminated_by_admin:  { background: 'rgba(239,68,68,0.15)',  color: '#f87171' },
};

const STATUS_LABELS: Record<string, string> = {
  completed:           'Completed',
  missed:              'Missed',
  terminated_by_admin: 'Ended by staff',
};

const ENDED_BY_LABELS: Record<string, string> = {
  incarcerated: 'Ended by you',
  family:       'Ended by family',
  time_limit:   'Time limit reached',
  admin:        'Ended by staff',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function PastCallsList() {
  const [calls, setCalls] = useState<PastCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '10' });
    fetch(`/api/video/past-calls?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
    })
      .then((r) => r.json())
      .then((body) => {
        if (!mounted) return;
        setCalls(body.data ?? []);
        if (body.pagination) setTotalPages(body.pagination.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load past calls');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [page]);

  if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading past calls…</p>;
  if (error)   return <p style={{ color: '#f87171', textAlign: 'center' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {calls.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>No past calls found.</p>
      )}

      {calls.map((call) => {
        const statusStyle = STATUS_STYLES[call.status] ?? { background: 'rgba(255,255,255,0.05)', color: '#94a3b8' };
        return (
          <div
            key={call.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>
                  {call.familyMember
                    ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
                    : 'Family Member'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  {formatDateTime(call.scheduledStart)}
                </p>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '9999px',
                ...statusStyle,
              }}>
                {STATUS_LABELS[call.status] ?? call.status}
              </span>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
              {call.durationSeconds != null && (
                <span>Duration: {formatDuration(call.durationSeconds)}</span>
              )}
              {call.endedBy && (
                <span>{ENDED_BY_LABELS[call.endedBy] ?? call.endedBy}</span>
              )}
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: page <= 1 ? '#334155' : '#94a3b8',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            ← Previous
          </button>
          <span style={{ color: '#64748b', fontSize: '13px' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: page >= totalPages ? '#334155' : '#94a3b8',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
