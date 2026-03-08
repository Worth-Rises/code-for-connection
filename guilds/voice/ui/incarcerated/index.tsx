import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function VoiceHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Voice Calls</h1>
      <Card padding="lg">
        <div className="text-center py-4 sm:py-8">
          <span className="text-5xl sm:text-6xl mb-4 block">📞</span>
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Voice Calling</h2>
          <p className="text-gray-600 mb-6">
            This is where the Voice Guild will build the calling interface.
          </p>
          <p className="text-sm text-gray-500">
            Features to implement:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>View approved contacts</li>
            <li>Initiate voice calls</li>
            <li>Call timer with warnings</li>
            <li>End call functionality</li>
            <li>Call history</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function VoiceIncarcerated() {
  return (
    <Routes>
      <Route index element={<VoiceHome />} />
    </Routes>
  );
}
