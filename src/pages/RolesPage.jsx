import { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Plus, Search, X, CheckCircle2 } from 'lucide-react'

const initialRoles = [
  { name: 'Admin', users: 2, status: 'Active', permissions: 'Full system & database access' },
  { name: 'Store Manager', users: 5, status: 'Active', permissions: 'Inventory catalog + stock intake' },
  { name: 'Department User', users: 27, status: 'Active', permissions: 'Issue asset + return logs' },
  { name: 'Auditor', users: 3, status: 'Pending', permissions: 'Read-only inspection + audit export' },
]

export default function RolesPage() {
  const [roleList, setRoleList] = useState(initialRoles)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newRole, setNewRole] = useState({
    name: '',
    users: 1,
    status: 'Active',
    permissions: '',
  })
  const [feedback, setFeedback] = useState('')

  const filteredRoles = roleList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.permissions.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddRole = (e) => {
    e.preventDefault()
    if (!newRole.name || !newRole.permissions) return
    setRoleList([...roleList, newRole])
    setIsAddModalOpen(false)
    setFeedback(`Role "${newRole.name}" created successfully!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Roles & Access Control</h2>
          <p className="text-xs text-slate-500">Manage user access policies, role permissions, and administrative privileges</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          <Plus size={16} /> Add Role
        </button>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white transition w-full sm:w-80">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search roles or permissions..."
            className="w-full bg-transparent outline-none text-slate-800 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Role Name</th>
                <th className="px-4 py-3 font-semibold">Assigned Users</th>
                <th className="px-4 py-3 font-semibold">Permissions Scope</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoles.map((role) => (
                <tr key={role.name} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-bold text-slate-900">{role.name}</td>
                  <td className="px-4 py-3 text-slate-700 font-mono">{role.users} active</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{role.permissions}</td>
                  <td className="px-4 py-3">
                    <Badge tone={role.status === 'Active' ? 'success' : 'warning'}>{role.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Role Cards */}
        <div className="grid gap-2.5 sm:hidden">
          {filteredRoles.map((role) => (
            <div key={role.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{role.name}</span>
                <Badge tone={role.status === 'Active' ? 'success' : 'warning'}>{role.status}</Badge>
              </div>
              <div className="text-slate-600">{role.permissions}</div>
              <div className="pt-1 border-t border-slate-200 text-slate-500 font-mono text-[11px]">
                {role.users} Assigned Active Users
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD ROLE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddRole} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create Access Role</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-sm space-y-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Lead"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Permissions Scope</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manage intake, scan assets"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newRole.permissions}
                  onChange={(e) => setNewRole({ ...newRole, permissions: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Initial Users</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 font-bold"
                  value={newRole.users}
                  onChange={(e) => setNewRole({ ...newRole, users: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
