import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card, Button, Modal, LoadingSpinner } from '@openconnect/ui';

const API_BASE = '/api';

// ==========================================
// Types
// ==========================================

interface FamilyMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ApprovedContact {
  id: string;
  relationship: string;
  isAttorney: boolean;
  familyMember: FamilyMemberInfo;
}

interface VoiceCallRecord {
  id: string;
  status: string;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endedBy?: string;
  familyMember?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  incarceratedPerson?: {
    firstName: string;
    lastName: string;
  };
}

// ==========================================
// Helpers
// ==========================================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'missed': return '❌';
    case 'terminated_by_admin': return '🚫';
    case 'connected': return '🟢';
    case 'ringing': return '📞';
    default: return '📞';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'missed': return 'Missed';
    case 'terminated_by_admin': return 'Terminated';
    case 'connected': return 'Connected';
    case 'ringing': return 'Ringing';
    default: return status;
  }
}

// ==========================================
// Active Call Screen (Full-screen overlay)
// ==========================================

interface ActiveCallProps {
  contact: ApprovedContact;
  onCallEnded: () => void;
}

function ActiveCallScreen({ contact, onCallEnded }: ActiveCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended' | 'error'>('connecting');
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Initiate call on mount
  useEffect(() => {
    let cancelled = false;

    async function initiateCall() {
      try {
        const resp = await fetch(`${API_BASE}/voice/users/initiate-call`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ contactId: contact.id }),
        });
        const data = await resp.json();

        if (cancelled) return;

        if (!resp.ok || !data.success) {
          setCallState('error');
          setErrorMsg(data.error?.message || 'Failed to connect call');
          return;
        }

        setCallId(data.data.id);
        setCallState('connected');
        startTimeRef.current = Date.now();
      } catch (err) {
        if (cancelled) return;
        setCallState('error');
        setErrorMsg('Network error — could not reach the server');
      }
    }

    initiateCall();
    return () => { cancelled = true; };
  }, [contact.id]);

  // Timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (callId) {
      try {
        await fetch(`${API_BASE}/voice/users/end-call/${callId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      } catch {
        // Best effort
      }
    }

    setCallState('ended');
    setTimeout(onCallEnded, 1500);
  }, [callId, onCallEnded]);

  const contactName = `${contact.familyMember.firstName} ${contact.familyMember.lastName}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 50%, #0a1628 100%)',
      }}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {callState === 'connected' && (
          <>
            <div className="absolute w-64 h-64 rounded-full border border-blue-400 opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-80 h-80 rounded-full border border-blue-300 opacity-10 animate-ping" style={{ animationDuration: '4s' }} />
          </>
        )}
        {callState === 'connecting' && (
          <div className="absolute w-48 h-48 rounded-full border-2 border-yellow-400 opacity-30 animate-ping" style={{ animationDuration: '1.5s' }} />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-white px-6">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-5xl font-bold shadow-2xl mb-6 border-4 border-white/20">
          {contact.familyMember.firstName[0]}{contact.familyMember.lastName[0]}
        </div>

        {/* Name & Phone */}
        <h2 className="text-3xl font-bold mb-1">{contactName}</h2>
        <p className="text-blue-300 text-lg mb-1">{contact.relationship}</p>
        <p className="text-blue-200/70 text-base mb-8">{formatPhone(contact.familyMember.phone)}</p>

        {/* Status */}
        {callState === 'connecting' && (
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-300 text-xl font-medium">Connecting…</span>
            </div>
            <LoadingSpinner size="sm" />
          </div>
        )}

        {callState === 'connected' && (
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-lg">Connected</span>
            </div>
            <span className="text-5xl font-mono font-light tracking-wider text-white">{formatDuration(elapsed)}</span>
          </div>
        )}

        {callState === 'ended' && (
          <div className="flex flex-col items-center mb-10">
            <span className="text-gray-300 text-xl mb-2">Call Ended</span>
            <span className="text-2xl font-mono text-gray-400">{formatDuration(elapsed)}</span>
          </div>
        )}

        {callState === 'error' && (
          <div className="flex flex-col items-center mb-10 max-w-sm">
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-6 py-4 text-center">
              <span className="text-red-300 text-lg block mb-1">Call Failed</span>
              <p className="text-red-200/70 text-sm">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-8">
          {(callState === 'connected') && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${isMuted
                  ? 'bg-red-500/30 border-2 border-red-400 text-red-300'
                  : 'bg-white/10 border-2 border-white/20 text-white hover:bg-white/20'
                }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
          )}

          {(callState === 'connecting' || callState === 'connected') && (
            <button
              onClick={handleEndCall}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-3xl shadow-lg shadow-red-900/50 transition-all duration-200 active:scale-95 border-2 border-red-400/30"
              title="End Call"
            >
              📵
            </button>
          )}

          {(callState === 'ended' || callState === 'error') && (
            <button
              onClick={onCallEnded}
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg font-medium transition-all border border-white/20"
            >
              Back to Contacts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Contact Card
// ==========================================

interface ContactCardProps {
  contact: ApprovedContact;
  onCall: (contact: ApprovedContact) => void;
}

function ContactCard({ contact, onCall }: ContactCardProps) {
  const { familyMember, relationship, isAttorney } = contact;
  const initials = `${familyMember.firstName[0]}${familyMember.lastName[0]}`;

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-inner">
          {initials}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {familyMember.firstName} {familyMember.lastName}
          </h3>
          <p className="text-sm text-gray-500">
            {relationship}
            {isAttorney && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Attorney</span>}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">{formatPhone(familyMember.phone)}</p>
        </div>
      </div>
      <button
        onClick={() => onCall(contact)}
        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-green-200 transition-all duration-150 active:scale-95"
        title={`Call ${familyMember.firstName}`}
      >
        📞
      </button>
    </div>
  );
}

// ==========================================
// Call History Item
// ==========================================

interface CallHistoryItemProps {
  call: VoiceCallRecord;
}

function CallHistoryItem({ call }: CallHistoryItemProps) {
  const name = call.familyMember
    ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
    : 'Unknown';

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{statusIcon(call.status)}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{formatDate(call.startedAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">
          {call.durationSeconds != null ? formatDuration(call.durationSeconds) : '—'}
        </p>
        <p className="text-xs text-gray-400">{statusLabel(call.status)}</p>
      </div>
    </div>
  );
}

// ==========================================
// Main Voice Home Screen
// ==========================================

function VoiceHome() {
  const [contacts, setContacts] = useState<ApprovedContact[]>([]);
  const [callHistory, setCallHistory] = useState<VoiceCallRecord[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeCall, setActiveCall] = useState<ApprovedContact | null>(null);
  const [error, setError] = useState('');

  // Load contacts
  useEffect(() => {
    async function fetchContacts() {
      try {
        const resp = await fetch(`${API_BASE}/voice/users/contacts`, {
          headers: getAuthHeaders(),
        });
        const data = await resp.json();
        if (data.success) {
          setContacts(data.data);
        } else {
          setError(data.error?.message || 'Failed to load contacts');
        }
      } catch {
        setError('Could not connect to the server');
      } finally {
        setLoadingContacts(false);
      }
    }
    fetchContacts();
  }, []);

  // Load call history
  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/voice/call-logs?pageSize=10`, {
        headers: getAuthHeaders(),
      });
      const data = await resp.json();
      if (data.success) {
        setCallHistory(data.data);
      }
    } catch {
      // Silently fail for history
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCallEnded = useCallback(() => {
    setActiveCall(null);
    fetchHistory();
  }, [fetchHistory]);

  // Active call overlay
  if (activeCall) {
    return <ActiveCallScreen contact={activeCall} onCallEnded={handleCallEnded} />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
          <p className="text-sm text-gray-500 mt-1">Tap a contact to start a call</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
          📞
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Contact List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>👥</span> Approved Contacts
        </h2>

        {loadingContacts ? (
          <Card padding="lg">
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          </Card>
        ) : contacts.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
              <span className="text-5xl block mb-4">📋</span>
              <p className="text-gray-500">No approved contacts yet.</p>
              <p className="text-sm text-gray-400 mt-1">Ask your facility to approve contacts for calling.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {contacts.map((c) => (
              <ContactCard key={c.id} contact={c} onCall={setActiveCall} />
            ))}
          </div>
        )}
      </div>

      {/* Call History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🕐</span> Recent Calls
        </h2>

        {loadingHistory ? (
          <Card padding="md">
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          </Card>
        ) : callHistory.length === 0 ? (
          <Card padding="md">
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No calls yet. Make your first call above!</p>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            {callHistory.map((call) => (
              <CallHistoryItem key={call.id} call={call} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Router wrapper
// ==========================================

export default function VoiceIncarcerated() {
  return (
    <Routes>
      <Route index element={<VoiceHome />} />
    </Routes>
  );
}
