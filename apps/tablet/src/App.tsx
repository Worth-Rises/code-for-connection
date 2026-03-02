import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PinLoginPage from './pages/PinLoginPage';

export default function App() {
  return (
    <div className="tablet-safe-area bg-gray-100">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PinLoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
