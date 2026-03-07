import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card, Button, ConfirmModal } from '@openconnect/ui';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoCall {
  id: string;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
  status: string;
  isLegal: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationSeconds?: number;
  endedBy?: string;
}

interface VideoStats {
  activeCalls: number;
  pendingRequests: number;
  todayTotal: number;
}

// ---------------------------------------------------------------------------
// useGuildApi - simple fetch wrapper for /api/video
// ---------------------------------------------------------------------------

function useGuildApi() {
  const { token } = useAuth();

  const request = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(`/api/video${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Request failed: ${response.status}`);
      }
      return data;
    },
    [token]
  );

  const get = useCallback((path: string) => request('GET', path), [request]);
  const post = useCallback(
    (path: string, body?: unknown) => request('POST', path, body),
    [request]
  );

  return { get, post };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function liveDuration(startIso?: string): string {
  if (!startIso) return '--';
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  if (elapsed < 0) return '0:00';
  return formatDuration(elapsed);
}

// ---------------------------------------------------------------------------
// VideoDashboard
// ---------------------------------------------------------------------------

function VideoDashboard() {
  const { get, post } = useGuildApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();

  const [activeTab, setActiveTab] = useState<string>('pending');

  // ------ Confirm modal state ------
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    action: (() => Promise<void>) | null;
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'Confirm',
    action: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (opts: {
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    action: () => Promise<void>;
  }) => {
    setConfirmModal({ open: true, ...opts });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, open: false, action: null }));
    setConfirmLoading(false);
  };

  const handleConfirm = async () => {
    if (!confirmModal.action) return;
    setConfirmLoading(true);
    try {
      await confirmModal.action();
    } finally {
      closeConfirm();
    }
  };

  // ------ Stats (always visible, polled) ------
  const { data: stats } = usePolling<VideoStats>(
    () => get('/stats').then((r) => r.data ?? r),
    15_000,
    [facilityId]
  );

  // ------ Pending requests ------
  const pendingPagination = usePagination(20);
  const { data: pendingData, loading: pendingLoading, refresh: refreshPending } = usePolling<{
    data: VideoCall[];
    totalPages: number;
  }>(
    () =>
      get(
        `/pending-requests?page=${pendingPagination.page}&pageSize=${pendingPagination.pageSize}${facilityId ? `&facilityId=${facilityId}` : ''}`
      ).then((r) => {
        pendingPagination.setTotalPages(r.totalPages ?? 1);
        return r;
      }),
    30_000,
    [pendingPagination.page, facilityId]
  );

  const pendingCalls: VideoCall[] = pendingData?.data ?? [];

  const approveRequest = (call: VideoCall) => {
    openConfirm({
      title: 'Approve Video Call Request',
      message: `Approve the video call request for ${call.incarceratedPerson.firstName} ${call.incarceratedPerson.lastName} with ${call.familyMember.firstName} ${call.familyMember.lastName}?`,
      variant: 'info',
      confirmText: 'Approve',
      action: async () => {
        await post(`/approve-request/${call.id}`);
        refreshPending();
      },
    });
  };

  const denyRequest = (call: VideoCall) => {
    openConfirm({
      title: 'Deny Video Call Request',
      message: `Deny the video call request for ${call.incarceratedPerson.firstName} ${call.incarceratedPerson.lastName} with ${call.familyMember.firstName} ${call.familyMember.lastName}?`,
      variant: 'danger',
      confirmText: 'Deny',
      action: async () => {
        await post(`/deny-request/${call.id}`);
        refreshPending();
      },
    });
  };

  // ------ Active calls (polled) ------
  const { data: activeData, loading: activeLoading, refresh: refreshActive } = usePolling<{
    data: VideoCall[];
  }>(
    () =>
      get(
        `/active-calls${facilityId ? `?facilityId=${facilityId}` : ''}`
      ),
    15_000,
    [facilityId]
  );

  const activeCalls: VideoCall[] = activeData?.data ?? [];

  const terminateCall = (call: VideoCall) => {
    openConfirm({
      title: 'Terminate Video Call',
      message: `Terminate the active call between ${call.incarceratedPerson.firstName} ${call.incarceratedPerson.lastName} and ${call.familyMember.firstName} ${call.familyMember.lastName}?`,
      variant: 'danger',
      confirmText: 'Terminate',
      action: async () => {
        await post(`/terminate-call/${call.id}`);
        refreshActive();
      },
    });
  };

  // ------ History ------
  const historyPagination = usePagination(20);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
  });

  const filterQuery = [
    historyFilters.startDate ? `startDate=${historyFilters.startDate}` : '',
    historyFilters.endDate ? `endDate=${historyFilters.endDate}` : '',
    historyFilters.status ? `status=${historyFilters.status}` : '',
    facilityId ? `facilityId=${facilityId}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const { data: historyData, loading: historyLoading } = usePolling<{
    data: VideoCall[];
    totalPages: number;
  }>(
    () =>
      get(
        `/call-logs?page=${historyPagination.page}&pageSize=${historyPagination.pageSize}${filterQuery ? `&${filterQuery}` : ''}`
      ).then((r) => {
        historyPagination.setTotalPages(r.totalPages ?? 1);
        return r;
      }),
    0, // no polling for history; fetches on dependency change
    [historyPagination.page, facilityId, historyFilters.startDate, historyFilters.endDate, historyFilters.status]
  );

  const historyCalls: VideoCall[] = historyData?.data ?? [];

  // ------ Tab config ------
  const tabs = [
    { key: 'pending', label: 'Pending Requests', count: stats?.pendingRequests },
    { key: 'active', label: 'Active Calls' },
    { key: 'history', label: 'Call History' },
  ];

  // ------ Legal badge helper ------
  const legalBadge = (call: VideoCall) =>
    call.isLegal ? (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
        Legal
      </span>
    ) : null;

  // ------ Column definitions ------
  const pendingColumns = [
    {
      key: 'person',
      header: 'Person',
      render: (c: VideoCall) => (
        <span>
          {c.incarceratedPerson.lastName}, {c.incarceratedPerson.firstName}
          {legalBadge(c)}
        </span>
      ),
    },
    {
      key: 'family',
      header: 'Family Member',
      render: (c: VideoCall) =>
        `${c.familyMember.lastName}, ${c.familyMember.firstName}`,
    },
    {
      key: 'scheduledStart',
      header: 'Scheduled Time',
      render: (c: VideoCall) => formatDateTime(c.scheduledStart),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: VideoCall) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c: VideoCall) => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => approveRequest(c)}>
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => denyRequest(c)}>
            Deny
          </Button>
        </div>
      ),
    },
  ];

  const activeColumns = [
    {
      key: 'person',
      header: 'Person',
      render: (c: VideoCall) => (
        <span>
          {c.incarceratedPerson.lastName}, {c.incarceratedPerson.firstName}
          {legalBadge(c)}
        </span>
      ),
    },
    {
      key: 'family',
      header: 'Family Member',
      render: (c: VideoCall) =>
        `${c.familyMember.lastName}, ${c.familyMember.firstName}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: VideoCall) => <StatusBadge status={c.status} />,
    },
    {
      key: 'started',
      header: 'Started',
      render: (c: VideoCall) =>
        c.actualStart ? formatDateTime(c.actualStart) : '--',
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (c: VideoCall) => liveDuration(c.actualStart),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c: VideoCall) => (
        <Button size="sm" variant="danger" onClick={() => terminateCall(c)}>
          Terminate
        </Button>
      ),
    },
  ];

  const historyColumns = [
    {
      key: 'person',
      header: 'Person',
      render: (c: VideoCall) => (
        <span>
          {c.incarceratedPerson.lastName}, {c.incarceratedPerson.firstName}
          {legalBadge(c)}
        </span>
      ),
    },
    {
      key: 'family',
      header: 'Family Member',
      render: (c: VideoCall) =>
        `${c.familyMember.lastName}, ${c.familyMember.firstName}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: VideoCall) => <StatusBadge status={c.status} />,
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      render: (c: VideoCall) => formatDateTime(c.scheduledStart),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (c: VideoCall) =>
        c.durationSeconds != null ? formatDuration(c.durationSeconds) : '--',
    },
    {
      key: 'endedBy',
      header: 'Ended By',
      render: (c: VideoCall) => c.endedBy ?? '--',
    },
  ];

  // ------ Render ------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Video Call Management</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Active Calls"
          value={stats?.activeCalls ?? null}
          color="text-blue-600"
        />
        <StatsCard
          title="Pending Requests"
          value={stats?.pendingRequests ?? null}
          color="text-yellow-600"
        />
        <StatsCard
          title="Today's Total"
          value={stats?.todayTotal ?? null}
          color="text-green-600"
        />
      </div>

      {/* Tabs */}
      <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Pending Requests tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <DataTable<VideoCall>
            columns={pendingColumns}
            data={pendingCalls}
            loading={pendingLoading}
            emptyMessage="No pending requests."
          />
          {pendingPagination.totalPages > 1 && (
            <Pagination
              page={pendingPagination.page}
              totalPages={pendingPagination.totalPages}
              onNext={pendingPagination.nextPage}
              onPrev={pendingPagination.prevPage}
            />
          )}
        </div>
      )}

      {/* Active Calls tab */}
      {activeTab === 'active' && (
        <DataTable<VideoCall>
          columns={activeColumns}
          data={activeCalls}
          loading={activeLoading}
          emptyMessage="No active calls."
        />
      )}

      {/* Call History tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <FilterBar>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From</label>
              <input
                type="date"
                value={historyFilters.startDate}
                onChange={(e) =>
                  setHistoryFilters((f) => ({ ...f, startDate: e.target.value }))
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To</label>
              <input
                type="date"
                value={historyFilters.endDate}
                onChange={(e) =>
                  setHistoryFilters((f) => ({ ...f, endDate: e.target.value }))
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={historyFilters.status}
              onChange={(e) =>
                setHistoryFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
              <option value="terminated_by_admin">Terminated by Admin</option>
              <option value="failed">Failed</option>
              <option value="denied">Denied</option>
              <option value="expired">Expired</option>
            </select>
          </FilterBar>

          <DataTable<VideoCall>
            columns={historyColumns}
            data={historyCalls}
            loading={historyLoading}
            emptyMessage="No call history found."
          />

          {historyPagination.totalPages > 1 && (
            <Pagination
              page={historyPagination.page}
              totalPages={historyPagination.totalPages}
              onNext={historyPagination.nextPage}
              onPrev={historyPagination.prevPage}
            />
          )}
        </div>
      )}

      {/* Shared confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        loading={confirmLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route export
// ---------------------------------------------------------------------------

export default function VideoAdmin() {
  return (
    <Routes>
      <Route index element={<VideoDashboard />} />
    </Routes>
  );
}
