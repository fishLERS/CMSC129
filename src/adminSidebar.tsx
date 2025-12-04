import React, { useContext, createContext, useState, type ReactNode } from "react"
import { Box, BarChart2, ClipboardList, ChevronFirst, ChevronLast, MoreVertical, LogOut, Home } from "lucide-react"
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import './sidebar.css'
import { useAuth } from './hooks/useAuth'

const AdminSidebarContext = createContext<{ expanded: boolean }>({ expanded: true })

export default function AdminSidebar({ children }: { children?: ReactNode }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = React.Children.count(children) > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  async function handleLogout() {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (e) {
      console.error('Sign out failed', e)
    }
  }

  React.useEffect(() => {
    try {
      document.documentElement.style.setProperty('--sidebar-width', expanded ? '16rem' : '4rem')
    } catch (e) {}
  }, [expanded])

  return (
    <aside className={`fixed left-0 top-0 h-screen z-20 ${expanded ? 'w-64' : 'w-16'} themed-sidebar`}>
      <nav className="h-full flex flex-col bg-slate-900 border-r border-slate-700 text-slate-200">
        <div className="p-4 pb-2 flex justify-between items-center">
          <img className={`overflow-hidden transition-all ${expanded ? "w-32" : "w-0"}`} alt="" />
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            {expanded ? <ChevronFirst /> : <ChevronLast />}
          </button>
        </div>

        <AdminSidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">
            {hasChildren ? children : (
              <>
                <AdminSidebarItem
                  icon={<Home />}
                  text="Dashboard"
                  active={location.pathname.startsWith('/admindashboard')}
                  onClick={() => navigate('/admindashboard')}
                />
                <AdminSidebarItem
                  icon={<Box />}
                  text="Inventory"
                  active={location.pathname.startsWith('/inventory')}
                  onClick={() => navigate('/inventory')}
                />
                <AdminSidebarItem
                  icon={<ClipboardList />}
                  text="Accountabilities"
                  active={location.pathname.startsWith('/admin/accountabilities')}
                  onClick={() => navigate('/admin/accountabilities')}
                />
                <AdminSidebarItem
                  icon={<BarChart2 />}
                  text="Analytics"
                  active={location.pathname.startsWith('/analytics')}
                  onClick={() => navigate('/analytics')}
                />
              </>
            )}
          </ul>
        </AdminSidebarContext.Provider>

        <div className="px-3 py-2">
          <button onClick={handleLogout} className="relative flex items-center justify-start w-full py-2 px-3 font-medium rounded-md cursor-pointer transition-colors hover:bg-slate-800 text-slate-300">
            <LogOut />
            <span className={`overflow-hidden transition-all text-left ${expanded ? "w-52 ml-3" : "w-0"}`}>
              Logout
            </span>
          </button>
        </div>

        <div className="border-t flex p-3 items-center">
          <img
            src={
              user?.photoURL
                ? user.photoURL
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.displayName || user?.email?.split('@')[0] || 'Admin'
                  )}&background=c7d2fe&color=3730a3&bold=true`
            }
            alt={user?.displayName ?? user?.email ?? 'Admin'}
            className="w-10 h-10 rounded-md"
          />
          <div className={`flex justify-between items-center overflow-hidden transition-all ${expanded ? "w-52 ml-3" : "w-0"}`}>
            <div className="leading-4">
              <h4 className="font-semibold">{user?.displayName ?? (user?.email ? user.email.split('@')[0] : 'Admin')}</h4>
              <span className="text-xs text-slate-400">{user?.email ?? ''}</span>
            </div>
            <MoreVertical size={20} />
          </div>
        </div>
      </nav>
    </aside>
  )
}

export function AdminSidebarItem({ icon, text, active, alert, onClick }: { icon: ReactNode; text: string; active?: boolean; alert?: boolean; onClick?: () => void }) {
  const { expanded } = useContext(AdminSidebarContext)
  return (
    <li
      className={`relative flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors group ${active ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
      onClick={onClick}
    >
      {icon}
      <span className={`overflow-hidden transition-all ${expanded ? "w-52 ml-3" : "w-0"}`}>
        {text}
      </span>
      {alert && (
        <div className={`absolute right-2 w-2 h-2 rounded bg-rose-500 ${expanded ? '' : 'top-2'}`} />
      )}

      {!expanded && (
        <div className={`absolute left-full rounded-md px-2 py-1 ml-6 bg-slate-800 text-slate-200 text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0`}>
          {text}
        </div>
      )}
    </li>
  )
}
