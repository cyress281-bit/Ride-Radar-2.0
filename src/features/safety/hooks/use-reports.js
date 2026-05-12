import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { createReport } from '@/features/safety/api/safety-api.js';

/**
 * Mutation hook to create a report.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, object>}
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportData) => {
      const { data, error } = await createReport(reportData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: 'Report submitted', description: 'Thank you for helping keep the community safe.' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit report',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
