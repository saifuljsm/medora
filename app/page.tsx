export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
        <span className="text-2xl font-bold text-primary-foreground">M</span>
      </div>
      <h1 className="text-xl font-bold text-foreground">Medora</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Storefront under construction — see build order Phase 2.3 in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/build-spec.md</code>.
      </p>
    </main>
  );
}
