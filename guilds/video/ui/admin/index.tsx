import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

import { ApprovalRequest } from './ApprovalRequest';

function VideoDashboard() {
  const [stats, setStats] = useState({ activeCalls: 0, todayTotal: 0, pendingRequests: 0 });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, requestsRes] = await Promise.all([
        fetch('/api/video/stats'),
        fetch('/api/video/pending-requests'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data as typeof stats || {});
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setPendingRequests(requestsData.data as any[] || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (callId: string, familyMemberName: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [callId]: true }));
      const response = await fetch(`/api/video/approve-request/${callId}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r.id !== callId));
        // Refresh stats
        fetchData();
      } else {
        const error = await response.json();
        console.error('Error approving request:', error);
      }
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [callId]: false }));
    }
  };

  const handleDeny = async (callId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [callId]: true }));
      const response = await fetch(`/api/video/deny-request/${callId}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r.id !== callId));
        // Refresh stats
        fetchData();
      } else {
        const error = await response.json();
        console.error('Error denying request:', error);
      }
    } catch (error) {
      console.error('Error denying request:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [callId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Video Call Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.activeCalls}</p>
            <p className="text-sm text-gray-600">Active Calls</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingRequests}</p>
            <p className="text-sm text-gray-600">Pending Requests</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats.todayTotal}</p>
            <p className="text-sm text-gray-600">Scheduled Today</p>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Pending Approval Requests</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading requests...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(request => (
              <ApprovalRequest
                key={request.id}
                name={`${request.familyMember?.firstName} ${request.familyMember?.lastName}`}
                details={`Scheduled: ${new Date(request.scheduledStart).toLocaleString()}`}
                onApprove={() => handleApprove(request.id, `${request.familyMember?.firstName} ${request.familyMember?.lastName}`)}
                onDeny={() => handleDeny(request.id)}
                isLoading={loadingStates[request.id] || false}
              />
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Active Video Calls</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Video Guild will implement the active calls monitoring here.</p>
          <p className="text-sm mt-2">Features: Monitor, terminate, view participants</p>
        </div>
      </Card>
    </div>
  );
}

export default function VideoAdmin() {
  return (
    <Routes>
      <Route index element={<VideoDashboard />} />
    </Routes>
  );
}
