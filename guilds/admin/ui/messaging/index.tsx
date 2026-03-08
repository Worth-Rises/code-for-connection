import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { usePolling } from '../../../../apps/web/src/hooks/usePolling';
import { StatCard } from '../../../../packages/ui/src/admin/StatCard';
import {
  fetchMessagingStats,
  fetchPendingMessages,
  fetchMessageLogs,
  approveMessage,
  rejectMessage,
  blockConversation,
} from './api';
import {
  MessagingPendingReviewTable,
  MessagingHistoryTable,
} from './components';

function MessagingDashboard() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const stats = usePolling(
    useCallback(() => fetchMessagingStats(token!), [token]),
    15_000
  );
  const pendingMessages = usePolling(
    useCallback(() => fetchPendingMessages(token!), [token]),
    15_000
  );
  const messageLogs = usePolling(
    useCallback(() => fetchMessageLogs(token!, page), [token, page]),
    30_000
  );

  useEffect(() => { messageLogs.refresh(); }, [page]);

  const handleApprove = async (messageId: string) => {
    setActionInProgress(messageId);
    try {
      await approveMessage(token!, messageId);
      pendingMessages.refresh();
      stats.refresh();
    } catch (e) {
      console.error('Error approving message:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (messageId: string) => {
    setActionInProgress(messageId);
    try {
      await rejectMessage(token!, messageId);
      pendingMessages.refresh();
      stats.refresh();
    } catch (e) {
      console.error('Error rejecting message:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBlock = async (conversationId: string) => {
    try {
      await blockConversation(token!, conversationId);
      pendingMessages.refresh();
    } catch (e) {
      console.error('Error blocking conversation:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage messages between residents and contacts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Pending Review"
          value={stats.data?.pendingReview ?? 0}
          loading={stats.loading}
          color="yellow"
          pulse={(stats.data?.pendingReview ?? 0) > 0}
        />
        <StatCard
          label="Messages Today"
          value={stats.data?.todayTotal ?? 0}
          loading={stats.loading}
          color="green"
        />
      </div>

      {/* Pending Review Queue */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages Pending Review</h2>
          <button onClick={pendingMessages.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <MessagingPendingReviewTable
          messages={pendingMessages.data ?? []}
          loading={pendingMessages.loading}
          actionInProgress={actionInProgress}
          onApprove={handleApprove}
          onReject={handleReject}
          onBlockConversation={handleBlock}
        />
      </Card>

      {/* Message History */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
          <button onClick={messageLogs.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <MessagingHistoryTable
          messages={messageLogs.data?.data ?? []}
          loading={messageLogs.loading}
          pagination={messageLogs.data ? {
            page: messageLogs.data.pagination.page,
            totalPages: messageLogs.data.pagination.totalPages,
            total: messageLogs.data.pagination.total,
          } : undefined}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}

export default function MessagingAdmin() {
  return (
    <Routes>
      <Route index element={<MessagingDashboard />} />
    </Routes>
  );
}
