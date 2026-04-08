import { Logger } from '@nestjs/common';

function stringifyContext(context: unknown): string {
  if (context === undefined) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return '';
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createDmsLogger(context: string) {
  const logger = new Logger(context);

  return {
    debug(message: string, meta?: unknown) {
      logger.debug(`${message}${stringifyContext(meta)}`);
    },
    info(message: string, meta?: unknown) {
      logger.log(`${message}${stringifyContext(meta)}`);
    },
    warn(message: string, meta?: unknown) {
      logger.warn(`${message}${stringifyContext(meta)}`);
    },
    error(message: string, error?: unknown, meta?: unknown) {
      const errorSuffix = error === undefined ? '' : ` | Error: ${toErrorMessage(error)}`;
      logger.error(`${message}${errorSuffix}${stringifyContext(meta)}`);
    },
  };
}
