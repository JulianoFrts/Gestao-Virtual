import { logger as LoggerInstance } from "../lib/utils/logger";

declare global {
  var logger: typeof LoggerInstance;
}

export {};
