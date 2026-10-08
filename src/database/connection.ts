import mongoose from "mongoose";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("Database");

export async function connectDatabase(uri: string): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return;
  }

  try {
    await mongoose.connect(uri);
    log.info("Connected");
  } catch (error: unknown) {
    log.error("Connection failed", error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    log.info("Disconnected");
  } catch (error: unknown) {
    log.error("Disconnect failed", error);
    throw error;
  }
}
