/**
 * Lightweight loading spinner used as Suspense fallback for lazy-loaded routes.
 * Kept minimal to avoid importing heavy dependencies in the loading state itself.
 */
export default function PageLoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
      <div className="rr-surface flex w-full max-w-[320px] flex-col items-center gap-4 rounded-[20px] p-8 text-center">
        <div className="relative h-12 w-12 rounded-full bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
          <span className="absolute inset-3 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]" />
          <span className="absolute inset-0 rounded-full border border-primary/25 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
