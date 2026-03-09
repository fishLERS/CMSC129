import express from "express";
import cors from "cors";
import { loadConfig, AppConfig } from "./config/env.js";
import { initializeFirebase } from "./config/firebase.js";
import { errorHandler } from "./middleware/auth.js";
import equipmentRoutes from "./routes/equipment.routes.js";
import authRoutes from "./routes/auth.routes.js";
import requestRoutes from "./routes/requests.routes.js";

/**
 * Create and configure the Express app.
 * NOTE: Does NOT start the server. Call listen() separately.
 */
export function createApp(config: AppConfig): express.Application {
  const app = express();

  // ============ CORS CONFIGURATION ============
  // Allow requests from the frontend running on localhost (any Vite dev port: 5173, 5174, etc.)
  // In production, change to your actual frontend domain
  const allowedOrigins = [
    config.clientUrl,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS not allowed"));
        }
      },
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
