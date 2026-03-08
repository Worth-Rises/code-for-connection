export const API_BASE = "/api";

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'missed': return '❌';
    case 'terminated_by_admin': return '🚫';
    case 'connected': return '🟢';
    case 'ringing': return '📞';
    default: return '📞';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'missed': return 'Missed';
    case 'terminated_by_admin': return 'Terminated';
    case 'connected': return 'Connected';
    case 'ringing': return 'Ringing';
    default: return status;
  }
}