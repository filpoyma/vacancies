export interface IShutdownController {
  isShuttingDown(): boolean;
  beginShutdown(): void;
}

export function createShutdownController(): IShutdownController {
  let shuttingDown = false;

  return {
    isShuttingDown(): boolean {
      return shuttingDown;
    },
    beginShutdown(): void {
      shuttingDown = true;
    },
  };
}
