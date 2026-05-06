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
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
        </div>
      )
    );
  }

  if (isError) {
    return (
      errorFallback || (
        <div className="fixed inset-0 flex items-center justify-center px-6">
          <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <h1 className="font-display text-xl font-bold mb-2">
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
        <div className="flex items-center justify-center py-20">
          <div className="text-center rounded-3xl border border-dashed border-border p-10">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </div>
      )
    );
  }

  return children;
}
