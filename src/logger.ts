import { format } from "node:util";
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
    const line = `${timestamp} [${level.toUpperCase()}] ${format(msg, ...args)}`;
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export const logger = new Logger();
