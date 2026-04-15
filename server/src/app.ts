// src/app.ts
import express from "express";
import cors from "cors";
import { AppConfig } from "./config/env.js";
import { errorHandler } from "./middleware/auth.js"; 
import mongoose from 'mongoose';
import equipmentRoutes from "./routes/equipment.routes.js";
import authRoutes from "./routes/auth.routes.js";
import requestRoutes from "./routes/requests.routes.js";

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
    ])
  );

  const isLocalDevOrigin = (origin: string): boolean =>
    /^https?:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(origin);
  const isLanDevOrigin = (origin: string): boolean =>
    /^https?:\/\/((192\.168|10\.\d+|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+):\d{2,5}$/.test(origin);

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin) || isLanDevOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  // ============ MIDDLEWARE ============
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ROUTES ============
  app.get("/health", (_req, res) => {
    // Helpful to check both DB statuses in health check
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      databases: {
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
      }
    });
  });

  app.use("/api/equipment", equipmentRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/requests", requestRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // ============ ERROR HANDLING ============
  app.use(errorHandler);

  return app;
}

export function startServer(app: express.Application, config: AppConfig): void {
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}