import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function MessagingDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Messages Today</p>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Messages Pending Review</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Messaging Guild will implement the review queue here.</p>
          <p className="text-sm mt-2">Features: Approve, block, flag messages</p>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Message History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Messaging Guild will implement the message history view here.</p>
          <p className="text-sm mt-2">Features: Search, filter, view conversations</p>
        </div>
      </Card>
    </div>
  );
}

export default function MessagingAdmin() {
  return (
    <Routes>
      <Route index element={<MessagingDashboard />} />
    </Routes>
  );
}
