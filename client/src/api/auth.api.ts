/**
 * Auth API.
 * HTTP wrapper for authentication endpoints.
 *
 * This module wraps all auth API calls, replacing Firebase Auth client methods.
 */

import { apiPost, apiGet, apiPatch } from "./http";

/**
 * User type (from server models).
 */
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "student" | "admin";
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

/**
 * Auth response type.
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Sign up a new user.
 * POST /api/auth/signup
 * Body: { email, password, displayName? }
 */
export async function signup(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const data = await apiPost<User>("/api/auth/signup", {
    email,
    password,
    displayName,
  });
  return data;
}

/**
 * Verify an ID token.
 * POST /api/auth/verify
 * Body: { token }
 * Returns: user data if valid
 */
export async function verifyToken(token: string): Promise<User> {
  const data = await apiPost<User>("/api/auth/verify", { token });
  return data;
}

/**
 * Get current user data.
 * GET /api/auth/me
 * Requires: Authorization header with token
 */
export async function getCurrentUser(): Promise<User> {
  const data = await apiGet<User>("/api/auth/me");
  return data;
}

/**
 * Update current user profile.
 * PATCH /api/auth/profile
 * Body: { displayName? }
 */
export async function updateProfile(displayName: string): Promise<User> {
  const data = await apiPatch<User>("/api/auth/profile", { displayName });
  return data;
}

/**
 * Set a user's role (admin only).
 * POST /api/auth/:uid/set-role
 * Body: { role: "student" | "admin" }
 */
export async function setUserRole(
  uid: string,
  role: "student" | "admin"
): Promise<void> {
  await apiPost(`/api/auth/${uid}/set-role`, { role });
}

/**
 * Deactivate a user account (admin only).
 * POST /api/auth/:uid/deactivate
 */
export async function deactivateUser(uid: string): Promise<void> {
  await apiPost(`/api/auth/${uid}/deactivate`, {});
}

export default {
  signup,
  verifyToken,
  getCurrentUser,
  updateProfile,
  setUserRole,
  deactivateUser,
};
