import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useFacilityScope } from '../../../admin/ui/hooks/useFacilityScope';
import { usePagination } from '../../../admin/ui/hooks/usePagination';
import { StatsCard } from '../../../admin/ui/components/StatsCard';
import { FacilitySelector } from '../../../admin/ui/components/FacilitySelector';
import { Pagination } from '../../../admin/ui/components/Pagination';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  conversationId: string;
  senderType: 'incarcerated' | 'family';
  status: string;
  conversation: {
    incarceratedPerson: { firstName: string; lastName: string };
    familyMember: { firstName: string; lastName: string };
  };
}

interface Stats {
  pendingReview: number;
  todaysTotal: number;
}

function MessagingDashboard() {
  const { get, post } = useGuildApi('/api/messaging');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const query = facilityId ? `?facilityId=${facilityId}` : '';
      const [statsRes, pendingRes] = await Promise.all([
        get(`/stats${query}`),
        get(`/pending${query}`),
      ]);
      setStats(statsRes.data || statsRes);
      setPending(pendingRes.data || []);
    } catch {
      setStats(null);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (messageId: string) => {
    setActionLoading(messageId);
    try {
      await post(`/approve/${messageId}`);
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (conversationId: string) => {
    setActionLoading(conversationId);
    try {
      await post(`/block-conversation/${conversationId}`);
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const getSenderName = (msg: Message) => {
    const person =
      msg.senderType === 'incarcerated'
        ? msg.conversation.incarceratedPerson
        : msg.conversation.familyMember;
    return `${msg.senderType === 'incarcerated' ? 'Resident' : 'Family'}: ${person.firstName} ${person.lastName}`;
  };

  const getRecipientName = (msg: Message) => {
    const person =
      msg.senderType === 'incarcerated'
        ? msg.conversation.familyMember
        : msg.conversation.incarceratedPerson;
    return `${person.firstName} ${person.lastName}`;
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
        <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>
        <Link to="logs">
          <Button variant="secondary" size="sm">View Logs</Button>
        </Link>
      </div>

      {isAgencyAdmin && (
        <FacilitySelector value={facilityId} onChange={setFacilityId} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Pending Review"
          value={stats?.pendingReview ?? null}
          color="text-yellow-600"
        />
        <StatsCard
          title="Today's Total"
          value={stats?.todaysTotal ?? null}
          color="text-green-600"
        />
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Messages Pending Review</h2>
        {pending.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No messages pending review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pending.map((msg) => (
                  <tr key={msg.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{getSenderName(msg)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getRecipientName(msg)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {msg.body.length > 50 ? `${msg.body.slice(0, 50)}...` : msg.body}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionLoading === msg.id}
                          onClick={() => handleApprove(msg.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={actionLoading === msg.conversationId}
                          onClick={() => handleBlock(msg.conversationId)}
                        >
                          Block
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
    </div>
  );
}

interface LogEntry {
  id: string;
  body: string;
  createdAt: string;
  status: string;
  senderType: 'incarcerated' | 'family';
  conversation: {
    incarceratedPerson: { firstName: string; lastName: string };
    familyMember: { firstName: string; lastName: string };
  };
}

function MessageLogs() {
  const { get } = useGuildApi('/api/messaging');
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (facilityId) query.set('facilityId', facilityId);
    get(`/logs?${query.toString()}`)
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
        <h1 className="text-2xl font-bold text-gray-900">Message Logs</h1>
        <Link to="..">
          <Button variant="secondary" size="sm">Back to Dashboard</Button>
        </Link>
      </div>

      {isAgencyAdmin && (
        <FacilitySelector value={facilityId} onChange={setFacilityId} />
      )}

      <Card padding="lg">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No message logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => {
                  const sender =
                    log.senderType === 'incarcerated'
                      ? log.conversation.incarceratedPerson
                      : log.conversation.familyMember;
                  const recipient =
                    log.senderType === 'incarcerated'
                      ? log.conversation.familyMember
                      : log.conversation.incarceratedPerson;
                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sender.firstName} {sender.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {recipient.firstName} {recipient.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            log.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'blocked'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.body.length > 50 ? `${log.body.slice(0, 50)}...` : log.body}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MessagingAdmin() {
  return (
    <Routes>
      <Route index element={<MessagingDashboard />} />
      <Route path="logs" element={<MessageLogs />} />
    </Routes>
  );
}
