import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingSpinner } from '@openconnect/ui';
import IncarceratedLayout from './layouts/IncarceratedLayout';
import FamilyLayout from './layouts/FamilyLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import PinLoginPage from './pages/PinLoginPage';
import RegisterPage from './pages/RegisterPage';

const VoiceIncarcerated = lazy(() => import('../../guilds/voice/ui/incarcerated'));
const VoiceFamily = lazy(() => import('../../guilds/voice/ui/family'));
const VoiceAdmin = lazy(() => import('../../guilds/voice/ui/admin'));

const VideoIncarcerated = lazy(() => import('../../guilds/video/ui/incarcerated'));
const VideoFamily = lazy(() => import('../../guilds/video/ui/family'));
const VideoAdmin = lazy(() => import('../../guilds/video/ui/admin'));

const MessagingIncarcerated = lazy(() => import('../../guilds/messaging/ui/incarcerated'));
const MessagingFamily = lazy(() => import('../../guilds/messaging/ui/family'));
const MessagingAdmin = lazy(() => import('../../guilds/messaging/ui/admin'));

const AdminDashboard = lazy(() => import('../../guilds/admin/ui'));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
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

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
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

  switch (user.role) {
    case 'incarcerated':
      return <Navigate to="/incarcerated" replace />;
    case 'family':
      return <Navigate to="/family" replace />;
    case 'facility_admin':
    case 'agency_admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
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
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pin-login" element={<PinLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Incarcerated User Routes */}
        <Route
          path="/incarcerated"
          element={
            <ProtectedRoute allowedRoles={['incarcerated']}>
              <IncarceratedLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="voice" replace />} />
          <Route path="voice/*" element={<VoiceIncarcerated />} />
          <Route path="video/*" element={<VideoIncarcerated />} />
          <Route path="messaging/*" element={<MessagingIncarcerated />} />
        </Route>

        {/* Family Member Routes */}
        <Route
          path="/family"
          element={
            <ProtectedRoute allowedRoles={['family']}>
              <FamilyLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="messaging" replace />} />
          <Route path="voice/*" element={<VoiceFamily />} />
          <Route path="video/*" element={<VideoFamily />} />
          <Route path="messaging/*" element={<MessagingFamily />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['facility_admin', 'agency_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="voice/*" element={<VoiceAdmin />} />
          <Route path="video/*" element={<VideoAdmin />} />
          <Route path="messaging/*" element={<MessagingAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
