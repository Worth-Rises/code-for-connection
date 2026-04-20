import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  status: string;
  admittedAt: string;
  facility: { id: string; name: string };
  housingUnit: { id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  transferred: 'bg-yellow-100 text-yellow-800',
  released: 'bg-blue-100 text-blue-800',
  deactivated: 'bg-red-100 text-red-800',
};

export default function ResidentListPage() {
  const { token } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/admin/residents?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setResidents(data.data);
        else setError(data.error?.message ?? 'Failed to load');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load residents');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
        <p className="text-gray-600">Manage incarcerated persons</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="transferred">Transferred</option>
          <option value="released">Released</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : residents.length === 0 ? (
        <p className="text-gray-500">No residents found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Housing Unit</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {residents.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {r.lastName}, {r.firstName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.externalId ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.facility.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.housingUnit.name}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/admin/residents/${r.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
