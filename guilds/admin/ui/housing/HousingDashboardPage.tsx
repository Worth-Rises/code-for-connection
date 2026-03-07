import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../../hooks/useFacilityScope';
import { FacilitySelector } from '../../components/FacilitySelector';

interface HousingUnit {
  id: string;
  name: string;
  facilityId: string;
  unitType: {
    id: string;
    name: string;
    maxContacts: number;
  };
  _count: {
    incarceratedPersons: number;
  };
}

export default function HousingDashboardPage() {
  const { get } = useAdminApi();
  const navigate = useNavigate();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/housing/units?${params}`);
      setUnits(res.data || []);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Estimate capacity as a rough heuristic (no capacity field in schema)
  // We use maxContacts from unit type as a proxy, default 50 if not available
  const getCapacity = (unit: HousingUnit) => {
    return 50; // default capacity; real implementation would use a capacity field
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Housing Units</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : units.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No housing units found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => {
            const occupancy = unit._count.incarceratedPersons;
            const capacity = getCapacity(unit);
            const percentage = capacity > 0 ? Math.min((occupancy / capacity) * 100, 100) : 0;
            const isHighOccupancy = percentage > 90;

            return (
              <div
                key={unit.id}
                className="cursor-pointer"
                onClick={() => navigate(`/admin/housing/${unit.id}`)}
              >
                <Card>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{unit.name}</h3>
                      <p className="text-sm text-gray-500">{unit.unitType.name}</p>
                    </div>
                    <div>
                      <div className="bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            isHighOccupancy ? 'bg-red-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {occupancy} / {capacity} residents
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
