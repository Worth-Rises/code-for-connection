import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { DataTable } from '../components/DataTable';
import { TabNav } from '../components/TabNav';
import { FilterBar } from '../components/FilterBar';
import { FacilitySelector } from '../components/FacilitySelector';
import { StatsCard } from '../components/StatsCard';

type ReportTab = 'volume' | 'moderation' | 'flags' | 'visitors';

interface DailyVolume {
  date: string;
  voice: number;
  video: number;
  messages: number;
}

interface VolumeData {
  voiceCalls: number;
  videoCalls: number;
  messages: number;
  daily: DailyVolume[];
}

interface ModerationData {
  messagesReviewed: number;
  messagesBlocked: number;
  contactsApproved: number;
  contactsDenied: number;
}

interface FlaggedData {
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
}

interface VisitorData {
  applications: number;
  approved: number;
  denied: number;
  suspended: number;
}

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const TAB_TO_EXPORT_TYPE: Record<ReportTab, string> = {
  volume: 'communication-volume',
  moderation: 'moderation',
  flags: 'flagged-content',
  visitors: 'visitors',
};

export default function ReportsPage() {
  const { get } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [activeTab, setActiveTab] = useState<ReportTab>('volume');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [loading, setLoading] = useState(false);

  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
  const [moderationData, setModerationData] = useState<ModerationData | null>(null);
  const [flaggedData, setFlaggedData] = useState<FlaggedData | null>(null);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (facilityId) params.set('facilityId', facilityId);
    return params.toString();
  }, [dateFrom, dateTo, facilityId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      if (activeTab === 'volume') {
        const res = await get(`/reports/communication-volume?${params}`);
        setVolumeData(res.data);
      } else if (activeTab === 'moderation') {
        const res = await get(`/reports/moderation?${params}`);
        setModerationData(res.data);
      } else if (activeTab === 'flags') {
        const res = await get(`/reports/flagged-content?${params}`);
        setFlaggedData(res.data);
      } else if (activeTab === 'visitors') {
        const res = await get(`/reports/visitors?${params}`);
        setVisitorData(res.data);
      }
    } catch {
      // Data stays null on error
    } finally {
      setLoading(false);
    }
  }, [get, activeTab, buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    const params = new URLSearchParams({
      type: TAB_TO_EXPORT_TYPE[activeTab],
      dateFrom,
      dateTo,
    });
    if (facilityId) params.set('facilityId', facilityId);
    window.open(`/api/admin/reports/export?${params.toString()}`, '_blank');
  };

  const tabs = [
    { key: 'volume', label: 'Volume' },
    { key: 'moderation', label: 'Moderation' },
    { key: 'flags', label: 'Flags' },
    { key: 'visitors', label: 'Visitors' },
  ];

  const volumeColumns = [
    { key: 'date', header: 'Date' },
    { key: 'voice', header: 'Voice Calls', render: (r: DailyVolume) => r.voice },
    { key: 'video', header: 'Video Calls', render: (r: DailyVolume) => r.video },
    { key: 'messages', header: 'Messages', render: (r: DailyVolume) => r.messages },
    {
      key: 'total',
      header: 'Total',
      render: (r: DailyVolume) => r.voice + r.video + r.messages,
    },
  ];

  const flagReasonColumns = [
    { key: 'label', header: 'Reason' },
    { key: 'count', header: 'Count' },
  ];

  const flagSeverityColumns = [
    { key: 'label', header: 'Severity' },
    { key: 'count', header: 'Count' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center gap-4">
          {isAgencyAdmin && (
            <div className="w-64">
              <FacilitySelector value={facilityId} onChange={setFacilityId} />
            </div>
          )}
          <Button onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      <FilterBar>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
      </FilterBar>

      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as ReportTab)}
      />

      {loading && (
        <Card padding="md">
          <p className="text-center text-gray-500 py-8">Loading report data...</p>
        </Card>
      )}

      {!loading && activeTab === 'volume' && volumeData && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard title="Total Voice Calls" value={volumeData.voiceCalls} color="text-blue-600" />
            <StatsCard title="Total Video Calls" value={volumeData.videoCalls} color="text-green-600" />
            <StatsCard title="Total Messages" value={volumeData.messages} color="text-purple-600" />
          </div>
          <DataTable
            columns={volumeColumns}
            data={volumeData.daily}
            keyExtractor={(r) => r.date}
            emptyMessage="No communication data for this period."
          />
        </div>
      )}

      {!loading && activeTab === 'moderation' && moderationData && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard title="Messages Reviewed" value={moderationData.messagesReviewed} color="text-blue-600" />
          <StatsCard title="Messages Blocked" value={moderationData.messagesBlocked} color="text-red-600" />
          <StatsCard title="Contacts Approved" value={moderationData.contactsApproved} color="text-green-600" />
          <StatsCard title="Contacts Denied" value={moderationData.contactsDenied} color="text-orange-600" />
        </div>
      )}

      {!loading && activeTab === 'flags' && flaggedData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard title="Pending" value={flaggedData.byStatus.pending || 0} color="text-yellow-600" />
            <StatsCard title="Reviewed" value={flaggedData.byStatus.reviewed || 0} color="text-blue-600" />
            <StatsCard title="Escalated" value={flaggedData.byStatus.escalated || 0} color="text-red-600" />
            <StatsCard title="Dismissed" value={flaggedData.byStatus.dismissed || 0} color="text-gray-600" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">By Reason</h3>
              <DataTable
                columns={flagReasonColumns}
                data={Object.entries(flaggedData.byReason).map(([label, count]) => ({ label, count }))}
                keyExtractor={(r) => r.label}
                emptyMessage="No flagged content by reason."
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">By Severity</h3>
              <DataTable
                columns={flagSeverityColumns}
                data={Object.entries(flaggedData.bySeverity)
                  .filter(([, count]) => count > 0)
                  .map(([label, count]) => ({ label, count }))}
                keyExtractor={(r) => r.label}
                emptyMessage="No flagged content by severity."
              />
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'visitors' && visitorData && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard title="Applications" value={visitorData.applications} color="text-blue-600" />
          <StatsCard title="Approved" value={visitorData.approved} color="text-green-600" />
          <StatsCard title="Denied" value={visitorData.denied} color="text-red-600" />
          <StatsCard title="Suspended" value={visitorData.suspended} color="text-orange-600" />
        </div>
      )}
    </div>
  );
}
