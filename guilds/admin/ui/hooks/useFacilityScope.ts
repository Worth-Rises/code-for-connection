import { useState } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';

export function useFacilityScope() {
  const { user } = useAuth();
  const isAgencyAdmin = user?.role === 'agency_admin';
  const [selectedFacilityId, setSelectedFacilityId] = useState('');

  const facilityId = isAgencyAdmin ? selectedFacilityId : (user?.facilityId || '');

  const setFacilityId = (id: string) => {
    if (isAgencyAdmin) {
      setSelectedFacilityId(id);
    }
  };

  return { facilityId, setFacilityId, isAgencyAdmin };
}
