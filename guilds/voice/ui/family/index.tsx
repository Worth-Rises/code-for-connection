import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useCallTimer } from '../../../shared/hooks/useCallTimer';

interface IncomingCall {
  callId: string;
  roomId: string;
  callerName: string;
}

interface CallRecord {
  callId: string;
  contactName: string;
  status: string;
  date: string;
  duration: number;
}

type View = 'home' | 'active-call';

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ActiveCall({
  roomId,
  callerName,
  onEnd,
}: {
  roomId: string;
  callerName: string;
  onEnd: () => void;
}) {
  const { emit, on, off } = useSocket();
  const { formattedTime, isWarning, isExpired, start } = useCallTimer(900);
  const [muted, setMuted] = useState(false);
  const [peerJoined, setPeerJoined] = useState(false);

  useEffect(() => {
    emit('join-room', { roomId });
    start();
  }, [emit, roomId, start]);

  useEffect(() => {
    const handleUserJoined = () => setPeerJoined(true);
    on('user-joined', handleUserJoined);
    return () => off('user-joined', handleUserJoined);
  }, [on, off]);

  useEffect(() => {
    if (isExpired) {
      handleEndCall();
    }
  }, [isExpired]);

  const handleEndCall = useCallback(() => {
    emit('leave-room', { roomId });
    onEnd();
  }, [roomId, emit, onEnd]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {isWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded text-center font-semibold">
          Warning: Call ending soon
        </div>
      )}

      <Card padding="lg">
        <div className="text-center py-8 space-y-6">
          <h2 className="text-2xl font-bold">Call with {callerName}</h2>
          <p className="text-sm text-gray-500">
            {peerJoined ? 'Connected' : 'Connecting...'}
          </p>
          <p className="text-5xl font-mono font-bold">{formattedTime}</p>

          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setMuted(!muted)}
            >
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700"
            >
              End Call
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VoiceFamily() {
  const { get, post } = useGuildApi('/api/voice');
  const [view, setView] = useState<View>('home');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeCallerName, setActiveCallerName] = useState('');
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncoming, setShowIncoming] = useState(false);

  const fetchHistory = useCallback(() => {
    get('/my-calls')
      .then((res) => setCallHistory(res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [get]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Poll for incoming calls
  useEffect(() => {
    if (view !== 'home') return;

    const poll = () => {
      get('/my-calls?status=ringing')
        .then((res) => {
          const calls = res.data || res || [];
          if (calls.length > 0 && !showIncoming) {
            setIncomingCall({
              callId: calls[0].callId,
              roomId: calls[0].roomId,
              callerName: calls[0].contactName || calls[0].callerName,
            });
            setShowIncoming(true);
          } else if (calls.length === 0) {
            setIncomingCall(null);
            setShowIncoming(false);
          }
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [get, view, showIncoming]);

  const handleAccept = useCallback(() => {
    if (!incomingCall) return;
    setActiveRoomId(incomingCall.roomId);
    setActiveCallerName(incomingCall.callerName);
    setShowIncoming(false);
    setView('active-call');
  }, [incomingCall]);

  const handleDecline = useCallback(() => {
    if (!incomingCall) return;
    post(`/decline-call/${incomingCall.callId}`)
      .catch(() => {});
    setIncomingCall(null);
    setShowIncoming(false);
  }, [incomingCall, post]);

  const handleEndCall = useCallback(() => {
    setView('home');
    setActiveRoomId(null);
    setActiveCallerName('');
    fetchHistory();
  }, [fetchHistory]);

  if (view === 'active-call' && activeRoomId) {
    return (
      <ActiveCall
        roomId={activeRoomId}
        callerName={activeCallerName}
        onEnd={handleEndCall}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>

      <Modal
        open={showIncoming}
        onClose={() => {}}
        title="Incoming Call"
      >
        <div className="text-center space-y-4">
          <p className="text-lg">
            <span className="font-semibold">{incomingCall?.callerName}</span> is calling you
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="danger"
              size="lg"
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept
            </Button>
          </div>
        </div>
      </Modal>

      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Call History</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : callHistory.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No calls yet</p>
        ) : (
          <div className="space-y-3">
            {callHistory.map((call) => (
              <div
                key={call.callId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{call.contactName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(call.date).toLocaleDateString()} - {formatSeconds(call.duration)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  call.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : call.status === 'missed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {call.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
