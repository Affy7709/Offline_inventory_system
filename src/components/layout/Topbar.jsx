import { Bell, Search, SlidersHorizontal, Plus, Menu } from 'lucide-react'

export default function Topbar({ onMenuClick }) {
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
        <button className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <Bell size={18} />
        </button>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 p-2 md:px-4 md:py-2 text-sm font-medium text-white">
          <Plus size={16} />
          <span className="hidden sm:inline">New Asset</span>
        </button>
      </div>
    </header>
  )
}
