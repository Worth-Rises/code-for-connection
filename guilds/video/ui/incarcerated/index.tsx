import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useCallTimer } from '../../../shared/hooks/useCallTimer';

interface ScheduledCall {
  callId: string;
  contactName: string;
  scheduledStart: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
      <h1 className="text-2xl font-bold text-gray-900">Video Calls</h1>

      {calls.length === 0 ? (
        <Card padding="lg">
          <p className="text-center py-8 text-gray-500">No scheduled video calls</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {calls.map((call) => (
            <Card key={call.callId} padding="lg">
              <div className="flex items-center justify-between">
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
                    'bg-red-100 text-red-800'
                  }`}>
                    {call.status}
                  </span>
                </div>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={!canJoin(call)}
                  loading={joiningId === call.callId}
                  onClick={() => handleJoin(call.callId)}
                  className="min-w-[120px] min-h-[56px]"
                >
                  Join
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
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
          className="min-w-[80px] min-h-[56px]"
        >
          {cameraOn ? 'Cam On' : 'Cam Off'}
        </Button>
        <Button
          size="lg"
          variant={micOn ? 'secondary' : 'ghost'}
          onClick={() => setMicOn(!micOn)}
          className="min-w-[80px] min-h-[56px]"
        >
          {micOn ? 'Mic On' : 'Mic Off'}
        </Button>
        <Button
          size="lg"
          variant="danger"
          onClick={handleEndCall}
          className="min-w-[120px] min-h-[56px]"
        >
          End Call
        </Button>
      </div>
    </div>
  );
}

export default function VideoIncarcerated() {
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);

  if (activeSession) {
    return (
      <ActiveVideoCall
        session={activeSession}
        onEnd={() => setActiveSession(null)}
      />
    );
  }

  return <ScheduledCalls onJoinCall={setActiveSession} />;
}
