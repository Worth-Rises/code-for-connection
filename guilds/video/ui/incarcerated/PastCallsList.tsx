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
  isLegal?: boolean;
  familyMember?: { firstName: string; lastName: string };
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  completed:           { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  missed:              { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
  terminated_by_admin: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

const STATUS_LABELS: Record<string, string> = {
  completed:           'Completed',
  missed:              'Missed',
  terminated_by_admin: 'Ended by staff',
};

const ENDED_BY_LABELS: Record<string, string> = {
  incarcerated: 'You',
  family:       'Family member',
  time_limit:   'Time limit reached',
  admin:        'Staff',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  true,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:    'numeric',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  true,
  });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function scheduledDuration(start: string, end: string) {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return formatDuration(diff);
}

// ─── Timeline row ─────────────────────────────────────────────────────────────
function TimelineRow({ dot, label, value, sub }: {
  dot: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, width: '1px', background: 'rgba(255,255,255,0.08)', minHeight: '16px' }} />
      </div>
      <div style={{ paddingBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#475569', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Call detail dropdown ─────────────────────────────────────────────────────
function CallDetail({ call }: { call: PastCall }) {
  const actualDuration = call.actualStart && call.actualEnd
    ? Math.round((new Date(call.actualEnd).getTime() - new Date(call.actualStart).getTime()) / 1000)
    : null;

  const joinDelay = call.actualStart
    ? Math.round((new Date(call.actualStart).getTime() - new Date(call.scheduledStart).getTime()) / 1000)
    : null;

  return (
    <div style={{
      marginTop: '14px',
      paddingTop: '14px',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Call Timeline
      </p>

      <TimelineRow
        dot="#3b82f6"
        label="Scheduled start"
        value={formatDateTime(call.scheduledStart)}
        sub={`Scheduled duration: ${scheduledDuration(call.scheduledStart, call.scheduledEnd)}`}
      />

      {call.actualStart ? (
        <TimelineRow
          dot="#4ade80"
          label="Call connected"
          value={formatTime(call.actualStart)}
          sub={joinDelay !== null && joinDelay > 0 ? `${formatDuration(Math.abs(joinDelay))} after scheduled start` : joinDelay !== null && joinDelay < 0 ? `${formatDuration(Math.abs(joinDelay))} early` : 'On time'}
        />
      ) : (
        <TimelineRow
          dot="#ef4444"
          label="Call connected"
          value="Never joined"
        />
      )}

      {call.actualEnd ? (
        <TimelineRow
          dot="#f87171"
          label="Call ended"
          value={formatTime(call.actualEnd)}
          sub={call.endedBy ? `Ended by: ${ENDED_BY_LABELS[call.endedBy] ?? call.endedBy}` : undefined}
        />
      ) : (
        <TimelineRow
          dot="#64748b"
          label="Call ended"
          value="—"
        />
      )}

      <TimelineRow
        dot="#3b82f6"
        label="Scheduled end"
        value={formatTime(call.scheduledEnd)}
      />

      {/* Summary stats */}
      <div style={{
        marginTop: '4px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <Stat label="Actual duration" value={call.durationSeconds != null ? formatDuration(call.durationSeconds) : actualDuration != null ? formatDuration(actualDuration) : '—'} />
        <Stat label="Scheduled duration" value={scheduledDuration(call.scheduledStart, call.scheduledEnd)} />
        <Stat label="Call type" value={call.isLegal ? 'Legal / Attorney' : 'Standard'} />
        <Stat label="Ended by" value={call.endedBy ? (ENDED_BY_LABELS[call.endedBy] ?? call.endedBy) : '—'} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '8px',
      padding: '8px 10px',
    }}>
      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PastCallsList() {
  const [calls, setCalls] = useState<PastCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {calls.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>No past calls found.</p>
      )}

      {calls.map((call) => {
        const statusStyle = STATUS_STYLES[call.status] ?? { background: 'rgba(255,255,255,0.05)', color: '#94a3b8' };
        const isOpen = expandedId === call.id;
        const name = call.familyMember
          ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
          : 'Family Member';

        return (
          <div
            key={call.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${isOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              padding: '14px 16px',
              transition: 'border-color 0.15s',
            }}
          >
            {/* Header row — always visible */}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : call.id)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                textAlign: 'left',
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{name}</p>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {formatDateTime(call.scheduledStart)}
                </p>
                {call.durationSeconds != null && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Duration: {formatDuration(call.durationSeconds)}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  ...statusStyle,
                }}>
                  {STATUS_LABELS[call.status] ?? call.status}
                </span>
                <span style={{ fontSize: '18px', color: '#475569', lineHeight: 1 }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Expandable detail */}
            {isOpen && <CallDetail call={call} />}
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
          <span style={{ color: '#64748b', fontSize: '13px' }}>{page} / {totalPages}</span>
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
