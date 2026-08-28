import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package2,
  Tags,
  ScanLine,
  ArrowLeftRight,
  Boxes,
  Users,
  FileBarChart2,
  ShieldCheck,
  ClipboardList,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { company, navigation } from "../../data/mockData";
import { logoutUser } from "../../api";

const iconMap = {
  LayoutDashboard,
  Package2,
  Tags,
  ScanLine,
  ArrowLeftRight,
  Boxes,
  Users,
  FileBarChart2,
  ShieldCheck,
  ClipboardList,
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out md:static md:translate-x-0
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          ${collapsed ? "md:w-20" : "md:w-72"} w-72 max-w-[85vw]`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-sm font-bold text-emerald-300">
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
              className="rounded-lg border border-slate-700 p-1.5 text-slate-300 md:hidden hover:bg-slate-800 transition active:scale-95"
            >
              <X size={18} />
            </button>
            {/* Collapse toggle button for Desktop screen */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden rounded-lg border border-slate-700 p-1 text-slate-300 md:block hover:bg-slate-800 transition"
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = iconMap[item.icon] || Package2;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition active:scale-98 ${
                    isActive
                      ? "bg-white/10 text-white font-bold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
                title={item.name}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} />
                {!collapsed || mobileOpen ? (
                  <span>{item.name}</span>
                ) : (
                  <span className="md:hidden">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition active:scale-98"
            title="Sign Out"
          >
            <LogOut size={20} />
            {(!collapsed || mobileOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

