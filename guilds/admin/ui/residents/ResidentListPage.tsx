import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminApi } from '../hooks/useAdminApi';
import { usePagination } from '../hooks/usePagination';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { FacilitySelector } from '../components/FacilitySelector';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { FilterBar } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  status: string;
  riskLevel: string;
  housingUnit: { id: string; name: string } | null;
  facility: { id: string; name: string } | null;
}

interface HousingUnit {
  id: string;
  name: string;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function ResidentListPage() {
  const navigate = useNavigate();
  const { get } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [housingUnitFilter, setHousingUnitFilter] = useState('all');
  const [housingUnits, setHousingUnits] = useState<HousingUnit[]>([]);

  const fetchHousingUnits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/facilities/housing-units?${params}`);
      setHousingUnits(res.data || []);
    } catch {
      setHousingUnits([]);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchHousingUnits();
  }, [fetchHousingUnits]);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (riskFilter !== 'all') params.set('riskLevel', riskFilter);
      if (housingUnitFilter !== 'all') params.set('housingUnitId', housingUnitFilter);
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/residents?${params}`);
      setResidents(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [get, page, pageSize, search, statusFilter, riskFilter, housingUnitFilter, facilityId, setTotalPages]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

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
      key: 'housingUnit',
      header: 'Housing Unit',
      render: (r: Resident) => r.housingUnit?.name || '-',
    },
    {
      key: 'riskLevel',
      header: 'Risk Level',
      render: (r: Resident) => (
        <StatusBadge status={r.riskLevel} colorMap={RISK_LEVEL_COLORS} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Resident) => <StatusBadge status={r.status} />,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: () => 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <FilterBar>
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="transferred">Transferred</option>
          <option value="released">Released</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={housingUnitFilter}
          onChange={(e) => setHousingUnitFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Housing Units</option>
          {housingUnits.map((hu) => (
            <option key={hu.id} value={hu.id}>{hu.name}</option>
          ))}
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={residents}
        loading={loading}
        emptyMessage="No residents found."
        onRowClick={(r) => navigate(`/admin/residents/${r.id}`)}
      />

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
    </div>
  );
}
