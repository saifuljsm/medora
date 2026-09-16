import * as Sentry from "@sentry/nextjs";

/**
 * Thin wrapper so call sites don't need to know whether Sentry is actually
 * configured — captureException() is safe to call unconditionally; it's a
 * no-op until SENTRY_DSN is set (see instrumentation.ts).
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
