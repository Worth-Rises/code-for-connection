import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ContactDetailPanel from './ContactDetailPanel';

interface ContactRequest {
  id: string;
  relationship: string;
  isAttorney: boolean;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  incarceratedPerson: {
    id: string;
    firstName: string;
    lastName: string;
    externalId: string | null;
    facilityId: string;
    facility: { id: string; name: string };
  };
  familyMember: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

const TAB_STATUS: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  denied: 'denied',
};

export default function ContactListPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('pending');
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const fetchContacts = useCallback((status: string) => {
    setLoading(true);
    setError(null);

    fetch(`/api/admin/contact-requests?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setContacts(data.data);
        } else {
          setError(data.error?.message ?? 'Failed to load');
        }
      })
      .catch(() => setError('Failed to load contact requests'))
      .finally(() => setLoading(false));
  }, [token]);

  // Fetch pending count for badge
  useEffect(() => {
    fetch('/api/admin/contact-requests?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPendingCount(data.data.length);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchContacts(TAB_STATUS[tab]);
  }, [tab, fetchContacts]);

  function handleUpdated() {
    fetchContacts(TAB_STATUS[tab]);
    setSelectedId(null);
    // Refresh pending count
    fetch('/api/admin/contact-requests?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPendingCount(data.data.length);
      })
      .catch(() => {});
  }

  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  const filtered = search
    ? contacts.filter((c) => {
        const term = search.toLowerCase();
        return (
          c.familyMember.firstName.toLowerCase().includes(term) ||
          c.familyMember.lastName.toLowerCase().includes(term) ||
          c.incarceratedPerson.firstName.toLowerCase().includes(term) ||
          c.incarceratedPerson.lastName.toLowerCase().includes(term) ||
          (c.incarceratedPerson.externalId ?? '').toLowerCase().includes(term)
        );
      })
    : contacts;

  return (
    <div className="flex h-full">
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Review and manage contact requests</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedId(null); }}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingCount !== null && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="denied">Denied / Removed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">No contact requests found.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Relationship</th>
                  {tab === 'approved' && (
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Attorney</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {tab === 'pending' ? 'Requested' : 'Reviewed'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedId === c.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {c.familyMember.firstName} {c.familyMember.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.incarceratedPerson.lastName}, {c.incarceratedPerson.firstName}
                      {c.incarceratedPerson.externalId && ` #${c.incarceratedPerson.externalId}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{c.relationship}</td>
                    {tab === 'approved' && (
                      <td className="px-6 py-4 text-sm">
                        {c.isAttorney && <Badge>atty</Badge>}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tab === 'pending' ? c.requestedAt : (c.reviewedAt ?? c.requestedAt)).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
