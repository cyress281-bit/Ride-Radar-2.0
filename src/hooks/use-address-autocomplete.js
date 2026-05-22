import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAddressSuggestions } from '@/lib/geocoding.js';

/**
 * Hook for address autocomplete with debounce, cancellation, and caching.
 *
 * @param {object} options
 * @param {string} options.query - The search query string
 * @param {boolean} [options.enabled=true] - Whether to fetch suggestions
 * @param {number} [options.debounceMs=300] - Debounce delay in milliseconds
 * @param {number} [options.minLength=3] - Minimum query length to trigger search
 * @returns {{
 *   suggestions: Array<{id: string, displayName: string, lat: number, lng: number, context: string}>;
 *   isLoading: boolean;
 *   error: Error | null;
 *   isEmpty: boolean;
 * }}
 */
export function useAddressAutocomplete({
  query,
  enabled = true,
  debounceMs = 300,
  minLength = 3,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const clearAbort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      clearAbort();
      return;
    }

    const normalized = String(query || '').trim();
    if (!normalized || normalized.length < minLength) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      clearAbort();
      return;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      searchAddressSuggestions(normalized, { signal: controller.signal })
        .then((results) => {
          if (controller.signal.aborted) return;
          setSuggestions(results);
          setError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          // Non-fatal: user can still type manually
          setSuggestions([]);
          setError(err);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearAbort();
    };
  }, [query, enabled, debounceMs, minLength, clearAbort]);

  const isEmpty = !isLoading && !error && suggestions.length === 0 && query.trim().length >= minLength;

  return { suggestions, isLoading, error, isEmpty };
}
