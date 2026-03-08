import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@openconnect/ui';

import { ApprovalRequest } from './ApprovalRequest';
import { CallCard } from './CallCard';

function VideoDashboard() {
  const [stats, setStats] = useState({ activeCalls: 0, todayTotal: 0, pendingRequests: 0 });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [scheduledToday, setScheduledToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});
  const [showDeniedCalls, setShowDeniedCalls] = useState(false);

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
      
      // Calculate today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [statsRes, requestsRes, activeCallsRes, callLogsRes] = await Promise.all([
        fetch('/api/video/stats', { headers: getAuthHeaders() }),
        fetch('/api/video/pending-requests', { headers: getAuthHeaders() }),
        fetch('/api/video/active-calls', { headers: getAuthHeaders() }),
        fetch(`/api/video/call-logs?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`, { headers: getAuthHeaders() }),
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

      if (callLogsRes.ok) {
        const callLogsData = await callLogsRes.json() as any;
        // Filter for today's calls - show scheduled and completed (same logic as stats endpoint)
        const todaysCalls = (callLogsData.data as any[])?.filter((call: any) => {
          return ['scheduled', 'completed', 'in_progress', 'denied'].includes(call.status);
        }) || [];

        setScheduledToday(todaysCalls);
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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Video Call Management</h1>
      
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 ml-0 sm:ml-4">
                    <div className="text-left sm:text-center">
                      <p className="text-gray-600 text-sm">Time Remaining</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {timeLeft[call.id] || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTerminate(call.id)}
                      disabled={loadingStates[call.id] || false}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Scheduled Today</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">Show Denied Calls</span>
            <input
              type="checkbox"
              checked={showDeniedCalls}
              onChange={(e: any) => setShowDeniedCalls(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
        {scheduledToday.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No calls scheduled for today</p>
        ) : (
          <div className="space-y-3">
            {scheduledToday.filter(r => showDeniedCalls || r.status !== 'denied').map(call => (
              <CallCard
                key={call.id}
                incarceratedPerson={`${call.incarceratedPerson?.firstName} ${call.incarceratedPerson?.lastName}`}
                familyMember={`${call.familyMember?.firstName} ${call.familyMember?.lastName}`}
                startTime={call.scheduledStart}
                endTime={call.scheduledEnd}
                duration={call.durationSeconds}
                status={call.status}
                actualStart={call.actualStart}
                actualEnd={call.actualEnd}
              />
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
