/**
 * Reusable video-specific UI sections.
 * The overview dashboard can import and render these directly.
 */
import { StatusBadge, LiveDuration } from '../../../../packages/ui/src/admin/DashboardComponents';
import { formatDuration, formatTime, formatDate } from '../../../../apps/web/src/utils/formatters';
import type { VideoCallRecord } from './types';

// ─── Pending Requests Table ─────────────────────────────

interface PendingRequestsTableProps {
  requests: VideoCallRecord[];
  loading: boolean;
  actionInProgress: string | null;
  onApprove: (callId: string) => void;
  onDeny: (callId: string) => void;
  onRefresh: () => void;
}

export function VideoPendingRequestsTable({
  requests,
  loading,
  actionInProgress,
  onApprove,
  onDeny,
  onRefresh,
}: PendingRequestsTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!requests.length) return <p className="text-center py-6 text-gray-400">No pending requests</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Person</th>
            <th className="pb-2 font-medium">Contact</th>
            <th className="pb-2 font-medium">Scheduled</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50">
              <td className="py-3">
                {req.incarceratedPerson.firstName} {req.incarceratedPerson.lastName}
              </td>
              <td className="py-3">
                {req.familyMember.firstName} {req.familyMember.lastName}
              </td>
              <td className="py-3 text-gray-500">
                {formatDate(req.scheduledStart)} {formatTime(req.scheduledStart)}
              </td>
              <td className="py-3">
                {req.isLegal ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Legal</span>
                ) : (
                  <span className="text-gray-400 text-xs">Standard</span>
                )}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(req.id)}
                    disabled={actionInProgress === req.id}
                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                  >
                    {actionInProgress === req.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => onDeny(req.id)}
                    disabled={actionInProgress === req.id}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Active Calls Table ─────────────────────────────────

interface ActiveCallsTableProps {
  calls: VideoCallRecord[];
  loading: boolean;
}

export function VideoActiveCallsTable({ calls, loading }: ActiveCallsTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!calls.length) return <p className="text-center py-6 text-gray-400">No active calls</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Person</th>
            <th className="pb-2 font-medium">Contact</th>
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
              <td className="py-3 text-gray-500">{formatTime(call.actualStart || call.scheduledStart)}</td>
              <td className="py-3 text-gray-500">
                <LiveDuration startedAt={call.actualStart || call.scheduledStart} />
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
  calls: VideoCallRecord[];
  loading: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

export function VideoCallHistoryTable({ calls, loading, pagination, onPageChange }: CallHistoryTableProps) {
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
              <th className="pb-2 font-medium">Scheduled</th>
              <th className="pb-2 font-medium">Duration</th>
              <th className="pb-2 font-medium">Type</th>
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
                <td className="py-3 text-gray-500">
                  {formatDate(call.scheduledStart)} {formatTime(call.scheduledStart)}
                </td>
                <td className="py-3 text-gray-500">{formatDuration(call.durationSeconds)}</td>
                <td className="py-3">
                  {call.isLegal ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Legal</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Standard</span>
                  )}
                </td>
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
