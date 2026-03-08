import { useState, useEffect } from 'react';

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Shared UI components for admin dashboard tables.
 */

/** Color-coded status badge for call statuses across all modalities. */
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    // Voice statuses
    ringing: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    // Video statuses
    requested: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    approved: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    denied: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
    // Shared statuses
    completed: 'bg-gray-100 text-gray-700',
    missed: 'bg-red-100 text-red-700',
    terminated_by_admin: 'bg-purple-100 text-purple-700',
    blocked_by_receiver: 'bg-red-100 text-red-800',
    // Messaging statuses
    pending_review: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    read: 'bg-gray-100 text-gray-700',
    blocked: 'bg-red-100 text-red-800',
    flagged: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/** Live-updating duration counter from a start timestamp. */
export function LiveDuration({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="tabular-nums">{formatDuration(elapsed)}</span>;
}
