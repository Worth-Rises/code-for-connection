import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../../hooks/useAdminApi';
import { usePagination } from '../../hooks/usePagination';
import { useFacilityScope } from '../../hooks/useFacilityScope';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { TabNav } from '../../components/TabNav';
import { Pagination } from '../../components/Pagination';
import { FacilitySelector } from '../../components/FacilitySelector';

type VisitorTab = 'pending' | 'approved' | 'suspended';

interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  visitorType: string;
  backgroundCheckStatus: string;
  isActive: boolean;
  _count: { linkedResidents: number };
}

interface TabCounts {
  pending: number;
  approved: number;
  suspended: number;
}

export default function VisitorListPage() {
  const { get, post } = useAdminApi();
  const navigate = useNavigate();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [activeTab, setActiveTab] = useState<VisitorTab>('pending');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState<TabCounts>({ pending: 0, approved: 0, suspended: 0 });
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: activeTab,
      });
      const res = await get(`/visitors?${params}`);
      setVisitors(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, [get, page, pageSize, activeTab, setTotalPages]);

  const fetchCounts = useCallback(async () => {
    try {
      const [pending, approved, suspended] = await Promise.all([
        get('/visitors?status=pending&pageSize=1'),
        get('/visitors?status=approved&pageSize=1'),
        get('/visitors?status=suspended&pageSize=1'),
      ]);
      setTabCounts({
        pending: pending.data?.pagination?.totalItems || 0,
        approved: approved.data?.pagination?.totalItems || 0,
        suspended: suspended.data?.pagination?.totalItems || 0,
      });
    } catch {
      // ignore count errors
    }
  }, [get]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await post(`/visitors/${confirmAction.id}/${confirmAction.action}`, {});
      setConfirmAction(null);
      fetchVisitors();
      fetchCounts();
    } catch {
      // keep modal open on error
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { key: 'pending', label: 'Applications', count: tabCounts.pending },
    { key: 'approved', label: 'Approved', count: tabCounts.approved },
    { key: 'suspended', label: 'Suspended', count: tabCounts.suspended },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (v: Visitor) => `${v.firstName} ${v.lastName}`,
    },
    {
      key: 'visitorType',
      header: 'Type',
      render: (v: Visitor) => (
        <span className="capitalize">{v.visitorType}</span>
      ),
    },
    {
      key: 'backgroundCheckStatus',
      header: 'Background Check',
      render: (v: Visitor) => <StatusBadge status={v.backgroundCheckStatus} />,
    },
    {
      key: 'email',
      header: 'Email',
      render: (v: Visitor) => v.email || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (v: Visitor) => v.phone || '-',
    },
    {
      key: 'linkedResidents',
      header: 'Linked Residents',
      render: (v: Visitor) => v._count.linkedResidents,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v: Visitor) => {
        const name = `${v.firstName} ${v.lastName}`;
        return (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {activeTab === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setConfirmAction({ id: v.id, action: 'approve', name })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirmAction({ id: v.id, action: 'deny', name })}
                >
                  Deny
                </Button>
              </>
            )}
            {activeTab === 'approved' && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setConfirmAction({ id: v.id, action: 'suspend', name })}
              >
                Suspend
              </Button>
            )}
            {activeTab === 'suspended' && (
              <Button
                size="sm"
                onClick={() => setConfirmAction({ id: v.id, action: 'reactivate', name })}
              >
                Reactivate
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as VisitorTab)}
      />

      <DataTable
        columns={columns}
        data={visitors}
        loading={loading}
        emptyMessage="No visitors found."
        onRowClick={(v) => navigate(`/admin/visitors/${v.id}`)}
      />

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`Confirm ${confirmAction?.action}`}
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to {confirmAction?.action} visitor{' '}
          <strong>{confirmAction?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmAction?.action === 'approve' || confirmAction?.action === 'reactivate' ? 'primary' : 'danger'}
            onClick={handleAction}
            loading={actionLoading}
          >
            {confirmAction?.action
              ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)
              : ''}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
