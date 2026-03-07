import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAdminApi } from './hooks/useAdminApi';
import { useFacilityScope } from './hooks/useFacilityScope';
import { StatsCard } from './components/StatsCard';
import { FacilitySelector } from './components/FacilitySelector';

interface DashboardStats {
  contacts: { pending: number; approved: number } | null;
  blockedNumbers: number | null;
  residents: { active: number; total: number } | null;
  voice: { activeCalls: number; todayTotal: number } | null;
  video: { activeCalls: number; todayTotal: number; pendingRequests: number } | null;
  messaging: { todayTotal: number; pendingReview: number } | null;
}

export default function AdminDashboard() {
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

  useEffect(() => {
    const params = new URLSearchParams();
    if (facilityId) params.set('facilityId', facilityId);
    get(`/dashboard/stats?${params}`)
      .then((res) => setStats(res.data || {}))
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Pending Contacts" value={stats.contacts?.pending ?? null} color="text-yellow-600" linkTo="/admin/contacts" />
        <StatsCard title="Active Residents" value={stats.residents?.active ?? null} color="text-indigo-600" linkTo="/admin/users" />
        <StatsCard title="Blocked Numbers" value={stats.blockedNumbers} color="text-red-600" linkTo="/admin/blocked-numbers" />
        <StatsCard title="Active Voice Calls" value={stats.voice?.activeCalls ?? null} color="text-blue-600" />
        <StatsCard title="Active Video Calls" value={stats.video?.activeCalls ?? null} color="text-green-600" />
        <StatsCard title="Pending Messages" value={stats.messaging?.pendingReview ?? null} color="text-purple-600" />
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <Link to="/admin/contacts" className="block w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <p className="font-medium">Manage Contacts</p>
            <p className="text-sm text-gray-500">Review and approve contact requests</p>
          </Link>
          <Link to="/admin/users" className="block w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <p className="font-medium">View Users</p>
            <p className="text-sm text-gray-500">Search and manage user accounts</p>
          </Link>
          <Link to="/admin/blocked-numbers" className="block w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <p className="font-medium">Manage Blocked Numbers</p>
            <p className="text-sm text-gray-500">View and modify blocked phone numbers</p>
          </Link>
          <Link to="/admin/facility" className="block w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <p className="font-medium">Facility Configuration</p>
            <p className="text-sm text-gray-500">Manage facility settings and announcements</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
