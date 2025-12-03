import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/equipment/Dashboard";
import RequestPage from "./pages/requestform/RequestPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/NavBar";

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <Navbar />

      <main className="flex-1 p-4">
        <Routes>
          {/* Default route → redirect based on role in localStorage */}
          <Route
            path="/"
            element={
              (() => {
                const role = localStorage.getItem("userRole");
                if (role === "admin") return <Navigate to="/dashboard" replace />;
                if (role === "student") return <Navigate to="/requestpage" replace />;
                return <Navigate to="/login" replace />;
              })()
            }
          />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Equipment dashboard → admin-only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Student request page → authenticated students */}
          <Route
            path="/requestpage"
            element={
              <ProtectedRoute>
                <RequestPage />
              </ProtectedRoute>
            }
          />

          {/* Admin requests dashboard → admin-only */}
          <Route
            path="/admindashboard"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → redirect to default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
