// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminHome from "./pages/home-admin";
import LoginStudent from "./pages/LoginStudent";
import LoginAdmin from "./pages/LoginAdmin";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./sidebar"; // change/remove if your file name is different

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-base-200">

      {/* main content area */}
      <main className="flex-1 p-4">
        <Routes>
          {/* default route → dashboard (protected) */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* auth routes (public) */}
          <Route path="/login" element={<Login />} />
          <Route path="/login/student" element={<LoginStudent />} />
          <Route path="/login/admin" element={<LoginAdmin />} />
          <Route path="/signup" element={<Signup />} />

          {/* main lab reservation dashboard (protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* admin area (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminHome />
              </ProtectedRoute>
            }
          />

          {/* example placeholders you can create later */}
          {/* 
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <EquipmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedRoute>
                <ReservationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          */}

          {/* catch-all → redirect to dashboard or login */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
