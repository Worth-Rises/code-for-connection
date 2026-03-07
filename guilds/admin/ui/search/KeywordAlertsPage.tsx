import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../../hooks/useFacilityScope';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { FacilitySelector } from '../../components/FacilitySelector';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface KeywordAlert {
  id: string;
  keyword: string;
  isRegex: boolean;
  severity: Severity;
  facilityId: string | null;
  isActive: boolean;
  createdAt: string;
  facility?: { id: string; name: string } | null;
  createdByAdmin: { id: string; firstName: string; lastName: string };
  _count: { flaggedContent: number };
}

interface FlaggedMatch {
  id: string;
  contentType: string;
  contentId: string;
  matchedText: string | null;
  flagReason: string;
  status: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewedByAdmin?: { id: string; firstName: string; lastName: string } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export default function KeywordAlertsPage() {
  const { get, post, patch, del } = useAdminApi();
  const { isAgencyAdmin } = useFacilityScope();
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<KeywordAlert | null>(null);
  const [formKeyword, setFormKeyword] = useState('');
  const [formIsRegex, setFormIsRegex] = useState(false);
  const [formSeverity, setFormSeverity] = useState<Severity>('medium');
  const [formFacilityId, setFormFacilityId] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Matches view state
  const [viewingAlert, setViewingAlert] = useState<KeywordAlert | null>(null);
  const [matches, setMatches] = useState<FlaggedMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/keyword-alerts');
      setAlerts(res.data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchMatches = useCallback(async (alertId: string, page: number) => {
    setMatchesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      const res = await get(`/keyword-alerts/${alertId}/matches?${params}`);
      setMatches(res.data?.data || []);
      setMatchTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [get]);

  useEffect(() => {
    if (viewingAlert) {
      fetchMatches(viewingAlert.id, matchPage);
    }
  }, [viewingAlert, matchPage, fetchMatches]);

  const openCreateModal = () => {
    setEditingAlert(null);
    setFormKeyword('');
    setFormIsRegex(false);
    setFormSeverity('medium');
    setFormFacilityId('');
    setShowModal(true);
  };

  const openEditModal = (alert: KeywordAlert) => {
    setEditingAlert(alert);
    setFormKeyword(alert.keyword);
    setFormIsRegex(alert.isRegex);
    setFormSeverity(alert.severity);
    setFormFacilityId(alert.facilityId || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormSaving(true);
    try {
      if (editingAlert) {
        await patch(`/keyword-alerts/${editingAlert.id}`, {
          keyword: formKeyword,
          isRegex: formIsRegex,
          severity: formSeverity,
        });
      } else {
        await post('/keyword-alerts', {
          keyword: formKeyword,
          isRegex: formIsRegex,
          severity: formSeverity,
          facilityId: formFacilityId || undefined,
        });
      }
      setShowModal(false);
      fetchAlerts();
    } catch {
      // keep modal open on error
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (alert: KeywordAlert) => {
    try {
      await patch(`/keyword-alerts/${alert.id}`, { isActive: !alert.isActive });
      fetchAlerts();
    } catch {
      // ignore toggle errors
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await del(`/keyword-alerts/${deleteId}`);
      setDeleteId(null);
      fetchAlerts();
    } catch {
      // keep modal open on error
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReview = async (matchId: string, status: string) => {
    setReviewLoading(matchId);
    try {
      await patch(`/flagged-content/${matchId}/review`, { status });
      if (viewingAlert) {
        fetchMatches(viewingAlert.id, matchPage);
      }
    } catch {
      // ignore review errors
    } finally {
      setReviewLoading(null);
    }
  };

  // Matches view
  if (viewingAlert) {
    const matchColumns = [
      {
        key: 'contentType',
        header: 'Content Type',
        render: (m: FlaggedMatch) => (
          <span className="capitalize">{m.contentType}</span>
        ),
      },
      {
        key: 'matchedText',
        header: 'Matched Text',
        render: (m: FlaggedMatch) => (
          <span className="font-mono text-sm">{m.matchedText || '-'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (m: FlaggedMatch) => (
          <StatusBadge status={m.status} colorMap={MATCH_STATUS_COLORS} />
        ),
      },
      {
        key: 'createdAt',
        header: 'Date',
        render: (m: FlaggedMatch) => new Date(m.createdAt).toLocaleDateString(),
      },
      {
        key: 'reviewer',
        header: 'Reviewer',
        render: (m: FlaggedMatch) =>
          m.reviewedByAdmin
            ? `${m.reviewedByAdmin.firstName} ${m.reviewedByAdmin.lastName}`
            : '-',
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (m: FlaggedMatch) => {
          if (m.status !== 'pending') return null;
          const isLoading = reviewLoading === m.id;
          return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                onClick={() => handleReview(m.id, 'reviewed')}
                loading={isLoading}
                disabled={isLoading}
              >
                Review
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleReview(m.id, 'escalated')}
                loading={isLoading}
                disabled={isLoading}
              >
                Escalate
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleReview(m.id, 'dismissed')}
                loading={isLoading}
                disabled={isLoading}
              >
                Dismiss
              </Button>
            </div>
          );
        },
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => { setViewingAlert(null); setMatches([]); setMatchPage(1); }}>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Matches for &ldquo;{viewingAlert.keyword}&rdquo;
          </h1>
        </div>

        <DataTable
          columns={matchColumns}
          data={matches}
          loading={matchesLoading}
          emptyMessage="No matches found for this alert."
        />

        <Pagination
          page={matchPage}
          totalPages={matchTotalPages}
          onNext={() => setMatchPage((p) => Math.min(p + 1, matchTotalPages))}
          onPrev={() => setMatchPage((p) => Math.max(p - 1, 1))}
        />
      </div>
    );
  }

  // Main alerts list
  const alertColumns = [
    {
      key: 'keyword',
      header: 'Keyword',
      render: (a: KeywordAlert) => (
        <span className="font-mono text-sm">{a.keyword}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (a: KeywordAlert) => (
        <StatusBadge status={a.severity} colorMap={SEVERITY_COLORS} />
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (a: KeywordAlert) => a.facility?.name || 'All Facilities',
    },
    {
      key: 'matches',
      header: 'Matches',
      render: (a: KeywordAlert) => a._count.flaggedContent,
    },
    {
      key: 'active',
      header: 'Active',
      render: (a: KeywordAlert) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleActive(a); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            a.isActive ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              a.isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a: KeywordAlert) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => openEditModal(a)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteId(a.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Keyword Alerts</h1>
        <Button onClick={openCreateModal}>Create Alert</Button>
      </div>

      <DataTable
        columns={alertColumns}
        data={alerts}
        loading={loading}
        emptyMessage="No keyword alerts configured."
        onRowClick={(a) => { setViewingAlert(a); setMatchPage(1); }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAlert ? 'Edit Keyword Alert' : 'Create Keyword Alert'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
            <input
              type="text"
              value={formKeyword}
              onChange={(e) => setFormKeyword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter keyword or regex pattern"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRegex"
              checked={formIsRegex}
              onChange={(e) => setFormIsRegex(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isRegex" className="text-sm text-gray-700">
              Is Regular Expression
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={formSeverity}
              onChange={(e) => setFormSeverity(e.target.value as Severity)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          {!editingAlert && isAgencyAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility (optional, leave blank for all)
              </label>
              <FacilitySelector value={formFacilityId} onChange={setFormFacilityId} />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={formSaving} disabled={!formKeyword.trim()}>
              {editingAlert ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Keyword Alert"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this keyword alert? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteLoading}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
