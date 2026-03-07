import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminSidebar } from './components/AdminSidebar';

// Existing pages
import ContactsPage from './pages/ContactsPage';
import BlockedNumbersPage from './pages/BlockedNumbersPage';
import FacilityConfigPage from './pages/FacilityConfigPage';
import UsersPage from './pages/UsersPage';

// New pages
import DashboardPage from './dashboard/DashboardPage';
import ResidentListPage from './residents/ResidentListPage';
import ResidentProfilePage from './residents/ResidentProfilePage';
import VisitorListPage from './visitors/VisitorListPage';
import VisitorProfilePage from './visitors/VisitorProfilePage';
import HousingDashboardPage from './housing/HousingDashboardPage';
import UnitRosterPage from './housing/UnitRosterPage';
import SearchPage from './search/SearchPage';
import KeywordAlertsPage from './search/KeywordAlertsPage';
import AuditLogPage from './audit/AuditLogPage';
import ReportsPage from './reports/ReportsPage';
import PermissionsPage from './settings/PermissionsPage';
import SystemStatusPage from './settings/SystemStatusPage';

export default function AdminPortal() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-6 ml-64">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="blocked-numbers" element={<BlockedNumbersPage />} />
          <Route path="facility" element={<FacilityConfigPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="residents" element={<ResidentListPage />} />
          <Route path="residents/:id" element={<ResidentProfilePage />} />
          <Route path="visitors" element={<VisitorListPage />} />
          <Route path="visitors/:id" element={<VisitorProfilePage />} />
          <Route path="housing" element={<HousingDashboardPage />} />
          <Route path="housing/:unitId" element={<UnitRosterPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="keyword-alerts" element={<KeywordAlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="settings/permissions" element={<PermissionsPage />} />
          <Route path="settings/system" element={<SystemStatusPage />} />
        </Routes>
      </main>
    </div>
  );
}
