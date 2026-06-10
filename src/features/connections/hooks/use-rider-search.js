import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProfiles } from '@/features/profile/api/profile-api';

export function useRiderSearch(query, friendIds = []) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['rider-search', debouncedQuery, friendIds],
    queryFn: async () => {
      const { data, error } = await searchProfiles(debouncedQuery, friendIds);
      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
