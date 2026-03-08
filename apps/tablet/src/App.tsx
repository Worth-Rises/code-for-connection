import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingSpinner } from '@openconnect/ui';
import IncarceratedLayout from './layouts/IncarceratedLayout';
import PinLoginPage from './pages/PinLoginPage';
import RecordNamePage from './pages/RecordNamePage';

const VoiceIncarcerated = lazy(() => import('../../../guilds/voice/ui/incarcerated'));
const VideoIncarcerated = lazy(() => import('../../../guilds/video/ui/incarcerated'));
const MessagingIncarcerated = lazy(() => import('../../../guilds/messaging/ui/incarcerated'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

/** When needsNameRecording, show record-name flow; otherwise show main incarcerated layout. */
function IncarceratedGate() {
  const { needsNameRecording } = useAuth();
  if (needsNameRecording) {
    return <RecordNamePage />;
  }
  return (
    <IncarceratedLayout>
      <Outlet />
    </IncarceratedLayout>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="tablet-safe-area bg-gray-100">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-blue-900">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/incarcerated" replace /> : <PinLoginPage />}
          />
          <Route
            path="/incarcerated"
            element={
              <RequireAuth>
                <IncarceratedGate />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="voice" replace />} />
            <Route path="voice/*" element={<VoiceIncarcerated />} />
            <Route path="video/*" element={<VideoIncarcerated />} />
            <Route path="messaging/*" element={<MessagingIncarcerated />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
