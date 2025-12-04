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
import AdminAccountabilities from "./pages/admin/AdminAccountabilities";
import ProfileStudent from "./pages/profile-student";
import ProfileAdmin from "./pages/admin/profile-admin";
import AdminUsers from "./pages/admin/AdminUsers";
import Analytics from "./pages/admin/Analytics";

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

          {/* Admin equipment inventory (renamed from /dashboard -> /inventory) → admin-only */}
          <Route
            path="/inventory"
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

          {/* Student profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute forbidAdmin>
                <ProfileStudent />
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

          {/* Admin accountabilities page */}
          <Route
            path="/admin/accountabilities"
            element={
              <ProtectedRoute requireAdmin>
                <AdminAccountabilities />
              </ProtectedRoute>
            }
          />

          {/* Admin profile page */}
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute requireAdmin>
                <ProfileAdmin />
              </ProtectedRoute>
            }
          />

          {/* Admin user management page */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Analytics page */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requireAdmin>
                <Analytics />
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
