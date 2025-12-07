import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { Home, FilePlus, ClipboardList, MapPin, LogOut, User, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface DrawerLayoutProps {
  children: React.ReactNode;
}

const DrawerLayout: React.FC<DrawerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
      navigate("/login");
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  const menuItems = [
    { icon: <Home size={20} />, text: "Dashboard", path: "/student", active: location.pathname === "/" || location.pathname.startsWith("/student") },
    { icon: <FilePlus size={20} />, text: "Request Form", path: "/requestpage", active: location.pathname.startsWith("/request") || location.pathname.startsWith("/requestpage") },
    { icon: <ClipboardList size={20} />, text: "Accountabilities", path: "/accountabilities", active: location.pathname.startsWith("/accountabilities") },
    { icon: <MapPin size={20} />, text: "Tracking", path: "/tracking", active: location.pathname.startsWith("/tracking") },
  ];

  const drawerOpen = isLargeScreen || isOpen;

  return (
    <div className="drawer lg:drawer-open">
      <input 
        id="student-drawer" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isOpen}
        onChange={handleToggle}
      />
      
      {/* Main content area */}
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <nav className="navbar bg-primary text-primary-content shadow-md w-full h-14 min-h-14">
          <label 
            htmlFor="student-drawer" 
            aria-label="toggle sidebar" 
            className="btn btn-square btn-ghost"
          >
            {drawerOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </label>
          <div className="flex-1 px-4">
            <span className="text-xl font-bold tracking-wide">FishLERS</span>
          </div>
        </nav>
        
        {/* Page content */}
        <main className="flex-1 p-4 bg-base-200">
          {children}
        </main>
      </div>

      {/* Sidebar drawer */}
      <div className="drawer-side max-lg:top-14 lg:h-full z-20 overflow-visible">
        <label htmlFor="student-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="flex h-full flex-col bg-base-200 border-r border-base-300 is-drawer-close:w-16 is-drawer-open:w-64 transition-all duration-200 overflow-visible">
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
            onClick={() => navigate("/profile")}
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
                          user?.displayName || user?.email?.split("@")[0] || "User"
                        )}&background=c7d2fe&color=3730a3&bold=true`
                  }
                  alt={user?.displayName ?? user?.email ?? "User"}
                />
              </div>
            </div>
            <div className="is-drawer-close:hidden flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">
                  {user?.displayName ?? (user?.email ? user.email.split("@")[0] : "User")}
                </h4>
                <span className="badge badge-primary badge-sm shrink-0">Student</span>
              </div>
              <span className="text-xs text-base-content/60 truncate block">{user?.email ?? ""}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawerLayout;
