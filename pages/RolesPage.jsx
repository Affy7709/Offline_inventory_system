import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

// Hardcoded permission descriptions per role name
const ROLE_PERMISSIONS = {
  'Admin':   'Full access',
  'Manager': 'Inventory + stock',
  'Staff':   'Issue + return',
  'Viewer':  'Read-only + audit',
};

export default function RolesPage() {
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getApiBase();
    apiFetch(`${base}/index.php?action=roles`)
      .then(r => r.json())
      .then(d => setRoles(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  const totalUsers = roles.reduce((sum, r) => sum + Number(r.user_count), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Roles & Access Control</h1>
        <p className="text-sm text-text-secondary mt-1">Manage user roles and system permissions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 stagger">
        <div className="card p-4 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>shield</span>
          </div>
          <div className="text-2xl font-bold text-primary">{roles.length}</div>
          <div className="text-xs text-text-tertiary mt-0.5">Total Roles</div>
        </div>
        <div className="card p-4 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>group</span>
          </div>
          <div className="text-2xl font-bold text-primary">{totalUsers}</div>
          <div className="text-xs text-text-tertiary mt-0.5">Active Users</div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '400px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Users</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.length > 0 ? roles.map(role => (
                <tr key={role.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>shield</span>
                      </div>
                      <span className="font-semibold text-sm text-text-primary">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-text-primary">{role.user_count}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {ROLE_PERMISSIONS[role.name] || 'Custom access'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">shield</span>
                    <p className="text-text-secondary font-medium">No roles found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
