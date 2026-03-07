import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { FacilitySelector } from '../components/FacilitySelector';

interface BlockedNumber {
  id: string;
  phoneNumber: string;
  scope: string;
  facility?: { name: string } | null;
  reason?: string;
  admin: { firstName: string; lastName: string };
  createdAt: string;
}

export default function BlockedNumbersPage() {
  const { get, post, del } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [numbers, setNumbers] = useState<BlockedNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [newPhone, setNewPhone] = useState('');
  const [newScope, setNewScope] = useState('facility');
  const [newFacilityId, setNewFacilityId] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/blocked-numbers?${params}`);
      setNumbers(res.data?.data || []);
    } catch {
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  const handleAdd = async () => {
    setActionLoading(true);
    try {
      await post('/blocked-numbers', {
        phoneNumber: newPhone,
        scope: newScope,
        facilityId: newScope === 'facility' ? newFacilityId : undefined,
        reason: newReason || undefined,
      });
      setShowAddModal(false);
      setNewPhone('');
      setNewScope('facility');
      setNewFacilityId('');
      setNewReason('');
      fetchNumbers();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    setActionLoading(true);
    try {
      await del(`/blocked-numbers/${removeId}`);
      setRemoveId(null);
      fetchNumbers();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blocked Numbers</h1>
        <div className="flex items-center gap-4">
          {isAgencyAdmin && (
            <div className="w-64">
              <FacilitySelector value={facilityId} onChange={setFacilityId} />
            </div>
          )}
          <Button onClick={() => setShowAddModal(true)}>Add Blocked Number</Button>
        </div>
      </div>

      <Card padding="none">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone Number</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Scope</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Facility</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Blocked By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : numbers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No blocked numbers.</td>
              </tr>
            ) : (
              numbers.map((n) => (
                <tr key={n.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{n.phoneNumber}</td>
                  <td className="px-4 py-3 capitalize">{n.scope}</td>
                  <td className="px-4 py-3">{n.facility?.name || '-'}</td>
                  <td className="px-4 py-3">{n.reason || '-'}</td>
                  <td className="px-4 py-3">{n.admin.firstName} {n.admin.lastName}</td>
                  <td className="px-4 py-3">{new Date(n.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="danger" onClick={() => setRemoveId(n.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Blocked Number">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
            <select
              value={newScope}
              onChange={(e) => setNewScope(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="facility">Facility</option>
              {isAgencyAdmin && <option value="agency">Agency</option>}
            </select>
          </div>
          {isAgencyAdmin && newScope === 'facility' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
              <FacilitySelector value={newFacilityId} onChange={setNewFacilityId} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional reason"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={actionLoading} disabled={!newPhone}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal isOpen={!!removeId} onClose={() => setRemoveId(null)} title="Remove Blocked Number" size="sm">
        <p className="text-gray-600 mb-4">Are you sure you want to remove this blocked number?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRemoveId(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={actionLoading}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
