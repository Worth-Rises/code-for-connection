import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { usePagination } from '../hooks/usePagination';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { FacilitySelector } from '../components/FacilitySelector';
import { Pagination } from '../components/Pagination';

interface UserRecord {
  type: 'incarcerated' | 'family';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    status?: string;
    facility?: { name: string };
    housingUnit?: { name: string };
  };
}

export default function UsersPage() {
  const { get } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const { page, pageSize, totalPages, setTotalPages, nextPage, prevPage } = usePagination();
  const [userType, setUserType] = useState<'incarcerated' | 'family'>('incarcerated');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: userType,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (facilityId) params.set('facilityId', facilityId);
      const res = await get(`/users?${params}`);
      setUsers(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [get, userType, page, pageSize, debouncedSearch, facilityId, setTotalPages]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setUserType('incarcerated')}
            className={`px-4 py-2 text-sm font-medium ${
              userType === 'incarcerated' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Incarcerated
          </button>
          <button
            onClick={() => setUserType('family')}
            className={`px-4 py-2 text-sm font-medium ${
              userType === 'family' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Family
          </button>
        </div>
      </div>

      <Card padding="none">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                {userType === 'family' ? 'Email' : 'Housing Unit'}
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Facility</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No users found.</td>
              </tr>
            ) : (
              users.map((record) => (
                <tr key={record.user.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{record.user.firstName} {record.user.lastName}</td>
                  <td className="px-4 py-3">{userType === 'family' ? (record.user.email || '-') : (record.user.housingUnit?.name || '-')}</td>
                  <td className="px-4 py-3">{record.user.facility?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUser(record)}>
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Pagination page={page} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />

      {/* User Detail Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">{selectedUser.user.firstName} {selectedUser.user.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="text-gray-900 capitalize">{selectedUser.type}</p>
              </div>
              {selectedUser.user.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{selectedUser.user.email}</p>
                </div>
              )}
              {selectedUser.user.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-gray-900">{selectedUser.user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Facility</p>
                <p className="text-gray-900">{selectedUser.user.facility?.name || '-'}</p>
              </div>
              {selectedUser.user.housingUnit && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Housing Unit</p>
                  <p className="text-gray-900">{selectedUser.user.housingUnit.name}</p>
                </div>
              )}
              {selectedUser.user.status && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-gray-900 capitalize">{selectedUser.user.status}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedUser(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
