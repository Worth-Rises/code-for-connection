import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';

interface Contact {
  id: string;
  incarceratedPerson: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function ManageContact() {
  const { contactId } = useParams<{ contactId: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // @ts-ignore
        const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/video/approved-contacts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json: any = await res.json();
          const contacts: Contact[] = json.data || json;
          const found = contacts.find((c: Contact) => c.incarceratedPerson.id === contactId);
          if (mounted && found) setContact(found);
        }
      } catch (err) {
        // Ignore errors, will show generic heading
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [contactId]);

  const contactName = contact 
    ? `${contact.incarceratedPerson.firstName} ${contact.incarceratedPerson.lastName}`
    : 'Contact';

  return (
    <div className="space-y-4">
      <Link to=".." className="text-blue-600 hover:text-blue-700">&larr; Back to contacts</Link>
      
      <h1 className="text-2xl font-bold text-gray-900">{loading ? 'Loading...' : contactName}</h1>

      <Card padding="lg">
        <div className="space-y-4">
          <div className="grid gap-3">
            <Link
              to={`schedule`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">Schedule video call</div>
                <div className="text-sm text-gray-500">Request a new video visit</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>

            <Link
              to={`scheduled`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">View scheduled calls</div>
                <div className="text-sm text-gray-500">See upcoming video visits</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>

            <Link
              to={`past`}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">View past calls</div>
                <div className="text-sm text-gray-500">Review call history</div>
              </div>
              <div className="text-gray-400">→</div>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
