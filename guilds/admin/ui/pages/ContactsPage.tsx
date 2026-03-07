import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { usePagination } from '../hooks/usePagination';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { FacilitySelector } from '../components/FacilitySelector';
import { Pagination } from '../components/Pagination';

type StatusFilter = 'pending' | 'approved' | 'denied' | 'removed' | 'all';

interface Contact {
  id: string;
  incarceratedPerson: { firstName: string; lastName: string };
  familyMember: { firstName: string; lastName: string };
  isAttorney: boolean;
  status: string;
  requestedAt: string;
}

export default function ContactsPage() {
  const { get, patch } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const tabs: StatusFilter[] = ['pending', 'approved', 'denied', 'removed', 'all'];

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== 'all') params.set('status', status);
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/contacts?${params}`);
      setContacts(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [get, page, pageSize, status, facilityId, setTotalPages]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await patch(`/contacts/${confirmAction.id}/${confirmAction.action}`, {});
      setConfirmAction(null);
      fetchContacts();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              status === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card padding="none">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Incarcerated Person</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Family Member</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Attorney</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No contacts found.</td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{c.incarceratedPerson.firstName} {c.incarceratedPerson.lastName}</td>
                  <td className="px-4 py-3">{c.familyMember.firstName} {c.familyMember.lastName}</td>
                  <td className="px-4 py-3">{c.isAttorney ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 capitalize">{c.status}</td>
                  <td className="px-4 py-3">{new Date(c.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => setConfirmAction({ id: c.id, action: 'approve' })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setConfirmAction({ id: c.id, action: 'deny' })}>
                            Deny
                          </Button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <Button size="sm" variant="danger" onClick={() => setConfirmAction({ id: c.id, action: 'remove' })}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`Confirm ${confirmAction?.action}`}
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to {confirmAction?.action} this contact?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmAction?.action === 'approve' ? 'primary' : 'danger'}
            onClick={handleAction}
            loading={actionLoading}
          >
            {confirmAction?.action ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : ''}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
