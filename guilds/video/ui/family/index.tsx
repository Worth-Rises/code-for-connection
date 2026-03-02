import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function VideoHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Video Visits</h1>
      <Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">📹</span>
          <h2 className="text-xl font-semibold mb-2">Schedule & Join Video Visits</h2>
          <p className="text-gray-600 mb-6">
            This is where the Video Guild will build the family video interface.
          </p>
          <p className="text-sm text-gray-500">Features to implement:</p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>Request video visits</li>
            <li>View scheduled visits</li>
            <li>Join video calls</li>
            <li>Camera/mic controls</li>
            <li>Visit history</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function VideoFamily() {
  return (
    <Routes>
      <Route index element={<VideoHome />} />
    </Routes>
  );
}
