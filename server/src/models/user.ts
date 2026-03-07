/**
 * User Model
 * Domain model for user accounts in the system.
 */
export interface User {
  uid: string; // Firebase UID
  email: string;
  displayName?: string;
  role: "student" | "admin"; // Student or admin role
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

/**
 * What can be updated by users or admins
 */
export type UserUpdateInput = Partial<Omit<User, "uid" | "createdAt" | "updatedAt">>;

/**
 * Auth response from login/signup
 */
export interface AuthResponse {
  user: User;
  token: string; // Firebase ID token
}

/**
 * Signup/Login request payload
 */
export interface AuthPayload {
  email: string;
  password: string;
  displayName?: string; // Only for signup
}
