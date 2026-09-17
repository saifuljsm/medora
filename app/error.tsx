"use client";

import { useEffect } from "react";
import Image from "next/image";
import { captureException } from "@/lib/sentry";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Image src="/medora-logo.png" alt="Medora" width={2251} height={727} className="h-9 w-auto" priority />
      <div>
        <p className="text-sm font-semibold text-foreground">Something went wrong</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          We hit an unexpected error. Try again, or call us if it keeps happening.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
      >
        Try again
      </button>
    </div>
  );
}
