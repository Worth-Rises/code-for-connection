import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { usePolling } from '../../../../apps/web/src/hooks/usePolling';
import { StatCard } from '../../../../packages/ui/src/admin/StatCard';
import {
  fetchVoiceStats,
  fetchVoiceActiveCalls,
  fetchVoiceCallLogs,
} from './api';
import {
  VoiceActiveCallsTable,
  VoiceCallHistoryTable,
} from './components';

function VoiceDashboard() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const stats = usePolling(
    useCallback(() => fetchVoiceStats(token!), [token]),
    15_000
  );
  const activeCalls = usePolling(
    useCallback(() => fetchVoiceActiveCalls(token!), [token]),
    15_000
  );
  const callLogs = usePolling(
    useCallback(() => fetchVoiceCallLogs(token!, page), [token, page]),
    30_000
  );

  useEffect(() => { callLogs.refresh(); }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Voice Call Management</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage active voice calls</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Active Calls"
          value={stats.data?.activeCalls ?? 0}
          loading={stats.loading}
          color="blue"
          pulse={(stats.data?.activeCalls ?? 0) > 0}
        />
        <StatCard
          label="Today's Calls"
          value={stats.data?.todayTotal ?? 0}
          loading={stats.loading}
          color="green"
        />
      </div>

      {/* Active Calls */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Calls</h2>
          <button onClick={activeCalls.refresh} className="text-sm text-blue-600 hover:text-blue-800 font-medium">↻ Refresh</button>
        </div>
        <VoiceActiveCallsTable
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
        <VoiceCallHistoryTable
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

export default function VoiceAdmin() {
  return (
    <Routes>
      <Route index element={<VoiceDashboard />} />
    </Routes>
  );
}
