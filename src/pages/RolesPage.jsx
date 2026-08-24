import { Badge } from '../components/ui/Badge'

const roles = [
  { name: 'Admin', users: 2, status: 'Active', permissions: 'Full access' },
  { name: 'Store Manager', users: 5, status: 'Active', permissions: 'Inventory + stock' },
  { name: 'Department User', users: 27, status: 'Active', permissions: 'Issue + return' },
  { name: 'Auditor', users: 3, status: 'Pending', permissions: 'Read-only + audit' },
]

export default function RolesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Roles & access control</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Users</th>
                <th className="pb-3 pr-4 font-medium">Permissions</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.name} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-800">{role.name}</td>
                  <td className="py-3 pr-4 text-slate-700">{role.users}</td>
                  <td className="py-3 pr-4 text-slate-600">{role.permissions}</td>
                  <td className="py-3"><Badge tone={role.status === 'Active' ? 'success' : 'warning'}>{role.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
