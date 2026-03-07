import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@openconnect/ui';
import { useAdminApi } from '../../hooks/useAdminApi';
import { usePagination } from '../../hooks/usePagination';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { FilterBar } from '../../components/FilterBar';
import { Pagination } from '../../components/Pagination';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface AuditEntry {
  id: string;
  adminUserId: string;
  adminUser: AdminUser;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_OPTIONS = [
  'login',
  'approve_contact',
  'deny_contact',
  'terminate_voice_call',
  'approve_video_call',
  'deny_video_call',
  'approve_message',
  'block_conversation',
  'update_risk_level',
  'transfer_resident',
  'move_resident',
  'update_resident_status',
];

const ENTITY_TYPE_OPTIONS = [
  'IncarceratedPerson',
  'FamilyMember',
  'VoiceCall',
  'VideoCall',
  'Message',
  'Conversation',
  'Visitor',
  'KeywordAlert',
];

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AuditLogPage() {
  const { get } = useAdminApi();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [adminUserId, setAdminUserId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Admin users for the dropdown
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const res = await get('/users?pageSize=200');
      const users = res.data?.data || res.data || [];
      setAdminUsers(users);
    } catch {
      setAdminUsers([]);
    }
  }, [get]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (adminUserId) params.set('adminUserId', adminUserId);
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await get(`/audit-log?${params}`);
      setEntries(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [get, page, pageSize, adminUserId, action, entityType, dateFrom, dateTo, setTotalPages]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRowClick = (entry: AuditEntry) => {
    setExpandedId(expandedId === entry.id ? null : entry.id);
  };

  const expandedEntry = expandedId ? entries.find((e) => e.id === expandedId) : null;

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (e: AuditEntry) => (
        <span className="text-gray-700 whitespace-nowrap">{formatTimestamp(e.createdAt)}</span>
      ),
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (e: AuditEntry) =>
        e.adminUser ? `${e.adminUser.firstName} ${e.adminUser.lastName}` : e.adminUserId,
    },
    {
      key: 'action',
      header: 'Action',
      render: (e: AuditEntry) => <StatusBadge status={formatAction(e.action)} />,
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      render: (e: AuditEntry) => e.entityType,
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      render: (e: AuditEntry) => (
        <span className="font-mono text-xs" title={e.entityId}>
          {e.entityId.substring(0, 8)}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (e: AuditEntry) =>
        e.details ? (
          <span className="text-blue-600 text-xs">
            {expandedId === e.id ? 'Hide' : 'View'}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">None</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      <FilterBar>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">Admin</label>
          <select
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Admins</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            {ENTITY_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={entries}
        loading={loading}
        emptyMessage="No audit log entries found."
        onRowClick={handleRowClick}
      />

      {expandedEntry && expandedEntry.details && (
        <Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Entry Details
              </h3>
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setExpandedId(null)}
              >
                Close
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {expandedEntry.entityType} / {expandedEntry.entityId}
              {expandedEntry.ipAddress && ` | IP: ${expandedEntry.ipAddress}`}
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-800 overflow-x-auto">
              {JSON.stringify(expandedEntry.details, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
    </div>
  );
}
