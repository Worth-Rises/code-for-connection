import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfirmModal } from '@openconnect/ui';
import { StatsCard } from '../../../../guilds/admin/ui/components/StatsCard';
import { DataTable } from '../../../../guilds/admin/ui/components/DataTable';
import { StatusBadge } from '../../../../guilds/admin/ui/components/StatusBadge';
import { FilterBar } from '../../../../guilds/admin/ui/components/FilterBar';
import { TabNav } from '../../../../guilds/admin/ui/components/TabNav';
import { Pagination } from '../../../../guilds/admin/ui/components/Pagination';
import { FacilitySelector } from '../../../../guilds/admin/ui/components/FacilitySelector';
import { usePolling } from '../../../../guilds/admin/ui/hooks/usePolling';
import { useFacilityScope } from '../../../../guilds/admin/ui/hooks/useFacilityScope';
import { usePagination } from '../../../../guilds/admin/ui/hooks/usePagination';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceCall {
  id: string;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
  status: string;
  isLegal: boolean;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endedBy?: string;
}

interface VoiceStats {
  activeCalls: number;
  todayTotal: number;
}

interface CallLogsResponse {
  data: VoiceCall[];
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useGuildApi(basePath: string) {
  const { token } = useAuth();

  const get = useCallback(
    async (path: string) => {
      const res = await fetch(`${basePath}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    [basePath, token],
  );

  const post = useCallback(
    async (path: string, body?: unknown) => {
      const res = await fetch(`${basePath}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    },
    [basePath, token],
  );

  return { get, post };
}

function formatDuration(seconds?: number, startedAt?: string): string {
  if (seconds != null) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (startedAt) {
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000,
    );
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return '--';
}

function formatDateTime(iso?: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString();
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'active', label: 'Active Calls' },
  { key: 'history', label: 'Call History' },
];

// ---------------------------------------------------------------------------
// Active Calls Tab
// ---------------------------------------------------------------------------

function ActiveCallsTab({
  facilityId,
  api,
}: {
  facilityId: string;
  api: ReturnType<typeof useGuildApi>;
}) {
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [terminateLoading, setTerminateLoading] = useState(false);

  const fetchActive = useCallback(
    async () => {
      const res = await api.get(
        `/active-calls${facilityId ? `?facilityId=${facilityId}` : ''}`,
      );
      return res.data ?? [];
    },
    [api, facilityId],
  );

  const { data: calls = [], loading, refresh } = usePolling<VoiceCall[]>(
    fetchActive,
    15000,
    [facilityId],
  );

  const handleTerminate = async () => {
    if (!terminatingId) return;
    setTerminateLoading(true);
    try {
      await api.post(`/terminate-call/${terminatingId}`);
      refresh();
    } finally {
      setTerminateLoading(false);
      setTerminatingId(null);
    }
  };

  const columns = [
    {
      key: 'person',
      header: 'Person',
      render: (c: VoiceCall) =>
        `${c.incarceratedPerson.firstName} ${c.incarceratedPerson.lastName}`,
    },
    {
      key: 'family',
      header: 'Family Member',
      render: (c: VoiceCall) =>
        `${c.familyMember.firstName} ${c.familyMember.lastName}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: VoiceCall) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={c.status} />
          {c.isLegal && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Legal
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (c: VoiceCall) =>
        formatDuration(c.durationSeconds, c.startedAt),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (c: VoiceCall) => formatDateTime(c.startedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c: VoiceCall) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setTerminatingId(c.id);
          }}
          className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        >
          Terminate
        </button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={calls}
        loading={loading}
        emptyMessage="No active calls."
        keyExtractor={(c) => c.id}
      />

      <ConfirmModal
        isOpen={terminatingId !== null}
        onClose={() => setTerminatingId(null)}
        onConfirm={handleTerminate}
        title="Terminate Call"
        message="Are you sure you want to terminate this call? This action cannot be undone."
        confirmText="Terminate"
        cancelText="Cancel"
        variant="danger"
        loading={terminateLoading}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Call History Tab
// ---------------------------------------------------------------------------

function CallHistoryTab({
  facilityId,
  api,
}: {
  facilityId: string;
  api: ReturnType<typeof useGuildApi>;
}) {
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } =
    usePagination(20);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (facilityId) params.set('facilityId', facilityId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(
        `/call-logs?${params.toString()}`,
      );
      setCalls(res.data ?? []);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [api, facilityId, page, pageSize, dateFrom, dateTo, statusFilter, setTotalPages]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const columns = [
    {
      key: 'person',
      header: 'Person',
      render: (c: VoiceCall) =>
        `${c.incarceratedPerson.firstName} ${c.incarceratedPerson.lastName}`,
    },
    {
      key: 'family',
      header: 'Family Member',
      render: (c: VoiceCall) =>
        `${c.familyMember.firstName} ${c.familyMember.lastName}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: VoiceCall) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={c.status} />
          {c.isLegal && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Legal
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (c: VoiceCall) => formatDuration(c.durationSeconds),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (c: VoiceCall) => formatDateTime(c.startedAt),
    },
    {
      key: 'endedAt',
      header: 'Ended',
      render: (c: VoiceCall) => formatDateTime(c.endedAt),
    },
    {
      key: 'endedBy',
      header: 'Ended By',
      render: (c: VoiceCall) => c.endedBy ?? '--',
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="terminated">Terminated</option>
          <option value="terminated_by_admin">Terminated by Admin</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={calls}
        loading={loading}
        emptyMessage="No call history found."
        keyExtractor={(c) => c.id}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onNext={nextPage}
        onPrev={prevPage}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function VoiceDashboard() {
  const [activeTab, setActiveTab] = useState('active');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const api = useGuildApi('/api/voice');

  const fetchStats = useCallback(
    async () => {
      const res = await api.get(`/stats${facilityId ? `?facilityId=${facilityId}` : ''}`);
      return res.data ?? {};
    },
    [api, facilityId],
  );

  const { data: stats } = usePolling<VoiceStats>(fetchStats, 15000, [
    facilityId,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Voice Call Management
        </h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Active Calls"
          value={stats?.activeCalls ?? null}
          color="text-blue-600"
        />
        <StatsCard
          title="Today's Total"
          value={stats?.todayTotal ?? null}
          color="text-green-600"
        />
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'active' && (
        <ActiveCallsTab facilityId={facilityId} api={api} />
      )}
      {activeTab === 'history' && (
        <CallHistoryTab facilityId={facilityId} api={api} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route wrapper
// ---------------------------------------------------------------------------

export default function VoiceAdmin() {
  return (
    <Routes>
      <Route index element={<VoiceDashboard />} />
    </Routes>
  );
}
