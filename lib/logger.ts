type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const payload = {
    level,
    message,
    at: new Date().toISOString(),
    ...(meta ? { meta } : {})
  };
  const text = JSON.stringify(payload);
  if (level === "error") {
    console.error(text);
    return;
  }
  if (level === "warn") {
    console.warn(text);
    return;
  }
  console.info(text);
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    write("warn", message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    write("error", message, meta);
  }
};
