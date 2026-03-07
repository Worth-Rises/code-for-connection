import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Card, Button, Modal, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useFacilityScope } from '../../../admin/ui/hooks/useFacilityScope';
import { usePagination } from '../../../admin/ui/hooks/usePagination';
import { StatsCard } from '../../../admin/ui/components/StatsCard';
import { FacilitySelector } from '../../../admin/ui/components/FacilitySelector';
import { Pagination } from '../../../admin/ui/components/Pagination';

interface VoiceStats {
  activeCalls: number;
  todayTotal: number;
}

interface ActiveCall {
  callId: string;
  firstName: string;
  lastName: string;
  familyMemberName: string;
  status: string;
  startedAt: string;
}

interface CallLog {
  callId: string;
  firstName: string;
  lastName: string;
  familyMemberName: string;
  status: string;
  duration: number;
  startedAt: string;
  endedAt: string | null;
  endedBy: string | null;
}

function formatDuration(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function VoiceDashboard() {
  const { get, post } = useGuildApi('/api/voice');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    if (facilityId) params.set('facilityId', facilityId);
    const query = params.toString() ? `?${params}` : '';

    Promise.all([
      get(`/stats${query}`),
      get(`/active-calls${query}`),
    ])
      .then(([statsRes, callsRes]) => {
        setStats(statsRes.data || statsRes);
        setActiveCalls(callsRes.data || callsRes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [get, facilityId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-render every second so durations update
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminate = useCallback(
    (callId: string) => {
      post(`/terminate-call/${callId}`)
        .then(() => {
          setActiveCalls((prev) => prev.filter((c) => c.callId !== callId));
          setTerminatingId(null);
        })
        .catch(() => setTerminatingId(null));
    },
    [post]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Call Management</h1>
          <Link to="logs" className="text-sm text-blue-600 hover:underline">
            View Call Logs
          </Link>
        </div>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Active Calls" value={stats?.activeCalls ?? null} color="text-blue-600" />
        <StatsCard title="Today's Total" value={stats?.todayTotal ?? null} color="text-green-600" />
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Active Calls</h2>
        {activeCalls.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No active calls</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Family Member</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Started At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeCalls.map((call) => (
                  <tr key={call.callId}>
                    <td className="px-4 py-3">{call.firstName} {call.lastName}</td>
                    <td className="px-4 py-3">{call.familyMemberName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDuration(call.startedAt)}</td>
                    <td className="px-4 py-3">{formatTime(call.startedAt)}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setTerminatingId(call.callId)}
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

      <Modal
        open={terminatingId !== null}
        onClose={() => setTerminatingId(null)}
        title="Terminate Call"
      >
        <p className="mb-4">Are you sure you want to terminate this call?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTerminatingId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => terminatingId && handleTerminate(terminatingId)}
          >
            Terminate
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function VoiceCallLogs() {
  const { get } = useGuildApi('/api/voice');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (facilityId) params.set('facilityId', facilityId);

    setLoading(true);
    get(`/call-logs?${params}`)
      .then((res) => {
        setLogs(res.data || []);
        if (res.totalPages) setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [get, page, pageSize, facilityId, setTotalPages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <Link to="/admin/voice" className="text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

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
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Family Member</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Ended</th>
                    <th className="px-4 py-3">Ended By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.callId}>
                      <td className="px-4 py-3">{log.firstName} {log.lastName}</td>
                      <td className="px-4 py-3">{log.familyMemberName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'terminated'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatSeconds(log.duration)}</td>
                      <td className="px-4 py-3">{formatTime(log.startedAt)}</td>
                      <td className="px-4 py-3">{log.endedAt ? formatTime(log.endedAt) : '-'}</td>
                      <td className="px-4 py-3">{log.endedBy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onNext={nextPage}
                onPrev={prevPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VoiceAdmin() {
  return (
    <Routes>
      <Route index element={<VoiceDashboard />} />
      <Route path="logs" element={<VoiceCallLogs />} />
    </Routes>
  );
}
