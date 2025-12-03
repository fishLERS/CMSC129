import React, { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "student"; // optional role
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setRole(userDoc.data()?.role || null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && role !== requiredRole) {
    // redirect based on actual role
    return <Navigate to={role === "admin" ? "/admindashboard" : "/requestpage"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
