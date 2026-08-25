import { NavLink } from "react-router-dom";
import * as Icons from "lucide-react";
import { company, navigation } from "../../data/mockData";

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-all duration-200 md:static md:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        ${collapsed ? "md:w-20" : "md:w-72"} w-64`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/20 text-sm font-bold text-accent-100">
            {company.short}
          </div>
          {(!collapsed || mobileOpen) && (
            <div>
              <div className="text-sm font-semibold text-white">
                {company.name}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Inventory Suite
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Close button for Mobile screen */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg border border-slate-700 p-1 text-slate-300 md:hidden"
          >
            <Icons.X size={16} />
          </button>
          {/* Collapse toggle button for Desktop screen */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg border border-slate-700 p-1 text-slate-300 md:block"
          >
            {collapsed ? (
              <Icons.ChevronRight size={16} />
            ) : (
              <Icons.ChevronLeft size={16} />
            )}
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = Icons[item.icon] || Icons.Package2;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
              title={item.name}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {!collapsed || mobileOpen ? (
                <span>{item.name}</span>
              ) : (
                <span className="md:hidden">{item.name}</span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
