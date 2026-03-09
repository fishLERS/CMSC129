import express from "express";
import cors from "cors";
import { AppConfig } from "./config/env.js";
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
  const allowedOrigins = Array.from(
    new Set([
      config.clientUrl,
      ...config.clientUrls,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ])
  );

  const isLocalDevOrigin = (origin: string): boolean =>
    /^https?:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(origin);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like curl or server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS not allowed for origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ============ MIDDLEWARE ============
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ROUTES ============
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  app.use("/api/equipment", equipmentRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/requests", requestRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // ============ ERROR HANDLING (must be last) ============
  app.use(errorHandler);

  return app;
}

/**
 * Start the server.
 */
export function startServer(app: express.Application, config: AppConfig): void {
  app.listen(config.port, () => {
    const configuredOrigins = [config.clientUrl, ...config.clientUrls].filter(Boolean);
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`CORS configured origins: ${configuredOrigins.join(", ") || "(none)"}`);
  });
}
