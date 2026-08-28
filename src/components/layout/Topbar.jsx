import { useState } from 'react'
import { Bell, Search, SlidersHorizontal, Plus, Menu, X, CheckCircle2, ShieldCheck, UserCheck, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '../../context/InventoryContext'
import { logoutUser } from '../../api'

export default function Topbar({ onMenuClick, onNewAssetClick }) {
  const { currentUser, updateCurrentUser } = useInventory()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [adminIdInput, setAdminIdInput] = useState(currentUser.id)
  const [adminNameInput, setAdminNameInput] = useState(currentUser.name)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleUserSave = (e) => {
    e.preventDefault()
    updateCurrentUser({
      id: adminIdInput.trim() || 'ADM-101',
      name: adminNameInput.trim() || 'Anita Shah',
    })
    setShowUserModal(false)
  }

  const notifications = [
    { id: 1, title: 'Low Stock Alert', desc: 'Dell Latitude 5420 is below 12 units', time: '10m ago' },
    { id: 2, title: 'Asset Issued', desc: 'Zebra Scanner checked out by Field Ops', time: '1h ago' },
    { id: 3, title: 'Database Connected', desc: 'PostgreSQL inventory backend live on port 5000', time: 'Just now' },
  ]

  return (
    <header className="relative flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 md:px-6 shadow-sm z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Operations</p>
          <h1 className="mt-0.5 text-lg font-bold text-slate-900 md:text-xl">Northstar AssetOps</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Global Search */}
        <div className="relative hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white md:flex">
          <Search size={16} />
          <input
            type="text"
            className="w-52 bg-transparent outline-none text-slate-800 text-xs placeholder:text-slate-400"
            placeholder="Search assets, SKU, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
          />
        </div>

        {/* Filter Quick Trigger */}
        <button
          onClick={() => navigate('/inventory')}
          title="Open Filter Drawer"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <SlidersHorizontal size={18} />
        </button>

        {/* Notifications Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Notifications</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl bg-slate-50 p-2.5 text-left border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logged-in Admin ID Badge */}
        <div className="relative">
          <button
            onClick={() => setShowUserModal(!showUserModal)}
            title="Logged In Admin Profile"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left hover:bg-slate-100 transition shadow-2xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
              {currentUser.id.slice(-2)}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-slate-900">{currentUser.id}</span>
                <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">ADMIN</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[100px]">{currentUser.name}</p>
            </div>
          </button>

          {showUserModal && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Logged-in Operator</span>
                </div>
                <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleUserSave} className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Issued By / Admin ID</label>
                  <input
                    type="text"
                    required
                    value={adminIdInput}
                    onChange={(e) => setAdminIdInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-slate-900 outline-none"
                    placeholder="e.g. ADM-101"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Admin Name</label>
                  <input
                    type="text"
                    required
                    value={adminNameInput}
                    onChange={(e) => setAdminNameInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 font-medium text-slate-900 outline-none"
                    placeholder="e.g. Anita Shah"
                  />
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
                  All asset issues and returns will automatically record <strong>Issued By: {adminIdInput}</strong>.
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={async () => {
                      setShowUserModal(false);
                      await logoutUser();
                      navigate('/login');
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 font-bold text-white hover:bg-slate-800"
                    >
                      Set Active ID
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* New Asset Button */}
        <button
          onClick={onNewAssetClick}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 p-2 md:px-4 md:py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Asset</span>
        </button>
      </div>
    </header>
  )
}

