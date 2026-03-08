import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { VideoCallRoom } from '../shared/VideoCallRoom.js';
import { Copy, Check } from 'lucide-react';
import { familyMessages } from '../messages';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:3001';
const JOIN_GRACE_MS = 900_000;

interface VideoCall {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  approvedBy?: string | null;
  incarceratedPerson: {
    firstName: string;
    lastName: string;
  };
}

interface ActiveCall {
  callId: string;
  scheduledEnd: string;
}

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

export default function ScheduledCalls() {
  const { contactId } = useParams<{ contactId: string }>();
  const manageContactPath = contactId ? `/family/video/manage_contact/${contactId}` : '/family/video';
  const schedulePath = contactId ? `/family/video/manage_contact/${contactId}/schedule` : '/family/video';
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingCallId, setCancelingCallId] = useState<string | null>(null);
  const [joiningCallId, setJoiningCallId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const userId = getUserIdFromToken();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // @ts-ignore
        const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        
        const res = await fetch(`/api/video/scheduled-calls?contactId=${contactId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        
        const json: any = await res.json();
        const data: VideoCall[] = json.data || json;
        if (mounted) setCalls(data);
      } catch (err: any) {
        if (mounted) setError(err.message || familyMessages.scheduled.loadErrorFallback);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [contactId]);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(familyMessages.locale.dateTime, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      requested: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-green-100 text-green-800',
      in_progress: 'bg-emerald-100 text-emerald-800',
      denied: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {familyMessages.scheduled.statusLabels[status] || status}
      </span>
    );
  };

  const hasCallStarted = (call: VideoCall) => Date.now() >= new Date(call.scheduledStart).getTime();

  const canJoinCall = (call: VideoCall) => {
    if (!['scheduled', 'in_progress'].includes(call.status)) return false;
    const now = Date.now();
    const start = new Date(call.scheduledStart).getTime();
    const end = new Date(call.scheduledEnd).getTime();
    return now >= start && now <= end + JOIN_GRACE_MS;
  };

  const canCancelCall = (call: VideoCall) => {
    if (call.status === 'requested') return true;
    if (call.status === 'scheduled') return !hasCallStarted(call);
    return false;
  };

  const canRescheduleCall = (call: VideoCall) => {
    if (call.status === 'requested') return true;
    if (call.status === 'scheduled') return !hasCallStarted(call);
    return false;
  };

  const handleJoinCall = async (call: VideoCall) => {
    setError(null);
    setJoiningCallId(call.id);
    try {
      // @ts-ignore
      const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`/api/video/join/${call.id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      });

      const json: any = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `HTTP ${res.status}`);
      }

      setActiveCall({
        callId: call.id,
        scheduledEnd: json?.data?.scheduledEnd || call.scheduledEnd,
      });
    } catch (err: any) {
      setError(err.message || familyMessages.scheduled.joinErrorFallback);
    } finally {
      setJoiningCallId(null);
    }
  };

  const handleCancelCall = async (callId: string) => {
    setError(null);
    setCancelingCallId(callId);
    try {
      // @ts-ignore
      const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`/api/video/cancel-call/${callId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const json: any = await res.json();
        throw new Error(json.error?.message || `HTTP ${res.status}`);
      }

      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (err: any) {
      setError(err.message || familyMessages.scheduled.cancelErrorFallback);
    } finally {
      setCancelingCallId(null);
    }
  };

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
    <div className="space-y-4">
      <Link to={manageContactPath} className="inline-flex items-center min-h-[44px] text-blue-600 hover:text-blue-700 hover:underline">&larr; {familyMessages.common.back}</Link>
      
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{familyMessages.scheduled.title}</h1>

      <Card padding="lg">
        <div className="space-y-4">
          {loading && <div className="text-gray-500">{familyMessages.common.loading}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && calls.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">{familyMessages.scheduled.noScheduledCalls}</div>
            </div>
          )}

          <div className="space-y-3">
            {calls.map((call) => (
              <div key={call.id} className="p-4 border rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 pr-3">
                    <div className="font-medium text-gray-900 truncate">
                      {call.incarceratedPerson.firstName} {call.incarceratedPerson.lastName}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {formatDateTime(call.scheduledStart)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(call.status)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {familyMessages.scheduled.durationLabel}
                </div>
                <div className="text-xs font-mono text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 mb-2 inline-flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Call ID:</span> 
                  <span className="select-all text-gray-900">{call.id}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(call.id);
                      setCopiedId(call.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="ml-2 hover:bg-gray-200 p-1 rounded transition-colors text-gray-500"
                    title="Copy to clipboard"
                  >
                    {copiedId === call.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
                {(canJoinCall(call) || canRescheduleCall(call) || canCancelCall(call)) && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      {canJoinCall(call) && (
                        <button
                          type="button"
                          onClick={() => handleJoinCall(call)}
                          disabled={joiningCallId === call.id}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm border border-green-300 text-green-700 rounded hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {joiningCallId === call.id
                            ? familyMessages.scheduled.joiningCallButton
                            : familyMessages.scheduled.joinCallButton}
                        </button>
                      )}
                      {canRescheduleCall(call) && (
                        <Link
                          to={`${schedulePath}?rescheduleCallId=${call.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                        >
                          {familyMessages.scheduled.rescheduleCallButton}
                        </Link>
                      )}
                      {canCancelCall(call) && (
                        <button
                          type="button"
                          onClick={() => handleCancelCall(call.id)}
                          disabled={cancelingCallId === call.id}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {cancelingCallId === call.id
                            ? familyMessages.scheduled.cancelingCallButton
                            : familyMessages.scheduled.cancelCallButton}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
