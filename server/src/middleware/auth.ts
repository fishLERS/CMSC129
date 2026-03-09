import { Request, Response, NextFunction } from "express";

/**
 * Global error handler middleware.
 * Catches errors thrown in routes/controllers and formats them as JSON.
 * Must be registered LAST in the app middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("❌ Error:", err.message);

  // Firebase errors
  if (err.message.includes("not-found")) {
    return res.status(404).json({ error: "Not found" });
  }
  if (err.message.includes("permission")) {
    return res.status(403).json({ error: "Permission denied" });
  }

  // Default server error
  res.status(500).json({ error: err.message || "Internal server error" });
}

/**
 * Middleware to verify Firebase authentication token.
 * Extracts the token from Authorization header (Bearer scheme).
 * Attaches user info to req.user if valid.
 * Returns 401 if token is missing or invalid.
 *
 * Usage: app.use(requireAuth) or router.use(requireAuth)
 */
import { getAuth } from "../config/firebase.js";

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email?: string };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error: any) {
    console.error("Auth error:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to verify Firebase admin claim.
 * Must be used AFTER requireAuth.
 * Returns 403 if user does not have admin claim.
 *
 * Usage: router.get("/admin-only", requireAuth, requireAdmin, handler)
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const claims = await getAuth().getUser(req.user.uid);
    if (!claims.customClaims?.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (error: any) {
    console.error("Admin check error:", error.message);
    res.status(403).json({ error: "Could not verify admin status" });
  }
}
