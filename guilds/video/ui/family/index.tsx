import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useCallTimer } from '../../../shared/hooks/useCallTimer';

interface ScheduledCall {
  callId: string;
  contactName: string;
  scheduledStart: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'pending';
}

interface CallSession {
  callId: string;
  roomId: string;
}

function ScheduledCalls({ onJoinCall }: { onJoinCall: (session: CallSession) => void }) {
  const { get, post } = useGuildApi('/api/video');
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    get('/my-scheduled')
      .then((res) => setCalls(res.data || []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [get]);

  const canJoin = (call: ScheduledCall) => {
    if (call.status !== 'scheduled') return false;
    const start = new Date(call.scheduledStart).getTime();
    const now = Date.now();
    return now >= start - 5 * 60 * 1000;
  };

  const handleJoin = async (callId: string) => {
    setJoiningId(callId);
    try {
      const res = await post(`/join-call/${callId}`);
      onJoinCall({ callId: res.callId, roomId: res.roomId });
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Video Visits</h1>
        <Link to="request">
          <Button variant="primary">Request Visit</Button>
        </Link>
      </div>

      {calls.length === 0 ? (
        <Card padding="lg">
          <p className="text-center py-8 text-gray-500">No scheduled video visits</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calls.map((call) => (
            <Card key={call.callId} padding="lg">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{call.contactName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(call.scheduledStart).toLocaleDateString()} at{' '}
                    {new Date(call.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className={`inline-flex mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                    call.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    call.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                    call.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    call.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {call.status}
                  </span>
                </div>
                <Button
                  variant="primary"
                  disabled={!canJoin(call)}
                  loading={joiningId === call.callId}
                  onClick={() => handleJoin(call.callId)}
                  fullWidth
                >
                  Join Call
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestVisit() {
  const { post } = useGuildApi('/api/video');
  const navigate = useNavigate();
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !date || !time) return;

    setSubmitting(true);
    setError('');

    try {
      const scheduledStart = new Date(`${date}T${time}`).toISOString();
      const scheduledEnd = new Date(new Date(`${date}T${time}`).getTime() + 30 * 60 * 1000).toISOString();
      await post('/request-visit', { incarceratedPersonId: personId, scheduledStart, scheduledEnd });
      setSuccess(true);
      setTimeout(() => navigate('..'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <Card padding="lg">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-green-700 mb-2">Visit Requested</h2>
            <p className="text-gray-600">Your visit request has been submitted for approval.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Request Video Visit</h1>
        <Link to="..">
          <Button variant="secondary" size="sm">Back</Button>
        </Link>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="personId" className="block text-sm font-medium text-gray-700 mb-1">
              Incarcerated Person ID
            </label>
            <input
              id="personId"
              type="text"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter person ID"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" variant="primary" loading={submitting} fullWidth>
            Submit Request
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ActiveVideoCall({ session, onEnd }: { session: CallSession; onEnd: () => void }) {
  const { post } = useGuildApi('/api/video');
  const { emit } = useSocket();
  const { formattedTime, isWarning, isExpired, start } = useCallTimer(1800);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    emit('join-room', { roomId: session.roomId });
    start();
  }, [emit, session.roomId, start]);

  useEffect(() => {
    if (isExpired) {
      handleEndCall();
    }
  }, [isExpired]);

  const handleEndCall = async () => {
    try {
      await post(`/end-call/${session.callId}`);
    } finally {
      onEnd();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {isWarning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-center font-medium">
          Warning: {formattedTime} remaining
        </div>
      )}

      <div className="text-center mb-4">
        <span className="text-2xl font-mono font-bold text-gray-900">{formattedTime}</span>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 rounded-xl flex items-center justify-center min-h-[280px]">
          <div className="text-white text-4xl font-bold opacity-60">You</div>
        </div>
        <div className="bg-gray-700 rounded-xl flex items-center justify-center min-h-[280px]">
          <div className="text-white text-4xl font-bold opacity-60">Remote</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 py-4">
        <Button
          size="lg"
          variant={cameraOn ? 'secondary' : 'ghost'}
          onClick={() => setCameraOn(!cameraOn)}
        >
          {cameraOn ? 'Cam On' : 'Cam Off'}
        </Button>
        <Button
          size="lg"
          variant={micOn ? 'secondary' : 'ghost'}
          onClick={() => setMicOn(!micOn)}
        >
          {micOn ? 'Mic On' : 'Mic Off'}
        </Button>
        <Button
          size="lg"
          variant="danger"
          onClick={handleEndCall}
        >
          End Call
        </Button>
      </div>
    </div>
  );
}

export default function VideoFamily() {
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);

  if (activeSession) {
    return (
      <ActiveVideoCall
        session={activeSession}
        onEnd={() => setActiveSession(null)}
      />
    );
  }

  return (
    <Routes>
      <Route index element={<ScheduledCalls onJoinCall={setActiveSession} />} />
      <Route path="request" element={<RequestVisit />} />
    </Routes>
  );
}
