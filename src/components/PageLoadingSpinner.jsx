/**
 * Lightweight loading spinner used as Suspense fallback for lazy-loaded routes.
 * Kept minimal to avoid importing heavy dependencies in the loading state itself.
 */
export default function PageLoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.22)]" />
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
