import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { familyMessages } from '../messages';

interface VideoCall {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  incarceratedPerson: {
    firstName: string;
    lastName: string;
  };
}

export default function ScheduledCalls() {
  const { contactId } = useParams<{ contactId: string }>();
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      denied: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {familyMessages.scheduled.statusLabels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <Link to=".." className="text-blue-600 hover:text-blue-700">&larr; {familyMessages.common.back}</Link>
      
      <h1 className="text-2xl font-bold text-gray-900">{familyMessages.scheduled.title}</h1>

      <Card padding="lg">
        <div className="space-y-4">
          {loading && <div className="text-gray-500">{familyMessages.common.loading}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && calls.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <div className="text-gray-500">{familyMessages.scheduled.noScheduledCalls}</div>
              <Link
                to="../schedule"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {familyMessages.scheduled.scheduleCallButton}
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {calls.map((call) => (
              <div key={call.id} className="p-4 border rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      {call.incarceratedPerson.firstName} {call.incarceratedPerson.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDateTime(call.scheduledStart)}
                    </div>
                  </div>
                  {getStatusBadge(call.status)}
                </div>
                <div className="text-xs text-gray-500">
                  {familyMessages.scheduled.durationLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
