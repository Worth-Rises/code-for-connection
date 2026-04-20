import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { usePolling } from '../../../../apps/web/src/hooks/usePolling';
import { StatCard } from '../../../../packages/ui/src/admin/StatCard';
import {
  fetchVideoStats,
  fetchVideoActiveCalls,
  fetchVideoPendingRequests,
  fetchVideoCallLogs,
  approveVideoRequest,
  denyVideoRequest,
} from './api';
import {
  VideoPendingRequestsTable,
  VideoActiveCallsTable,
  VideoCallHistoryTable,
} from './components';

function VideoDashboard() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const stats = usePolling(
    useCallback(() => fetchVideoStats(token!), [token]),
    15_000
  );
  const activeCalls = usePolling(
    useCallback(() => fetchVideoActiveCalls(token!), [token]),
    15_000
  );
  const pendingRequests = usePolling(
    useCallback(() => fetchVideoPendingRequests(token!), [token]),
    15_000
  );
  const callLogs = usePolling(
    useCallback(() => fetchVideoCallLogs(token!, page), [token, page]),
    30_000
  );

  useEffect(() => { callLogs.refresh(); }, [page]);

  const handleApprove = async (callId: string) => {
    setActionInProgress(callId);
    try {
      await approveVideoRequest(token!, callId);
      pendingRequests.refresh();
      stats.refresh();
    } catch (e) {
      console.error('Error approving request:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeny = async (callId: string) => {
    setActionInProgress(callId);
    try {
      await denyVideoRequest(token!, callId);
      pendingRequests.refresh();
      stats.refresh();
    } catch (e) {
      console.error('Error denying request:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Video Call Management</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage video calls and requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Calls"
          value={stats.data?.activeCalls ?? 0}
          loading={stats.loading}
          color="blue"
          pulse={(stats.data?.activeCalls ?? 0) > 0}
        />
        <StatCard
          label="Pending Requests"
          value={stats.data?.pendingRequests ?? 0}
          loading={stats.loading}
          color="yellow"
          pulse={(stats.data?.pendingRequests ?? 0) > 0}
        />
        <StatCard
          label="Today's Calls"
          value={stats.data?.todayTotal ?? 0}
          loading={stats.loading}
          color="green"
        />
      </div>

      {/* Pending Approval Requests */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Approval Requests</h2>
          <button onClick={pendingRequests.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <VideoPendingRequestsTable
          requests={pendingRequests.data ?? []}
          loading={pendingRequests.loading}
          actionInProgress={actionInProgress}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onRefresh={pendingRequests.refresh}
        />
      </Card>

      {/* Active Video Calls */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Calls</h2>
          <button onClick={activeCalls.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <VideoActiveCallsTable
          calls={activeCalls.data ?? []}
          loading={activeCalls.loading}
        />
      </Card>

      {/* Call History */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
          <button onClick={callLogs.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <VideoCallHistoryTable
          calls={callLogs.data?.data ?? []}
          loading={callLogs.loading}
          pagination={callLogs.data ? {
            page: callLogs.data.pagination.page,
            totalPages: callLogs.data.pagination.totalPages,
            total: callLogs.data.pagination.total,
          } : undefined}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}

export default function VideoAdmin() {
  return (
    <Routes>
      <Route index element={<VideoDashboard />} />
    </Routes>
  );
}
