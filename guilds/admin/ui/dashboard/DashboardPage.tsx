import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { StatsCard } from '../components/StatsCard';
import { FacilitySelector } from '../components/FacilitySelector';

interface DashboardStats {
  contacts: { pending: number; approved: number } | null;
  blockedNumbers: number | null;
  residents: { active: number; total: number } | null;
  voice: { activeCalls: number; todayTotal: number } | null;
  video: { activeCalls: number; todayTotal: number; pendingRequests: number } | null;
  messaging: { todayTotal: number; pendingReview: number } | null;
}

interface SinceLastLogin {
  newMessages: number;
  newContacts: number;
  newCalls: number;
  newAlerts: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { get } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [stats, setStats] = useState<DashboardStats>({
    contacts: null,
    blockedNumbers: null,
    residents: null,
    voice: null,
    video: null,
    messaging: null,
  });
  const [sinceLastLogin, setSinceLastLogin] = useState<SinceLastLogin | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (facilityId) params.set('facilityId', facilityId);

    get(`/dashboard/stats?${params}`)
      .then((res) => setStats(res.data || {}))
      .catch(() => {});

    get(`/dashboard/since-last-login?${params}`)
      .then((res) => setSinceLastLogin(res.data || null))
      .catch(() => {});

    get(`/dashboard/recent-activity?${params}&limit=10`)
      .then((res) => setRecentActivity(res.data || []))
      .catch(() => {});
  }, [get, facilityId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to the Open Connect Admin Portal</p>
        </div>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Pending Contacts" value={stats.contacts?.pending ?? null} color="text-yellow-600" linkTo="/admin/contacts" />
        <StatsCard title="Active Residents" value={stats.residents?.active ?? null} color="text-indigo-600" linkTo="/admin/residents" />
        <StatsCard title="Blocked Numbers" value={stats.blockedNumbers} color="text-red-600" linkTo="/admin/blocked-numbers" />
        <StatsCard title="Active Voice Calls" value={stats.voice?.activeCalls ?? null} color="text-blue-600" />
        <StatsCard title="Active Video Calls" value={stats.video?.activeCalls ?? null} color="text-green-600" />
        <StatsCard title="Pending Messages" value={stats.messaging?.pendingReview ?? null} color="text-purple-600" />
      </div>

      {/* Since Last Login */}
      {sinceLastLogin && (
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Since Last Login</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{sinceLastLogin.newMessages}</p>
              <p className="text-sm text-gray-500">New Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{sinceLastLogin.newContacts}</p>
              <p className="text-sm text-gray-500">New Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{sinceLastLogin.newCalls}</p>
              <p className="text-sm text-gray-500">New Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{sinceLastLogin.newAlerts}</p>
              <p className="text-sm text-gray-500">New Alerts</p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Items */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
        <div className="space-y-3">
          <Link to="/admin/contacts" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div>
              <p className="font-medium">Pending Contacts</p>
              <p className="text-sm text-gray-500">Review and approve contact requests</p>
            </div>
            {stats.contacts?.pending != null && stats.contacts.pending > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {stats.contacts.pending}
              </span>
            )}
          </Link>
          <Link to="/admin/messaging" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div>
              <p className="font-medium">Pending Messages</p>
              <p className="text-sm text-gray-500">Messages awaiting review</p>
            </div>
            {stats.messaging?.pendingReview != null && stats.messaging.pendingReview > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {stats.messaging.pendingReview}
              </span>
            )}
          </Link>
          <Link to="/admin/video" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div>
              <p className="font-medium">Pending Video Requests</p>
              <p className="text-sm text-gray-500">Video call requests awaiting approval</p>
            </div>
            {stats.video?.pendingRequests != null && stats.video.pendingRequests > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {stats.video.pendingRequests}
              </span>
            )}
          </Link>
        </div>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                  <p className="text-xs text-gray-500">
                    {entry.actor}
                    {entry.details ? ` (${entry.details})` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {timeAgo(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
