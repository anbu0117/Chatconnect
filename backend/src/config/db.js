import mongoose from "mongoose";
import dns from "dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV connection strings
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if not supported in some restricted environments
}

/**
 * Connects to MongoDB using the URI from environment variables.
 * Retries up to 3 times before exiting.
 */
export const connectDB = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`[MongoDB] Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`[MongoDB] Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error("[MongoDB] Exhausted all connection retries. Exiting.");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};
