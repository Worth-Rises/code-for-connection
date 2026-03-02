import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function VoiceHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
      <Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">📞</span>
          <h2 className="text-xl font-semibold mb-2">Incoming Calls</h2>
          <p className="text-gray-600 mb-6">
            This is where the Voice Guild will build the family call receiving interface.
          </p>
          <p className="text-sm text-gray-500">
            Features to implement:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>Receive incoming calls</li>
            <li>Accept/decline call prompts</li>
            <li>In-call controls</li>
            <li>Call history</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function VoiceFamily() {
  return (
    <Routes>
      <Route index element={<VoiceHome />} />
    </Routes>
  );
}
