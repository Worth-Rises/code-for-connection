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

// Placeholder for pages not yet built
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="text-gray-500 mt-2">This page will be implemented in a later stage.</p>
    </div>
  );
}

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
          <Route path="residents" element={<PlaceholderPage title="Residents" />} />
          <Route path="residents/:id" element={<PlaceholderPage title="Resident Profile" />} />
          <Route path="visitors" element={<PlaceholderPage title="Visitors" />} />
          <Route path="visitors/:id" element={<PlaceholderPage title="Visitor Profile" />} />
          <Route path="housing" element={<PlaceholderPage title="Housing" />} />
          <Route path="housing/:unitId" element={<PlaceholderPage title="Unit Roster" />} />
          <Route path="search" element={<PlaceholderPage title="Search" />} />
          <Route path="keyword-alerts" element={<PlaceholderPage title="Keyword Alerts" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="audit-log" element={<PlaceholderPage title="Audit Log" />} />
          <Route path="settings/permissions" element={<PlaceholderPage title="Permissions" />} />
          <Route path="settings/system" element={<PlaceholderPage title="System Status" />} />
        </Routes>
      </main>
    </div>
  );
}
