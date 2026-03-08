/**
 * Reusable voice-specific UI sections.
 * The overview dashboard can import and render these directly.
 */
import { StatusBadge, LiveDuration } from '../../../../packages/ui/src/admin/DashboardComponents';
import { formatDuration, formatTime } from '../../../../apps/web/src/utils/formatters';
import type { VoiceCallRecord } from './types';

// ─── Active Calls Table ─────────────────────────────────

interface ActiveCallsTableProps {
  calls: VoiceCallRecord[];
  loading: boolean;
}

export function VoiceActiveCallsTable({ calls, loading }: ActiveCallsTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!calls.length) return <p className="text-center py-6 text-gray-400">No active calls</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Person</th>
            <th className="pb-2 font-medium">Contact</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Started</th>
            <th className="pb-2 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {calls.map((call) => (
            <tr key={call.id} className="hover:bg-gray-50">
              <td className="py-3">
                {call.incarceratedPerson.firstName} {call.incarceratedPerson.lastName}
              </td>
              <td className="py-3">
                {call.familyMember.firstName} {call.familyMember.lastName}
              </td>
              <td className="py-3"><StatusBadge status={call.status} /></td>
              <td className="py-3 text-gray-500">{formatTime(call.startedAt)}</td>
              <td className="py-3 text-gray-500">
                <LiveDuration startedAt={call.connectedAt || call.startedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Call History Table ──────────────────────────────────

interface CallHistoryTableProps {
  calls: VoiceCallRecord[];
  loading: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

export function VoiceCallHistoryTable({ calls, loading, pagination, onPageChange }: CallHistoryTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!calls.length) return <p className="text-center py-6 text-gray-400">No call history</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Person</th>
              <th className="pb-2 font-medium">Contact</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {calls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="py-3">
                  {call.incarceratedPerson.firstName} {call.incarceratedPerson.lastName}
                </td>
                <td className="py-3">
                  {call.familyMember.firstName} {call.familyMember.lastName}
                </td>
                <td className="py-3"><StatusBadge status={call.status} /></td>
                <td className="py-3 text-gray-500">{formatTime(call.startedAt)}</td>
                <td className="py-3 text-gray-500">{formatDuration(call.durationSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
            {' '}({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
