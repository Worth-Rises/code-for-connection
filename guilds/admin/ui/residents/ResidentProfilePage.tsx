import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { StatusBadge } from '../components/StatusBadge';
import { TabNav } from '../components/TabNav';
import { DataTable } from '../components/DataTable';

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface ApprovedContact {
  id: string;
  familyMember: FamilyMember;
  isAttorney: boolean;
  status: string;
  relationship?: string;
}

interface VisitorLink {
  id: string;
  visitor: { id: string; firstName: string; lastName: string; visitorType: string };
  status: string;
}

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  status: string;
  riskLevel: string;
  notes: string | null;
  facility: { id: string; name: string };
  housingUnit: { id: string; name: string };
  approvedContacts: ApprovedContact[];
  visitorLinks: VisitorLink[];
}

interface TimelineItem {
  type: string;
  date: string;
  description: string;
  details: Record<string, unknown>;
}

interface HistoryItem {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  changedByAdmin: { id: string; firstName: string; lastName: string };
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'housing', label: 'Housing' },
  { key: 'notes', label: 'Notes' },
];

const TIMELINE_ICONS: Record<string, string> = {
  voice_call: 'phone',
  video_call: 'video',
  message: 'message',
};

export default function ResidentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { get, patch } = useAdminApi();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchResident = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await get(`/residents/${id}`);
      const data = res.data;
      setResident(data);
      setNotes(data?.notes || '');
    } catch {
      setResident(null);
    } finally {
      setLoading(false);
    }
  }, [get, id]);

  const fetchTimeline = useCallback(async () => {
    if (!id) return;
    setTimelineLoading(true);
    try {
      const res = await get(`/residents/${id}/timeline`);
      setTimeline(res.data || []);
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [get, id]);

  const fetchHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await get(`/residents/${id}/history`);
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [get, id]);

  useEffect(() => {
    fetchResident();
  }, [fetchResident]);

  useEffect(() => {
    if (activeTab === 'activity') fetchTimeline();
    if (activeTab === 'housing') fetchHistory();
  }, [activeTab, fetchTimeline, fetchHistory]);

  const handleSaveNotes = async () => {
    if (!id) return;
    setNotesSaving(true);
    try {
      await patch(`/residents/${id}/notes`, { notes });
      await fetchResident();
    } catch {
      // keep current state on error
    } finally {
      setNotesSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading resident profile...</div>
    );
  }

  if (!resident) {
    return (
      <div className="text-center py-12 text-gray-500">Resident not found.</div>
    );
  }

  const initials = `${resident.firstName.charAt(0)}${resident.lastName.charAt(0)}`.toUpperCase();

  const contactColumns = [
    {
      key: 'name',
      header: 'Contact Name',
      render: (c: ApprovedContact) => `${c.familyMember.firstName} ${c.familyMember.lastName}`,
    },
    {
      key: 'relationship',
      header: 'Relationship',
      render: (c: ApprovedContact) => c.relationship || '-',
    },
    {
      key: 'isAttorney',
      header: 'Attorney',
      render: (c: ApprovedContact) => (
        <StatusBadge
          status={c.isAttorney ? 'yes' : 'no'}
          colorMap={{
            yes: 'bg-blue-100 text-blue-800',
            no: 'bg-gray-100 text-gray-800',
          }}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: ApprovedContact) => <StatusBadge status={c.status} />,
    },
  ];

  const housingHistory = history.filter((h) => h.field === 'housingUnitId');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {resident.firstName} {resident.lastName}
            </h1>
            <StatusBadge status={resident.status} />
            <StatusBadge status={resident.riskLevel} colorMap={RISK_LEVEL_COLORS} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            ID: {resident.externalId || resident.id}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          {timelineLoading ? (
            <p className="text-gray-500 text-center py-4">Loading activity...</p>
          ) : timeline.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No activity recorded.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {timeline.map((item, i) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-400" />
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 mr-2">
                          {TIMELINE_ICONS[item.type] || item.type}
                        </span>
                        <span className="text-sm text-gray-900">{item.description}</span>
                        {item.details?.status && (
                          <span className="ml-2">
                            <StatusBadge status={String(item.details.status)} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <DataTable
          columns={contactColumns}
          data={resident.approvedContacts}
          emptyMessage="No approved contacts."
        />
      )}

      {/* Housing Tab */}
      {activeTab === 'housing' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Assignment</h3>
            <p className="text-lg font-semibold text-gray-900">{resident.housingUnit?.name || 'Unassigned'}</p>
            <p className="text-sm text-gray-500">{resident.facility?.name}</p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Transfer History</h3>
            {historyLoading ? (
              <p className="text-gray-500 text-center py-4">Loading history...</p>
            ) : housingHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No transfer history.</p>
            ) : (
              <div className="space-y-3">
                {housingHistory.map((h) => (
                  <div key={h.id} className="flex items-start justify-between border-b border-gray-100 pb-2 last:border-0">
                    <div>
                      <p className="text-sm text-gray-900">
                        Moved from <span className="font-medium">{h.oldValue || 'N/A'}</span> to{' '}
                        <span className="font-medium">{h.newValue || 'N/A'}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        by {h.changedByAdmin.firstName} {h.changedByAdmin.lastName}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <Card>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Add admin notes about this resident..."
          />
          <div className="flex justify-end mt-3">
            <Button onClick={handleSaveNotes} loading={notesSaving}>
              Save Notes
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
