import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import Contacts from './manage_contacts';

function VideoHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Video Visits</h1>
      <Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">📹</span>
          <h2 className="text-xl font-semibold mb-2">Schedule & Join Video Visits</h2>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="schedule"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
            >
              Schedule video call
            </Link>
            <Link
              to="calls"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              View scheduled calls
            </Link>
            <Link
              to="past-calls"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              View past calls
            </Link>
            <Link
              to="manage"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Manage contacts
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VideoFamily() {
  return (
    <Routes>
      <Route index element={<VideoHome />} />
      <Route path="manage" element={<Contacts />} />
    </Routes>
  );
}
