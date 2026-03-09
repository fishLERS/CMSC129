import { getAuth } from "../config/firebase.js";
import { User, UserUpdateInput, AuthPayload } from "../models/user.js";
import { UserRepository } from "../repositories/users.repo.js";

/**
 * Auth Service.
 * Handles user authentication, authorization, and account management.
 *
 * Purpose: Business logic layer for auth operations.
 */
export class AuthService {
  /**
   * Sign up a new user.
   * Creates both a Firebase Auth user and a Firestore user document.
   */
  static async signup(payload: AuthPayload): Promise<User> {
    const { email, password, displayName } = payload;

    this.validateAuthPayload(email, password);

    try {
      // Create Firebase Auth user
      const authUser = await getAuth().createUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
      });

      // Create Firestore user document
      const user = await UserRepository.create(authUser.uid, {
        email,
        displayName: authUser.displayName || "User",
        role: "student", // Default role is student
        isActive: true,
      });

      return user;
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        throw new Error("Email already registered");
      }
      if (error.code === "auth/weak-password") {
        throw new Error("Password must be at least 6 characters");
      }
      throw error;
    }
  }

  /**
   * Verify a user's authentication token.
   * Returns user data if token is valid.
   */
  static async verifyToken(token: string): Promise<User> {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      const user = await UserRepository.getById(decodedToken.uid);

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error: any) {
      throw new Error("Invalid authentication token");
    }
  }

  /**
   * Get user by ID.
   */
  static async getUserById(uid: string): Promise<User> {
    const user = await UserRepository.getById(uid);

    if (!user) {
      throw new Error(`User not found: ${uid}`);
    }

    return user;
  }

  /**
   * Update user profile (name, etc.)
   * Does NOT allow changing email or role via this method.
   */
  static async updateProfile(uid: string, updates: Partial<Pick<User, "displayName">>): Promise<User> {
    const user = await UserRepository.getById(uid);
    if (!user) {
      throw new Error("User not found");
    }

    await UserRepository.update(uid, updates);

    const updated = await UserRepository.getById(uid);
    if (!updated) {
      throw new Error("Failed to update user");
    }

    return updated;
  }

  /**
   * Set user role (admin only operation).
   * Should be used with requireAdmin middleware.
   */
  static async setUserRole(uid: string, role: "student" | "admin"): Promise<void> {
    const user = await UserRepository.getById(uid);
    if (!user) {
      throw new Error("User not found");
    }

    // Set custom claim in Firebase Auth
    await getAuth().setCustomUserClaims(uid, { admin: role === "admin" });

    // Update Firestore document
    await UserRepository.update(uid, { role });
  }

  /**
   * Deactivate a user account.
   */
  static async deactivateUser(uid: string): Promise<void> {
    const user = await UserRepository.getById(uid);
    if (!user) {
      throw new Error("User not found");
    }

    await UserRepository.update(uid, { isActive: false });
  }

  /**
   * Validate auth payload (email, password format).
   */
  private static validateAuthPayload(email: string, password: string): void {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email format");
    }

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
  }
}
