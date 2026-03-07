import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';

export default function ManageContact() {
  const { contactId } = useParams<{ contactId: string }>();

  return (
    <div className="space-y-4">
      <Link to=".." className="text-blue-600 hover:text-blue-700">&larr; Back to contacts</Link>
      
      <h1 className="text-2xl font-bold text-gray-900">Manage Contact</h1>

      <Card padding="lg">
        <div className="space-y-4">
          <div className="grid gap-3">
            <Link
              to={`schedule`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">Schedule video call</div>
                <div className="text-sm text-gray-500">Request a new video visit</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>

            <Link
              to={`scheduled`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">View scheduled calls</div>
                <div className="text-sm text-gray-500">See upcoming video visits</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>

            <Link
              to={`past`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">View past calls</div>
                <div className="text-sm text-gray-500">Review call history</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
