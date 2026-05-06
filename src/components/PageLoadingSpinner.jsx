/**
 * Lightweight loading spinner used as Suspense fallback for lazy-loaded routes.
 * Kept minimal to avoid importing heavy dependencies in the loading state itself.
 */
export default function PageLoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-secondary border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
