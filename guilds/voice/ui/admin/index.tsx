import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function VoiceDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Voice Call Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600">Active Calls</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Today's Calls</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">0</p>
            <p className="text-sm text-gray-600">Avg Duration (min)</p>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Active Calls</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Voice Guild will implement the active calls table here.</p>
          <p className="text-sm mt-2">Features: Monitor calls, terminate calls, view details</p>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Call History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Voice Guild will implement the call history table here.</p>
          <p className="text-sm mt-2">Features: Filter, search, export logs</p>
        </div>
      </Card>
    </div>
  );
}

export default function VoiceAdmin() {
  return (
    <Routes>
      <Route index element={<VoiceDashboard />} />
    </Routes>
  );
}
