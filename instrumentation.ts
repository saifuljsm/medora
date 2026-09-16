// Native Next.js instrumentation hook (stable since 14.0, no experimental
// flag needed) — initializes Sentry for the Node.js server runtime only.
// Sentry.init() with an empty dsn is a documented no-op, so this is safe to
// ship before SENTRY_DSN exists; error capture activates the moment it's set.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN || undefined,
      tracesSampleRate: 0.1,
      enabled: Boolean(process.env.SENTRY_DSN),
    });
  }
}
