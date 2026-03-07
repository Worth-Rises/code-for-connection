import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../../hooks/useAdminApi';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { TabNav } from '../../components/TabNav';

interface LinkedResident {
  id: string;
  incarceratedPersonId: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  incarceratedPerson: {
    id: string;
    firstName: string;
    lastName: string;
    externalId: string | null;
    status: string;
  };
  approvedByAdmin: { id: string; name: string } | null;
}

interface VisitorDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  visitorType: string;
  backgroundCheckStatus: string;
  governmentIdNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  linkedResidents: LinkedResident[];
}

interface SearchResident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
}

export default function VisitorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { get, post, del, patch } = useAdminApi();
  const [visitor, setVisitor] = useState<VisitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('residents');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Link resident modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResident[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  // Unlink confirm
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedResident | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchVisitor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await get(`/visitors/${id}`);
      setVisitor(res.data);
    } catch {
      setVisitor(null);
    } finally {
      setLoading(false);
    }
  }, [get, id]);

  useEffect(() => {
    fetchVisitor();
  }, [fetchVisitor]);

  const handleStatusAction = async () => {
    if (!confirmAction || !id) return;
    setActionLoading(true);
    try {
      await post(`/visitors/${id}/${confirmAction}`, {});
      setConfirmAction(null);
      fetchVisitor();
    } catch {
      // keep modal open
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery, pageSize: '10' });
      const res = await get(`/dashboard/residents?${params}`);
      setSearchResults(res.data?.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLinkResident = async () => {
    if (!selectedResidentId || !id) return;
    setLinkLoading(true);
    try {
      await post(`/visitors/${id}/link-resident`, { incarceratedPersonId: selectedResidentId });
      setLinkModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResidentId('');
      fetchVisitor();
    } catch {
      // keep modal open
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget || !id) return;
    setUnlinkLoading(true);
    try {
      await del(`/visitors/${id}/unlink-resident/${unlinkTarget.incarceratedPersonId}`);
      setUnlinkTarget(null);
      fetchVisitor();
    } catch {
      // keep modal open
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      await patch(`/visitors/${id}`, { notes: notesValue });
      setEditingNotes(false);
      fetchVisitor();
    } catch {
      // stay in edit mode
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!visitor) {
    return <div className="text-center py-12 text-gray-500">Visitor not found.</div>;
  }

  const maskedGovId = visitor.governmentIdNumber
    ? '****' + visitor.governmentIdNumber.slice(-4)
    : null;

  const residentColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (r: LinkedResident) =>
        `${r.incarceratedPerson.firstName} ${r.incarceratedPerson.lastName}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: LinkedResident) => <StatusBadge status={r.status} />,
    },
    {
      key: 'approvedBy',
      header: 'Approved By',
      render: (r: LinkedResident) => r.approvedByAdmin?.name || '-',
    },
    {
      key: 'date',
      header: 'Date',
      render: (r: LinkedResident) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: LinkedResident) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setUnlinkTarget(r)}
          >
            Unlink
          </Button>
        </div>
      ),
    },
  ];

  const tabs = [
    { key: 'residents', label: 'Linked Residents' },
    { key: 'details', label: 'Details' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/visitors')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to Visitors
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {visitor.firstName} {visitor.lastName}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {visitor.visitorType}
            </span>
            <StatusBadge status={visitor.backgroundCheckStatus} />
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                visitor.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {visitor.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {visitor.backgroundCheckStatus === 'pending' && (
            <>
              <Button onClick={() => setConfirmAction('approve')}>Approve</Button>
              <Button variant="danger" onClick={() => setConfirmAction('deny')}>Deny</Button>
            </>
          )}
          {visitor.backgroundCheckStatus === 'passed' && visitor.isActive && (
            <Button variant="danger" onClick={() => setConfirmAction('suspend')}>Suspend</Button>
          )}
          {visitor.backgroundCheckStatus === 'passed' && !visitor.isActive && (
            <Button onClick={() => setConfirmAction('reactivate')}>Reactivate</Button>
          )}
        </div>
      </div>

      <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Linked Residents tab */}
      {activeTab === 'residents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setLinkModalOpen(true)}>Link Resident</Button>
          </div>
          <DataTable
            columns={residentColumns}
            data={visitor.linkedResidents}
            emptyMessage="No linked residents."
          />
        </div>
      )}

      {/* Details tab */}
      {activeTab === 'details' && (
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{visitor.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{visitor.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Government ID</label>
                <p className="mt-1 text-sm text-gray-900">{maskedGovId || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(visitor.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-500">Notes</label>
                {!editingNotes && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setNotesValue(visitor.notes || '');
                      setEditingNotes(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    rows={4}
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} loading={savingNotes}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingNotes(false)}
                      disabled={savingNotes}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {visitor.notes || '-'}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Status action confirm modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`Confirm ${confirmAction}`}
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to {confirmAction} this visitor?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmAction === 'approve' || confirmAction === 'reactivate' ? 'primary' : 'danger'}
            onClick={handleStatusAction}
            loading={actionLoading}
          >
            {confirmAction
              ? confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)
              : ''}
          </Button>
        </div>
      </Modal>

      {/* Link resident modal */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => {
          setLinkModalOpen(false);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedResidentId('');
        }}
        title="Link Resident"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search residents by name..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} loading={searchLoading}>
              Search
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResidentId(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 ${
                    selectedResidentId === r.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {r.firstName} {r.lastName}
                  {r.externalId && (
                    <span className="text-gray-400 ml-2">({r.externalId})</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setLinkModalOpen(false);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedResidentId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkResident}
              disabled={!selectedResidentId}
              loading={linkLoading}
            >
              Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unlink confirm modal */}
      <Modal
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        title="Confirm Unlink"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to unlink{' '}
          <strong>
            {unlinkTarget?.incarceratedPerson.firstName}{' '}
            {unlinkTarget?.incarceratedPerson.lastName}
          </strong>{' '}
          from this visitor?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setUnlinkTarget(null)} disabled={unlinkLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleUnlink} loading={unlinkLoading}>
            Unlink
          </Button>
        </div>
      </Modal>
    </div>
  );
}
