import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useFacilityScope } from '../../../admin/ui/hooks/useFacilityScope';
import { usePagination } from '../../../admin/ui/hooks/usePagination';
import { StatsCard } from '../../../admin/ui/components/StatsCard';
import { FacilitySelector } from '../../../admin/ui/components/FacilitySelector';
import { Pagination } from '../../../admin/ui/components/Pagination';

interface PendingRequest {
  callId: string;
  personName: string;
  familyMemberName: string;
  scheduledStart: string;
}

interface ActiveCall {
  callId: string;
  personName: string;
  familyMemberName: string;
  startedAt: string;
  duration: number;
}

interface CallLog {
  id: string;
  personName: string;
  familyMemberName: string;
  status: string;
  duration: number;
  scheduledStart: string;
  actualStart: string | null;
  endedBy: string | null;
}

interface Stats {
  activeCalls: number;
  pendingRequests: number;
  todaysTotal: number;
}

function VideoDashboard() {
  const { get, post } = useGuildApi('/api/video');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const facilityParam = facilityId ? `?facilityId=${facilityId}` : '';
      const [statsRes, pendingRes, activeRes] = await Promise.all([
        get(`/stats${facilityParam}`),
        get(`/pending-requests${facilityParam}`),
        get('/active-calls'),
      ]);
      setStats(statsRes.data || statsRes);
      setPending(pendingRes.data || []);
      setActiveCalls(activeRes.data || []);
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (callId: string) => {
    setActionLoading(callId);
    try {
      await post(`/approve-request/${callId}`);
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (callId: string) => {
    setActionLoading(callId);
    try {
      await post(`/deny-request/${callId}`);
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminate = async (callId: string) => {
    setActionLoading(callId);
    try {
      await post(`/terminate-call/${callId}`);
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Video Call Management</h1>
        <Link to="logs">
          <Button variant="secondary" size="sm">View Call Logs</Button>
        </Link>
      </div>

      {isAgencyAdmin && (
        <div className="max-w-xs">
          <FacilitySelector value={facilityId} onChange={setFacilityId} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Active Calls" value={stats?.activeCalls ?? null} color="text-blue-600" />
        <StatsCard title="Pending Requests" value={stats?.pendingRequests ?? null} color="text-yellow-600" />
        <StatsCard title="Today's Total" value={stats?.todaysTotal ?? null} color="text-green-600" />
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Pending Approval Requests</h2>
        {pending.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No pending requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Family Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pending.map((req) => (
                  <tr key={req.callId}>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.personName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.familyMemberName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(req.scheduledStart).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprove(req.callId)}
                          loading={actionLoading === req.callId}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeny(req.callId)}
                          loading={actionLoading === req.callId}
                        >
                          Deny
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Active Video Calls</h2>
        {activeCalls.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No active calls</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Family Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeCalls.map((call) => (
                  <tr key={call.callId}>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.personName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.familyMemberName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(call.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleTerminate(call.callId)}
                        loading={actionLoading === call.callId}
                      >
                        Terminate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function VideoCallLogs() {
  const { get } = useGuildApi('/api/video');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (facilityId) params.set('facilityId', facilityId);
    get(`/call-logs?${params.toString()}`)
      .then((res) => {
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [get, page, pageSize, facilityId, setTotalPages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Video Call Logs</h1>
        <Link to="..">
          <Button variant="secondary" size="sm">Back to Dashboard</Button>
        </Link>
      </div>

      {isAgencyAdmin && (
        <div className="max-w-xs">
          <FacilitySelector value={facilityId} onChange={setFacilityId} />
        </div>
      )}

      <Card padding="lg">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No call logs found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Family Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ended By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.personName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.familyMemberName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.status === 'completed' ? 'bg-green-100 text-green-800' :
                          log.status === 'missed' ? 'bg-red-100 text-red-800' :
                          log.status === 'terminated' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.scheduledStart).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.actualStart ? new Date(log.actualStart).toLocaleString() : '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.endedBy || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VideoAdmin() {
  return (
    <Routes>
      <Route index element={<VideoDashboard />} />
      <Route path="logs" element={<VideoCallLogs />} />
    </Routes>
  );
}
