/**
 * Reusable messaging-specific UI sections.
 * The overview dashboard can import and render these directly.
 */
import { StatusBadge } from '../../../../packages/ui/src/admin/DashboardComponents';
import { formatTime, formatDate } from '../../../../apps/web/src/utils/formatters';
import type { MessageRecord } from './types';

// ─── Pending Review Table ────────────────────────────────

interface PendingReviewTableProps {
  messages: MessageRecord[];
  loading: boolean;
  actionInProgress: string | null;
  onApprove: (messageId: string) => void;
  onReject: (messageId: string) => void;
  onBlockConversation: (conversationId: string) => void;
}

export function MessagingPendingReviewTable({
  messages,
  loading,
  actionInProgress,
  onApprove,
  onReject,
  onBlockConversation,
}: PendingReviewTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!messages.length) return <p className="text-center py-6 text-gray-400">No messages pending review</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">From</th>
            <th className="pb-2 font-medium">To</th>
            <th className="pb-2 font-medium">Message</th>
            <th className="pb-2 font-medium">Sent</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {messages.map((msg) => {
            const from = msg.senderType === 'incarcerated'
              ? `${msg.conversation.incarceratedPerson.firstName} ${msg.conversation.incarceratedPerson.lastName}`
              : `${msg.conversation.familyMember.firstName} ${msg.conversation.familyMember.lastName}`;
            const to = msg.senderType === 'incarcerated'
              ? `${msg.conversation.familyMember.firstName} ${msg.conversation.familyMember.lastName}`
              : `${msg.conversation.incarceratedPerson.firstName} ${msg.conversation.incarceratedPerson.lastName}`;

            return (
              <tr key={msg.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <div>
                    <span className="font-medium">{from}</span>
                    <span className="text-xs text-gray-400 ml-1">({msg.senderType})</span>
                  </div>
                </td>
                <td className="py-3">{to}</td>
                <td className="py-3 max-w-xs">
                  <p className="truncate text-gray-700" title={msg.body}>{msg.body}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <span className="text-xs text-blue-500">📎 {msg.attachments.length} attachment(s)</span>
                  )}
                </td>
                <td className="py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(msg.id)}
                      disabled={actionInProgress === msg.id}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                    >
                      {actionInProgress === msg.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => onReject(msg.id)}
                      disabled={actionInProgress === msg.id}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onBlockConversation(msg.conversation.id)}
                      disabled={actionInProgress === msg.id}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                      title="Block this conversation"
                    >
                      Block
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Message History Table ───────────────────────────────

interface MessageHistoryTableProps {
  messages: MessageRecord[];
  loading: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

export function MessagingHistoryTable({ messages, loading, pagination, onPageChange }: MessageHistoryTableProps) {
  if (loading) return <p className="text-center py-6 text-gray-400">Loading...</p>;
  if (!messages.length) return <p className="text-center py-6 text-gray-400">No message history</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">From</th>
              <th className="pb-2 font-medium">To</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {messages.map((msg) => {
              const from = msg.senderType === 'incarcerated'
                ? `${msg.conversation.incarceratedPerson.firstName} ${msg.conversation.incarceratedPerson.lastName}`
                : `${msg.conversation.familyMember.firstName} ${msg.conversation.familyMember.lastName}`;
              const to = msg.senderType === 'incarcerated'
                ? `${msg.conversation.familyMember.firstName} ${msg.conversation.familyMember.lastName}`
                : `${msg.conversation.incarceratedPerson.firstName} ${msg.conversation.incarceratedPerson.lastName}`;

              return (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div>
                      <span className="font-medium">{from}</span>
                      <span className="text-xs text-gray-400 ml-1">({msg.senderType})</span>
                    </div>
                  </td>
                  <td className="py-3">{to}</td>
                  <td className="py-3"><StatusBadge status={msg.status} /></td>
                  <td className="py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                  </td>
                </tr>
              );
            })}
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
