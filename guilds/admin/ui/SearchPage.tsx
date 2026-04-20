import React, { useState, useCallback } from 'react';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../apps/web/src/context/AuthContext';

type TabId = 'residents' | 'voice' | 'video' | 'messages';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string;
  status: string;
  housingUnit: { name: string; unitType: { name: string } };
  facility: { name: string };
}

interface VoiceCall {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
}

interface VideoCall {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
}

interface Message {
  id: string;
  content: string;
  senderType: string;
  status: string;
  createdAt: string;
  conversation: {
    incarceratedPerson: { firstName: string; lastName: string };
    familyMember: { firstName: string; lastName: string };
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data ?? json;
}

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    connected: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-600',
    approved: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    denied: 'bg-red-100 text-red-800',
    missed: 'bg-red-100 text-red-800',
    flagged: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function SearchPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<TabId>('residents');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Residents
  const [residents, setResidents] = useState<Resident[]>([]);

  // Comms
  const [voiceCalls, setVoiceCalls] = useState<VoiceCall[]>([]);
  const [videoCalls, setVideoCalls] = useState<VideoCall[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const search = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    setPage(p);
    try {
      if (tab === 'residents') {
        const data = await apiFetch<{ data: Resident[] }>(
          `/api/admin/residents?search=${encodeURIComponent(query)}`, token
        );
        // API wraps in createSuccessResponse, data may be array directly or nested
        setResidents(Array.isArray(data) ? data : (data as any).data ?? data);
      } else if (tab === 'voice') {
        const resp = await apiFetch<any>(
          `/api/voice/call-logs?page=${p}&pageSize=20`, token
        );
        setVoiceCalls(resp.data ?? resp);
        setPagination(resp.pagination ?? null);
      } else if (tab === 'video') {
        const resp = await apiFetch<any>(
          `/api/video/call-logs?page=${p}&pageSize=20`, token
        );
        setVideoCalls(resp.data ?? resp);
        setPagination(resp.pagination ?? null);
      } else if (tab === 'messages') {
        const resp = await apiFetch<any>(
          `/api/messaging/logs?page=${p}&pageSize=20`, token
        );
        setMessages(resp.data ?? resp);
        setPagination(resp.pagination ?? null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [token, tab, query]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'residents', label: 'Residents' },
    { id: 'voice', label: 'Voice Calls' },
    { id: 'video', label: 'Video Calls' },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-600">Find residents, calls, and messages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setResidents([]); setVoiceCalls([]); setVideoCalls([]); setMessages([]); setPagination(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(1)}
          placeholder={tab === 'residents' ? 'Search by name or ID...' : 'Search communications...'}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => search(1)}
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <Card padding="lg">
        {/* Residents */}
        {tab === 'residents' && (
          residents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {loading ? 'Searching...' : 'Search for residents by name or external ID'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">External ID</th>
                    <th className="pb-2 pr-4">Facility</th>
                    <th className="pb-2 pr-4">Housing</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium">{r.firstName} {r.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600 font-mono text-xs">{r.externalId}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{r.facility?.name}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{r.housingUnit?.name} ({r.housingUnit?.unitType?.name})</td>
                      <td className="py-2.5 pr-4"><StatusPill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Voice Calls */}
        {tab === 'voice' && (
          voiceCalls.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {loading ? 'Searching...' : 'Click Search to load voice call logs'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">Resident</th>
                    <th className="pb-2 pr-4">Family Member</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {voiceCalls.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium">{c.incarceratedPerson?.firstName} {c.incarceratedPerson?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{c.familyMember?.firstName} {c.familyMember?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{formatDate(c.startedAt)}</td>
                      <td className="py-2.5 pr-4">{formatDuration(c.durationSeconds)}</td>
                      <td className="py-2.5 pr-4"><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Video Calls */}
        {tab === 'video' && (
          videoCalls.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {loading ? 'Searching...' : 'Click Search to load video call logs'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">Resident</th>
                    <th className="pb-2 pr-4">Family Member</th>
                    <th className="pb-2 pr-4">Scheduled</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {videoCalls.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium">{c.incarceratedPerson?.firstName} {c.incarceratedPerson?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{c.familyMember?.firstName} {c.familyMember?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{formatDate(c.scheduledStart)}</td>
                      <td className="py-2.5 pr-4"><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Messages */}
        {tab === 'messages' && (
          messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {loading ? 'Searching...' : 'Click Search to load message logs'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">Resident</th>
                    <th className="pb-2 pr-4">Family Member</th>
                    <th className="pb-2 pr-4">Message</th>
                    <th className="pb-2 pr-4">Sender</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium">{m.conversation?.incarceratedPerson?.firstName} {m.conversation?.incarceratedPerson?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{m.conversation?.familyMember?.firstName} {m.conversation?.familyMember?.lastName}</td>
                      <td className="py-2.5 pr-4 text-gray-600 max-w-xs truncate">{m.content}</td>
                      <td className="py-2.5 pr-4">{m.senderType}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{formatDate(m.createdAt)}</td>
                      <td className="py-2.5 pr-4"><StatusPill status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination for comms tabs */}
        {tab !== 'residents' && pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => search(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => search(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
