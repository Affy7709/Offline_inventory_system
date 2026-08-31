import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch, subscribeDataSync } from '../api'

const defaultPermissions = {
  Admin: 'Full system access + User management',
  Manager: 'Inventory + Stock + Allocations',
  Staff: 'Issue + Return + Scanner',
  Viewer: 'Read-only + Audit review',
}

export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  const loadRoles = () => {
    apiFetch(`${base}/index.php?action=roles`)
      .then(r => r.json())
      .then(d => setRoles(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRoles()
    const unsubscribe = subscribeDataSync(loadRoles, 3500)
    return () => unsubscribe()
  }, [base])

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Roles & access control</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium text-center">Active Users</th>
                <th className="pb-3 pr-4 font-medium">Permissions</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading roles…</td>
                </tr>
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{role.name}</td>
                    <td className="py-3 pr-4 text-slate-900 font-bold text-center">{role.user_count || 0}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {defaultPermissions[role.name] || 'Standard permissions'}
                    </td>
                    <td className="py-3">
                      <Badge tone="success">Active</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No roles found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
