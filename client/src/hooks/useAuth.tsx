import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../firebase";
import * as authApi from "../api/auth.api";

/**
 * User type (from API).
 */
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "student" | "admin";
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<User>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<User>;
  getCurrentUser: () => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Context provider for authentication.
 * Wraps the app and manages auth state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /**
   * Subscribe to Firebase auth state changes and verify user data.
   * This runs whenever the user logs in/out.
   */
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          // User is logged out
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
            localStorage.removeItem("authToken");
            localStorage.removeItem("userRole");
          }
          return;
        }

        // Get the stored token
        const token = localStorage.getItem("authToken");

        if (!token) {
          // No token stored, user is logged out
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
          }
          return;
        }

        // Verify token with backend and get user data
        try {
          const userData = await authApi.verifyToken(token);
          
          // Check Firebase custom claims for admin status
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const hasAdminClaim = !!idTokenResult.claims.admin;

          if (mounted) {
            setUser(userData);
            setIsAdmin(hasAdminClaim && userData.role === "admin");
            localStorage.setItem("userRole", userData.role);
            setError(null);
          }
        } catch (err: any) {
          console.error("Auth verification failed:", err);
          // Token is invalid or expired, clear it
          if (mounted) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userRole");
            setUser(null);
            setIsAdmin(false);
            setError(err.message);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Sign up a new user.
   */
  const signup = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      const userData = await authApi.signup(email, password, displayName);
      setUser(userData);
      setError(null);
      return userData;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log in an existing user.
   */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      alert("Login not yet implemented via API. Use Firebase client SDK or create login endpoint.");
      throw new Error("Login endpoint not implemented");
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out the current user.
   */
  const logout = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear all stored auth data
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userSeenStatuses");
      localStorage.removeItem("studentNotificationHistory");
      
      // Clear state
      setUser(null);
      setIsAdmin(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Update user profile (display name, etc).
   */
  const updateProfile = async (displayName: string) => {
    try {
      setLoading(true);
      const updated = await authApi.updateProfile(displayName);
      setUser(updated);
      setError(null);
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current user data.
   */
  const getCurrentUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Send password reset email.
   */
  const resetPassword = async (email: string) => {
    try {
      alert("Password reset not yet implemented. Use Firebase client SDK or create endpoint.");
      throw new Error("Password reset not implemented");
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAdmin,
    signup,
    login,
    logout,
    updateProfile,
    getCurrentUser,
    resetPassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook - Use in components to access auth state and methods.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default useAuth;
