import { useState } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package2, ScanLine, ArrowLeftRight, Boxes } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { InventoryProvider } from '../../context/InventoryContext'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const mobileNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package2 },
    { name: 'Scan / QR', path: '/qr', icon: ScanLine, isCenter: true },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Stock', path: '/stock', icon: Boxes },
  ]

  return (
    <InventoryProvider>
      <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
        {/* Sidebar Navigation */}
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Topbar
            onMenuClick={() => setMobileOpen(true)}
            onNewAssetClick={() => navigate('/inventory?new=true')}
          />

          {/* Main Content with bottom padding on mobile for the bottom nav bar */}
          <main className="flex-1 overflow-y-auto bg-slate-50/70 pb-20 md:pb-6">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation Bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 py-1.5 flex justify-around items-center">
            {mobileNavItems.map((item) => {
              const Icon = item.icon

              if (item.isCenter) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center -mt-5 p-2 rounded-2xl transition shadow-lg active:scale-90 ${
                        isActive
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : 'bg-slate-900 text-white'
                      }`
                    }
                  >
                    <Icon size={22} />
                    <span className="text-[9px] font-extrabold mt-0.5 tracking-wider uppercase">Scan</span>
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition active:scale-95 ${
                      isActive
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-400 hover:text-slate-700'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="mt-0.5">{item.name}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </InventoryProvider>
  )
}


