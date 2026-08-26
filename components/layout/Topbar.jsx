import { Bell, Search, SlidersHorizontal, Plus, Menu } from 'lucide-react'

export default function Topbar({ onMenuClick }) {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Operations</p>
          <h1 className="mt-0.5 text-lg font-semibold text-slate-900 md:text-2xl">Inventory Overview</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
          <Search size={16} />
          <span>Search assets, SKU or location</span>
        </div>
        <button className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <SlidersHorizontal size={18} />
        </button>
        <button className="rounded-xl border border-slate-200 p-2 text-slate-600 relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-sm">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-800 leading-tight">{user?.username || 'Admin'}</div>
            <div className="text-[11px] text-slate-400">{user?.role_name || 'Administrator'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
