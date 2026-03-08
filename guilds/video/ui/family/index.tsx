import React, { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Button, Card } from '@openconnect/ui';
import { VideoCallRoom } from '../shared/VideoCallRoom.js';
import ManageContact from './manage_contact';
import ScheduleCall from './schedule';
import ScheduledCalls from './scheduled';
import PastCalls from './past';
import { familyMessages } from '../messages';

/**
 * Family UI — Development Stub
 */
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:3001';
const IS_TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';

function getUserIdFromToken(): string {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? '';
  } catch {
    return '';
  }
}

function FamilyVideoHomeDevStub() {
  const [callId, setCallId] = useState('');
  const [activeCall, setActiveCall] = useState<{ callId: string; scheduledEnd: string } | null>(null);
  const userId = getUserIdFromToken();

  if (activeCall) {
    return (
      <VideoCallRoom
        callId={activeCall.callId}
        userId={userId}
        userRole="family"
        scheduledEnd={activeCall.scheduledEnd}
        signalingUrl={SIGNALING_URL}
        onExit={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '40px',
        width: '360px',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '24px', fontSize: '20px' }}>
          Join a Video Call
        </h2>
        <input
          id="callId-input"
          type="text"
          placeholder="Enter Call ID"
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.07)',
            color: '#e2e8f0',
            fontSize: '14px',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />
        <Button
          id="join-call-dev-btn"
          disabled={!callId.trim()}
          fullWidth
          variant="primary"
          onClick={() => {
            fetch(`/api/video/join/${callId.trim()}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                'Content-Type': 'application/json',
              },
            })
              .then((r) => r.json())
              .then((body) => {
                if (body.success) {
                  setActiveCall({ callId: callId.trim(), scheduledEnd: body.data.scheduledEnd });
                } else {
                  alert(`Cannot join: ${body.error?.message ?? 'Unknown error'}`);
                }
              })
              .catch(() => alert('Failed to join call.'));
          }}
        >
          Join Call (Dev)
        </Button>
        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '16px' }}>
          [Dev stub — full scheduling UI coming soon]
        </p>
      </div>
    </div>
  );
}

interface IncarceratedPerson {
  id: string;
  firstName: string;
  lastName: string;
  facilityId?: string;
}

interface ApprovedContactItem {
  id: string;
  incarceratedPerson: IncarceratedPerson;
  relationship?: string;
}

function VideoHome() {
  const [contacts, setContacts] = useState<ApprovedContactItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testCallLoading, setTestCallLoading] = useState(false);
  const [activeTestCall, setActiveTestCall] = useState<{ callId: string; scheduledEnd: string } | null>(null);
  const userId = getUserIdFromToken();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // @ts-ignore
        const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/video/approved-contacts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json: any = await res.json();
        const data: ApprovedContactItem[] = json.data || json;
        if (mounted) setContacts(data);
      } catch (err: any) {
        if (mounted) setError(err.message || familyMessages.index.loadErrorFallback);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleTestCall(incarceratedPersonId: string) {
    setTestCallLoading(true);
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/video/test/create-call', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ incarceratedPersonId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to create test call');

      // Join the call immediately
      const joinRes = await fetch(`/api/video/join/${json.data.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const joinJson = await joinRes.json();
      if (!joinJson.success) throw new Error(joinJson.error?.message ?? 'Failed to join call');

      setActiveTestCall({ callId: json.data.id, scheduledEnd: joinJson.data.scheduledEnd });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestCallLoading(false);
    }
  }

  if (activeTestCall) {
    return (
      <VideoCallRoom
        callId={activeTestCall.callId}
        userId={userId}
        userRole="family"
        scheduledEnd={activeTestCall.scheduledEnd}
        signalingUrl={SIGNALING_URL}
        onExit={() => setActiveTestCall(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{familyMessages.index.title}</h1>

      {/* TEST MODE: instant call buttons */}
      {IS_TEST_MODE && contacts && contacts.length > 0 && (
        <div className="border-2 border-dashed border-yellow-400 rounded-lg p-4 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800 mb-2">TEST MODE — Start an instant call</p>
          <div className="space-y-2">
            {contacts.map((c) => (
              <Button
                key={c.id}
                fullWidth
                variant="primary"
                disabled={testCallLoading}
                onClick={() => handleTestCall(c.incarceratedPerson.id)}
              >
                {testCallLoading ? 'Creating...' : `Call ${c.incarceratedPerson.firstName} ${c.incarceratedPerson.lastName} NOW`}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Dev stub bypass block */}
      <div className="mb-4">
        <Link to="dev" className="text-blue-500 hover:underline">
          → Access Developer Test Room Stub
        </Link>
      </div>

      <Card padding="lg">
        <div className="space-y-4">
          <p className="text-gray-600">{familyMessages.index.selectContactPrompt}</p>

          {loading && <div className="text-gray-500">{familyMessages.common.loading}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && contacts && contacts.length === 0 && (
            <div className="text-gray-500">{familyMessages.index.noApprovedContacts}</div>
          )}

          <div className="grid gap-3">
            {contacts && contacts.map((c) => (
              <Link
                key={c.id}
                to={`manage_contact/${c.incarceratedPerson.id}`}
                className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {c.incarceratedPerson.firstName} {c.incarceratedPerson.lastName}
                  </div>
                  {c.relationship && <div className="text-sm text-gray-500">{c.relationship}</div>}
                </div>
                <div className="text-gray-400">→</div>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function FamilyVideoUI() {
  return (
    <Routes>
      <Route index element={<VideoHome />} />
      <Route path="dev" element={<FamilyVideoHomeDevStub />} />
      <Route path="manage_contact/:contactId" element={<ManageContact />} />
      <Route path="manage_contact/:contactId/schedule" element={<ScheduleCall />} />
      <Route path="manage_contact/:contactId/scheduled" element={<ScheduledCalls />} />
      <Route path="manage_contact/:contactId/past" element={<PastCalls />} />
    </Routes>
  );
}

