import { startMonitorApplication } from "./app/monitorApp.ts";
import { createShutdownController } from "./app/shutdown.ts";
import { createLogger } from "./utils/logger.ts";

const log = createLogger("App");
const shutdownController = createShutdownController();

let application: Awaited<ReturnType<typeof startMonitorApplication>> | undefined;

async function shutdown(signal: string): Promise<void> {
  if (application === undefined) {
    process.exit(0);
    return;
  }

  try {
    await application.shutdown(signal);
    process.exit(process.exitCode ?? 0);
  } catch (error: unknown) {
    log.error("Error during shutdown", error);
    process.exit(1);
  }
}

function registerProcessHandlers(): void {
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("unhandledRejection", (reason: unknown) => {
    log.error("Unhandled promise rejection", reason);
  });

  process.on("uncaughtException", (error: Error) => {
    log.error("Uncaught exception", error);
    void shutdown("uncaughtException");
  });
}

async function main(): Promise<void> {
  registerProcessHandlers();
  application = await startMonitorApplication(shutdownController);
}

main().catch((error: unknown) => {
  log.error("Failed to start application", error);
  process.exit(1);
});
