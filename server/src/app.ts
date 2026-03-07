import express from "express";
import cors from "cors";
import { loadConfig, AppConfig } from "./config/env";
import { initializeFirebase } from "./config/firebase";
import { errorHandler } from "./middleware/auth";
import equipmentRoutes from "./routes/equipment.routes";
import authRoutes from "./routes/auth.routes";
import requestRoutes from "./routes/requests.routes";

/**
 * Create and configure the Express app.
 * NOTE: Does NOT start the server. Call listen() separately.
 */
export function createApp(config: AppConfig): express.Application {
  const app = express();

  // ============ CORS CONFIGURATION ============
  // Allow requests from the frontend running on localhost:5173 (Vite dev server)
  // In production, change CLIENT_URL to your actual frontend domain
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ============ MIDDLEWARE ============
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ROUTES ============
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/equipment", equipmentRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/requests", requestRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // ============ ERROR HANDLING (must be last) ============
  app.use(errorHandler);

  return app;
}

/**
 * Start the server.
 * Call this in your index.ts or similar entry point after initializing Firebase.
 */
export function startServer(app: express.Application, config: AppConfig): void {
  app.listen(config.port, () => {
    console.log(`✓ Server running on http://localhost:${config.port}`);
    console.log(`✓ CORS enabled for: ${config.clientUrl}`);
  });
}
