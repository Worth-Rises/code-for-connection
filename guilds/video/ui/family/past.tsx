import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { familyMessages } from '../messages';

interface VideoCall {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationSeconds?: number;
  status: string;
  endedBy?: string;
  incarceratedPerson: {
    firstName: string;
    lastName: string;
  };
}

export default function PastCalls() {
  const { contactId } = useParams<{ contactId: string }>();
  const manageContactPath = contactId ? `/family/video/manage_contact/${contactId}` : '/family/video';

  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (contactId) params.set('contactId', contactId);

        const res = await fetch(`/api/video/past-calls?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const json: any = await res.json();
        const data: VideoCall[] = json.data || json;
        if (mounted) {
          setCalls(data);
          if (json.pagination) setTotalPages(json.pagination.totalPages ?? 1);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || familyMessages.past.loadErrorFallback);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [contactId, page]);

  const formatDateTime = (isoString: string) =>
    new Date(isoString).toLocaleString(familyMessages.locale.dateTime, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      missed: 'bg-yellow-100 text-yellow-800',
      terminated_by_admin: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {familyMessages.past.statusLabels[status] || status}
      </span>
    );
  };

  const formatDuration = (seconds: number) => familyMessages.past.durationSeconds(seconds);

  return (
    <div className="space-y-4">
      <Link to={manageContactPath} className="inline-flex items-center min-h-[44px] text-blue-600 hover:text-blue-700 hover:underline">
        &larr; {familyMessages.common.back}
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{familyMessages.past.title}</h1>

      <Card padding="lg">
        <div className="space-y-4">
          {loading && <div className="text-gray-500">{familyMessages.common.loading}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && calls.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">{familyMessages.past.noPastCalls}</div>
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
                    <div className="text-sm text-gray-600 truncate">{formatDateTime(call.scheduledStart)}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(call.status)}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-500">
                  {call.durationSeconds != null && (
                    <div>
                      {familyMessages.past.durationLabel}: {formatDuration(call.durationSeconds)}
                    </div>
                  )}
                  {call.endedBy && (
                    <div>{familyMessages.past.endedByLabels[call.endedBy] || call.endedBy}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
