import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingSpinner } from '@openconnect/ui';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';

const VoiceAdmin = lazy(() => import('../../../guilds/voice/ui/admin'));
const VideoAdmin = lazy(() => import('../../../guilds/video/ui/admin'));
const MessagingAdmin = lazy(() => import('../../../guilds/messaging/ui/admin'));

const AdminDashboard = lazy(() => import('../../../guilds/admin/ui'));
const ContactsPage = lazy(() => import('../../../guilds/admin/ui/pages/ContactsPage'));
const BlockedNumbersPage = lazy(() => import('../../../guilds/admin/ui/pages/BlockedNumbersPage'));
const UsersPage = lazy(() => import('../../../guilds/admin/ui/pages/UsersPage'));
const FacilityConfigPage = lazy(() => import('../../../guilds/admin/ui/pages/FacilityConfigPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="blocked-numbers" element={<BlockedNumbersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="facility" element={<FacilityConfigPage />} />
          <Route path="voice/*" element={<VoiceAdmin />} />
          <Route path="video/*" element={<VideoAdmin />} />
          <Route path="messaging/*" element={<MessagingAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
