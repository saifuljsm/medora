import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Image src="/medora-logo.png" alt="Medora" width={2251} height={727} className="h-9 w-auto" priority />
      <div>
        <p className="text-4xl font-bold text-primary">404</p>
        <p className="mt-1 text-sm font-semibold text-foreground">Page not found</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
      >
        Back to home
      </Link>
    </div>
  );
}
