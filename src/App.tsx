// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/equipment/Dashboard";
import RequestPage from "./pages/RequestPage";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/NavBar"; // ⬅️ new

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Top navigation bar */}
      <Navbar />

      {/* main content area */}
      <main className="flex-1 p-4">
        <Routes>
          {/* default route → dashboard (protected) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* auth routes (public) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* inventory / dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* request page */}
          <Route
            path="/requestpage"
            element={
              <ProtectedRoute>
                <RequestPage />
              </ProtectedRoute>
            }
          />

          {/* catch-all → redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
