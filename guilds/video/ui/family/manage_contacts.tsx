import React, { useEffect, useState } from 'react';
import { Card } from '@openconnect/ui';

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

export default function Contacts() {
  const [contacts, setContacts] = useState<ApprovedContactItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/video/approved-contacts', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json = await res.json();
        const data: ApprovedContactItem[] = json.data || json;
        if (mounted) setContacts(data);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load contacts');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>

      <Card padding="lg">
        <div className="space-y-4">
          <p className="text-gray-600">These are the incarcerated individuals you've been approved to contact.</p>

          {loading && <div className="text-gray-500">Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && contacts && contacts.length === 0 && (
            <div className="text-gray-500">No approved contacts found.</div>
          )}

          <ul className="space-y-3">
            {contacts && contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{c.incarceratedPerson.firstName} {c.incarceratedPerson.lastName}</div>
                  {c.relationship && <div className="text-sm text-gray-500">{c.relationship}</div>}
                </div>
                <div className="text-sm text-gray-500">ID: {c.incarceratedPerson.id.slice(0,8)}</div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
