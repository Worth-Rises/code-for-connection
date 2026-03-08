import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { Button } from '@/components/ui/button';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  status: string;
  admittedAt: string;
  releasedAt: string | null;
  createdAt: string;
  facilityId: string;
  agencyId: string;
  housingUnitId: string;
  facility: { id: string; name: string };
  housingUnit: { id: string; name: string; unitType: { id: string; name: string } | null };
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  transferred: 'bg-yellow-100 text-yellow-800',
  released: 'bg-blue-100 text-blue-800',
  deactivated: 'bg-red-100 text-red-800',
};

export default function ResidentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/admin/residents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setResident(data.data);
        else setError(data.error?.message ?? 'Failed to load resident');
      })
      .catch(() => setError('Failed to load resident'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!resident) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/admin/residents" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Residents
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {resident.firstName} {resident.lastName}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[resident.status] ?? 'bg-gray-100 text-gray-800'}`}>
              {resident.status}
            </span>
            {resident.externalId && (
              <span className="text-sm text-gray-500">ID: {resident.externalId}</span>
            )}
          </div>
        </div>

        {/* Action buttons — placeholders for TICKET-01 and TICKET-02 */}
        <div className="flex gap-2">
          {resident.status === 'active' && (
            <>
              <Button variant="outline" disabled>Release</Button>
              <Button variant="destructive" disabled>Deactivate</Button>
            </>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Facility</dt>
              <dd className="text-sm font-medium text-gray-900">{resident.facility.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Housing Unit</dt>
              <dd className="text-sm font-medium text-gray-900">{resident.housingUnit.name}</dd>
            </div>
            {resident.housingUnit.unitType && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Unit Type</dt>
                <dd className="text-sm font-medium text-gray-900">{resident.housingUnit.unitType.name}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Admitted</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(resident.admittedAt).toLocaleDateString()}
              </dd>
            </div>
            {resident.releasedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Released</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(resident.releasedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* PIN section — TICKET-03 will add the Reset PIN modal here */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">PIN</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">PIN: ••••</span>
            <Button variant="outline" disabled>Reset PIN</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
