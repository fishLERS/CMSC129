import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/equipment/Dashboard";
import RequestPage from "./pages/requestform/RequestPage";
import TrackingPage from "./pages/tracking/TrackingPage";
import Accountabilities from "./pages/accountabilities/Accountabilities";
import HomeStudent from "./pages/home-student";
import AdminDashboard from "./pages/admin/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <main className="flex-1 p-4">
        <Routes>
          {/* Default route → redirect based on role in localStorage */}
          <Route
            path="/"
            element={
              (() => {
                const role = localStorage.getItem("userRole");
                if (role === "admin") return <Navigate to="/admindashboard" replace />;
                if (role === "student") return <Navigate to="/student" replace />;
                return <Navigate to="/login" replace />;
              })()
            }
          />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Admin equipment dashboard → admin-only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Student homepage (separate) → authenticated students only; admins are forbidden */}
          <Route
            path="/student"
            element={
              <ProtectedRoute forbidAdmin>
                <HomeStudent />
              </ProtectedRoute>
            }
          />

          {/* keep old requestpage route as alias for student homepage */}
          <Route
            path="/requestpage"
            element={
              <ProtectedRoute forbidAdmin>
                <RequestPage />
              </ProtectedRoute>
            }
          />

          {/* Tracking page for students */}
          <Route
            path="/tracking"
            element={
              <ProtectedRoute forbidAdmin>
                <TrackingPage />
              </ProtectedRoute>
            }
          />

          {/* Accountabilities (student) */}
          <Route
            path="/accountabilities"
            element={
              <ProtectedRoute forbidAdmin>
                <Accountabilities />
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
