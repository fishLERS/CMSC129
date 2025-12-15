import { MoreVertical, ChevronLast, ChevronFirst, Home, FilePlus, ClipboardList, MapPin, User, LogOut } from "lucide-react"
import React, { useContext, createContext, useState, type ReactNode } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import './sidebar.css'
import { useAuth } from './hooks/useAuth'

const SidebarContext = createContext<{ expanded: boolean }>({ expanded: true })

export default function Sidebar({ children }: { children?: ReactNode }) {
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
    // expose the sidebar width to the rest of the app via CSS variable
    try {
      document.documentElement.style.setProperty('--sidebar-width', expanded ? '16rem' : '4rem')
    } catch (e) {
      // ignore (server-side rendering / non-browser)
    }
  }, [expanded])
  
  return (
    <aside className={`fixed left-0 top-0 h-screen bg-main-1 z-20 opacity-95 ${expanded ? 'w-64' : 'w-16'}`}>
      <nav className="h-full flex flex-col text-slate-200">
        <div className="p-4 pb-2 flex justify-between items-center">
          <img
            // src="https://img.logoipsum.com/243.svg"
            className={`overflow-hidden transition-all ${
              expanded ? "w-32" : "w-0"
            }`}
            alt=""
          />
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            {expanded ? <ChevronFirst /> : <ChevronLast />}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">
            {hasChildren ? children : (
              <>
                <SidebarItem
                  icon={<Home />}
                  text="Dashboard"
                  active={location.pathname === '/' || location.pathname.startsWith('/student')}
                  onClick={() => navigate('/student')}
                />
                <SidebarItem
                  icon={<FilePlus />}
                  text="Request Form"
                  active={location.pathname.startsWith('/request') || location.pathname.startsWith('/requestpage')}
                  onClick={() => navigate('/requestpage')}
                />
                <SidebarItem
                  icon={<ClipboardList />}
                  text="Accountabilities"
                  active={location.pathname.startsWith('/accountabilities')}
                  onClick={() => navigate('/accountabilities')}
                />
                <SidebarItem
                  icon={<MapPin />}
                  text="Tracking"
                  active={location.pathname.startsWith('/tracking')}
                  onClick={() => navigate('/tracking')}
                />
                {/* Logout moved to footer area so it's visible above the user info */}
              </>
            )}
          </ul>
        </SidebarContext.Provider>

        {/* logout button placed directly above the user info so it's visible when collapsed or expanded */}
        <div className="px-3 py-2">
          <button onClick={handleLogout} className="relative flex items-center justify-start w-full py-2 px-3 font-medium rounded-md cursor-pointer transition-colors hover:bg-slate-800 text-slate-300">
            <LogOut />
            <span className={`overflow-hidden transition-all text-left ${expanded ? "w-52 ml-3" : "w-0"}`}>
              Logout
            </span>
          </button>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className={`border-t flex p-3 items-center w-full text-left bg-transparent border-0 hover:bg-slate-800 hover:outline-2 hover:outline-purple-500 rounded-md cursor-pointer transition-colors`}
          title="View profile"
        >
          <img
            src={
              user?.photoURL
                ? user.photoURL
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.displayName || user?.email?.split('@')[0] || 'User'
                  )}&background=c7d2fe&color=3730a3&bold=true`
            }
            alt={user?.displayName ?? user?.email ?? 'User'}
            className="w-10 h-10 rounded-md"
          />
          <div
            className={`
              flex justify-between items-center
              overflow-hidden transition-all ${expanded ? "w-52 ml-3" : "w-0"}
          `}
          >
            <div className="leading-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{user?.displayName ?? (user?.email ? user.email.split('@')[0] : 'User')}</h4>
                <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Student</span>
              </div>
              <span className="text-xs text-slate-400">{user?.email ?? ''}</span>
            </div>
            <MoreVertical size={20} />
          </div>
        </button>
      </nav>
    </aside>
  )
}

export function SidebarItem({ icon, text, active, alert, onClick }: { icon: ReactNode; text: string; active?: boolean; alert?: boolean; onClick?: () => void }) {
  const { expanded } = useContext(SidebarContext)
  
  return (
    <li
    className={`relative flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors group ${active ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
    onClick={onClick}
    >
      {icon}
      <span
        className={`overflow-hidden transition-all ${
          expanded ? "w-52 ml-3" : "w-0"
        }`}
      >
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
