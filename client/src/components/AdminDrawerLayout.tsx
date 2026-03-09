import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { Home, Box, ClipboardList, BarChart2, Users, LogOut, PanelLeftClose, PanelLeftOpen, Fish, History } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface AdminDrawerLayoutProps {
  children: React.ReactNode;
}

const LOGOUT_TOAST_KEY = "fishlers-logout-toast";

const AdminDrawerLayout: React.FC<AdminDrawerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check if on large screen (drawer always open)
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.setItem(
        LOGOUT_TOAST_KEY,
        JSON.stringify({ type: "success", message: "Logged out successfully" })
      );
      navigate("/login", { replace: true });
    } catch (e: any) {
      console.error("Sign out failed", e);
      setLogoutError(e?.message ?? "Logout failed. Please try again.");
    }
  };

  const menuItems = [
    { icon: <Home size={20} />, text: "Dashboard", path: "/admindashboard", active: location.pathname.startsWith("/admindashboard") },
    { icon: <Box size={20} />, text: "Inventory", path: "/inventory", active: location.pathname.startsWith("/inventory") },
    { icon: <History size={20} />, text: "Request History", path: "/admin/history", active: location.pathname.startsWith("/admin/history") },
    { icon: <ClipboardList size={20} />, text: "Accountabilities", path: "/admin/accountabilities", active: location.pathname.startsWith("/admin/accountabilities") },
    { icon: <BarChart2 size={20} />, text: "Analytics", path: "/analytics", active: location.pathname.startsWith("/analytics") },
    { icon: <Users size={20} />, text: "Admin", path: "/admin/users", active: location.pathname.startsWith("/admin/users") },
  ];

  const drawerOpen = isLargeScreen || isOpen;

  return (
    <div className="drawer lg:drawer-open h-screen">
      <input 
        id="admin-drawer" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isOpen}
        onChange={handleToggle}
      />
      
      {/* Main content area */}
      <div className="drawer-content flex flex-col h-screen">
        {/* Navbar - sticky */}
        <nav className="navbar bg-primary text-primary-content shadow-md w-full h-14 min-h-14 sticky top-0 z-30">
          <label 
            htmlFor="admin-drawer" 
            aria-label="toggle sidebar" 
            className="btn btn-square btn-ghost"
          >
            {drawerOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </label>
          <div className="flex-1 px-4">
            <button
              type="button"
              onClick={() => navigate("/admindashboard")}
              className="btn btn-ghost normal-case px-3 py-1 text-left text-primary-content hover:bg-primary-content/10 focus-visible:outline-none focus-visible:ring-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-bold">FishLERS</span>
                  <span className="text-[10px] tracking-wide opacity-80">UPV CFOS IA-MSH</span>
                </div>
                <span className="p-1 rounded-full bg-primary-content/20">
                  <Fish className="w-5 h-5 text-primary-content" />
                </span>
              </div>
            </button>
          </div>
          <div className="navbar-end">
            <ThemeToggle className="text-primary-content" />
          </div>
        </nav>
        
        {/* Page content - scrollable */}
        <main className="flex-1 p-4 bg-base-200 overflow-y-auto">
          {logoutError && (
            <div className="alert alert-error mb-4">
              <span>{logoutError}</span>
              <button className="btn btn-sm" onClick={() => setLogoutError(null)}>Close</button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Sidebar drawer - fixed */}
      <div className="drawer-side max-lg:top-14 lg:h-screen z-40 overflow-visible fixed lg:sticky lg:top-0">
        <label htmlFor="admin-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="flex h-full flex-col bg-base-100 border-r border-base-300 shadow-lg is-drawer-close:w-16 is-drawer-open:w-64 transition-all duration-200 overflow-visible">
          {/* Menu items */}
          <ul className="menu w-full flex-1 gap-1 p-2 overflow-visible is-drawer-close:items-center">
            {menuItems.map((item, index) => (
              <li key={index} className="is-drawer-close:w-auto">
                <button
                  className={`flex items-center gap-3 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center is-drawer-close:px-3 ${item.active ? "active" : ""}`}
                  data-tip={item.text}
                  onClick={() => navigate(item.path)}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="is-drawer-close:hidden whitespace-nowrap">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Logout button */}
          <div className="p-2 is-drawer-close:flex is-drawer-close:justify-center">
            <button
              onClick={handleLogout}
              className="btn btn-ghost w-full justify-start gap-3 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:btn-square is-drawer-close:justify-center is-drawer-close:w-auto"
              data-tip="Logout"
            >
              <LogOut size={20} />
              <span className="is-drawer-close:hidden">Logout</span>
            </button>
          </div>

          {/* User profile section */}
          <button
            onClick={() => navigate("/admin/profile")}
            className="border-t border-base-300 flex items-center gap-3 p-3 hover:bg-base-300 transition-colors cursor-pointer is-drawer-close:justify-center is-drawer-close:tooltip is-drawer-close:tooltip-right"
            data-tip={user?.displayName ?? user?.email?.split("@")[0] ?? "Profile"}
          >
            <div className="avatar">
              <div className="w-10 rounded-lg">
                <img
                  src={
                    user?.photoURL
                      ? user.photoURL
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user?.displayName || user?.email?.split("@")[0] || "Admin"
                        )}&background=c7d2fe&color=3730a3&bold=true`
                  }
                  alt={user?.displayName ?? user?.email ?? "Admin"}
                />
              </div>
            </div>
            <div className="is-drawer-close:hidden flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">
                  {user?.displayName ?? (user?.email ? user.email.split("@")[0] : "Admin")}
                </h4>
                <span
                  className={`badge badge-sm shrink-0 ${
                    user?.isSuperAdmin ? "badge-accent" : "badge-secondary"
                  }`}
                >
                  {user?.isSuperAdmin ? "Super Admin" : "Admin"}
                </span>
              </div>
              <span className="text-xs text-base-content/60 truncate block">{user?.email ?? ""}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDrawerLayout;
