// src/index.ts
import { loadConfig } from "./config/env.js";
import { initializeFirebase } from "./config/firebase.js";
import { createApp, startServer } from "./app.js";
import { connectMongoDB } from "./config/mongodb.js";
import { startFirestoreListeners } from "./services/firestoreListerner.js";
import mongoose from 'mongoose';

async function main() {
  try {
    const config = loadConfig();
    console.log(`\n🚀 Starting FishLERS Server (${config.nodeEnv} mode)\n`);

    // 1. Initialize Primary Storage (Firestore)
    initializeFirebase(config);

    // 2. Initialize Backup Storage (MongoDB)
    // Ensure we wait for the connection before starting listeners
    await connectMongoDB();

    // 3. Start Syncing (Listeners)
    // These link Firestore events to MongoDB updates
    startFirestoreListeners();

    // 4. Create and start Express app
    const app = createApp(config);
    startServer(app, config);

    // Handle Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing database connections...`);
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();