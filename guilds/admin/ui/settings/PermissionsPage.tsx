import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal } from '@openconnect/ui';
import { useAdminApi } from '../../hooks/useAdminApi';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

const ALL_PERMISSIONS = [
  'manage_residents',
  'manage_contacts',
  'manage_visitors',
  'manage_housing',
  'monitor_voice',
  'monitor_video',
  'monitor_messaging',
  'manage_keyword_alerts',
  'manage_permissions',
  'view_audit_log',
  'export_reports',
] as const;

type PermissionType = (typeof ALL_PERMISSIONS)[number];

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions: PermissionType[];
}

function formatPermission(p: string): string {
  return p
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function PermissionsPage() {
  const { get, patch } = useAdminApi();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<PermissionType>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/settings/permissions');
      setAdmins(res.data || []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const openEdit = (admin: AdminUser) => {
    setEditAdmin(admin);
    setSelectedPermissions(new Set(admin.permissions));
  };

  const togglePermission = (perm: PermissionType) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      await patch(`/settings/permissions/${editAdmin.id}`, {
        permissions: Array.from(selectedPermissions),
      });
      setEditAdmin(null);
      fetchAdmins();
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (a: AdminUser) => `${a.firstName} ${a.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
      render: (a: AdminUser) => a.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (a: AdminUser) => <StatusBadge status={a.role} />,
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (a: AdminUser) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            a.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {a.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (a: AdminUser) => (
        <span className="text-sm text-gray-600">{a.permissions.length}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a: AdminUser) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => openEdit(a)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Permissions</h1>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        loading={loading}
        emptyMessage="No admin users found."
      />

      <Modal
        isOpen={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        title="Edit Permissions"
        size="md"
      >
        {editAdmin && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Admin</p>
              <p className="font-medium text-gray-900">
                {editAdmin.firstName} {editAdmin.lastName}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Role: <StatusBadge status={editAdmin.role} />
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.has(perm)}
                      onChange={() => togglePermission(perm)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {formatPermission(perm)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setEditAdmin(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
