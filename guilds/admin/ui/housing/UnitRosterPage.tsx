import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { usePagination } from '../hooks/usePagination';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  status: string;
  riskLevel: string;
  admittedAt: string;
}

interface UnitInfo {
  id: string;
  name: string;
  facilityId: string;
  unitType: { id: string; name: string };
}

interface AvailableUnit {
  id: string;
  name: string;
  unitType: { name: string };
  _count: { incarceratedPersons: number };
}

export default function UnitRosterPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { get, post } = useAdminApi();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();

  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  // Move modal state
  const [moveTarget, setMoveTarget] = useState<Resident | null>(null);
  const [availableUnits, setAvailableUnits] = useState<AvailableUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const fetchRoster = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await get(`/housing/units/${unitId}/roster?${params}`);
      setUnit(res.data?.unit || null);
      setResidents(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setUnit(null);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [get, unitId, page, pageSize, setTotalPages]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const openMoveModal = async (resident: Resident) => {
    setMoveTarget(resident);
    setSelectedUnitId('');
    setUnitsLoading(true);
    try {
      const res = await get('/housing/units');
      const allUnits: AvailableUnit[] = res.data || [];
      // Exclude current unit
      setAvailableUnits(allUnits.filter((u) => u.id !== unitId));
    } catch {
      setAvailableUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleMove = async () => {
    if (!moveTarget || !selectedUnitId) return;
    setMoveLoading(true);
    try {
      await post('/housing/move', {
        incarceratedPersonId: moveTarget.id,
        housingUnitId: selectedUnitId,
      });
      setMoveTarget(null);
      setSelectedUnitId('');
      fetchRoster();
    } catch {
      // keep modal open
    } finally {
      setMoveLoading(false);
    }
  };

  const riskColorMap: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (r: Resident) => `${r.firstName} ${r.lastName}`,
    },
    {
      key: 'externalId',
      header: 'External ID',
      render: (r: Resident) => r.externalId || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Resident) => <StatusBadge status={r.status} />,
    },
    {
      key: 'riskLevel',
      header: 'Risk Level',
      render: (r: Resident) => (
        <StatusBadge status={r.riskLevel} colorMap={riskColorMap} />
      ),
    },
    {
      key: 'admittedAt',
      header: 'Admitted Date',
      render: (r: Resident) => new Date(r.admittedAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: Resident) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => openMoveModal(r)}>
            Move
          </Button>
        </div>
      ),
    },
  ];

  if (loading && !unit) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!unit) {
    return <div className="text-center py-12 text-gray-500">Housing unit not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/admin/housing')}
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Housing
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
        <p className="text-sm text-gray-500">{unit.unitType.name}</p>
      </div>

      <DataTable
        columns={columns}
        data={residents}
        loading={loading}
        emptyMessage="No residents in this unit."
        onRowClick={(r) => navigate(`/admin/residents/${r.id}`)}
      />

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />

      {/* Move modal */}
      <Modal
        isOpen={!!moveTarget}
        onClose={() => {
          setMoveTarget(null);
          setSelectedUnitId('');
        }}
        title="Move Resident"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Move <strong>{moveTarget?.firstName} {moveTarget?.lastName}</strong> to another unit.
          </p>
          {unitsLoading ? (
            <p className="text-sm text-gray-500">Loading units...</p>
          ) : (
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              <option value="">Select a unit...</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.unitType.name}) - {u._count.incarceratedPersons} residents
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setMoveTarget(null);
                setSelectedUnitId('');
              }}
              disabled={moveLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!selectedUnitId}
              loading={moveLoading}
            >
              Move
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
