import pino from "pino";

function createRootLogger(): pino.Logger {
  const level = process.env.LOG_LEVEL ?? "info";

  if (process.env.LOG_PRETTY === "true") {
    return pino({
      level,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    });
  }

  return pino({ level });
}

const rootLogger = createRootLogger();

export type TAppLogger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
};

export function createLogger(scope: string): TAppLogger {
  const child = rootLogger.child({ scope });

  return {
    info(message: string): void {
      child.info(message);
    },
    warn(message: string): void {
      child.warn(message);
    },
    error(message: string, error?: unknown): void {
      if (error instanceof Error) {
        child.error(error, message);
        return;
      }
      if (error !== undefined) {
        child.error({ err: error }, message);
        return;
      }
      child.error(message);
    },
  };
}
