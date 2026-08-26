import { useState } from 'react'
import { Bell, Search, SlidersHorizontal, Plus, Menu, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ onMenuClick }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    navigate(`/inventory?q=${encodeURIComponent(searchTerm.trim())}`)
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 relative">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden hover:bg-slate-50"
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Operations</p>
          <h1 className="mt-0.5 text-lg font-semibold text-slate-900 md:text-xl">Inventory Overview</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Working Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 md:flex focus-within:border-slate-900 focus-within:bg-white transition">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            className="bg-transparent outline-none text-slate-900 placeholder-slate-400 text-xs w-48 lg:w-64"
            placeholder="Search assets, SKU or barcode…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </form>

        <button 
          onClick={() => navigate('/inventory')} 
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition" 
          title="Catalog Filters"
        >
          <SlidersHorizontal size={18} />
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 relative transition"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in text-xs">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
                <span>System Alerts</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                  <p className="font-semibold text-slate-900">System Connected</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Database & server operational</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-800">
                  <p className="font-semibold">Stock Monitoring</p>
                  <p className="text-amber-700 text-[11px] mt-0.5">Check low stock alerts in Dashboard</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Asset Button */}
        <button 
          onClick={() => navigate('/inventory')}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-soft"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Asset</span>
        </button>

        {/* User profile */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-sm">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-soft">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-800 leading-tight text-xs">{user?.username || 'Admin'}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role_name || 'Admin'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
