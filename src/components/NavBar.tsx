import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Navbar: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setRole(userDoc.data()?.role || null);
      } else {
        setRole(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      nav("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4">
      {/* Left side - brand */}
      <div className="flex-1">
        <span className="text-xl font-bold tracking-wide">FishLERS</span>
      </div>

      {/* Right side - nav links */}
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1 gap-2 items-center">
          {role === "admin" && (
            <>
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-primary" : "text-base-content"
                  }
                >
                  Inventory
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admindashboard"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-primary" : "text-base-content"
                  }
                >
                  Admin
                </NavLink>
              </li>
            </>
          )}

          {role === "student" && (
            <li>
              <NavLink
                to="/requestpage"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-primary" : "text-base-content"
                }
              >
                Request Form
              </NavLink>
            </li>
          )}

          {role && (
            <li>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-error ml-2"
              >
                Logout
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
