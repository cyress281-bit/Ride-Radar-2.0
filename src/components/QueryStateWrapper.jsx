/**
 * Reusable wrapper for handling common query states (loading, error, empty).
 * Eliminates repeated loading/error/empty state boilerplate across pages.
 *
 * @param {boolean} isLoading - Query loading state
 * @param {boolean} isError - Query error state
 * @param {any} error - Error object
 * @param {Array|null} data - Data array to check if empty
 * @param {React.ReactNode} loadingFallback - Custom loading UI
 * @param {React.ReactNode} errorFallback - Custom error UI
 * @param {React.ReactNode} emptyFallback - Custom empty state UI
 * @param {React.ReactNode} children - Content to render when data exists
 */
export default function QueryStateWrapper({
  isLoading,
  isError,
  error,
  data,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}) {
  if (isLoading) {
    return (
      loadingFallback || (
        <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
          <div className="rr-surface flex w-full max-w-[320px] flex-col items-center gap-4 rounded-[20px] p-8 text-center">
            <div className="relative h-12 w-12 rounded-full bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
              <span className="absolute inset-3 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]" />
              <span className="absolute inset-0 rounded-full border border-primary/25 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Loading latest ride data</p>
          </div>
        </div>
      )
    );
  }

  if (isError) {
    return (
      errorFallback || (
        <div className="fixed inset-0 flex items-center justify-center px-6">
          <div className="rr-surface-strong w-full max-w-sm rounded-[20px] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-[0_0_24px_hsl(var(--destructive)/0.16)]">
              !
            </div>
            <h1 className="font-display mb-2 text-2xl font-extrabold">
              Unable to load
            </h1>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'Please refresh and try again.'}
            </p>
          </div>
        </div>
      )
    );
  }

  if (data && Array.isArray(data) && data.length === 0) {
    return (
      emptyFallback || (
        <div className="flex items-center justify-center px-6 py-16">
          <div className="rr-surface w-full max-w-sm rounded-[20px] p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.12)]" />
            <h2 className="font-display text-xl font-extrabold">Nothing here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">New ride activity will appear here when it is available.</p>
          </div>
        </div>
      )
    );
  }

  return children;
}
