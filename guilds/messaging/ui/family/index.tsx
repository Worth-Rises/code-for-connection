import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

function MessagingHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      <Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">💬</span>
          <h2 className="text-xl font-semibold mb-2">Message Your Loved One</h2>
          <p className="text-gray-600 mb-6">
            This is where the Messaging Guild will build the family messaging interface.
          </p>
          <p className="text-sm text-gray-500">Features to implement:</p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>View conversations</li>
            <li>Send and receive messages</li>
            <li>Photo attachments</li>
            <li>Read receipts</li>
            <li>Message notifications</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function MessagingFamily() {
  return (
    <Routes>
      <Route index element={<MessagingHome />} />
    </Routes>
  );
}
