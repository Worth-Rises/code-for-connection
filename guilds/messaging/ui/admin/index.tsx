import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card, Button, ConfirmModal, Modal } from '@openconnect/ui';
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

// --- Interfaces ---

interface Message {
  id: string;
  conversationId: string;
  senderType: 'incarcerated' | 'family';
  senderId: string;
  senderName: string;
  recipientName: string;
  body: string;
  status: string;
  createdAt: string;
  attachments?: { id: string; fileType: string; fileUrl: string; status: string }[];
}

interface MessagingStats {
  pendingReview: number;
  todayTotal: number;
}

// --- useGuildApi hook ---

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
      const response = await fetch(`/api/messaging${path}`, {
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
  const post = useCallback((path: string, body?: unknown) => request('POST', path, body), [request]);

  return { get, post };
}

// --- Helper ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncateBody(body: string, maxLen = 80): React.ReactNode {
  if (body.length <= maxLen) return body;
  return (
    <>
      {body.slice(0, maxLen)}
      <span className="text-gray-500">...</span>
    </>
  );
}

// --- Dashboard ---

function MessagingDashboard() {
  const { get, post } = useGuildApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [activeTab, setActiveTab] = useState('pending');

  // Stats polling (15s)
  const facilityParam = facilityId ? `?facilityId=${facilityId}` : '';
  const { data: stats } = usePolling<MessagingStats>(
    useCallback(() => get(`/stats${facilityParam}`).then((r) => r.data), [get, facilityParam]),
    15000,
    [facilityParam]
  );

  // Pending messages polling (30s)
  const { data: pendingMessages, loading: pendingLoading, refresh: refreshPending } = usePolling<Message[]>(
    useCallback(() => get(`/pending${facilityParam}`).then((r) => r.data || []), [get, facilityParam]),
    30000,
    [facilityParam]
  );

  // Logs state
  const { page, totalPages, setTotalPages, nextPage, prevPage } = usePagination(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const logsParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (facilityId) params.set('facilityId', facilityId);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  }, [page, facilityId, statusFilter, dateFrom, dateTo]);

  const { data: logsData, loading: logsLoading } = usePolling<{ messages: Message[]; totalPages: number }>(
    useCallback(async () => {
      if (activeTab !== 'logs') return { messages: [], totalPages: 1 };
      const res = await get(`/logs?${logsParams()}`);
      const result = res.data || { messages: [], totalPages: 1 };
      setTotalPages(result.totalPages || 1);
      return result;
    }, [get, logsParams, activeTab, setTotalPages]),
    60000,
    [logsParams, activeTab]
  );

  // Action state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'block';
    messageId: string;
    conversationId: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Detail modal
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const handleApprove = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await post(`/approve/${confirmAction.messageId}`);
      setConfirmAction(null);
      refreshPending();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await post(`/block-conversation/${confirmAction.conversationId}`);
      setConfirmAction(null);
      refreshPending();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  const pendingColumns = [
    {
      key: 'senderType',
      header: 'Sender Type',
      render: (m: Message) => <span className="capitalize">{m.senderType}</span>,
    },
    { key: 'senderName', header: 'Sender' },
    { key: 'recipientName', header: 'Recipient' },
    {
      key: 'body',
      header: 'Preview',
      render: (m: Message) => <span className="text-sm">{truncateBody(m.body)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (m: Message) => formatDate(m.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (m: Message) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={() =>
              setConfirmAction({ type: 'approve', messageId: m.id, conversationId: m.conversationId })
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              setConfirmAction({ type: 'block', messageId: m.id, conversationId: m.conversationId })
            }
          >
            Block Conversation
          </Button>
        </div>
      ),
    },
  ];

  const logsColumns = [
    { key: 'senderName', header: 'Sender' },
    { key: 'recipientName', header: 'Recipient' },
    {
      key: 'status',
      header: 'Status',
      render: (m: Message) => (
        <StatusBadge
          status={m.status}
          colorMap={{
            sent: 'bg-blue-100 text-blue-800',
            delivered: 'bg-green-100 text-green-800',
            read: 'bg-green-100 text-green-800',
          }}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (m: Message) => formatDate(m.createdAt),
    },
    {
      key: 'body',
      header: 'Preview',
      render: (m: Message) => <span className="text-sm">{truncateBody(m.body)}</span>,
    },
  ];

  const tabs = [
    { key: 'pending', label: 'Pending Review', count: stats?.pendingReview },
    { key: 'logs', label: 'Message Logs' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Pending Review"
          value={stats?.pendingReview ?? null}
          color="text-yellow-600"
        />
        <StatsCard
          title="Today's Total"
          value={stats?.todayTotal ?? null}
          color="text-green-600"
        />
      </div>

      {/* Tab Navigation */}
      <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Pending Review Tab */}
      {activeTab === 'pending' && (
        <DataTable<Message>
          columns={pendingColumns}
          data={pendingMessages || []}
          loading={pendingLoading}
          emptyMessage="No messages pending review."
          onRowClick={(m) => setSelectedMessage(m)}
          keyExtractor={(m) => m.id}
        />
      )}

      {/* Message Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <FilterBar>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="blocked">Blocked</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
              </select>
            </div>
          </FilterBar>

          <DataTable<Message>
            columns={logsColumns}
            data={logsData?.messages || []}
            loading={logsLoading}
            emptyMessage="No messages found."
            onRowClick={(m) => setSelectedMessage(m)}
            keyExtractor={(m) => m.id}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onNext={nextPage}
            onPrev={prevPage}
          />
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction?.type === 'approve'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        title="Approve Message"
        message="Are you sure you want to approve this message? It will be delivered to the recipient."
        confirmText="Approve"
        variant="info"
        loading={actionLoading}
      />

      {/* Block Conversation Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction?.type === 'block'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleBlock}
        title="Block Conversation"
        message="Are you sure you want to block this entire conversation? All pending messages in this conversation will be blocked and no further messages can be sent."
        confirmText="Block Conversation"
        variant="danger"
        loading={actionLoading}
      />

      {/* Message Detail Modal */}
      <Modal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title="Message Details"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Sender Type</p>
                <p className="text-sm capitalize">{selectedMessage.senderType}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                <StatusBadge status={selectedMessage.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Sender</p>
                <p className="text-sm">{selectedMessage.senderName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Recipient</p>
                <p className="text-sm">{selectedMessage.recipientName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                <p className="text-sm">{formatDate(selectedMessage.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Conversation ID</p>
                <p className="text-sm font-mono text-gray-600">{selectedMessage.conversationId}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Full Message</p>
              <Card padding="md">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
              </Card>
            </div>

            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Attachments ({selectedMessage.attachments.length})
                </p>
                <div className="space-y-2">
                  {selectedMessage.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{att.fileType}</span>
                        <StatusBadge status={att.status} />
                      </div>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedMessage.status === 'blocked' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-700 font-medium">This message has been blocked.</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
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
