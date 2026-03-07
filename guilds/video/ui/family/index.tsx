import React, { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import ManageContact from './manage_contact';
import ScheduleCall from './schedule';
import ScheduledCalls from './scheduled';
import { familyMessages } from '../messages';

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{familyMessages.index.title}</h1>

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

export default function VideoFamily() {
  return (
    <Routes>
      <Route index element={<VideoHome />} />
      <Route path="manage_contact/:contactId" element={<ManageContact />} />
      <Route path="manage_contact/:contactId/schedule" element={<ScheduleCall />} />
      <Route path="manage_contact/:contactId/scheduled" element={<ScheduledCalls />} />
    </Routes>
  );
}
