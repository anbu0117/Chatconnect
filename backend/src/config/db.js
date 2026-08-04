import mongoose from "mongoose";

/**
 * Connects to MongoDB using the URI from environment variables.
 * Exits the process if the connection fails, since the app cannot
 * function without a database connection.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};
