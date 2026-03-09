import { loadConfig } from "./config/env.js";
import { initializeFirebase } from "./config/firebase.js";
import { createApp, startServer } from "./app.js";

/**
 * Main entry point.
 * Loads config, initializes Firebase, creates and starts the Express app.
 */
async function main() {
  try {
    // Load environment configuration
    const config = loadConfig();
    console.log(`\n🚀 Starting FishLERS Server (${config.nodeEnv} mode)\n`);

    // Initialize Firebase Admin SDK
    initializeFirebase(config);

    // Create and start Express app
    const app = createApp(config);
    startServer(app, config);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();
