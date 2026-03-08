import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

import { ApprovalRequest } from './ApprovalRequest';

function VideoDashboard() {
  const [stats, setStats] = useState({ activeCalls: 0, todayTotal: 0, pendingRequests: 0 });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});

  const getAuthHeaders = () => {
    const token = typeof globalThis !== 'undefined' ? (globalThis as any).localStorage?.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update time remaining every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft: { [key: string]: string } = {};
      
      activeCalls.forEach(call => {
        const endTime = new Date(call.scheduledEnd).getTime();
        const now = Date.now();
        const remaining = endTime - now;

        if (remaining <= 0) {
          newTimeLeft[call.id] = '0:00';
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          newTimeLeft[call.id] = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      });

      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCalls]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, requestsRes, activeCallsRes] = await Promise.all([
        fetch('/api/video/stats', { headers: getAuthHeaders() }),
        fetch('/api/video/pending-requests', { headers: getAuthHeaders() }),
        fetch('/api/video/active-calls', { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json() as any;
        setStats(statsData.data as typeof stats || {});
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json() as any;
        setPendingRequests(requestsData.data as any[] || []);
      }

      if (activeCallsRes.ok) {
        const activeCallsData = await activeCallsRes.json() as any;
        setActiveCalls(activeCallsData.data as any[] || []);
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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

  const handleTerminate = async (callId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [callId]: true }));
      const response = await fetch(`/api/video/terminate-call/${callId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Remove from active calls list
        setActiveCalls(prev => prev.filter(c => c.id !== callId));
        // Refresh stats
        fetchData();
      } else {
        const error = await response.json();
        console.error('Error terminating call:', error);
      }
    } catch (error) {
      console.error('Error terminating call:', error);
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
                requestedTime={request.createdAt || new Date().toISOString()}
                startTime={request.scheduledStart}
                endTime={request.scheduledEnd}
                incarceratedPerson={`${request.incarceratedPerson?.firstName} ${request.incarceratedPerson?.lastName}`}
                isAttorney={request.incarceratedPerson?.approvedContacts?.[0]?.isAttorney || false}
                isLegal={request.isLegal || false}
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
        {activeCalls.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No active calls</p>
        ) : (
          <div className="space-y-3">
            {activeCalls.map(call => (
              <div key={call.id} className="border border-gray-300 rounded-lg bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Call Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {call.incarceratedPerson?.firstName} {call.incarceratedPerson?.lastName}
                      {' '}&amp;{' '}
                      {call.familyMember?.firstName} {call.familyMember?.lastName}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Started</p>
                        <p className="font-medium text-gray-900">
                          {call.actualStart ? new Date(call.actualStart).toLocaleTimeString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Scheduled End</p>
                        <p className="font-medium text-gray-900">
                          {new Date(call.scheduledEnd).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Time Left & Terminate Button */}
                  <div className="flex flex-col items-end gap-3 ml-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">Time Remaining</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {timeLeft[call.id] || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTerminate(call.id)}
                      disabled={loadingStates[call.id] || false}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Terminate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
