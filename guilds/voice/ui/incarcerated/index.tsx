import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useCallTimer } from '../../../shared/hooks/useCallTimer';

interface Contact {
  familyMemberId: string;
  name: string;
}

interface CallRecord {
  callId: string;
  contactName: string;
  status: string;
  date: string;
  duration: number;
}

type View = 'contacts' | 'active-call' | 'history';

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ContactList({
  onCall,
  onShowHistory,
}: {
  onCall: (contact: Contact) => void;
  onShowHistory: () => void;
}) {
  const { get } = useGuildApi('/api/voice');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/my-contacts')
      .then((res) => setContacts(res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [get]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
        <Button variant="secondary" onClick={onShowHistory}>
          Call History
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card padding="lg">
          <p className="text-center py-8 text-gray-500">No approved contacts found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.familyMemberId} padding="lg">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">{contact.name}</span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onCall(contact)}
                  className="bg-green-600 hover:bg-green-700 min-w-[120px] min-h-[48px]"
                >
                  Call
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveCall({
  contact,
  onEnd,
}: {
  contact: Contact;
  onEnd: () => void;
}) {
  const { post } = useGuildApi('/api/voice');
  const { emit, on, off } = useSocket();
  const { formattedTime, isWarning, isExpired, start } = useCallTimer(900);
  const [muted, setMuted] = useState(false);
  const [peerJoined, setPeerJoined] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    post('/initiate-call', { familyMemberId: contact.familyMemberId })
      .then((res) => {
        const data = res.data || res;
        setCallId(data.callId);
        setRoomId(data.roomId);
        emit('join-room', { roomId: data.roomId });
        start();
      })
      .catch((err) => {
        setError(err.message || 'Failed to initiate call');
      });
  }, [post, contact.familyMemberId, emit, start]);

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
    if (roomId) {
      emit('leave-room', { roomId });
    }
    onEnd();
  }, [roomId, emit, onEnd]);

  if (error) {
    return (
      <div className="space-y-4">
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <Button variant="secondary" size="lg" onClick={onEnd} className="min-h-[48px]">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded text-center text-lg font-semibold">
          Warning: Call ending soon
        </div>
      )}

      <Card padding="lg">
        <div className="text-center py-8 space-y-6">
          <h2 className="text-2xl font-bold">Calling {contact.name}</h2>
          <p className="text-sm text-gray-500">
            {peerJoined ? 'Connected' : 'Waiting for family member to join...'}
          </p>
          <p className="text-5xl font-mono font-bold">{formattedTime}</p>

          <div className="flex justify-center gap-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setMuted(!muted)}
              className="min-w-[120px] min-h-[56px]"
            >
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleEndCall}
              className="min-w-[120px] min-h-[56px] bg-red-600 hover:bg-red-700"
            >
              End Call
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CallHistory({ onBack }: { onBack: () => void }) {
  const { get } = useGuildApi('/api/voice');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/my-calls')
      .then((res) => setCalls(res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [get]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : calls.length === 0 ? (
        <Card padding="lg">
          <p className="text-center py-8 text-gray-500">No call history</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {calls.map((call) => (
            <Card key={call.callId} padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{call.contactName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(call.date).toLocaleDateString()} - {formatSeconds(call.duration)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  call.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {call.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VoiceIncarcerated() {
  const [view, setView] = useState<View>('contacts');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  const handleCall = useCallback((contact: Contact) => {
    setActiveContact(contact);
    setView('active-call');
  }, []);

  const handleEndCall = useCallback(() => {
    setActiveContact(null);
    setView('contacts');
  }, []);

  switch (view) {
    case 'active-call':
      return activeContact ? (
        <ActiveCall contact={activeContact} onEnd={handleEndCall} />
      ) : null;
    case 'history':
      return <CallHistory onBack={() => setView('contacts')} />;
    default:
      return (
        <ContactList
          onCall={handleCall}
          onShowHistory={() => setView('history')}
        />
      );
  }
}
