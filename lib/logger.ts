type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10, info: 20, warn: 30, error: 40,
};

const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

type SentryModule = {
  captureException: (e: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
  captureMessage: (msg: string, level?: string) => void;
};
let sentry: SentryModule | null = null;
let sentryAttempted = false;

async function maybeLoadSentry(): Promise<void> {
  if (sentryAttempted || !process.env.SENTRY_DSN) return;
  sentryAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("@sentry/nextjs" as any)) as SentryModule;
    sentry = mod;
  } catch {
    // Optional dep — silently skip if not installed
  }
}

function emit(level: LogLevel, event: string, ctx: LogContext, base: LogContext) {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(), level, event, ...base, ...ctx,
  });
  if (level === "error") {
    console.error(line);
    void maybeLoadSentry().then(() => {
      if (!sentry) return;
      const err = ctx.error;
      if (err instanceof Error) {
        sentry.captureException(err, { extra: { event, ...base, ...ctx } });
      } else {
        sentry.captureMessage(`${event}: ${JSON.stringify(ctx)}`, "error");
      }
    });
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export type Logger = {
  debug: (event: string, ctx?: LogContext) => void;
  info: (event: string, ctx?: LogContext) => void;
  warn: (event: string, ctx?: LogContext) => void;
  error: (event: string, ctx?: LogContext) => void;
  child: (extra: LogContext) => Logger;
  time: <T>(event: string, fn: () => Promise<T>, ctx?: LogContext) => Promise<T>;
};

function createLogger(base: LogContext = {}): Logger {
  return {
    debug: (event, ctx = {}) => emit("debug", event, ctx, base),
    info: (event, ctx = {}) => emit("info", event, ctx, base),
    warn: (event, ctx = {}) => emit("warn", event, ctx, base),
    error: (event, ctx = {}) => emit("error", event, ctx, base),
    child: (extra) => createLogger({ ...base, ...extra }),
    time: async (event, fn, ctx = {}) => {
      const startedAt = Date.now();
      try {
        const result = await fn();
        emit("info", event, { ...ctx, durationMs: Date.now() - startedAt, ok: true }, base);
        return result;
      } catch (err) {
        emit("error", event, {
          ...ctx,
          durationMs: Date.now() - startedAt,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }, base);
        throw err;
      }
    },
  };
}

export const logger = createLogger({ app: "nowaam" });

export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
