// src/components/Navbar.tsx
import React from "react";
import { NavLink } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4">
      {/* Left side - brand */}
      <div className="flex-1">
        <span className="text-xl font-bold tracking-wide">FishLERS</span>
      </div>

      {/* Right side - nav links */}
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1 gap-2">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold text-primary"
                  : "text-base-content"
              }
            >
              Inventory
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/requestpage"
              className={({ isActive }) =>
                isActive
                  ? "font-semibold text-primary"
                  : "text-base-content"
              }
            >
              Request Form
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
