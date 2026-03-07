import type { LogLevel } from "./types.js";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private threshold: number;

  constructor(level: LogLevel = "info") {
    this.threshold = LEVELS[level];
  }

  setLevel(level: LogLevel): void {
    this.threshold = LEVELS[level];
  }

  debug(msg: string, ...args: unknown[]): void {
    this.log("debug", msg, ...args);
  }

  info(msg: string, ...args: unknown[]): void {
    this.log("info", msg, ...args);
  }

  warn(msg: string, ...args: unknown[]): void {
    this.log("warn", msg, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    this.log("error", msg, ...args);
  }

  private log(level: LogLevel, msg: string, ...args: unknown[]): void {
    if (LEVELS[level] < this.threshold) return;
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} [${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, msg, ...args);
    } else if (level === "warn") {
      console.warn(prefix, msg, ...args);
    } else {
      console.log(prefix, msg, ...args);
    }
  }
}

export const logger = new Logger();
