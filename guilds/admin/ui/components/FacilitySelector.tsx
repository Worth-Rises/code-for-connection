import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { useAdminApi } from '../hooks/useAdminApi';

interface FacilitySelectorProps {
  value: string;
  onChange: (id: string) => void;
}

interface Facility {
  id: string;
  name: string;
}

export const FacilitySelector: React.FC<FacilitySelectorProps> = ({ value, onChange }) => {
  const { user } = useAuth();
  const { get } = useAdminApi();
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    if (user?.role !== 'agency_admin') return;
    get('/facilities')
      .then((res) => setFacilities(res.data || []))
      .catch(() => setFacilities([]));
  }, [get, user?.role]);

  if (user?.role !== 'agency_admin') return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">All Facilities</option>
      {facilities.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
};
